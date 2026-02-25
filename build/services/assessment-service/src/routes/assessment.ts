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
      const assessment_id = (await repo.saveAssessment(assessment, {
        taxpayer_id: filing.taxpayer_id,
        tax_period_end: filing.tax_period_end,
      })) ?? crypto.randomUUID();
      const assessmentResponse = { ...assessment, assessment_id };
      await publisher.publishAssessed(assessmentResponse, traceId);

      return reply.status(201).send({ trace_id: traceId, assessment: assessmentResponse });
    }
  );

  // GET /assessments?taxpayer_id={id}&tax_period_end={date?} — list assessments by taxpayer
  app.get<{ Querystring: { taxpayer_id?: string; tax_period_end?: string } }>(
    "/",
    async (req, reply) => {
      const { taxpayer_id, tax_period_end } = req.query;
      if (!taxpayer_id) {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "taxpayer_id is required", trace_id: req.id });
      }
      const rows = await repo.findByTaxpayerId(taxpayer_id, tax_period_end);
      const assessments = rows.map((r) => buildTransparencyEnvelope(r));
      return reply.send({ trace_id: req.id, taxpayer_id, assessments });
    }
  );

  // GET /assessments/:assessment_id
  app.get<{ Params: { assessment_id: string } }>("/:assessment_id", async (req, reply) => {
    const { assessment_id } = req.params;
    const record = await repo.findAssessment(assessment_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", trace_id: req.id });
    }
    return reply.send({ trace_id: req.id, ...buildTransparencyEnvelope(record) });
  });

  // GET /assessments/by-filing/:filing_id
  app.get<{ Params: { filing_id: string } }>("/by-filing/:filing_id", async (req, reply) => {
    const { filing_id } = req.params;
    const record = await repo.findAssessmentByFilingId(filing_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", trace_id: req.id });
    }
    return reply.send({ trace_id: req.id, ...buildTransparencyEnvelope(record) });
  });
}

function buildTransparencyEnvelope(record: Record<string, unknown>): {
  assessment: Record<string, unknown>;
  transparency: Record<string, unknown>;
} {
  const s1 = Number(record.stage1_gross_output_vat ?? 0);
  const s2 = Number(record.stage2_total_deductible_input_vat ?? 0);
  const s3 = Number(record.stage3_pre_adjustment_net_vat ?? 0);
  const s4 = Number(record.stage4_net_vat ?? 0);
  const resultType = String(record.result_type ?? "");
  const ruleVersionId = String(record.rule_version_id ?? "");
  return {
    assessment: record,
    transparency: {
      calculation_stages: [
        { stage: "stage1", label: "Gross Output VAT", value: s1 },
        { stage: "stage2", label: "Deductible Input VAT", value: s2 },
        { stage: "stage3", label: "Pre-Adjustment Net VAT", value: s3 },
        { stage: "stage4", label: "Final Net VAT", value: s4 },
      ],
      result_type: resultType,
      claim_amount: Number(record.claim_amount ?? 0),
      rule_version_id: ruleVersionId,
      applied_rule_ids: [], // enriched in Gate C when rule results are co-stored
      explanation: `Assessment computed using DK VAT rules version ${ruleVersionId}. Result: ${resultType}.`,
    },
  };
}
