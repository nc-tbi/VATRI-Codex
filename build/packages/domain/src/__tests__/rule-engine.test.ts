// rule-engine.test.ts — Rule catalog and evaluation tests
// Tests: effective-date filtering (ADR-002), DK VAT rule evaluation, rule_version_id stamping
// Source: architecture/adr/ADR-002-effective-dated-rule-catalog.md

import { describe, it, expect } from "vitest";
import { RuleCatalog } from "../rule-engine/rule-catalog.js";
import {
  DK_VAT_RULES,
  dkVatRuleCatalog,
  evaluateRules,
} from "../rule-engine/index.js";
import type { CanonicalFiling, RuleFacts } from "../shared/types.js";

function makeBaseFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "f-001",
    taxpayer_id: "tp-001",
    cvr_number: "12345678",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-03-31",
    filing_type: "regular",
    submission_timestamp: "2024-04-10T12:00:00Z",
    contact_reference: "c-001",
    source_channel: "api",
    rule_version_id: "v1",
    trace_id: "trace-001",
    assessment_version: 1,
    output_vat_amount_domestic: 10000,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 3000,
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

// ---------------------------------------------------------------------------
// RuleCatalog — effective-date filtering (ADR-002)
// ---------------------------------------------------------------------------

describe("RuleCatalog — effective-date filtering (ADR-002)", () => {
  it("includes rules where effective_from <= evaluatedAt", () => {
    const catalog = new RuleCatalog();
    catalog.register({
      rule_id: "TEST-001",
      rule_name: "Test rule",
      legal_ref: "ML § test",
      effective_from: new Date("2024-01-01"),
      effective_to: null,
      apply: (facts) => ({
        rule_id: "TEST-001",
        rule_name: "Test rule",
        legal_ref: "ML § test",
        applied: true,
        notes: "applied",
      }),
    });

    const resolved = catalog.resolveActiveRules(new Date("2024-06-01"));
    expect(resolved.rules.map((r) => r.rule_id)).toContain("TEST-001");
  });

  it("excludes rules not yet effective at evaluated_at", () => {
    const catalog = new RuleCatalog();
    catalog.register({
      rule_id: "FUTURE-001",
      rule_name: "Future rule",
      legal_ref: "ML § future",
      effective_from: new Date("2025-01-01"),
      effective_to: null,
      apply: () => ({ rule_id: "FUTURE-001", rule_name: "Future rule", legal_ref: "ML § future", applied: false, notes: "" }),
    });

    const resolved = catalog.resolveActiveRules(new Date("2024-06-01"));
    expect(resolved.rules.map((r) => r.rule_id)).not.toContain("FUTURE-001");
  });

  it("excludes rules that have expired (effective_to in the past)", () => {
    const catalog = new RuleCatalog();
    catalog.register({
      rule_id: "EXPIRED-001",
      rule_name: "Expired rule",
      legal_ref: "ML § expired",
      effective_from: new Date("2020-01-01"),
      effective_to: new Date("2023-12-31"),
      apply: () => ({ rule_id: "EXPIRED-001", rule_name: "Expired rule", legal_ref: "ML § expired", applied: false, notes: "" }),
    });

    const resolved = catalog.resolveActiveRules(new Date("2024-06-01"));
    expect(resolved.rules.map((r) => r.rule_id)).not.toContain("EXPIRED-001");
  });

  it("includes rules where effective_to is exactly null (open-ended)", () => {
    const catalog = new RuleCatalog();
    catalog.register({
      rule_id: "OPEN-001",
      rule_name: "Open-ended rule",
      legal_ref: "ML § open",
      effective_from: new Date("2020-01-01"),
      effective_to: null,
      apply: () => ({ rule_id: "OPEN-001", rule_name: "Open-ended rule", legal_ref: "ML § open", applied: true, notes: "active" }),
    });

    const resolved = catalog.resolveActiveRules(new Date("2030-01-01"));
    expect(resolved.rules.map((r) => r.rule_id)).toContain("OPEN-001");
  });

  it("produces a deterministic rule_version_id based on sorted rule IDs", () => {
    const catalog = new RuleCatalog();
    const makeRule = (id: string) => ({
      rule_id: id,
      rule_name: id,
      legal_ref: "ML §",
      effective_from: new Date("2020-01-01"),
      effective_to: null as Date | null,
      apply: () => ({ rule_id: id, rule_name: id, legal_ref: "ML §", applied: true, notes: "" }),
    });

    catalog.register(makeRule("Z-RULE"));
    catalog.register(makeRule("A-RULE"));

    const resolved = catalog.resolveActiveRules(new Date("2024-01-01"));
    // Sorted alphabetically: A-RULE|Z-RULE
    expect(resolved.rule_version_id).toBe("A-RULE|Z-RULE");
  });
});

