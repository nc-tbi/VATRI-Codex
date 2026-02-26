// registration-service/src/routes/registration.ts — Registration lifecycle HTTP handlers
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import {
  createRegistration,
  promoteToRegistered,
  deregister,
  transferRegistration,
  getCadencePolicy,
} from "@tax-core/domain";
import { RegistrationRepository } from "../db/repository.js";
import { RegistrationEventPublisher } from "../events/publisher.js";

export interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface CreateRegistrationBody {
  taxpayer_id: string;
  cvr_number: string;
  annual_turnover_dkk: number;
  business_profile?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  address?: Record<string, unknown>;
}

interface TransferBody {
  to_taxpayer_id: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isActiveBusinessProfile(businessProfile: Record<string, unknown> | undefined): boolean {
  const status = typeof businessProfile?.status === "string" ? businessProfile.status.toLowerCase() : "";
  return status === "active";
}

function resolveEffectiveDate(businessProfile: Record<string, unknown> | undefined): string {
  const dateValue = typeof businessProfile?.effective_date === "string" ? businessProfile.effective_date : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function registrationRoutes(
  app: FastifyInstance,
  options: RouteOptions,
): Promise<void> {
  const repo = new RegistrationRepository(options.sql);
  const publisher = new RegistrationEventPublisher(options.kafka);

  // POST /registrations — create a registration record
  app.post("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateRegistrationBody;
    const traceId = req.id;
    const { taxpayer_id, cvr_number, annual_turnover_dkk, business_profile, contact, address } = body;

    if (!taxpayer_id || !cvr_number || annual_turnover_dkk === undefined) {
      return reply.badRequest("taxpayer_id, cvr_number, and annual_turnover_dkk are required");
    }

    const registration = createRegistration(taxpayer_id, cvr_number, annual_turnover_dkk, traceId);
    await repo.saveRegistration(registration, { business_profile, contact, address });
    await publisher.publishRegistrationCreated(registration, traceId);

    let registrationStatus = registration.status;
    let obligationsCreated = 0;
    const businessProfile = business_profile as Record<string, unknown> | undefined;

    if (isActiveBusinessProfile(businessProfile) && registration.status === "pending_registration") {
      const promoted = promoteToRegistered(registration.registration_id, traceId);
      registrationStatus = promoted.status;
      await repo.updateRegistrationStatus(registration.registration_id, promoted.status, {
        registered_at: promoted.registered_at,
      });

      const effectiveDate = resolveEffectiveDate(businessProfile);
      const obligations = await repo.ensureRecurringObligationsForTaxpayer({
        taxpayer_id: registration.taxpayer_id,
        cadence: registration.cadence,
        effective_date: effectiveDate,
        trace_id: traceId,
      });
      obligationsCreated = obligations.length;
    }

    return reply.status(201).send({
      registration_id: registration.registration_id,
      taxpayer_id: registration.taxpayer_id,
      status: registrationStatus,
      cadence: registration.cadence,
      obligations_created: obligationsCreated,
      trace_id: traceId,
    });
  });

  // GET /registrations?taxpayer_id=
  app.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const { taxpayer_id } = req.query as { taxpayer_id?: string };
    if (!taxpayer_id) return reply.badRequest("taxpayer_id query parameter is required");
    const registrations = await repo.findRegistrationsByTaxpayerId(taxpayer_id);
    return reply.send({
      trace_id: req.id,
      taxpayer_id,
      registrations,
    });
  });

  // GET /registrations/:registration_id
  app.get("/:registration_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    if (!isUuid(registration_id)) {
      return reply.status(422).send({
        error: "VALIDATION_FAILED",
        message: "registration_id must be a UUID",
        trace_id: req.id,
      });
    }
    const record = await repo.findRegistration(registration_id);
    if (!record) return reply.notFound(`Registration not found: ${registration_id}`);
    return reply.send(record);
  });

  // POST /registrations/:registration_id/promote — pending_registration → registered
  app.post("/:registration_id/promote", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    const traceId = req.id;
    if (!isUuid(registration_id)) {
      return reply.status(422).send({ error: "VALIDATION_FAILED", message: "registration_id must be a UUID", trace_id: traceId });
    }

    await repo.loadIntoMemory(registration_id);
    const registration = promoteToRegistered(registration_id, traceId);
    await repo.updateRegistrationStatus(registration_id, registration.status, {
      registered_at: registration.registered_at,
    });

    let obligationsCreated = 0;
    const persisted = await repo.findRegistration(registration_id);
    if (persisted) {
      const businessProfile =
        typeof persisted.business_profile === "object" && persisted.business_profile !== null
          ? (persisted.business_profile as Record<string, unknown>)
          : undefined;
      const effectiveDate = resolveEffectiveDate(businessProfile);
      const obligations = await repo.ensureRecurringObligationsForTaxpayer({
        taxpayer_id: registration.taxpayer_id,
        cadence: registration.cadence,
        effective_date: effectiveDate,
        trace_id: traceId,
      });
      obligationsCreated = obligations.length;
    }

    return reply.send({ registration_id, status: registration.status, obligations_created: obligationsCreated, trace_id: traceId });
  });

  // POST /registrations/:registration_id/deregister
  app.post("/:registration_id/deregister", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    const traceId = req.id;
    if (!isUuid(registration_id)) {
      return reply.status(422).send({ error: "VALIDATION_FAILED", message: "registration_id must be a UUID", trace_id: traceId });
    }

    await repo.loadIntoMemory(registration_id);
    const registration = deregister(registration_id, traceId);
    await repo.updateRegistrationStatus(registration_id, registration.status, {
      deregistered_at: registration.deregistered_at,
    });
    await publisher.publishRegistrationDeregistered(registration, traceId);

    return reply.send({ registration_id, status: registration.status, trace_id: traceId });
  });

  // POST /registrations/:registration_id/transfer
  app.post("/:registration_id/transfer", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    const { to_taxpayer_id } = req.body as TransferBody;
    const traceId = req.id;

    if (!to_taxpayer_id) return reply.badRequest("to_taxpayer_id is required");
    if (!isUuid(registration_id)) {
      return reply.status(422).send({ error: "VALIDATION_FAILED", message: "registration_id must be a UUID", trace_id: traceId });
    }

    await repo.loadIntoMemory(registration_id);
    const registration = transferRegistration(registration_id, to_taxpayer_id, traceId);
    await repo.updateRegistrationStatus(registration_id, registration.status, {});
    await publisher.publishRegistrationTransferred(registration, to_taxpayer_id, traceId);

    return reply.send({ registration_id, status: registration.status, trace_id: traceId });
  });

  // GET /registrations/cadence-policy?turnover_dkk=
  // Registered as a separate route outside the prefix to avoid param collision
  app.get("/cadence-policy", async (req: FastifyRequest, reply: FastifyReply) => {
    const { turnover_dkk } = req.query as { turnover_dkk?: string };
    if (!turnover_dkk) return reply.badRequest("turnover_dkk query parameter is required");
    const cadence = getCadencePolicy(Number(turnover_dkk));
    return reply.send({ turnover_dkk: Number(turnover_dkk), cadence });
  });
}
