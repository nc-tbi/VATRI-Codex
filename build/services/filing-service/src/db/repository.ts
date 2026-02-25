// filing-service/src/db/repository.ts — PostgreSQL persistence for filing bounded context
// Schema: filing.filings, filing.assessments_ref (lightweight ref), filing.claims_ref
import type { Sql } from "postgres";
import type { CanonicalFiling, StagedAssessment, ClaimIntent } from "@tax-core/domain";

export interface FilingAlterEventRecord {
  event_id: string;
  filing_id: string;
  event_type: "alter" | "undo" | "redo";
  alter_id: string;
  field_deltas: Record<string, unknown> | null;
  actor_subject_id: string | null;
  actor_role: string;
  trace_id: string;
  before_snapshot_hash: string;
  after_snapshot_hash: string;
  created_at: string;
}

export class FilingRepository {
  constructor(private readonly sql: Sql) {}

  async saveFiling(
    filing: CanonicalFiling,
    assessment: StagedAssessment,
    claim: ClaimIntent
  ): Promise<boolean> {
    const rows = await this.sql`
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
      RETURNING filing_id
    `;
    return rows.length > 0;
  }

  async findFiling(filingId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM filing.filings WHERE filing_id = ${filingId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findByTaxpayerId(taxpayer_id: string, tax_period_end?: string): Promise<Record<string, unknown>[]> {
    const rows = tax_period_end
      ? await this.sql`
          SELECT * FROM filing.filings
          WHERE taxpayer_id = ${taxpayer_id} AND tax_period_end = ${tax_period_end}
          ORDER BY submission_timestamp DESC
        `
      : await this.sql`
          SELECT * FROM filing.filings
          WHERE taxpayer_id = ${taxpayer_id}
          ORDER BY submission_timestamp DESC
        `;
    return rows as Record<string, unknown>[];
  }

  async saveAlterEvent(event: FilingAlterEventRecord): Promise<void> {
    await this.sql`
      INSERT INTO filing.filing_admin_alter_events (
        event_id, filing_id, event_type, alter_id, field_deltas,
        actor_subject_id, actor_role, trace_id, before_snapshot_hash, after_snapshot_hash, created_at
      ) VALUES (
        ${event.event_id}::uuid,
        ${event.filing_id}::uuid,
        ${event.event_type},
        ${event.alter_id}::uuid,
        ${event.field_deltas ? JSON.stringify(event.field_deltas) : null}::jsonb,
        ${event.actor_subject_id},
        ${event.actor_role},
        ${event.trace_id},
        ${event.before_snapshot_hash},
        ${event.after_snapshot_hash},
        ${event.created_at}::timestamptz
      )
    `;
  }

  async findAlterEvents(filingId: string): Promise<FilingAlterEventRecord[]> {
    const rows = await this.sql`
      SELECT
        event_id,
        filing_id,
        event_type,
        alter_id,
        field_deltas,
        actor_subject_id,
        actor_role,
        trace_id,
        before_snapshot_hash,
        after_snapshot_hash,
        created_at
      FROM filing.filing_admin_alter_events
      WHERE filing_id = ${filingId}::uuid
      ORDER BY created_at ASC, event_id ASC
    `;
    return rows as unknown as FilingAlterEventRecord[];
  }
}
