// rule-regression.test.ts — Rule effective-dating regression suite
// TB-S2-01: S06-S15 scenario coverage
// Verifies deterministic rule activation, effective-date boundary behaviour,
// and rule_version_id stability across Phase 2 rule packs.
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2 Epic E3/E4

import { describe, it, expect } from "vitest";
import {
  createDkVatRuleCatalog,
  evaluateRules,
  DK_VAT_RULES,
} from "../rule-engine/index.js";
import type { CanonicalFiling } from "../shared/types.js";

// Base filing fixture — all amounts zero
function makeFiling(overrides: Partial<CanonicalFiling> = {}): CanonicalFiling {
  return {
    filing_id: "f-reg-001",
    taxpayer_id: "tp-reg-001",
    cvr_number: "99887766",
    tax_period_start: "2024-01-01",
    tax_period_end: "2024-06-30",
    filing_type: "regular",
    submission_timestamp: "2024-07-10T09:00:00Z",
    contact_reference: "c-reg-001",
    source_channel: "api",
    rule_version_id: "",
    trace_id: "trace-reg-001",
    assessment_version: 1,
    output_vat_amount_domestic: 0,
    reverse_charge_output_vat_goods_abroad_amount: 0,
    reverse_charge_output_vat_services_abroad_amount: 0,
    input_vat_deductible_amount_total: 0,
    adjustments_amount: 0,
    rubrik_a_goods_eu_purchase_value: 0,
    rubrik_a_services_eu_purchase_value: 0,
    rubrik_b_goods_eu_sale_value: 0,
    rubrik_b_services_eu_sale_value: 0,
    rubrik_c_other_vat_exempt_supplies_value: 0,
    ...overrides,
  };
}

const EFFECTIVE_FROM = new Date("2024-01-01");
const BEFORE_EFFECTIVE = new Date("2023-12-31");
const AFTER_EFFECTIVE = new Date("2024-07-01");

