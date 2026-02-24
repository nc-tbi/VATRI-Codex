// claim-orchestrator/src/db/repository.ts — PostgreSQL persistence for claim bounded context
// Schema: claim.claim_intents — ADR-004: outbox pattern with idempotency
import type { Sql } from "postgres";
import type { ClaimIntent } from "@tax-core/domain";

export class ClaimRepository {
  constructor(private readonly sql: Sql) {}

  async saveClaim(claim: ClaimIntent): Promise<void> {
    await this.sql`
      INSERT INTO claim.claim_intents (
        claim_id, idempotency_key, taxpayer_id, tax_period_end,
        assessment_version, filing_id, result_type,
        claim_amount, rule_version_id, calculation_trace_id,
        status, retry_count, created_at
      ) VALUES (
        ${claim.claim_id}, ${claim.idempotency_key}, ${claim.taxpayer_id},
        ${claim.tax_period_end}, ${claim.assessment_version}, ${claim.filing_id},
        ${claim.result_type}, ${claim.claim_amount}, ${claim.rule_version_id},
        ${claim.calculation_trace_id}, ${claim.status}, ${claim.retry_count},
        ${claim.created_at}
      )
      ON CONFLICT (idempotency_key) DO NOTHING
    `;
  }

  async findClaim(claimId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM claim.claim_intents WHERE claim_id = ${claimId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM claim.claim_intents WHERE idempotency_key = ${key}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async updateStatus(claimId: string, status: string, retryCount: number): Promise<void> {
    await this.sql`
      UPDATE claim.claim_intents
      SET status = ${status},
          retry_count = ${retryCount},
          last_attempted_at = NOW()
      WHERE claim_id = ${claimId}
    `;
  }
}
