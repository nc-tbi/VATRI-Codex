// registration-service/src/db/repository.ts — PostgreSQL persistence for registration bounded context
// Schema: registration.registrations
import type { Sql } from "postgres";
import type { RegistrationRecord } from "@tax-core/domain";
import {
  createRegistration,
  createObligation,
  promoteToRegistered,
  _clearRegistrationStore,
} from "@tax-core/domain";
import type { ObligationCadence, ObligationRecord } from "@tax-core/domain";

const PERIODS_PER_YEAR: Record<ObligationCadence, number> = {
  monthly: 12,
  quarterly: 4,
  half_yearly: 2,
  annual: 1,
};

function cadenceMonths(cadence: ObligationCadence): number {
  if (cadence === "monthly") return 1;
  if (cadence === "quarterly") return 3;
  if (cadence === "half_yearly") return 6;
  return 12;
}

function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addUtcMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

function alignPeriodStart(effectiveDate: string, cadence: ObligationCadence): string {
  const d = parseDateOnly(effectiveDate);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();

  if (cadence === "monthly") {
    return toDateOnly(new Date(Date.UTC(year, month, 1)));
  }
  if (cadence === "quarterly") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return toDateOnly(new Date(Date.UTC(year, quarterStartMonth, 1)));
  }
  if (cadence === "half_yearly") {
    const halfStartMonth = month < 6 ? 0 : 6;
    return toDateOnly(new Date(Date.UTC(year, halfStartMonth, 1)));
  }
  return toDateOnly(new Date(Date.UTC(year, 0, 1)));
}

export function buildRecurringPeriods(
  cadence: ObligationCadence,
  effectiveDate: string,
): Array<{ tax_period_start: string; tax_period_end: string; due_date: string }> {
  const start = parseDateOnly(alignPeriodStart(effectiveDate, cadence));
  const monthsPerPeriod = cadenceMonths(cadence);
  const periodCount = PERIODS_PER_YEAR[cadence] ?? 1;

  const periods: Array<{ tax_period_start: string; tax_period_end: string; due_date: string }> = [];
  for (let i = 0; i < periodCount; i += 1) {
    const periodStart = addUtcMonths(start, i * monthsPerPeriod);
    const nextPeriodStart = addUtcMonths(periodStart, monthsPerPeriod);
    const periodEnd = addUtcDays(nextPeriodStart, -1);
    const dueDate = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth() + 2, 1));
    periods.push({
      tax_period_start: toDateOnly(periodStart),
      tax_period_end: toDateOnly(periodEnd),
      due_date: toDateOnly(dueDate),
    });
  }
  return periods;
}

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
      SELECT * FROM registration.registrations WHERE registration_id = ${registrationId}::uuid
    `;
    return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null;
  }

  async findRegistrationsByTaxpayerId(taxpayerId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.sql`
      SELECT *
      FROM registration.registrations
      WHERE taxpayer_id = ${taxpayerId}
      ORDER BY created_at ASC, registration_id ASC
    `;
    return rows as Record<string, unknown>[];
  }

  async ensureRecurringObligationsForTaxpayer(args: {
    taxpayer_id: string;
    cadence: ObligationCadence;
    effective_date: string;
    trace_id: string;
  }): Promise<ObligationRecord[]> {
    const { taxpayer_id, cadence, effective_date, trace_id } = args;
    const periods = buildRecurringPeriods(cadence, effective_date);
    const created: ObligationRecord[] = [];

    for (const period of periods) {
      const existing = await this.sql`
        SELECT obligation_id
        FROM obligation.obligations
        WHERE taxpayer_id = ${taxpayer_id}
          AND tax_period_start = ${period.tax_period_start}::date
          AND tax_period_end = ${period.tax_period_end}::date
        LIMIT 1
      `;
      if (existing.length > 0) {
        continue;
      }

      const obligation = createObligation(
        taxpayer_id,
        period.tax_period_start,
        period.tax_period_end,
        cadence,
        period.due_date,
        trace_id,
      );
      await this.sql`
        INSERT INTO obligation.obligations (
          obligation_id, taxpayer_id, tax_period_start, tax_period_end,
          due_date, cadence, state, trace_id, created_at
        ) VALUES (
          ${obligation.obligation_id}::uuid,
          ${obligation.taxpayer_id},
          ${obligation.tax_period_start}::date,
          ${obligation.tax_period_end}::date,
          ${obligation.due_date}::date,
          ${obligation.cadence},
          ${obligation.state},
          ${obligation.trace_id},
          ${obligation.created_at}::timestamptz
        )
      `;
      created.push(obligation);
    }

    return created;
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
      WHERE registration_id = ${registrationId}::uuid
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
