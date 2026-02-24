// amendment-service/src/db/repository.ts — PostgreSQL persistence for amendment bounded context
// Schema: amendment.amendments — ADR-005: versioned, no in-place mutation
import type { Sql } from "postgres";
import type { AmendmentRecord } from "@tax-core/domain";

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
}
