// amendment-service/src/db/repository.ts — PostgreSQL persistence for amendment bounded context
// Schema: amendment.amendments — ADR-005: versioned, no in-place mutation
import type { Sql } from "postgres";
import type { AmendmentRecord } from "@tax-core/domain";

export interface AmendmentAlterEventRecord {
  event_id: string;
  amendment_id: string;
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

export class AmendmentRepository {
  constructor(private readonly sql: Sql) {}

  async saveAmendment(amendment: AmendmentRecord): Promise<void> {
    await this.sql`
      INSERT INTO amendment.amendments (
        amendment_id, original_filing_id,
        prior_assessment_version, new_assessment_version,
        taxpayer_id, tax_period_end,
        delta_net_vat, delta_classification,
        new_claim_required, trace_id, created_at
      ) VALUES (
        ${amendment.amendment_id}, ${amendment.original_filing_id},
        ${amendment.prior_assessment_version}, ${amendment.new_assessment_version},
        ${amendment.taxpayer_id}, ${amendment.tax_period_end},
        ${amendment.delta_net_vat}, ${amendment.delta_classification},
        ${amendment.new_claim_required}, ${amendment.trace_id}, ${amendment.created_at}
      )
    `;
  }

  async findByFilingId(originalFilingId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.sql`
      SELECT * FROM amendment.amendments
      WHERE original_filing_id = ${originalFilingId}
      ORDER BY new_assessment_version ASC
    `;
    return rows as Record<string, unknown>[];
  }

  async findByAmendmentId(amendmentId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM amendment.amendments
      WHERE amendment_id = ${amendmentId}::uuid
      LIMIT 1
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findByTaxpayerId(taxpayer_id: string, tax_period_end?: string): Promise<Record<string, unknown>[]> {
    const rows = tax_period_end
      ? await this.sql`
          SELECT * FROM amendment.amendments
          WHERE taxpayer_id = ${taxpayer_id} AND tax_period_end = ${tax_period_end}
          ORDER BY new_assessment_version ASC
        `
      : await this.sql`
          SELECT * FROM amendment.amendments
          WHERE taxpayer_id = ${taxpayer_id}
          ORDER BY new_assessment_version ASC
        `;
    return rows as Record<string, unknown>[];
  }

  async saveAlterEvent(event: AmendmentAlterEventRecord): Promise<void> {
    await this.sql`
      INSERT INTO amendment.amendment_admin_alter_events (
        event_id, amendment_id, event_type, alter_id, field_deltas,
        actor_subject_id, actor_role, trace_id, before_snapshot_hash, after_snapshot_hash, created_at
      ) VALUES (
        ${event.event_id}::uuid,
        ${event.amendment_id}::uuid,
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

  async findAlterEvents(amendmentId: string): Promise<AmendmentAlterEventRecord[]> {
    const rows = await this.sql`
      SELECT
        event_id,
        amendment_id,
        event_type,
        alter_id,
        field_deltas,
        actor_subject_id,
        actor_role,
        trace_id,
        before_snapshot_hash,
        after_snapshot_hash,
        created_at
      FROM amendment.amendment_admin_alter_events
      WHERE amendment_id = ${amendmentId}::uuid
      ORDER BY created_at ASC, event_id ASC
    `;
    return rows as unknown as AmendmentAlterEventRecord[];
  }
}
