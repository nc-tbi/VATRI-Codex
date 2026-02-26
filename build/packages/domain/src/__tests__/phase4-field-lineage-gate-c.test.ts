import { describe, expect, it } from "vitest";
import { processFiling } from "../filing/index.js";
import { evidenceWriter } from "../audit/evidence-writer.js";
import type { CanonicalFiling } from "../shared/types.js";

function filing(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "00000000-0000-4000-8000-000000000201",
    taxpayer_id: "tp-phase4-lineage-fields",
    cvr_number: "12345678",
    tax_period_start: "2026-01-01",
    tax_period_end: "2026-03-31",
    filing_type: "regular",
    submission_timestamp: "2026-04-10T12:00:00Z",
    contact_reference: "phase4-lineage-fields",
    source_channel: "api",
    rule_version_id: "DK-VAT-001",
    trace_id: "trace-phase4-field-lineage",
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

describe("Phase 4 field lineage suite [gate:C][backlog:TB-S4-02]", () => {
  it("[scenario:S06][scenario:S12] traces reverse-charge goods + deduction fields through validation->rule->assessment->audit", () => {
    const traceId = "trace-phase4-field-lineage-rc-goods";
    const input = filing({
      trace_id: traceId,
      filing_id: "00000000-0000-4000-8000-000000000211",
      output_vat_amount_domestic: 12000,
      reverse_charge_output_vat_goods_abroad_amount: 2500,
      rubrik_a_goods_eu_purchase_value: 10000,
      input_vat_deductible_amount_total: 3000,
      rubrik_c_other_vat_exempt_supplies_value: 5000,
    });

    const result = processFiling(input, { taxpayer_id: input.taxpayer_id });
    expect(result.context.validation_result?.valid).toBe(true);
    expect(result.context.rule_engine_output?.rule_version_id).toBe(result.context.assessment?.rule_version_id);
    expect(result.context.assessment?.stage1_gross_output_vat).toBe(14500);

    const applied = (result.context.rule_engine_output?.results ?? [])
      .filter((entry) => entry.applied)
      .map((entry) => entry.rule_id);
    expect(applied).toEqual(expect.arrayContaining(["DK-VAT-001", "DK-VAT-002", "DK-VAT-004", "DK-VAT-011"]));

    const assessedAudit = evidenceWriter
      .queryByTraceId(traceId)
      .find((entry) => entry.event_type === "filing_assessed");
    expect(assessedAudit).toBeDefined();
    expect(assessedAudit?.payload.source_reverse_charge_goods_vat).toBe(2500);
    expect(assessedAudit?.payload.source_input_vat_deductible_total).toBe(3000);
    expect(assessedAudit?.payload.source_rubrik_a_goods_value).toBe(10000);
    expect(Array.isArray(assessedAudit?.payload.applied_rule_ids)).toBe(true);
    expect(assessedAudit?.payload.applied_rule_ids as string[]).toEqual(
      expect.arrayContaining(["DK-VAT-002", "DK-VAT-004", "DK-VAT-011"]),
    );
  });

  it("[scenario:S07][scenario:S13] traces reverse-charge services + deduction fields through validation->rule->assessment->audit", () => {
    const traceId = "trace-phase4-field-lineage-rc-services";
    const input = filing({
      trace_id: traceId,
      filing_id: "00000000-0000-4000-8000-000000000212",
      output_vat_amount_domestic: 9000,
      reverse_charge_output_vat_services_abroad_amount: 1800,
      rubrik_a_services_eu_purchase_value: 8500,
      input_vat_deductible_amount_total: 2400,
    });

    const result = processFiling(input, { taxpayer_id: input.taxpayer_id });
    expect(result.context.validation_result?.valid).toBe(true);
    expect(result.context.assessment?.stage1_gross_output_vat).toBe(10800);

    const applied = (result.context.rule_engine_output?.results ?? [])
      .filter((entry) => entry.applied)
      .map((entry) => entry.rule_id);
    expect(applied).toEqual(expect.arrayContaining(["DK-VAT-001", "DK-VAT-003", "DK-VAT-004"]));

    const assessedAudit = evidenceWriter
      .queryByTraceId(traceId)
      .find((entry) => entry.event_type === "filing_assessed");
    expect(assessedAudit).toBeDefined();
    expect(assessedAudit?.payload.source_reverse_charge_services_vat).toBe(1800);
    expect(assessedAudit?.payload.source_rubrik_a_services_value).toBe(8500);
    expect(assessedAudit?.payload.source_input_vat_deductible_total).toBe(2400);
    expect(assessedAudit?.payload.applied_rule_ids as string[]).toEqual(
      expect.arrayContaining(["DK-VAT-003", "DK-VAT-004"]),
    );
  });
});
