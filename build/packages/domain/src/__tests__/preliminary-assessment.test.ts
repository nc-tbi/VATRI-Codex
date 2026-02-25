// preliminary-assessment.test.ts — Preliminary assessment supersession chain
// TB-S2-03: S19 risk anchor — full preliminary → final chain immutability and correctness
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2 Epic E5 F5.4

import { describe, it, expect, beforeEach } from "vitest";
import {
  createObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  supersedeByFiling,
  getObligation,
  getPreliminaryAssessment,
  _clearObligationStore,
} from "../obligation/index.js";
import { ObligationStateError } from "../shared/errors.js";
import type { StagedAssessment } from "../shared/types.js";

beforeEach(() => {
  _clearObligationStore();
});

function makeStagedAssessment(overrides: Partial<StagedAssessment> = {}): StagedAssessment {
  return {
    filing_id: "f-prelim-001",
    trace_id: "trace-prelim-001",
    rule_version_id: "DK-VAT-001|DK-VAT-002|DK-VAT-003|DK-VAT-004|DK-VAT-005|DK-VAT-006|DK-VAT-007|DK-VAT-008|DK-VAT-009|DK-VAT-010|DK-VAT-011|DK-VAT-012",
    assessed_at: "2024-09-15T10:00:00Z",
    stage1_gross_output_vat: 20000,
    stage2_total_deductible_input_vat: 8000,
    stage3_pre_adjustment_net_vat: 12000,
    stage4_net_vat: 12000,
    result_type: "payable",
    claim_amount: 12000,
    ...overrides,
  };
}

/** Helper: create an overdue obligation ready for preliminary assessment */
function setupOverdueObligation(suffix: string) {
  const obl = createObligation(
    `tp-prelim-${suffix}`,
    "2024-01-01",
    "2024-06-30",
    "half_yearly",
    "2024-08-01",
    `trace-prelim-${suffix}`,
  );
  markObligationOverdue(obl.obligation_id, `trace-prelim-${suffix}`);
  return obl;
}

