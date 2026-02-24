import type { CanonicalFiling } from "../../shared/types.js";

export interface SprintFixture {
  scenario_id: "S01" | "S02" | "S03" | "S20";
  risk_tier: "tier_1";
  gate: "A";
  filing: CanonicalFiling;
  expected_result_type?: "payable" | "refund" | "zero";
}

function makeBaseFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "f-s1-001",
    taxpayer_id: "tp-s1-001",
    cvr_number: "12345678",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-03-31",
    filing_type: "regular",
    submission_timestamp: "2024-04-10T12:00:00Z",
    contact_reference: "contact-s1-001",
    source_channel: "api",
    rule_version_id: "v1",
    trace_id: "trace-s1-001",
    assessment_version: 1,
    output_vat_amount_domestic: 10000,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 3000,
    adjustments_amount: 0,
    rubrik_a_goods_eu_purchase_value: 0,
    rubrik_a_services_eu_purchase_value: 0,
    rubrik_b_goods_eu_sale_value: 0,
    rubrik_b_services_eu_sale_value: 0,
    rubrik_c_other_vat_exempt_supplies_value: 0,
    ...overrides,
  };
}

export const sprint1Fixtures: readonly SprintFixture[] = [
  {
    scenario_id: "S01",
    risk_tier: "tier_1",
    gate: "A",
    expected_result_type: "payable",
    filing: makeBaseFiling({
      filing_id: "f-s1-s01",
      taxpayer_id: "tp-s1-s01",
      trace_id: "trace-s1-s01",
      output_vat_amount_domestic: 12000,
      input_vat_deductible_amount_total: 2000,
    }),
  },
  {
    scenario_id: "S02",
    risk_tier: "tier_1",
    gate: "A",
    expected_result_type: "refund",
    filing: makeBaseFiling({
      filing_id: "f-s1-s02",
      taxpayer_id: "tp-s1-s02",
      trace_id: "trace-s1-s02",
      output_vat_amount_domestic: 2000,
      input_vat_deductible_amount_total: 7000,
    }),
  },
  {
    scenario_id: "S03",
    risk_tier: "tier_1",
    gate: "A",
    expected_result_type: "zero",
    filing: makeBaseFiling({
      filing_id: "f-s1-s03",
      taxpayer_id: "tp-s1-s03",
      trace_id: "trace-s1-s03",
      filing_type: "zero",
      output_vat_amount_domestic: 0,
      input_vat_deductible_amount_total: 0,
      reverse_charge_output_vat_goods_abroad_amount: 0,
      reverse_charge_output_vat_services_abroad_amount: 0,
      adjustments_amount: 0,
    }),
  },
  {
    scenario_id: "S20",
    risk_tier: "tier_1",
    gate: "A",
    filing: makeBaseFiling({
      filing_id: "f-s1-s20",
      taxpayer_id: "tp-s1-s20",
      trace_id: "trace-s1-s20",
      filing_type: "zero",
      output_vat_amount_domestic: 1500,
    }),
  },
];

export function getSprint1Fixture(id: SprintFixture["scenario_id"]): SprintFixture {
  const match = sprint1Fixtures.find((fixture) => fixture.scenario_id === id);
  if (!match) {
    throw new Error(`Sprint 1 fixture not found for scenario ${id}`);
  }
  return match;
}
