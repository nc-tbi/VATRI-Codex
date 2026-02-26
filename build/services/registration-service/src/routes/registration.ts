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

    return reply.status(201).send({
      registration_id: registration.registration_id,
      taxpayer_id: registration.taxpayer_id,
      status: registration.status,
      cadence: registration.cadence,
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
    const record = await repo.findRegistration(registration_id);
    if (!record) return reply.notFound(`Registration not found: ${registration_id}`);
    return reply.send(record);
  });

  // POST /registrations/:registration_id/promote — pending_registration → registered
  app.post("/:registration_id/promote", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    const traceId = req.id;

    await repo.loadIntoMemory(registration_id);
    const registration = promoteToRegistered(registration_id, traceId);
    await repo.updateRegistrationStatus(registration_id, registration.status, {
      registered_at: registration.registered_at,
    });

    return reply.send({ registration_id, status: registration.status, trace_id: traceId });
  });

  // POST /registrations/:registration_id/deregister
  app.post("/:registration_id/deregister", async (req: FastifyRequest, reply: FastifyReply) => {
    const { registration_id } = req.params as { registration_id: string };
    const traceId = req.id;

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
