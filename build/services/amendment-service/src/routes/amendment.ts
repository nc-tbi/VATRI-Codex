// amendment-service/src/routes/amendment.ts
// POST /amendments                 → createAmendment() (ADR-005)
// GET  /amendments/:filing_id      → DB lookup by original filing
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import {
  createAmendment,
  type StagedAssessment,
  AmendmentError,
} from "@tax-core/domain";
import { AmendmentRepository } from "../db/repository.js";
import { AmendmentEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface AmendmentBody {
  original_filing_id: string;
  taxpayer_id: string;
  original_assessment: StagedAssessment;
  new_assessment: StagedAssessment;
}

export async function amendmentRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new AmendmentRepository(opts.sql);
  const publisher = new AmendmentEventPublisher(opts.kafka);

  // POST /amendments
  app.post<{ Body: AmendmentBody }>("/", async (req, reply) => {
    const { original_filing_id, taxpayer_id, original_assessment, new_assessment } = req.body;
    const traceId = req.id;

    try {
      const amendment = createAmendment(
        original_filing_id,
        taxpayer_id,
        original_assessment,
        new_assessment,
        traceId
      );
      await repo.saveAmendment(amendment);
      await publisher.publishAmendmentCreated(amendment, traceId);

      return reply.status(201).send({ trace_id: traceId, amendment });
    } catch (err) {
      if (err instanceof AmendmentError) {
        return reply.status(422).send({ error: "AMENDMENT_ERROR", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  // GET /amendments/:filing_id
  app.get<{ Params: { filing_id: string } }>("/:filing_id", async (req, reply) => {
    const { filing_id } = req.params;
    const records = await repo.findByFilingId(filing_id);
    return reply.send({ trace_id: req.id, filing_id, amendments: records });
  });
}
