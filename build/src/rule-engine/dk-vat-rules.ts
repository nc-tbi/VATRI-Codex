// rule-engine/dk-vat-rules.ts — Danish VAT rule definitions
// Sources: analysis/02-vat-form-fields-dk.md, analysis/05-reverse-charge-and-cross-border-dk.md,
//          analysis/06-exemptions-and-deduction-rules-dk.md
// All rules reference Momsloven (ML) §§.

import type { RuleFacts, RuleEvaluationResult } from "../shared/types.js";
import type { RuleCatalogEntry } from "./rule-catalog.js";

// Effective from 2024-01-01; open-ended validity (no effective_to) per design assumptions.
const EFFECTIVE_FROM = new Date("2024-01-01");

function makeResult(
  entry: Omit<RuleCatalogEntry, "effective_from" | "effective_to" | "apply">,
  applied: boolean,
  notes: string,
): RuleEvaluationResult {
  return {
    rule_id: entry.rule_id,
    rule_name: entry.rule_name,
    legal_ref: entry.legal_ref,
    applied,
    notes,
  };
}

// ---------------------------------------------------------------------------
// DK-VAT-001: Domestic taxable supply — output VAT at 25%
// ML § 4 stk. 1: taxable supplies in Denmark are subject to 25% VAT.
// ---------------------------------------------------------------------------
export const DK_VAT_001: RuleCatalogEntry = {
  rule_id: "DK-VAT-001",
  rule_name: "Domestic Taxable Supply — Output VAT at 25%",
  legal_ref: "ML § 4 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const applied = facts.filing.output_vat_amount_domestic > 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Domestic output VAT of ${facts.filing.output_vat_amount_domestic} DKK applies.`
        : "No domestic output VAT declared.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-002: EU B2B goods purchase — reverse charge (output VAT)
// ML § 46 stk. 1 nr. 3: buyer accounts for VAT on EU B2B goods acquisitions.
// ---------------------------------------------------------------------------
export const DK_VAT_002: RuleCatalogEntry = {
  rule_id: "DK-VAT-002",
  rule_name: "EU B2B Goods Purchase — Reverse Charge Output VAT",
  legal_ref: "ML § 46 stk. 1 nr. 3",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const rcGoods = facts.filing.reverse_charge_output_vat_goods_abroad_amount;
    const rubrikA = facts.filing.rubrik_a_goods_eu_purchase_value;
    const applied = rcGoods > 0;
    const warning =
      applied && rubrikA === 0
        ? " WARNING: reverse-charge output VAT declared without Rubrik A goods value."
        : "";
    return makeResult(
      this,
      applied,
      applied
        ? `Reverse-charge output VAT (goods) of ${rcGoods} DKK applies.${warning}`
        : "No reverse-charge output VAT on EU goods.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-003: EU B2B services purchase — reverse charge (output VAT)
// ML § 46 stk. 1 nr. 3 (services): buyer accounts for VAT on EU B2B services.
// ---------------------------------------------------------------------------
export const DK_VAT_003: RuleCatalogEntry = {
  rule_id: "DK-VAT-003",
  rule_name: "EU B2B Services Purchase — Reverse Charge Output VAT",
  legal_ref: "ML § 46 stk. 1 nr. 3",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const rcServices =
      facts.filing.reverse_charge_output_vat_services_abroad_amount;
    const rubrikAServices = facts.filing.rubrik_a_services_eu_purchase_value;
    const applied = rcServices > 0;
    const warning =
      applied && rubrikAServices === 0
        ? " WARNING: reverse-charge output VAT declared without Rubrik A services value."
        : "";
    return makeResult(
      this,
      applied,
      applied
        ? `Reverse-charge output VAT (services) of ${rcServices} DKK applies.${warning}`
        : "No reverse-charge output VAT on EU services.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-004: Input VAT deduction — fully taxable business
// ML § 37 stk. 1: fully taxable businesses may deduct full input VAT.
// ---------------------------------------------------------------------------
export const DK_VAT_004: RuleCatalogEntry = {
  rule_id: "DK-VAT-004",
  rule_name: "Input VAT Deduction — Fully Taxable Business",
  legal_ref: "ML § 37 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const inputVat = facts.filing.input_vat_deductible_amount_total;
    const applied = inputVat > 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Deductible input VAT of ${inputVat} DKK recognised.`
        : "No input VAT declared for deduction.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-005: EU B2B sale — no Danish VAT obligation
// ML § 34 stk. 1 nr. 1: supplies dispatched to VAT-registered EU buyers are zero-rated.
// Reported in Rubrik B; separate EU-sales reporting obligation applies.
// ---------------------------------------------------------------------------
export const DK_VAT_005: RuleCatalogEntry = {
  rule_id: "DK-VAT-005",
  rule_name: "EU B2B Sale — Zero-Rated Supply (No DK VAT)",
  legal_ref: "ML § 34 stk. 1 nr. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const rubrikBGoods = facts.filing.rubrik_b_goods_eu_sale_value;
    const rubrikBServices = facts.filing.rubrik_b_services_eu_sale_value;
    const totalRubrikB = rubrikBGoods + rubrikBServices;
    const applied = totalRubrikB > 0;
    const domesticOutput = facts.filing.output_vat_amount_domestic;
    const warning =
      applied && domesticOutput === 0 && rubrikBGoods + rubrikBServices > 0
        ? " NOTE: Rubrik B values declared with zero domestic output VAT — verify EU-sales reporting obligation."
        : "";
    return makeResult(
      this,
      applied,
      applied
        ? `EU B2B sales of ${totalRubrikB} DKK (excl. VAT) declared in Rubrik B. No DK VAT due.${warning}`
        : "No EU B2B sales declared in Rubrik B.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-006: VAT-exempt supplies — no output VAT, no deduction
// ML § 13: exempt supplies carry no output VAT and generally no input VAT deduction.
// ---------------------------------------------------------------------------
export const DK_VAT_006: RuleCatalogEntry = {
  rule_id: "DK-VAT-006",
  rule_name: "VAT-Exempt Supplies — No Output VAT, No Deduction",
  legal_ref: "ML § 13",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    const exemptValue = facts.filing.rubrik_c_other_vat_exempt_supplies_value;
    const applied = exemptValue > 0;
    return makeResult(
      this,
      applied,
      applied
        ? `VAT-exempt supplies of ${exemptValue} DKK declared in Rubrik C. No output VAT applies; deduction rights excluded for exempt portion.`
        : "No VAT-exempt supplies declared.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-007: Zero filing consistency
// A zero filing must not carry positive VAT amounts (cross-field rule).
// ---------------------------------------------------------------------------
export const DK_VAT_007: RuleCatalogEntry = {
  rule_id: "DK-VAT-007",
  rule_name: "Zero Filing — No Positive VAT Amounts",
  legal_ref: "design/01-vat-filing-assessment-solution-design.md §validation",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    if (facts.filing.filing_type !== "zero") {
      return makeResult(this, false, "Not a zero filing — rule not applicable.");
    }
    const hasPositive =
      facts.filing.output_vat_amount_domestic > 0 ||
      facts.filing.reverse_charge_output_vat_goods_abroad_amount > 0 ||
      facts.filing.reverse_charge_output_vat_services_abroad_amount > 0 ||
      facts.filing.input_vat_deductible_amount_total > 0;
    return makeResult(
      this,
      !hasPositive,
      hasPositive
        ? "VIOLATION: zero filing contains positive VAT amounts."
        : "Zero filing consistency confirmed — no positive amounts.",
    );
  },
};

/** All canonical DK VAT rules for Phase 1 (S01-S19 scenario coverage). */
export const DK_VAT_RULES: readonly RuleCatalogEntry[] = [
  DK_VAT_001,
  DK_VAT_002,
  DK_VAT_003,
  DK_VAT_004,
  DK_VAT_005,
  DK_VAT_006,
  DK_VAT_007,
];
