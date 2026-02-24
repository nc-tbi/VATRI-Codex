// assessment/staged-derivation.ts — Staged net-VAT derivation (S1-S4)
// Source: analysis/02-vat-form-fields-dk.md §Deterministic Derived Fields (Staged)
// design/01-vat-filing-assessment-solution-design.md §assessment-service
//
// All four stages are computed and persisted independently.
// The calculation is deterministic and side-effect-free.
// Stage values must never be recomputed from stage4 alone — all intermediates
// must be stored for audit replay (ADR-003).

import type {
  CanonicalFiling,
  StagedAssessment,
  AssessmentResultType,
} from "../shared/types.js";

const EPSILON = 0.000001;

function classifyResult(stage4: number): AssessmentResultType {
  if (Math.abs(stage4) < EPSILON) return "zero";
  return stage4 > 0 ? "payable" : "refund";
}

/**
 * Compute the four-stage net-VAT derivation from a canonical filing.
 *
 * Stage 1: gross output VAT = domestic + reverse-charge goods + reverse-charge services
 * Stage 2: total deductible input VAT
 * Stage 3: pre-adjustment net VAT = stage1 - stage2
 * Stage 4: final net VAT = stage3 + adjustments
 *
 * result_type: "payable" | "refund" | "zero"
 * claim_amount: Math.abs(stage4)
 */
export function computeStagedAssessment(
  filing: CanonicalFiling,
  assessedAt?: Date,
): StagedAssessment {
  // Stage 1: gross output VAT
  // Source: analysis/02-vat-form-fields-dk.md — stage_1_gross_output_vat_amount
  const stage1_gross_output_vat =
    filing.output_vat_amount_domestic +
    filing.reverse_charge_output_vat_goods_abroad_amount +
    filing.reverse_charge_output_vat_services_abroad_amount;

  // Stage 2: total deductible input VAT
  // Source: analysis/02-vat-form-fields-dk.md — stage_2_total_deductible_input_vat_amount
  const stage2_total_deductible_input_vat =
    filing.input_vat_deductible_amount_total;

  // Stage 3: pre-adjustment net VAT
  // Source: analysis/02-vat-form-fields-dk.md — stage_3_pre_adjustment_net_vat_amount
  const stage3_pre_adjustment_net_vat =
    stage1_gross_output_vat - stage2_total_deductible_input_vat;

  // Stage 4: final net VAT (includes positive or negative adjustments)
  // Source: analysis/02-vat-form-fields-dk.md — stage_4_net_vat_amount
  const stage4_net_vat =
    stage3_pre_adjustment_net_vat + filing.adjustments_amount;

  const result_type = classifyResult(stage4_net_vat);
  const claim_amount = Math.abs(stage4_net_vat);

  return {
    filing_id: filing.filing_id,
    trace_id: filing.trace_id,
    rule_version_id: filing.rule_version_id,
    assessed_at: (assessedAt ?? new Date()).toISOString(),
    stage1_gross_output_vat,
    stage2_total_deductible_input_vat,
    stage3_pre_adjustment_net_vat,
    stage4_net_vat,
    result_type,
    claim_amount,
  };
}
