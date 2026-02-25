// obligation-service/src/db/repository.ts — PostgreSQL persistence for obligation bounded context
// Schema: obligation.obligations + obligation.preliminary_assessments
import type { Sql } from "postgres";
import type { ObligationRecord, PreliminaryAssessmentRecord } from "@tax-core/domain";
import {
  createObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  _clearObligationStore,
} from "@tax-core/domain";

export class ObligationRepository {
  constructor(private readonly sql: Sql) {}

  async saveObligation(obligation: ObligationRecord): Promise<void> {
    await this.sql`
      INSERT INTO obligation.obligations (
        obligation_id, taxpayer_id, tax_period_start, tax_period_end,
        due_date, cadence, state, trace_id, created_at
      ) VALUES (
        ${obligation.obligation_id}, ${obligation.taxpayer_id},
        ${obligation.tax_period_start}, ${obligation.tax_period_end},
        ${obligation.due_date}, ${obligation.cadence}, ${obligation.state},
        ${obligation.trace_id}, ${obligation.created_at}
      )
      ON CONFLICT (obligation_id) DO NOTHING
    `;
  }

  async findObligation(obligationId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM obligation.obligations WHERE obligation_id = ${obligationId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async updateObligationState(
    obligationId: string,
    state: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    await this.sql`
      UPDATE obligation.obligations
      SET state = ${state},
          filing_id = COALESCE(${extra.filing_id as string | null ?? null}, filing_id),
          preliminary_assessment_id = COALESCE(
            ${extra.preliminary_assessment_id as string | null ?? null},
            preliminary_assessment_id
          )
      WHERE obligation_id = ${obligationId}
    `;
  }

  async savePreliminaryAssessment(rec: PreliminaryAssessmentRecord): Promise<void> {
    await this.sql`
      INSERT INTO obligation.preliminary_assessments (
        preliminary_assessment_id, obligation_id, taxpayer_id, tax_period_end,
        estimated_net_vat, state, triggered_at, trace_id
      ) VALUES (
        ${rec.preliminary_assessment_id}, ${rec.obligation_id}, ${rec.taxpayer_id},
        ${rec.tax_period_end}, ${rec.estimated_net_vat}, ${rec.state},
        ${rec.triggered_at}, ${rec.trace_id}
      )
      ON CONFLICT (preliminary_assessment_id) DO NOTHING
    `;
  }

  async updatePreliminaryState(
    preliminaryId: string,
    state: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    await this.sql`
      UPDATE obligation.preliminary_assessments
      SET state = ${state},
          issued_at = COALESCE(${extra.issued_at as string | null ?? null}, issued_at),
          superseding_filing_id = COALESCE(
            ${extra.superseding_filing_id as string | null ?? null},
            superseding_filing_id
          ),
          superseded_at = COALESCE(${extra.superseded_at as string | null ?? null}, superseded_at),
          final_net_vat = COALESCE(${extra.final_net_vat as number | null ?? null}, final_net_vat)
      WHERE preliminary_assessment_id = ${preliminaryId}
    `;
  }

  async findByTaxpayerId(taxpayer_id: string): Promise<Record<string, unknown>[]> {
    const rows = await this.sql`
      SELECT * FROM obligation.obligations
      WHERE taxpayer_id = ${taxpayer_id}
      ORDER BY due_date ASC
    `;
    return rows as Record<string, unknown>[];
  }

  /** Load obligation from DB into in-memory domain store for state-machine operations. */
  async loadIntoMemory(obligationId: string): Promise<void> {
    const row = await this.findObligation(obligationId);
    if (!row) throw new Error(`Obligation not found: ${obligationId}`);

    // Reconstruct domain in-memory state by replaying from persisted state
    _clearObligationStore();
    const obl = createObligation(
      String(row.taxpayer_id),
      String(row.tax_period_start),
      String(row.tax_period_end),
      row.cadence as import("@tax-core/domain").ObligationCadence,
      String(row.due_date),
      String(row.trace_id),
    );
    // Override the generated ID to match the stored one
    (obl as unknown as Record<string, unknown>).obligation_id = obligationId;

    // Replay state transitions
    if (row.state === "overdue") {
      markObligationOverdue(obl.obligation_id, String(row.trace_id));
    }
  }

  /** Load preliminary assessment from DB into in-memory domain store. */
  async loadPreliminaryIntoMemory(preliminaryId: string): Promise<void> {
    const rows = await this.sql`
      SELECT pa.*, o.taxpayer_id, o.tax_period_end, o.cadence, o.trace_id as obl_trace_id,
             o.tax_period_start, o.due_date, o.state as obl_state
      FROM obligation.preliminary_assessments pa
      JOIN obligation.obligations o ON pa.obligation_id = o.obligation_id
      WHERE pa.preliminary_assessment_id = ${preliminaryId}
    `;
    if (rows.length === 0) throw new Error(`Preliminary assessment not found: ${preliminaryId}`);

    const row = rows[0] as Record<string, unknown>;
    _clearObligationStore();

    // Reconstruct obligation
    const obl = createObligation(
      String(row.taxpayer_id),
      String(row.tax_period_start),
      String(row.tax_period_end),
      row.cadence as import("@tax-core/domain").ObligationCadence,
      String(row.due_date),
      String(row.obl_trace_id),
    );
    (obl as unknown as Record<string, unknown>).obligation_id = String(row.obligation_id);
    markObligationOverdue(obl.obligation_id, String(row.obl_trace_id));

    // Reconstruct preliminary
    const prelim = triggerPreliminaryAssessment(
      obl.obligation_id,
      Number(row.estimated_net_vat),
      String(row.trace_id),
    );
    (prelim as unknown as Record<string, unknown>).preliminary_assessment_id = preliminaryId;

    if (row.state === "issued" || row.state === "superseded_by_filing" || row.state === "final_calculated") {
      issuePreliminaryAssessment(prelim.preliminary_assessment_id, String(row.trace_id));
    }
  }
}
