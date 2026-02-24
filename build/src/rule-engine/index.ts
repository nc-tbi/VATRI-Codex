// rule-engine/index.ts — Rule engine public API

import { RuleCatalog } from "./rule-catalog.js";
import { DK_VAT_RULES } from "./dk-vat-rules.js";
import type { RuleFacts, RuleEngineOutput } from "../shared/types.js";

export { RuleCatalog } from "./rule-catalog.js";
export { DK_VAT_RULES } from "./dk-vat-rules.js";
export type { RuleCatalogEntry, ResolvedRuleSet } from "./rule-catalog.js";

/** Pre-built catalog loaded with all DK VAT Phase 1 rules. */
export function createDkVatRuleCatalog(): RuleCatalog {
  const catalog = new RuleCatalog();
  for (const rule of DK_VAT_RULES) {
    catalog.register(rule);
  }
  return catalog;
}

/** Shared singleton catalog instance. */
export const dkVatRuleCatalog = createDkVatRuleCatalog();

/** Evaluate all active DK VAT rules against a filing at the given date. */
export function evaluateRules(facts: RuleFacts): RuleEngineOutput {
  const { rule_version_id, results } = dkVatRuleCatalog.evaluate(facts);
  return {
    rule_version_id,
    evaluated_at: facts.evaluated_at.toISOString(),
    results,
    trace_id: facts.filing.trace_id,
  };
}