describe("TB-S2-03: Preliminary → final supersession chain", () => {
  describe("Full event chain (S19 risk anchor)", () => {
    it("completes the full 4-step chain: triggered → issued → superseded → final_calculated", () => {
      const obl = setupOverdueObligation("full");

      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 7500, `trace-prelim-full`);
      expect(preliminary.state).toBe("triggered");

      const issued = issuePreliminaryAssessment(preliminary.preliminary_assessment_id, `trace-prelim-full`);
      expect(issued.state).toBe("issued");

      const final = makeStagedAssessment({ filing_id: "f-prelim-full", stage4_net_vat: 9000, claim_amount: 9000 });
      const superseded = supersedeByFiling(
        preliminary.preliminary_assessment_id, "f-prelim-full", final, `trace-prelim-full`,
      );

      expect(superseded.state).toBe("final_calculated");
      expect(superseded.superseding_filing_id).toBe("f-prelim-full");
      expect(superseded.final_assessment?.stage4_net_vat).toBe(9000);
    });

    it("preliminary_assessment_id is back-linked on the parent obligation record", () => {
      const obl = setupOverdueObligation("backlink");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 4000, "trace-backlink");
      const parentObl = getObligation(obl.obligation_id);
      expect(parentObl?.preliminary_assessment_id).toBe(preliminary.preliminary_assessment_id);
    });

    it("getPreliminaryAssessment retrieves the record by ID", () => {
      const obl = setupOverdueObligation("get");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 3000, "trace-get");
      const found = getPreliminaryAssessment(preliminary.preliminary_assessment_id);
      expect(found?.preliminary_assessment_id).toBe(preliminary.preliminary_assessment_id);
    });
  });

  describe("Immutability assertions", () => {
    it("triggered_at is unchanged after supersession", () => {
      const obl = setupOverdueObligation("immut");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 5000, "trace-immut");
      const triggeredAt = preliminary.triggered_at;

      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-immut");
      const final = makeStagedAssessment({ filing_id: "f-immut" });
      supersedeByFiling(preliminary.preliminary_assessment_id, "f-immut", final, "trace-immut");

      const after = getPreliminaryAssessment(preliminary.preliminary_assessment_id);
      expect(after?.triggered_at).toBe(triggeredAt);
    });

    it("estimated_net_vat is unchanged after supersession", () => {
      const obl = setupOverdueObligation("immut2");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 6000, "trace-immut2");
      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-immut2");
      const final = makeStagedAssessment({ filing_id: "f-immut2", stage4_net_vat: 9999 });
      supersedeByFiling(preliminary.preliminary_assessment_id, "f-immut2", final, "trace-immut2");

      const after = getPreliminaryAssessment(preliminary.preliminary_assessment_id);
      expect(after?.estimated_net_vat).toBe(6000); // original estimate preserved
      expect(after?.final_assessment?.stage4_net_vat).toBe(9999); // final is different
    });

    it("final_assessment cross-reference matches provided StagedAssessment exactly", () => {
      const obl = setupOverdueObligation("crossref");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 2000, "trace-crossref");
      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-crossref");
      const final = makeStagedAssessment({
        filing_id: "f-crossref",
        stage4_net_vat: 3500,
        result_type: "payable",
        claim_amount: 3500,
      });
      const superseded = supersedeByFiling(
        preliminary.preliminary_assessment_id, "f-crossref", final, "trace-crossref",
      );

      expect(superseded.final_assessment?.filing_id).toBe("f-crossref");
      expect(superseded.final_assessment?.stage4_net_vat).toBe(3500);
      expect(superseded.final_assessment?.result_type).toBe("payable");
    });
  });

  describe("State guards", () => {
    it("supersedeByFiling throws ObligationStateError on non-issued preliminary (triggered state)", () => {
      const obl = setupOverdueObligation("guard1");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 1000, "trace-guard1");
      // State is 'triggered' — not yet 'issued'
      const final = makeStagedAssessment({ filing_id: "f-guard1" });
      expect(() =>
        supersedeByFiling(preliminary.preliminary_assessment_id, "f-guard1", final, "trace-guard1"),
      ).toThrow(ObligationStateError);
    });

    it("supersedeByFiling throws ObligationStateError on already final_calculated preliminary", () => {
      const obl = setupOverdueObligation("guard2");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 1000, "trace-guard2");
      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-guard2");
      const final1 = makeStagedAssessment({ filing_id: "f-guard2a" });
      supersedeByFiling(preliminary.preliminary_assessment_id, "f-guard2a", final1, "trace-guard2");

      // Try to supersede again
      const final2 = makeStagedAssessment({ filing_id: "f-guard2b" });
      expect(() =>
        supersedeByFiling(preliminary.preliminary_assessment_id, "f-guard2b", final2, "trace-guard2"),
      ).toThrow(ObligationStateError);
    });

    it("issuePreliminaryAssessment throws ObligationStateError when called twice", () => {
      const obl = setupOverdueObligation("guard3");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 500, "trace-guard3");
      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-guard3");
      expect(() =>
        issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-guard3"),
      ).toThrow(ObligationStateError);
    });

    it("triggerPreliminaryAssessment throws ObligationStateError when obligation is 'due' not 'overdue'", () => {
      const obl = createObligation(
        "tp-guard4", "2024-01-01", "2024-06-30", "half_yearly", "2024-08-01", "trace-guard4",
      );
      // Obligation is 'due' — preliminary cannot be triggered yet
      expect(() => triggerPreliminaryAssessment(obl.obligation_id, 1000, "trace-guard4"))
        .toThrow(ObligationStateError);
    });
  });

  describe("issued_at and superseded_at timestamps", () => {
    it("issued_at is set when preliminary is issued", () => {
      const obl = setupOverdueObligation("ts1");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 2500, "trace-ts1");
      expect(preliminary.issued_at).toBeUndefined();
      const issued = issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-ts1");
      expect(issued.issued_at).toBeDefined();
    });

    it("superseded_at is set when filing supersedes the preliminary", () => {
      const obl = setupOverdueObligation("ts2");
      const preliminary = triggerPreliminaryAssessment(obl.obligation_id, 2500, "trace-ts2");
      issuePreliminaryAssessment(preliminary.preliminary_assessment_id, "trace-ts2");
      expect(preliminary.superseded_at).toBeUndefined();
      const final = makeStagedAssessment({ filing_id: "f-ts2" });
      const superseded = supersedeByFiling(
        preliminary.preliminary_assessment_id, "f-ts2", final, "trace-ts2",
      );
      expect(superseded.superseded_at).toBeDefined();
    });
  });
});
