// assessment-service/src/routes/assessment.ts
// POST /assessments          → computeStagedAssessment()
// GET  /assessments/:id      → DB lookup
import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { computeStagedAssessment, type CanonicalFiling } from "@tax-core/domain";
import { AssessmentRepository } from "../db/repository.js";
import { AssessmentEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

export async function assessmentRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new AssessmentRepository(opts.sql);
  const publisher = new AssessmentEventPublisher(opts.kafka);

  // POST /assessments
  app.post<{ Body: { filing: CanonicalFiling; rule_version_id: string } }>(
    "/",
    async (req, reply) => {
      const { filing, rule_version_id } = req.body;
      const traceId = req.id;

      // Merge explicit rule_version_id into the filing before assessment
      const assessment = computeStagedAssessment({ ...filing, rule_version_id });
      await repo.saveAssessment(assessment);
      await publisher.publishAssessed(assessment, traceId);

      return reply.status(201).send({ trace_id: traceId, assessment });
    }
  );

  // GET /assessments/:assessment_id
  app.get<{ Params: { assessment_id: string } }>("/:assessment_id", async (req, reply) => {
    const { assessment_id } = req.params;
    const record = await repo.findAssessment(assessment_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", assessment_id, trace_id: req.id });
    }
    return reply.send({ trace_id: req.id, assessment: record });
  });
}
