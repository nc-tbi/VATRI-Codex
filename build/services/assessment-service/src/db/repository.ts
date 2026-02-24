// assessment-service/src/db/repository.ts — PostgreSQL persistence for assessment bounded context
// Schema: assessment.assessments
import type { Sql } from "postgres";
import type { StagedAssessment } from "@tax-core/domain";

export class AssessmentRepository {
  constructor(private readonly sql: Sql) {}

  async saveAssessment(assessment: StagedAssessment): Promise<void> {
    await this.sql`
      INSERT INTO assessment.assessments (
        assessment_id, filing_id, rule_version_id, trace_id,
        stage1_gross_output_vat, stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat, stage4_net_vat,
        result_type, claim_amount, assessed_at
      ) VALUES (
        ${crypto.randomUUID()}, ${assessment.filing_id}, ${assessment.rule_version_id},
        ${assessment.trace_id},
        ${assessment.stage1_gross_output_vat},
        ${assessment.stage2_total_deductible_input_vat},
        ${assessment.stage3_pre_adjustment_net_vat},
        ${assessment.stage4_net_vat},
        ${assessment.result_type}, ${assessment.claim_amount}, ${assessment.assessed_at}
      )
      ON CONFLICT (filing_id) DO UPDATE SET
        stage1_gross_output_vat = EXCLUDED.stage1_gross_output_vat,
        stage2_total_deductible_input_vat = EXCLUDED.stage2_total_deductible_input_vat,
        stage3_pre_adjustment_net_vat = EXCLUDED.stage3_pre_adjustment_net_vat,
        stage4_net_vat = EXCLUDED.stage4_net_vat,
        result_type = EXCLUDED.result_type,
        claim_amount = EXCLUDED.claim_amount,
        assessed_at = EXCLUDED.assessed_at
    `;
  }

  async findAssessment(assessmentId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM assessment.assessments WHERE assessment_id = ${assessmentId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }
}
