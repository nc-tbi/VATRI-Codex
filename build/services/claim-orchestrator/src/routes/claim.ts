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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function isClaimBody(input: unknown): input is ClaimBody {
  if (!input || typeof input !== "object") return false;
  const body = input as Record<string, unknown>;
  const assessment = body.assessment;
  const assessmentRecord = assessment as Record<string, unknown>;
  return (
    typeof body.taxpayer_id === "string" &&
    typeof body.filing_id === "string" &&
    isUuid(body.filing_id) &&
    typeof body.tax_period_end === "string" &&
    typeof body.assessment_version === "number" &&
    !!assessment &&
    typeof assessment === "object" &&
    typeof assessmentRecord.filing_id === "string" &&
    isUuid(String(assessmentRecord.filing_id))
  );
}

export async function claimRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new ClaimRepository(opts.sql);
  const publisher = new ClaimEventPublisher(opts.kafka);

  // POST /claims
  app.post<{ Body: ClaimBody }>("/", async (req, reply) => {
    if (!isClaimBody(req.body)) {
      return reply.status(422).send({
        error: "VALIDATION_FAILED",
        message:
          "required fields: taxpayer_id, filing_id(UUID), tax_period_end, assessment_version, assessment(filing_id UUID)",
        trace_id: req.id,
      });
    }

    const { taxpayer_id, assessment, tax_period_end, assessment_version } = req.body;
    const traceId = req.id;
    if (req.body.filing_id !== assessment.filing_id) {
      return reply.status(422).send({
        error: "VALIDATION_FAILED",
        message: "filing_id must match assessment.filing_id",
        trace_id: traceId,
      });
    }

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

      return reply.status(201).send({ trace_id: traceId, idempotent: false, claim });
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return reply.status(409).send({ error: "IDEMPOTENCY_CONFLICT", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  // GET /claims?taxpayer_id={id}&tax_period_end={date?} — list claims by taxpayer
  app.get<{ Querystring: { taxpayer_id?: string; tax_period_end?: string } }>(
    "/",
    async (req, reply) => {
      const { taxpayer_id, tax_period_end } = req.query;
      if (!taxpayer_id) {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "taxpayer_id is required", trace_id: req.id });
      }
      const claims = await repo.findByTaxpayerId(taxpayer_id, tax_period_end);
      return reply.send({ trace_id: req.id, taxpayer_id, claims });
    }
  );

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
