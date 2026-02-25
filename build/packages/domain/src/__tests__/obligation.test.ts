// obligation.test.ts — Obligation lifecycle tests
// TB-S2-02: S16-S19, S22-S23 scenario coverage
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2 Epic E5 F5.2

import { describe, it, expect, beforeEach } from "vitest";
import {
  createObligation,
  submitObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  supersedeByFiling,
  getObligation,
  _clearObligationStore,
} from "../obligation/index.js";
import {
  createRegistration,
  promoteToRegistered,
  deregister,
  transferRegistration,
  _clearRegistrationStore,
} from "../registration/index.js";
import { ObligationStateError } from "../shared/errors.js";
import type { StagedAssessment } from "../shared/types.js";

beforeEach(() => {
  _clearObligationStore();
  _clearRegistrationStore();
});

function makeStagedAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-obl-001",
    trace_id: "trace-obl-001",
    rule_version_id: "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007|DK-VAT-008|DK-VAT-009|DK-VAT-010|DK-VAT-011|DK-VAT-012",
    assessed_at: new Date().toISOString(),
    stage1_gross_output_vat: 10000,
    stage2_total_deductible_input_vat: 4000,
    stage3_pre_adjustment_net_vat: 6000,
    stage4_net_vat: 6000,
    result_type: "payable",
    claim_amount: 6000,
    ...overrides,
  };
}

