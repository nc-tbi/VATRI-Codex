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

function rubrikBGoodsTotal(filing: RuleFacts["filing"]): number {
  return (
    filing.rubrik_b_goods_eu_sale_value_reportable +
    filing.rubrik_b_goods_eu_sale_value_non_reportable
  );
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
    const rubrikBGoods = rubrikBGoodsTotal(facts.filing);
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

// ---------------------------------------------------------------------------
// DK-VAT-008: Non-EU goods import — acquisition VAT (S09)
// ML § 12 stk. 1: VAT on goods imported from non-EU countries is declared by the
// importer. The VAT base is the customs value including customs duty.
// ---------------------------------------------------------------------------
export const DK_VAT_008: RuleCatalogEntry = {
  rule_id: "DK-VAT-008",
  rule_name: "Non-EU Goods Import — Acquisition VAT",
  legal_ref: "ML § 12 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    // Non-EU goods imports are signalled by reverse-charge output VAT on goods
    // where there is no corresponding EU Rubrik A goods purchase value.
    const rcGoods = facts.filing.reverse_charge_output_vat_goods_abroad_amount;
    const rubrikA = facts.filing.rubrik_a_goods_eu_purchase_value;
    const applied = rcGoods > 0 && rubrikA === 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Non-EU goods import acquisition VAT of ${rcGoods} DKK declared (no Rubrik A offset).`
        : "No non-EU goods import acquisition VAT pattern detected.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-009: Non-EU services purchase — import VAT (S10)
// ML § 16 stk. 1: services purchased from non-EU suppliers where the Danish
// business is the taxable person are subject to reverse-charge VAT.
// ---------------------------------------------------------------------------
export const DK_VAT_009: RuleCatalogEntry = {
  rule_id: "DK-VAT-009",
  rule_name: "Non-EU Services Purchase — Import VAT",
  legal_ref: "ML § 16 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    // Non-EU service imports signalled by reverse-charge on services with no
    // corresponding EU Rubrik A services value.
    const rcServices = facts.filing.reverse_charge_output_vat_services_abroad_amount;
    const rubrikAServices = facts.filing.rubrik_a_services_eu_purchase_value;
    const applied = rcServices > 0 && rubrikAServices === 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Non-EU services import VAT of ${rcServices} DKK declared (no Rubrik A services offset).`
        : "No non-EU services import VAT pattern detected.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-010: Domestic reverse charge — scrap/construction (S11)
// ML § 46 stk. 1 nr. 1: certain domestic supplies (scrap metal, construction
// services, emission allowances) are subject to domestic reverse charge.
// ---------------------------------------------------------------------------
export const DK_VAT_010: RuleCatalogEntry = {
  rule_id: "DK-VAT-010",
  rule_name: "Domestic Reverse Charge — Scrap/Construction",
  legal_ref: "ML § 46 stk. 1 nr. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    // Domestic reverse charge is signalled by zero output VAT domestic but positive
    // input VAT, where no EU/non-EU cross-border amounts are declared.
    const domestic = facts.filing.output_vat_amount_domestic;
    const input = facts.filing.input_vat_deductible_amount_total;
    const rcGoods = facts.filing.reverse_charge_output_vat_goods_abroad_amount;
    const rcServices = facts.filing.reverse_charge_output_vat_services_abroad_amount;
    const applied = domestic === 0 && input > 0 && rcGoods === 0 && rcServices === 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Domestic reverse charge pattern detected: zero output VAT with ${input} DKK input VAT, no cross-border reverse charge.`
        : "No domestic reverse charge pattern detected.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-011: Partial deduction — mixed activity (S14)
// ML § 38 stk. 1: businesses with both taxable and exempt activities may only
// deduct a pro-rata proportion of input VAT.
// ---------------------------------------------------------------------------
export const DK_VAT_011: RuleCatalogEntry = {
  rule_id: "DK-VAT-011",
  rule_name: "Partial Deduction — Mixed Activity",
  legal_ref: "ML § 38 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    // Mixed activity is signalled by both domestic output VAT and exempt supplies.
    const domestic = facts.filing.output_vat_amount_domestic;
    const exempt = facts.filing.rubrik_c_other_vat_exempt_supplies_value;
    const input = facts.filing.input_vat_deductible_amount_total;
    const applied = domestic > 0 && exempt > 0 && input > 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Mixed activity detected: domestic output VAT ${domestic} DKK + exempt supplies ${exempt} DKK. Partial deduction rule applies.`
        : "No mixed activity (partial deduction) pattern detected.",
    );
  },
};

// ---------------------------------------------------------------------------
// DK-VAT-012: Export / zero-rated supply (S15)
// ML § 34 stk. 1: exports to non-EU countries are zero-rated. The supply is
// not exempt — input VAT deduction is preserved.
// ---------------------------------------------------------------------------
export const DK_VAT_012: RuleCatalogEntry = {
  rule_id: "DK-VAT-012",
  rule_name: "Export / Zero-Rated Supply",
  legal_ref: "ML § 34 stk. 1",
  effective_from: EFFECTIVE_FROM,
  effective_to: null,
  apply(facts: RuleFacts): RuleEvaluationResult {
    // Export (zero-rated, non-exempt) is signalled by zero domestic output VAT,
    // no EU Rubrik B sales, but deductible input VAT present.
    const domestic = facts.filing.output_vat_amount_domestic;
    const rubrikB = rubrikBGoodsTotal(facts.filing) + facts.filing.rubrik_b_services_eu_sale_value;
    const input = facts.filing.input_vat_deductible_amount_total;
    const exempt = facts.filing.rubrik_c_other_vat_exempt_supplies_value;
    const applied = domestic === 0 && rubrikB === 0 && input > 0 && exempt === 0;
    return makeResult(
      this,
      applied,
      applied
        ? `Export/zero-rated supply pattern: zero domestic output VAT, deductible input VAT ${input} DKK preserved.`
        : "No export/zero-rated supply pattern detected.",
    );
  },
};

/** All canonical DK VAT rules for Phase 1 + Phase 2 (S01-S19 scenario coverage). */
export const DK_VAT_RULES: readonly RuleCatalogEntry[] = [
  DK_VAT_001,
  DK_VAT_002,
  DK_VAT_003,
  DK_VAT_004,
  DK_VAT_005,
  DK_VAT_006,
  DK_VAT_007,
  // Phase 2 — S09-S15
  DK_VAT_008,
  DK_VAT_009,
  DK_VAT_010,
  DK_VAT_011,
  DK_VAT_012,
];
