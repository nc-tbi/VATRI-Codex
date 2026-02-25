// registration/registration-service.ts — VAT registration and cadence policy
// Epic E5 F5.1: cadence policy table + registration threshold enforcement
// ADR-001 bounded context: registration
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2

import { randomUUID } from "node:crypto";
import type {
  RegistrationRecord,
  RegistrationStatus,
  ObligationCadence,
} from "../shared/types.js";
import { RegistrationError } from "../shared/errors.js";

// ---------------------------------------------------------------------------
// DK VAT registration threshold and cadence policy (ML §§ 48, 57-58)
// ---------------------------------------------------------------------------

/** Danish VAT registration threshold (ML § 48 stk. 1): DKK 50,000/year. */
export const DK_VAT_THRESHOLD_DKK = 50_000;

/**
 * Derive the periodic filing cadence from estimated annual VAT-liable turnover.
 * Thresholds per ML §§ 57-58:
 *   < DKK  5,000,000  → half_yearly (halvårlig)
 *   < DKK 50,000,000  → quarterly  (kvartalsvis)
 *   ≥ DKK 50,000,000  → monthly    (månedlig)
 */
export function getCadencePolicy(
  annual_turnover_dkk: number,
): ObligationCadence {
  if (annual_turnover_dkk < 5_000_000) return "half_yearly";
  if (annual_turnover_dkk < 50_000_000) return "quarterly";
  return "monthly";
}

// ---------------------------------------------------------------------------
// In-memory registration store
// ---------------------------------------------------------------------------

/** In-memory registration store (state machine). */
const registrationStore: RegistrationRecord[] = [];

// ---------------------------------------------------------------------------
// Registration lifecycle
// ---------------------------------------------------------------------------

/**
 * Create a new registration record for a taxpayer.
 * Status is derived from annual turnover vs. the DK VAT threshold:
 *   ≥ DK_VAT_THRESHOLD_DKK → "pending_registration"
 *   < DK_VAT_THRESHOLD_DKK → "not_registered"
 */
export function createRegistration(
  taxpayer_id: string,
  cvr_number: string,
  annual_turnover_dkk: number,
  trace_id: string,
): RegistrationRecord {
  const status: RegistrationStatus =
    annual_turnover_dkk >= DK_VAT_THRESHOLD_DKK
      ? "pending_registration"
      : "not_registered";

  const cadence = getCadencePolicy(annual_turnover_dkk);

  const record: RegistrationRecord = {
    registration_id: randomUUID(),
    taxpayer_id,
    cvr_number,
    status,
    cadence,
    annual_turnover_dkk,
    created_at: new Date().toISOString(),
    trace_id,
  };

  registrationStore.push(record);
  return record;
}

/**
 * Check whether a new annual turnover value crosses the VAT threshold
 * for an existing registration (used to trigger registration promotion).
 */
export function checkThresholdBreach(
  registration_id: string,
  new_turnover_dkk: number,
): boolean {
  const record = _requireRegistration(registration_id);
  return (
    record.annual_turnover_dkk < DK_VAT_THRESHOLD_DKK &&
    new_turnover_dkk >= DK_VAT_THRESHOLD_DKK
  );
}

/**
 * Promote a registration from "pending_registration" to "registered".
 * Sets `registered_at` to now.
 */
export function promoteToRegistered(
  registration_id: string,
  trace_id: string,
): RegistrationRecord {
  const record = _requireRegistration(registration_id);
  if (record.status !== "pending_registration") {
    throw new RegistrationError(
      `Cannot promote registration ${registration_id}: status is '${record.status}', expected 'pending_registration'`,
    );
  }
  record.status = "registered";
  record.registered_at = new Date().toISOString();
  void trace_id;
  return record;
}

/**
 * Deregister an active registration.
 * Transition: "registered" → "deregistered"
 */
export function deregister(
  registration_id: string,
  trace_id: string,
): RegistrationRecord {
  const record = _requireRegistration(registration_id);
  if (record.status !== "registered") {
    throw new RegistrationError(
      `Cannot deregister ${registration_id}: status is '${record.status}', expected 'registered'`,
    );
  }
  record.status = "deregistered";
  record.deregistered_at = new Date().toISOString();
  void trace_id;
  return record;
}

/**
 * Transfer a registration to a new taxpayer (overdragelse).
 * Marks the source record as "transferred"; a new registration for the
 * receiving taxpayer should be created separately.
 */
export function transferRegistration(
  from_registration_id: string,
  _to_taxpayer_id: string,
  trace_id: string,
): RegistrationRecord {
  const record = _requireRegistration(from_registration_id);
  if (record.status !== "registered") {
    throw new RegistrationError(
      `Cannot transfer registration ${from_registration_id}: status is '${record.status}', expected 'registered'`,
    );
  }
  record.status = "transferred";
  void trace_id;
  return record;
}

// ---------------------------------------------------------------------------
// Read accessors
// ---------------------------------------------------------------------------

export function getRegistration(
  registration_id: string,
): RegistrationRecord | undefined {
  return registrationStore.find((r) => r.registration_id === registration_id);
}

export function getActiveRegistrationForTaxpayer(
  taxpayer_id: string,
): RegistrationRecord | undefined {
  return registrationStore.find(
    (r) =>
      r.taxpayer_id === taxpayer_id &&
      (r.status === "registered" || r.status === "pending_registration"),
  );
}

// ---------------------------------------------------------------------------
// Test isolation helpers
// ---------------------------------------------------------------------------

/** Clear store — for test isolation only. */
export function _clearRegistrationStore(): void {
  registrationStore.length = 0;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function _requireRegistration(registration_id: string): RegistrationRecord {
  const record = registrationStore.find(
    (r) => r.registration_id === registration_id,
  );
  if (!record) {
    throw new Error(`Registration not found: ${registration_id}`);
  }
  return record;
}
