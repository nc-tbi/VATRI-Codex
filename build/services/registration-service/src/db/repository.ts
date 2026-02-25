// registration-service/src/db/repository.ts — PostgreSQL persistence for registration bounded context
// Schema: registration.registrations
import type { Sql } from "postgres";
import type { RegistrationRecord } from "@tax-core/domain";
import {
  createRegistration,
  promoteToRegistered,
  _clearRegistrationStore,
} from "@tax-core/domain";

export class RegistrationRepository {
  constructor(private readonly sql: Sql) {}

  async saveRegistration(
    registration: RegistrationRecord,
    metadata?: {
      business_profile?: Record<string, unknown>;
      contact?: Record<string, unknown>;
      address?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.sql`
      INSERT INTO registration.registrations (
        registration_id, taxpayer_id, cvr_number, status, cadence,
        annual_turnover_dkk, trace_id, created_at,
        business_profile, contact, address
      ) VALUES (
        ${registration.registration_id}, ${registration.taxpayer_id},
        ${registration.cvr_number}, ${registration.status}, ${registration.cadence},
        ${registration.annual_turnover_dkk}, ${registration.trace_id}, ${registration.created_at},
        ${metadata?.business_profile ? JSON.stringify(metadata.business_profile) : null}::jsonb,
        ${metadata?.contact ? JSON.stringify(metadata.contact) : null}::jsonb,
        ${metadata?.address ? JSON.stringify(metadata.address) : null}::jsonb
      )
      ON CONFLICT (registration_id) DO NOTHING
    `;
  }

  async findRegistration(registrationId: string): Promise<Record<string, unknown> | null> {
    const rows = await this.sql`
      SELECT * FROM registration.registrations WHERE registration_id = ${registrationId}
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async updateRegistrationStatus(
    registrationId: string,
    status: string,
    extra: Record<string, unknown>,
  ): Promise<void> {
    await this.sql`
      UPDATE registration.registrations
      SET status = ${status},
          registered_at = COALESCE(${extra.registered_at as string | null ?? null}, registered_at),
          deregistered_at = COALESCE(${extra.deregistered_at as string | null ?? null}, deregistered_at)
      WHERE registration_id = ${registrationId}
    `;
  }

  /** Load registration from DB into in-memory domain store for state-machine operations. */
  async loadIntoMemory(registrationId: string): Promise<void> {
    const row = await this.findRegistration(registrationId);
    if (!row) throw new Error(`Registration not found: ${registrationId}`);

    _clearRegistrationStore();
    const reg = createRegistration(
      String(row.taxpayer_id),
      String(row.cvr_number),
      Number(row.annual_turnover_dkk),
      String(row.trace_id),
    );
    (reg as unknown as Record<string, unknown>).registration_id = registrationId;

    // Replay state transitions
    if (row.status === "registered") {
      promoteToRegistered(reg.registration_id, String(row.trace_id));
    }
  }
}
