// filing-service/src/routes/filing.ts — Fastify route handlers
// POST /vat-filings  → processFiling() orchestration (S01-S19)
// GET  /vat-filings/:filing_id → DB lookup
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import {
  processFiling,
  type CanonicalFiling,
  FilingStateError,
  ValidationFailedError,
} from "@tax-core/domain";
import { FilingRepository } from "../db/repository.js";
import { FilingEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

export async function filingRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new FilingRepository(opts.sql);
  const publisher = new FilingEventPublisher(opts.kafka);

  // POST /vat-filings
  app.post<{ Body: CanonicalFiling }>("/", async (req, reply) => {
    const filing = req.body;
    const traceId = req.id;

    try {
      const result = processFiling(
        { ...filing, trace_id: traceId },
        { taxpayer_id: filing.taxpayer_id },
      );
      const ctx = result.context;
      await repo.saveFiling(ctx.filing, ctx.assessment!, ctx.claim_intent!);
      await publisher.publishFilingReceived(ctx.filing, traceId);
      if (ctx.assessment) await publisher.publishFilingAssessed(ctx.assessment, traceId);
      if (ctx.claim_intent) await publisher.publishClaimCreated(ctx.claim_intent, traceId);

      return reply.status(201).send({
        filing_id: ctx.filing.filing_id,
        state: ctx.state,
        trace_id: traceId,
        assessment: ctx.assessment,
        claim_intent: ctx.claim_intent,
      });
    } catch (err) {
      if (err instanceof ValidationFailedError) {
        return reply.status(422).send({ error: "VALIDATION_FAILED", message: err.message, trace_id: traceId });
      }
      if (err instanceof FilingStateError) {
        return reply.status(409).send({ error: "STATE_ERROR", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  // GET /vat-filings/:filing_id
  app.get<{ Params: { filing_id: string } }>("/:filing_id", async (req, reply) => {
    const { filing_id } = req.params;
    const record = await repo.findFiling(filing_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", filing_id, trace_id: req.id });
    }
    return reply.send({ ...record, trace_id: req.id });
  });
}