describe("TB-S2-01: Rule effective-dating regression suite", () => {
  describe("Phase 2 rule packs active at EFFECTIVE_FROM", () => {
    it("all 12 DK VAT rules are active on 2024-01-01", () => {
      const catalog = createDkVatRuleCatalog();
      const { rules } = catalog.resolveActiveRules(EFFECTIVE_FROM);
      expect(rules.length).toBe(12);
      const ids = rules.map((r) => r.rule_id);
      expect(ids).toContain("DK-VAT-008");
      expect(ids).toContain("DK-VAT-009");
      expect(ids).toContain("DK-VAT-010");
      expect(ids).toContain("DK-VAT-011");
      expect(ids).toContain("DK-VAT-012");
    });

    it("no rules are active before EFFECTIVE_FROM (2023-12-31)", () => {
      const catalog = createDkVatRuleCatalog();
      const { rules } = catalog.resolveActiveRules(BEFORE_EFFECTIVE);
      expect(rules.length).toBe(0);
    });

    it("all 12 rules remain active after EFFECTIVE_FROM", () => {
      const catalog = createDkVatRuleCatalog();
      const { rules } = catalog.resolveActiveRules(AFTER_EFFECTIVE);
      expect(rules.length).toBe(12);
    });
  });

  describe("Rule version ID stability", () => {
    it("rule_version_id is deterministic — same date always returns same ID", () => {
      const catalog = createDkVatRuleCatalog();
      const at = new Date("2024-04-15");
      const r1 = catalog.resolveActiveRules(at);
      const r2 = catalog.resolveActiveRules(at);
      expect(r1.rule_version_id).toBe(r2.rule_version_id);
    });

    it("rule_version_id changes when a rule is retired (effective_to set)", () => {
      const catalog = createDkVatRuleCatalog();
      // Add a temporary rule with an explicit effective_to
      catalog.register({
        rule_id: "DK-VAT-TEST-RETIRE",
        rule_name: "Retiring Test Rule",
        legal_ref: "test",
        effective_from: new Date("2024-01-01"),
        effective_to: new Date("2024-06-30"),
        apply: () => ({ rule_id: "DK-VAT-TEST-RETIRE", rule_name: "Retiring Test Rule", legal_ref: "test", applied: false, notes: "" }),
      });
      const before = catalog.resolveActiveRules(new Date("2024-06-29"));
      const after = catalog.resolveActiveRules(new Date("2024-06-30"));
      expect(before.rule_version_id).not.toBe(after.rule_version_id);
    });

    it("rule_version_id is a sorted pipe-delimited list of active rule IDs", () => {
      const catalog = createDkVatRuleCatalog();
      const { rule_version_id, rules } = catalog.resolveActiveRules(EFFECTIVE_FROM);
      const expectedId = [...rules]
        .map((r) => r.rule_id)
        .sort((a, b) => a.localeCompare(b))
        .join("|");
      expect(rule_version_id).toBe(expectedId);
    });
  });

  describe("S06 — EU B2B goods purchase (reverse charge output VAT)", () => {
    it("DK-VAT-002 applied when reverse-charge goods amount > 0 with Rubrik A", () => {
      const filing = makeFiling({
        reverse_charge_output_vat_goods_abroad_amount: 25000,
        rubrik_a_goods_eu_purchase_value: 100000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-002");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S07 — EU B2B services purchase (reverse charge output VAT)", () => {
    it("DK-VAT-003 applied when reverse-charge services amount > 0 with Rubrik A", () => {
      const filing = makeFiling({
        reverse_charge_output_vat_services_abroad_amount: 10000,
        rubrik_a_services_eu_purchase_value: 40000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-003");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S08 — EU B2B sale, no DK VAT (zero-rated)", () => {
    it("DK-VAT-005 applied when Rubrik B > 0", () => {
      const filing = makeFiling({ rubrik_b_goods_eu_sale_value: 200000 });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-005");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S09 — Non-EU goods import (acquisition VAT)", () => {
    it("DK-VAT-008 applied when reverse-charge goods > 0 but Rubrik A is zero", () => {
      const filing = makeFiling({
        reverse_charge_output_vat_goods_abroad_amount: 15000,
        rubrik_a_goods_eu_purchase_value: 0,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-008");
      expect(result?.applied).toBe(true);
    });

    it("DK-VAT-008 not applied when Rubrik A goods also present (EU pattern)", () => {
      const filing = makeFiling({
        reverse_charge_output_vat_goods_abroad_amount: 15000,
        rubrik_a_goods_eu_purchase_value: 60000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-008");
      expect(result?.applied).toBe(false);
    });
  });

  describe("S10 — Non-EU services purchase (import VAT)", () => {
    it("DK-VAT-009 applied when reverse-charge services > 0 but Rubrik A services is zero", () => {
      const filing = makeFiling({
        reverse_charge_output_vat_services_abroad_amount: 8000,
        rubrik_a_services_eu_purchase_value: 0,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-009");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S11 — Domestic reverse charge (scrap/construction)", () => {
    it("DK-VAT-010 applied when domestic output = 0, input VAT > 0, no cross-border amounts", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 0,
        input_vat_deductible_amount_total: 5000,
        reverse_charge_output_vat_goods_abroad_amount: 0,
        reverse_charge_output_vat_services_abroad_amount: 0,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-010");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S12 — Fully taxable with full input VAT deduction", () => {
    it("DK-VAT-004 applied when input_vat_deductible_amount_total > 0", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 50000,
        input_vat_deductible_amount_total: 20000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-004");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S13 — Fully exempt ML §13", () => {
    it("DK-VAT-006 applied when Rubrik C > 0", () => {
      const filing = makeFiling({
        rubrik_c_other_vat_exempt_supplies_value: 75000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-006");
      expect(result?.applied).toBe(true);
    });
  });

  describe("S14 — Mixed activity (partial deduction)", () => {
    it("DK-VAT-011 applied when domestic output > 0, exempt > 0, and input > 0", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 30000,
        rubrik_c_other_vat_exempt_supplies_value: 20000,
        input_vat_deductible_amount_total: 10000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-011");
      expect(result?.applied).toBe(true);
    });

    it("DK-VAT-011 not applied when no exempt supplies (fully taxable)", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 30000,
        input_vat_deductible_amount_total: 10000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-011");
      expect(result?.applied).toBe(false);
    });
  });

  describe("S15 — Export / zero-rated supply", () => {
    it("DK-VAT-012 applied when zero domestic output, no Rubrik B, deductible input present, no exempt", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 0,
        input_vat_deductible_amount_total: 12000,
        rubrik_b_goods_eu_sale_value: 0,
        rubrik_b_services_eu_sale_value: 0,
        rubrik_c_other_vat_exempt_supplies_value: 0,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-012");
      expect(result?.applied).toBe(true);
    });

    it("DK-VAT-012 not applied when domestic output VAT is present", () => {
      const filing = makeFiling({
        output_vat_amount_domestic: 5000,
        input_vat_deductible_amount_total: 3000,
      });
      const output = evaluateRules({ filing, evaluated_at: EFFECTIVE_FROM });
      const result = output.results.find((r) => r.rule_id === "DK-VAT-012");
      expect(result?.applied).toBe(false);
    });
  });

  describe("DK_VAT_RULES array integrity", () => {
    it("DK_VAT_RULES contains exactly 12 rules", () => {
      expect(DK_VAT_RULES.length).toBe(12);
    });

    it("all rule IDs are unique", () => {
      const ids = DK_VAT_RULES.map((r) => r.rule_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("all rules have the same effective_from date (2024-01-01)", () => {
      const target = new Date("2024-01-01").getTime();
      for (const rule of DK_VAT_RULES) {
        expect(rule.effective_from.getTime()).toBe(target);
      }
    });

    it("all Phase 2 rules have null effective_to (open-ended)", () => {
      const phase2Ids = ["DK-VAT-008", "DK-VAT-009", "DK-VAT-010", "DK-VAT-011", "DK-VAT-012"];
      for (const id of phase2Ids) {
        const rule = DK_VAT_RULES.find((r) => r.rule_id === id);
        expect(rule?.effective_to).toBeNull();
      }
    });
  });
});
