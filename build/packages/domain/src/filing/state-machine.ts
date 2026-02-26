// filing/state-machine.ts — Filing state machine
// States: received → validated → assessed → claim_created
// Source: design/01-vat-filing-assessment-solution-design.md §filing-service
//         architecture/designer/02-component-design-contracts.md §Filing Service

import type { FilingState, FilingContext, DomainEvent } from "../shared/types.js";
import { FilingStateError } from "../shared/errors.js";
import { evidenceWriter } from "../audit/evidence-writer.js";
import { randomUUID } from "node:crypto";

// ADR-001: valid transitions only; invalid transitions throw FilingStateError.
const VALID_TRANSITIONS: ReadonlyMap<FilingState, FilingState> = new Map([
  ["received", "validated"],
  ["validated", "assessed"],
  ["assessed", "claim_created"],
]);

/**
 * Advance a FilingContext to the next state.
 * Each transition is recorded as an immutable audit evidence entry (ADR-003).
 * Returns a new FilingContext (immutable — original is not mutated).
 */
export function transition(
  ctx: FilingContext,
  toState: FilingState,
  update: Partial<Omit<FilingContext, "filing" | "state" | "events">>,
): FilingContext {
  const expectedNext = VALID_TRANSITIONS.get(ctx.state);
  if (expectedNext !== toState) {
    throw new FilingStateError(ctx.state, `→ ${toState}`);
  }

  // ADR-003: write evidence record for every state transition.
  evidenceWriter.write({
    trace_id: ctx.filing.trace_id,
    event_type: stateToEventType(toState),
    bounded_context: "filing",
    actor: "filing-service",
    payload: {
      filing_id: ctx.filing.filing_id,
      from_state: ctx.state,
      to_state: toState,
      ...snapshotUpdate(ctx.filing, update),
    },
  });

  const event: DomainEvent = {
    event_id: randomUUID(),
    event_type: `filing.${toState}`,
    bounded_context: "filing",
    trace_id: ctx.filing.trace_id,
    occurred_at: new Date().toISOString(),
    payload: { filing_id: ctx.filing.filing_id, state: toState },
  };

  return {
    ...ctx,
    ...update,
    state: toState,
    events: [...ctx.events, event],
  };
}

function stateToEventType(
  state: FilingState,
): import("../shared/types.js").AuditEventType {
  switch (state) {
    case "validated":
      return "filing_validated";
    case "assessed":
      return "filing_assessed";
    case "claim_created":
      return "claim_created";
    default:
      return "filing_received";
  }
}

function snapshotUpdate(
  filing: FilingContext["filing"],
  update: Partial<Omit<FilingContext, "filing" | "state" | "events">>,
): Record<string, unknown> {
  const snap: Record<string, unknown> = {};
  if (update.validation_result) {
    snap["validation_issues_count"] = update.validation_result.issues.length;
    snap["validation_valid"] = update.validation_result.valid;
  }
  if (update.assessment) {
    snap["result_type"] = update.assessment.result_type;
    snap["stage4_net_vat"] = update.assessment.stage4_net_vat;
    snap["rule_version_id"] = update.assessment.rule_version_id;
    snap["source_reverse_charge_goods_vat"] = filing.reverse_charge_output_vat_goods_abroad_amount;
    snap["source_reverse_charge_services_vat"] = filing.reverse_charge_output_vat_services_abroad_amount;
    snap["source_input_vat_deductible_total"] = filing.input_vat_deductible_amount_total;
    snap["source_rubrik_a_goods_value"] = filing.rubrik_a_goods_eu_purchase_value;
    snap["source_rubrik_a_services_value"] = filing.rubrik_a_services_eu_purchase_value;
    snap["source_exempt_supplies_value"] = filing.rubrik_c_other_vat_exempt_supplies_value;
  }
  if (update.rule_engine_output) {
    snap["applied_rule_ids"] = update.rule_engine_output.results
      .filter((entry) => entry.applied)
      .map((entry) => entry.rule_id);
  }
  if (update.claim_intent) {
    snap["claim_id"] = update.claim_intent.claim_id;
    snap["claim_status"] = update.claim_intent.status;
  }
  return snap;
}

/** Create the initial FilingContext for a newly received filing. */
export function createInitialContext(
  filing: FilingContext["filing"],
): FilingContext {
  evidenceWriter.write({
    trace_id: filing.trace_id,
    event_type: "filing_received",
    bounded_context: "filing",
    actor: "filing-service",
    payload: {
      filing_id: filing.filing_id,
      cvr_number: filing.cvr_number,
      filing_type: filing.filing_type,
      state: "received",
    },
  });

  return {
    filing,
    state: "received",
    events: [
      {
        event_id: randomUUID(),
        event_type: "filing.received",
        bounded_context: "filing",
        trace_id: filing.trace_id,
        occurred_at: new Date().toISOString(),
        payload: { filing_id: filing.filing_id },
      },
    ],
  };
}
