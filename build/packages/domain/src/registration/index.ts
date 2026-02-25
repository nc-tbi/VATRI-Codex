// registration/index.ts — Public API for registration bounded context
export {
  DK_VAT_THRESHOLD_DKK,
  getCadencePolicy,
  createRegistration,
  checkThresholdBreach,
  promoteToRegistered,
  deregister,
  transferRegistration,
  getRegistration,
  getActiveRegistrationForTaxpayer,
  _clearRegistrationStore,
} from "./registration-service.js";