describe("createObligation", () => {
  it("creates obligation with state 'due' and correct fields", () => {
    const obl = createObligation(
      "tp-001", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-001",
    );
    expect(obl.state).toBe("due");
    expect(obl.taxpayer_id).toBe("tp-001");
    expect(obl.cadence).toBe("half_yearly");
    expect(obl.due_date).toBe("2024-08-01");
    expect(obl.obligation_id).toBeDefined();
  });

  it("getObligation retrieves the obligation by ID", () => {
    const obl = createObligation("tp-002", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-002");
    const found = getObligation(obl.obligation_id);
    expect(found?.obligation_id).toBe(obl.obligation_id);
  });
});

describe("submitObligation — S18 filing on time", () => {
  it("transitions obligation from due to submitted and links filing_id", () => {
    const obl = createObligation("tp-003", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-003");
    const updated = submitObligation(obl.obligation_id, "f-003", "trace-003");
    expect(updated.state).toBe("submitted");
    expect(updated.filing_id).toBe("f-003");
  });

  it("throws ObligationStateError when submitting an already submitted obligation", () => {
    const obl = createObligation("tp-004", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-004");
    submitObligation(obl.obligation_id, "f-004", "trace-004");
    expect(() => submitObligation(obl.obligation_id, "f-004b", "trace-004"))
      .toThrow(ObligationStateError);
  });

  it("throws ObligationStateError when submitting an overdue obligation", () => {
    const obl = createObligation("tp-005", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-005");
    markObligationOverdue(obl.obligation_id, "trace-005");
    expect(() => submitObligation(obl.obligation_id, "f-005", "trace-005"))
      .toThrow(ObligationStateError);
  });
});

describe("markObligationOverdue — S18 deadline missed", () => {
  it("transitions obligation from due to overdue", () => {
    const obl = createObligation("tp-006", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-006");
    const updated = markObligationOverdue(obl.obligation_id, "trace-006");
    expect(updated.state).toBe("overdue");
  });

  it("throws ObligationStateError when marking submitted obligation as overdue", () => {
    const obl = createObligation("tp-007", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-007");
    submitObligation(obl.obligation_id, "f-007", "trace-007");
    expect(() => markObligationOverdue(obl.obligation_id, "trace-007"))
      .toThrow(ObligationStateError);
  });
});

describe("S16 — Taxpayer not VAT registered (below threshold)", () => {
  it("creates registration with not_registered status when turnover < 50,000 DKK", () => {
    const reg = createRegistration("tp-s16", "11111111", 30_000, "trace-s16");
    expect(reg.status).toBe("not_registered");
    // No obligation should be generated for not_registered taxpayers
    // (obligation creation is an explicit business process — not auto-triggered)
  });
});

describe("S17 — Threshold breach triggers registration", () => {
  it("creates registration with pending_registration status when turnover >= 50,000 DKK", () => {
    const reg = createRegistration("tp-s17", "22222222", 60_000, "trace-s17");
    expect(reg.status).toBe("pending_registration");
  });

  it("promotes to registered after threshold breach", () => {
    const reg = createRegistration("tp-s17b", "33333333", 60_000, "trace-s17b");
    const promoted = promoteToRegistered(reg.registration_id, "trace-s17b");
    expect(promoted.status).toBe("registered");
    expect(promoted.registered_at).toBeDefined();
  });
});

describe("S19 — No filing by deadline: preliminary assessment lifecycle", () => {
  it("full preliminary chain: overdue → triggered → issued → superseded", () => {
    const obl = createObligation("tp-s19", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-s19");

    // Step 1: mark overdue
    markObligationOverdue(obl.obligation_id, "trace-s19");
    const refreshed = getObligation(obl.obligation_id);
    expect(refreshed?.state).toBe("overdue");

    // Step 2: trigger preliminary assessment
    const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 5000, "trace-s19");
    expect(preliminary.state).toBe("triggered");
    expect(preliminary.estimated_net_vat).toBe(5000);
    expect(preliminary.obligation_id).toBe(obl.obligation_id);

    // The obligation record links back to the preliminary assessment
    const oblAfterTrigger = getObligation(obl.obligation_id);
    expect(oblAfterTrigger?.preliminary_assessment_id).toBe(preliminary.preliminary_assessment_id);

    // Step 3: issue preliminary assessment (formal notification)
    const issued = issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-s19");
    expect(issued.state).toBe("issued");
    expect(issued.issued_at).toBeDefined();

    // Step 4: taxpayer files — supersede by filed return
    const finalAssessment = makeStagedAssessment({ filing_id: "f-s19" });
    const superseded = supersedeByFiling(
      preliminary.preliminary_assessment_id, "f-s19", finalAssessment, "trace-s19",
    );
    expect(superseded.state).toBe("final_calculated");
    expect(superseded.superseding_filing_id).toBe("f-s19");
    expect(superseded.superseded_at).toBeDefined();
    expect(superseded.final_assessment?.filing_id).toBe("f-s19");
  });

  it("throws ObligationStateError when triggering preliminary on a non-overdue obligation", () => {
    const obl = createObligation("tp-s19b", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-s19b");
    // obligation is 'due' — not yet overdue
    expect(() => triggerPreliminaryAssessment(obl.obligation_id, 5000, "trace-s19b"))
      .toThrow(ObligationStateError);
  });

  it("throws ObligationStateError when issuing a non-triggered preliminary", () => {
    const obl = createObligation("tp-s19c", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-s19c");
    markObligationOverdue(obl.obligation_id, "trace-s19c");
    const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 3000, "trace-s19c");
    // Already issued — cannot issue again
    issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-s19c");
    expect(() => issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-s19c"))
      .toThrow(ObligationStateError);
  });
});

describe("S22 — Final return on business closure (deregistration)", () => {
  it("registers, submits final obligation, then deregisters", () => {
    const reg = createRegistration("tp-s22", "55555555", 100_000, "trace-s22");
    promoteToRegistered(reg.registration_id, "trace-s22");

    const obl = createObligation("tp-s22", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-s22");
    submitObligation(obl.obligation_id, "f-s22-final", "trace-s22");

    const deregistered = deregister(reg.registration_id, "trace-s22");
    expect(deregistered.status).toBe("deregistered");
    expect(getObligation(obl.obligation_id)?.state).toBe("submitted");
  });
});

describe("S23 — Transfer / overdragelse", () => {
  it("marks source registration as transferred on business transfer", () => {
    const src = createRegistration("tp-s23-src", "66666666", 100_000, "trace-s23");
    promoteToRegistered(src.registration_id, "trace-s23");

    const transferred = transferRegistration(src.registration_id, "tp-s23-dst", "trace-s23");
    expect(transferred.status).toBe("transferred");

    // Obligation for source period can still be submitted (e.g. final return)
    const obl = createObligation("tp-s23-src", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-s23");
    const submitted = submitObligation(obl.obligation_id, "f-s23-final", "trace-s23");
    expect(submitted.state).toBe("submitted");
  });
});
