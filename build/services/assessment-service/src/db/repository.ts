// assessment-service/src/db/repository.ts — PostgreSQL persistence for assessment bounded context
// Schema: assessment.assessments
import type { Sql } from "postgres";
import type { StagedAssessment } from "@tax-core/domain";

export class AssessmentRepository {
  constructor(private readonly sql: Sql) {}

  async saveAssessment(assessment: StagedAssessment): Promise<string> {
    const assessmentId = crypto.randomUUID();
    const rows = await this.sql`
      INSERT INTO assessment.assessments (
        assessment_id, filing_id, rule_version_id, trace_id,
        assessment_version, assessment_type,
        stage1_gross_output_vat, stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat, stage4_net_vat,
        result_type, claim_amount, assessed_at
      ) VALUES (
        ${assessmentId}, ${assessment.filing_id}, ${assessment.rule_version_id},
        ${assessment.trace_id},
        ${assessment.assessment_version ?? 1},
        ${assessment.assessment_type ?? "regular"},
        ${assessment.stage1_gross_output_vat},
        ${assessment.stage2_total_deductible_input_vat},
        ${assessment.stage3_pre_adjustment_net_vat},
        ${assessment.stage4_net_vat},
        ${assessment.result_type}, ${assessment.claim_amount}, ${assessment.assessed_at}
      )
      ON CONFLICT (filing_id) DO UPDATE SET
        assessment_version = EXCLUDED.assessment_version,
        assessment_type = EXCLUDED.assessment_type,
        stage1_gross_output_vat = EXCLUDED.stage1_gross_output_vat,
        stage2_total_deductible_input_vat = EXCLUDED.stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat = EXCLUDED.stage3_pre_adjustment_net_vat,
        stage4_net_vat = EXCLUDED.stage4_net_vat,
        result_type = EXCLUDED.result_type,
        claim_amount = EXCLUDED.claim_amount,
        assessed_at = EXCLUDED.assessed_at
      RETURNING assessment_id
    `;
    return String(rows[0]?.assessment_id ?? assessmentId);
  }

  async findAssessment(assessmentId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM assessment.assessments WHERE assessment_id = ${assessmentId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findAssessmentByFilingId(filingId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM assessment.assessments WHERE filing_id = ${filingId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findByTaxpayerId(taxpayer_id: string, tax_period_end?: string): Promise<Record<string, unknown>[]> {
    const rows = tax_period_end
      ? await this.sql`
          SELECT a.* FROM assessment.assessments a
          JOIN filing.filings f ON f.filing_id = a.filing_id
          WHERE f.taxpayer_id = ${taxpayer_id} AND f.tax_period_end = ${tax_period_end}
          ORDER BY a.assessed_at DESC
        `
      : await this.sql`
          SELECT a.* FROM assessment.assessments a
          JOIN filing.filings f ON f.filing_id = a.filing_id
          WHERE f.taxpayer_id = ${taxpayer_id}
          ORDER BY a.assessed_at DESC
        `;
    return rows as Record<string, unknown>[];
  }
}
