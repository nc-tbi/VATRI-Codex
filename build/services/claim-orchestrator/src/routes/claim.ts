// claim-orchestrator/src/routes/claim.ts
// POST /claims          → createClaimIntent() with outbox (ADR-004)
// GET  /claims/:id      → DB lookup
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import {
  createClaimIntent,
  buildIdempotencyKey,
  IdempotencyConflictError,
  type StagedAssessment,
} from "@tax-core/domain";
import { ClaimRepository } from "../db/repository.js";
import { ClaimEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface ClaimBody {
  taxpayer_id: string;
  filing_id: string;
  tax_period_end: string;
  assessment_version: number;
  assessment: StagedAssessment;
}

export async function claimRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new ClaimRepository(opts.sql);
  const publisher = new ClaimEventPublisher(opts.kafka);

  // POST /claims
  app.post<{ Body: ClaimBody }>("/", async (req, reply) => {
    const { taxpayer_id, assessment, tax_period_end, assessment_version } = req.body;
    const traceId = req.id;

    try {
      const idempotencyKey = buildIdempotencyKey(
        taxpayer_id,
        tax_period_end,
        assessment_version,
      );

      const existing = await repo.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        // Idempotent return — already created
        return reply.status(200).send({ trace_id: traceId, claim: existing, idempotent: true });
      }

      // createClaimIntent(assessment, taxpayer_id, tax_period_end, assessment_version)
      const { claim } = createClaimIntent(assessment, taxpayer_id, tax_period_end, assessment_version);
      await repo.saveClaim(claim);
      await publisher.publishClaimCreated(claim, traceId);

      return reply.status(201).send({ trace_id: traceId, claim });
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return reply.status(409).send({ error: "IDEMPOTENCY_CONFLICT", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  // GET /claims/:claim_id
  app.get<{ Params: { claim_id: string } }>("/:claim_id", async (req, reply) => {
    const { claim_id } = req.params;
    const record = await repo.findClaim(claim_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", claim_id, trace_id: req.id });
    }
    return reply.send({ trace_id: req.id, claim: record });
  });
}
