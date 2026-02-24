// filing-service/src/db/repository.ts — PostgreSQL persistence for filing bounded context
// Schema: filing.filings, filing.assessments_ref (lightweight ref), filing.claims_ref
import type { Sql } from "postgres";
import type { CanonicalFiling, StagedAssessment, ClaimIntent } from "@tax-core/domain";

export class FilingRepository {
  constructor(private readonly sql: Sql) {}

  async saveFiling(
    filing: CanonicalFiling,
    assessment: StagedAssessment,
    claim: ClaimIntent
  ): Promise<void> {
    await this.sql`
      INSERT INTO filing.filings (
        filing_id, cvr_number, taxpayer_id, filing_type, state,
        tax_period_start, tax_period_end, submission_timestamp,
        contact_reference, source_channel, rule_version_id,
        assessment_version, prior_filing_id, trace_id,
        output_vat_domestic, rc_output_vat_goods, rc_output_vat_services,
        input_vat_deductible, adjustments,
        rubrik_a_goods, rubrik_a_services, rubrik_b_goods, rubrik_b_services, rubrik_c,
        stage1, stage2, stage3, stage4,
        result_type, claim_amount, assessed_at,
        claim_id, claim_status, created_at
      ) VALUES (
        ${filing.filing_id}, ${filing.cvr_number}, ${filing.taxpayer_id},
        ${filing.filing_type}, 'claim_created',
        ${filing.tax_period_start}, ${filing.tax_period_end}, ${filing.submission_timestamp},
        ${filing.contact_reference}, ${filing.source_channel}, ${filing.rule_version_id},
        ${filing.assessment_version}, ${filing.prior_filing_id ?? null}, ${filing.trace_id},
        ${filing.output_vat_amount_domestic},
        ${filing.reverse_charge_output_vat_goods_abroad_amount},
        ${filing.reverse_charge_output_vat_services_abroad_amount},
        ${filing.input_vat_deductible_amount_total},
        ${filing.adjustments_amount},
        ${filing.rubrik_a_goods_eu_purchase_value},
        ${filing.rubrik_a_services_eu_purchase_value},
        ${filing.rubrik_b_goods_eu_sale_value},
        ${filing.rubrik_b_services_eu_sale_value},
        ${filing.rubrik_c_other_vat_exempt_supplies_value},
        ${assessment.stage1_gross_output_vat},
        ${assessment.stage2_total_deductible_input_vat},
        ${assessment.stage3_pre_adjustment_net_vat},
        ${assessment.stage4_net_vat},
        ${assessment.result_type}, ${assessment.claim_amount}, ${assessment.assessed_at},
        ${claim.claim_id}, ${claim.status}, NOW()
      )
      ON CONFLICT (filing_id) DO NOTHING
    `;
  }

  async findFiling(filingId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM filing.filings WHERE filing_id = ${filingId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }
}