// ---------------------------------------------------------------------------
// DK VAT rules — evaluation results
// ---------------------------------------------------------------------------

describe("DK VAT rules — loaded rules", () => {
  it("all Phase 1 + Phase 2 DK VAT rules are registered (12 rules)", () => {
    expect(DK_VAT_RULES).toHaveLength(12);
  });

  it("DK-VAT-001 applies when domestic output VAT > 0", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({ output_vat_amount_domestic: 10000 }),
      evaluated_at: new Date("2024-06-01"),
    };
    const { results } = dkVatRuleCatalog.evaluate(facts);
    const dk001 = results.find((r) => r.rule_id === "DK-VAT-001");
    expect(dk001?.applied).toBe(true);
  });

  it("DK-VAT-001 does not apply when domestic output VAT = 0", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({ output_vat_amount_domestic: 0 }),
      evaluated_at: new Date("2024-06-01"),
    };
    const { results } = dkVatRuleCatalog.evaluate(facts);
    const dk001 = results.find((r) => r.rule_id === "DK-VAT-001");
    expect(dk001?.applied).toBe(false);
  });

  it("DK-VAT-002 applies when reverse-charge goods amount > 0", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({
        reverse_charge_output_vat_goods_abroad_amount: 5000,
        rubrik_a_goods_eu_purchase_value: 20000,
      }),
      evaluated_at: new Date("2024-06-01"),
    };
    const { results } = dkVatRuleCatalog.evaluate(facts);
    const dk002 = results.find((r) => r.rule_id === "DK-VAT-002");
    expect(dk002?.applied).toBe(true);
  });

  it("DK-VAT-002 notes include warning when Rubrik A is zero", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({
        reverse_charge_output_vat_goods_abroad_amount: 5000,
        rubrik_a_goods_eu_purchase_value: 0,
      }),
      evaluated_at: new Date("2024-06-01"),
    };
    const { results } = dkVatRuleCatalog.evaluate(facts);
    const dk002 = results.find((r) => r.rule_id === "DK-VAT-002");
    expect(dk002?.notes).toContain("WARNING");
  });

  it("DK-VAT-007 detects zero filing violation", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({
        filing_type: "zero",
        output_vat_amount_domestic: 100,
      }),
      evaluated_at: new Date("2024-06-01"),
    };
    const { results } = dkVatRuleCatalog.evaluate(facts);
    const dk007 = results.find((r) => r.rule_id === "DK-VAT-007");
    expect(dk007?.notes).toContain("VIOLATION");
  });
});

// ---------------------------------------------------------------------------
// evaluateRules — output shape
// ---------------------------------------------------------------------------

describe("evaluateRules — output shape", () => {
  it("returns a rule_version_id string", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling(),
      evaluated_at: new Date("2024-06-01"),
    };
    const output = evaluateRules(facts);
    expect(typeof output.rule_version_id).toBe("string");
    expect(output.rule_version_id.length).toBeGreaterThan(0);
  });

  it("stamps trace_id from the filing", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling({ trace_id: "trace-RULE-TEST" }),
      evaluated_at: new Date("2024-06-01"),
    };
    const output = evaluateRules(facts);
    expect(output.trace_id).toBe("trace-RULE-TEST");
  });

  it("returns one result per registered rule", () => {
    const facts: RuleFacts = {
      filing: makeBaseFiling(),
      evaluated_at: new Date("2024-06-01"),
    };
    const output = evaluateRules(facts);
    expect(output.results).toHaveLength(DK_VAT_RULES.length);
  });
});
