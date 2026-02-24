// rule-engine/rule-catalog.ts — Effective-dated rule version store
// ADR-002: rules are versioned with effective_from / effective_to.
// Services resolve rule_version_id at filing time; historic recalculation
// must use the rule set active at the original filing date.

import type { RuleFacts, RuleEvaluationResult } from "../shared/types.js";

export interface RuleCatalogEntry {
  readonly rule_id: string;
  readonly rule_name: string;
  /** Legal reference, e.g. "ML § 4" (Momsloven). */
  readonly legal_ref: string;
  readonly effective_from: Date;
  /** null means open-ended validity (currently active). */
  readonly effective_to: Date | null;
  apply(facts: RuleFacts): RuleEvaluationResult;
}

export interface ResolvedRuleSet {
  /** Deterministic rule_version_id: sorted rule IDs joined with "|". */
  readonly rule_version_id: string;
  readonly resolved_at: Date;
  readonly rules: readonly RuleCatalogEntry[];
}

export class RuleCatalog {
  private readonly entries: RuleCatalogEntry[] = [];

  register(entry: RuleCatalogEntry): void {
    this.entries.push(entry);
  }

  /**
   * Resolve all rules active at the given date.
   * ADR-002: effective_from <= at < effective_to (or effective_to is null).
   */
  resolveActiveRules(at: Date): ResolvedRuleSet {
    const active = this.entries.filter((e) => {
      const started = e.effective_from <= at;
      const notEnded = e.effective_to === null || e.effective_to > at;
      return started && notEnded;
    });

    const sortedIds = [...active]
      .map((r) => r.rule_id)
      .sort((a, b) => a.localeCompare(b));
    const rule_version_id = sortedIds.join("|");

    return { rule_version_id, resolved_at: at, rules: active };
  }

  /** Evaluate all active rules at the given date against the provided facts. */
  evaluate(facts: RuleFacts): {
    rule_version_id: string;
    results: RuleEvaluationResult[];
  } {
    const { rule_version_id, rules } = this.resolveActiveRules(
      facts.evaluated_at,
    );
    const results = rules.map((r) => r.apply(facts));
    return { rule_version_id, results };
  }
}
