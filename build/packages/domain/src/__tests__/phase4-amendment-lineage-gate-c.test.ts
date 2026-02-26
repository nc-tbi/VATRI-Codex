import { beforeEach, describe, expect, it } from "vitest";
import { computeStagedAssessment } from "../assessment/index.js";
import { createAmendment, _clearAmendmentStore } from "../amendment/index.js";
import { ManualLegalRoutingRequiredError } from "../shared/errors.js";
import type { CanonicalFiling } from "../shared/types.js";

function filing(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "00000000-0000-4000-8000-000000000101",
    taxpayer_id: "tp-phase4-lineage",
    cvr_number: "12345678",
    tax_period_start: "2026-01-01",
    tax_period_end: "2026-03-31",
    filing_type: "regular",
    submission_timestamp: "2026-04-10T12:00:00Z",
    contact_reference: "phase4-lineage",
    source_channel: "api",
    rule_version_id: "DK-VAT-001",
    trace_id: "trace-phase4-lineage",
    assessment_version: 1,
    output_vat_amount_domestic: 10000,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 2000,
    adjustments_amount: 0,
    reimbursement_oil_and_bottled_gas_duty_amount: 0,
    reimbursement_electricity_duty_amount: 0,
    rubrik_a_goods_eu_purchase_value: 0,
    rubrik_a_services_eu_purchase_value: 0,
    rubrik_b_goods_eu_sale_value_reportable: 0,
    rubrik_b_goods_eu_sale_value_non_reportable: 0,
    rubrik_b_services_eu_sale_value: 0,
    rubrik_c_other_vat_exempt_supplies_value: 0,
    ...overrides,
  };
}

describe("Phase 4 amendment lineage suite [gate:C][backlog:TB-S4-01]", () => {
  beforeEach(() => {
    _clearAmendmentStore();
  });

  it("[scenario:S04][scenario:S05] enforces version chain and delta classification", () => {
    const original = computeStagedAssessment(filing({ filing_id: "00000000-0000-4000-8000-000000000111", assessment_version: 1 }));
    const amendedV2 = computeStagedAssessment(
      filing({
        filing_id: "00000000-0000-4000-8000-000000000112",
        assessment_version: 2,
        output_vat_amount_domestic: 14000,
      }),
    );
    const amendedV3 = computeStagedAssessment(
      filing({
        filing_id: "00000000-0000-4000-8000-000000000113",
        assessment_version: 3,
        output_vat_amount_domestic: 9000,
      }),
    );

    const first = createAmendment("tp-phase4-lineage", "2026-03-31", original, amendedV2, "trace-phase4-amd-1");
    const second = createAmendment("tp-phase4-lineage", "2026-03-31", amendedV2, amendedV3, "trace-phase4-amd-2");

    expect(first.prior_assessment_version).toBe(1);
    expect(first.new_assessment_version).toBe(2);
    expect(first.delta_classification).toBe("increase");
    expect(second.prior_assessment_version).toBe(2);
    expect(second.new_assessment_version).toBe(3);
    expect(second.delta_classification).toBe("decrease");
  });

  it("[scenario:S21] routes past-period (>3y) amendments to manual/legal handling", () => {
    const original = computeStagedAssessment(filing({
      filing_id: "00000000-0000-4000-8000-000000000121",
      assessment_version: 1,
    }));
    const amended = computeStagedAssessment(filing({
      filing_id: "00000000-0000-4000-8000-000000000122",
      assessment_version: 2,
      output_vat_amount_domestic: 11000,
    }));

    expect(() =>
      createAmendment("tp-phase4-lineage", "2020-01-31", original, amended, "trace-phase4-amd-old"),
    ).toThrow(ManualLegalRoutingRequiredError);
  });
});
