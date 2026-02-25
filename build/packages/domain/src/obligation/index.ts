// obligation/index.ts — Public API for obligation bounded context
export {
  createObligation,
  submitObligation,
  markObligationOverdue,
  triggerPreliminaryAssessment,
  issuePreliminaryAssessment,
  supersedeByFiling,
  getObligation,
  getPreliminaryAssessment,
  getObligationsForTaxpayer,
  _clearObligationStore,
} from "./obligation-service.js";
