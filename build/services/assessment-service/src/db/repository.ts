// assessment-service/src/db/repository.ts — PostgreSQL persistence for assessment bounded context
// Schema: assessment.assessments
import type { Sql } from "postgres";
import type { StagedAssessment } from "@tax-core/domain";

export interface AssessmentPersistenceContext {
  taxpayer_id: string;
  tax_period_end: string;
}

export class AssessmentRepository {
  constructor(private readonly sql: Sql) {}

  async saveAssessment(
    assessment: StagedAssessment,
    context: AssessmentPersistenceContext,
  ): Promise<string> {
    const assessmentId = crypto.randomUUID();
    const rows = await this.sql`
      INSERT INTO assessment.assessments (
        assessment_id, filing_id, rule_version_id, trace_id,
        assessment_version, assessment_type, taxpayer_id, tax_period_end,
        stage1_gross_output_vat, stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat, stage4_net_vat,
        result_type, claim_amount, assessed_at
      ) VALUES (
        ${assessmentId}, ${assessment.filing_id}, ${assessment.rule_version_id},
        ${assessment.trace_id},
        ${assessment.assessment_version ?? 1},
        ${assessment.assessment_type ?? "regular"},
        ${context.taxpayer_id}, ${context.tax_period_end},
        ${assessment.stage1_gross_output_vat},
        ${assessment.stage2_total_deductible_input_vat},
        ${assessment.stage3_pre_adjustment_net_vat},
        ${assessment.stage4_net_vat},
        ${assessment.result_type}, ${assessment.claim_amount}, ${assessment.assessed_at}
      )
      ON CONFLICT (filing_id, assessment_version) DO NOTHING
      RETURNING assessment_id
    `;
    if (rows.length > 0) {
      return String(rows[0].assessment_id);
    }

    const existing = await this.sql`
      SELECT assessment_id
      FROM assessment.assessments
      WHERE filing_id = ${assessment.filing_id}
        AND assessment_version = ${assessment.assessment_version ?? 1}
      LIMIT 1
    `;
    return String(existing[0]?.assessment_id ?? assessmentId);
  }

  async findAssessment(assessmentId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM assessment.assessments WHERE assessment_id = ${assessmentId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findAssessmentByFilingId(filingId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM assessment.assessments
      WHERE filing_id = ${filingId}
      ORDER BY assessment_version DESC, assessed_at DESC
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findByTaxpayerId(taxpayer_id: string, tax_period_end?: string): Promise<Record<string, unknown>[]> {
    const rows = tax_period_end
      ? await this.sql`
          SELECT *
          FROM assessment.assessments
          WHERE taxpayer_id = ${taxpayer_id} AND tax_period_end = ${tax_period_end}
          ORDER BY assessed_at DESC, assessment_version DESC
        `
      : await this.sql`
          SELECT *
          FROM assessment.assessments
          WHERE taxpayer_id = ${taxpayer_id}
          ORDER BY assessed_at DESC, assessment_version DESC
        `;
    return rows as Record<string, unknown>[];
  }
}
