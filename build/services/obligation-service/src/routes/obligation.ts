// obligation-service/src/routes/obligation.ts — Obligation lifecycle HTTP handlers
import type {
  FastifyInstance,
  FastifyPluginOptions,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import {
  createObligation,
  submitObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  supersedeByFiling,
} from "@tax-core/domain";
import type { ObligationCadence, StagedAssessment } from "@tax-core/domain";
import { ObligationRepository } from "../db/repository.js";
import { ObligationEventPublisher } from "../events/publisher.js";

export interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface CreateObligationBody {
  taxpayer_id: string;
  tax_period_start: string;
  tax_period_end: string;
  cadence: ObligationCadence;
  due_date: string;
}

interface SubmitBody {
  filing_id: string;
}

interface PreliminaryTriggerBody {
  estimated_net_vat: number;
}

interface SupersedeBody {
  filing_id: string;
  final_assessment: StagedAssessment;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function obligationRoutes(
  app: FastifyInstance,
  options: RouteOptions,
): Promise<void> {
  const repo = new ObligationRepository(options.sql);
  const publisher = new ObligationEventPublisher(options.kafka);

  // POST /obligations — create a new filing obligation
  app.post("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as CreateObligationBody;
    const traceId = req.id;
    const { taxpayer_id, tax_period_start, tax_period_end, cadence, due_date } = body;

    if (!taxpayer_id || !tax_period_start || !tax_period_end || !cadence || !due_date) {
      return reply.badRequest("taxpayer_id, tax_period_start, tax_period_end, cadence, due_date are required");
    }

    const obligation = createObligation(taxpayer_id, tax_period_start, tax_period_end, cadence, due_date, traceId);
    await repo.saveObligation(obligation);
    await publisher.publishObligationCreated(obligation, traceId);

    return reply.status(201).send({
      obligation_id: obligation.obligation_id,
      state: obligation.state,
      cadence: obligation.cadence,
      due_date: obligation.due_date,
      trace_id: traceId,
    });
  });

  // GET /obligations?taxpayer_id={id} — list obligations by taxpayer
  app.get("/", async (req: FastifyRequest, reply: FastifyReply) => {
    const { taxpayer_id } = req.query as { taxpayer_id?: string };
    if (!taxpayer_id) {
      return reply.badRequest("taxpayer_id query param is required");
    }
    const obligations = await repo.findByTaxpayerId(taxpayer_id);
    return reply.send({ trace_id: req.id, taxpayer_id, obligations });
  });

  // GET /obligations/:obligation_id
  app.get("/:obligation_id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { obligation_id } = req.params as { obligation_id: string };
    const record = await repo.findObligation(obligation_id);
    if (!record) return reply.notFound(`Obligation not found: ${obligation_id}`);
    return reply.send(record);
  });

  // POST /obligations/:obligation_id/submit
  app.post("/:obligation_id/submit", async (req: FastifyRequest, reply: FastifyReply) => {
    const { obligation_id } = req.params as { obligation_id: string };
    const { filing_id } = req.body as SubmitBody;
    const traceId = req.id;

    if (!filing_id) return reply.badRequest("filing_id is required");
    if (!isUuid(filing_id)) return reply.status(422).send({ error: "VALIDATION_FAILED", message: "filing_id must be a UUID", trace_id: traceId });

    await repo.loadIntoMemory(obligation_id);
    const obligation = submitObligation(obligation_id, filing_id, traceId);
    await repo.updateObligationState(obligation_id, obligation.state, { filing_id });

    return reply.send({ obligation_id, state: obligation.state, trace_id: traceId });
  });

  // POST /obligations/:obligation_id/overdue
  app.post("/:obligation_id/overdue", async (req: FastifyRequest, reply: FastifyReply) => {
    const { obligation_id } = req.params as { obligation_id: string };
    const traceId = req.id;

    await repo.loadIntoMemory(obligation_id);
    const obligation = markObligationOverdue(obligation_id, traceId);
    await repo.updateObligationState(obligation_id, obligation.state, {});
    await publisher.publishObligationOverdue(obligation, traceId);

    return reply.send({ obligation_id, state: obligation.state, trace_id: traceId });
  });

  // POST /obligations/:obligation_id/preliminary — trigger preliminary assessment
  app.post("/:obligation_id/preliminary", async (req: FastifyRequest, reply: FastifyReply) => {
    const { obligation_id } = req.params as { obligation_id: string };
    const { estimated_net_vat } = req.body as PreliminaryTriggerBody;
    const traceId = req.id;

    if (estimated_net_vat === undefined) return reply.badRequest("estimated_net_vat is required");

    await repo.loadIntoMemory(obligation_id);
    const preliminary = triggerPreliminaryAssessment(obligation_id, estimated_net_vat, traceId);
    await repo.savePreliminaryAssessment(preliminary);
    await repo.updateObligationState(obligation_id, "overdue", {
      preliminary_assessment_id: preliminary.preliminary_assessment_id,
    });
    await publisher.publishPreliminaryTriggered(preliminary, traceId);

    return reply.status(201).send({
      preliminary_assessment_id: preliminary.preliminary_assessment_id,
      state: preliminary.state,
      estimated_net_vat: preliminary.estimated_net_vat,
      trace_id: traceId,
    });
  });

  // POST /obligations/:obligation_id/preliminary/:id/issue
  app.post("/:obligation_id/preliminary/:id/issue", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id: preliminary_assessment_id } = req.params as { obligation_id: string; id: string };
    const traceId = req.id;

    await repo.loadPreliminaryIntoMemory(preliminary_assessment_id);
    const preliminary = issuePreliminaryAssessment(preliminary_assessment_id, traceId);
    await repo.updatePreliminaryState(preliminary_assessment_id, preliminary.state, {
      issued_at: preliminary.issued_at,
    });

    return reply.send({
      preliminary_assessment_id,
      state: preliminary.state,
      issued_at: preliminary.issued_at,
      trace_id: traceId,
    });
  });

  // POST /obligations/:obligation_id/preliminary/:id/supersede
  app.post("/:obligation_id/preliminary/:id/supersede", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id: preliminary_assessment_id } = req.params as { obligation_id: string; id: string };
    const { filing_id, final_assessment } = req.body as SupersedeBody;
    const traceId = req.id;

    if (!filing_id || !final_assessment) return reply.badRequest("filing_id and final_assessment are required");
    if (!isUuid(filing_id)) return reply.status(422).send({ error: "VALIDATION_FAILED", message: "filing_id must be a UUID", trace_id: traceId });

    await repo.loadPreliminaryIntoMemory(preliminary_assessment_id);
    const superseded = supersedeByFiling(preliminary_assessment_id, filing_id, final_assessment, traceId);
    await repo.updatePreliminaryState(preliminary_assessment_id, superseded.state, {
      superseding_filing_id: filing_id,
      superseded_at: superseded.superseded_at,
      final_net_vat: final_assessment.stage4_net_vat,
    });
    await publisher.publishPreliminarySuperseded(superseded, traceId);

    return reply.send({
      preliminary_assessment_id,
      state: superseded.state,
      superseding_filing_id: filing_id,
      superseded_at: superseded.superseded_at,
      trace_id: traceId,
    });
  });
}
