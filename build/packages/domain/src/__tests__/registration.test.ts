// registration.test.ts — VAT registration lifecycle and cadence policy tests
// Scenario coverage: S16-S17 (registration threshold and status)
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2 Epic E5 F5.1

import { describe, it, expect, beforeEach } from "vitest";
import {
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
} from "../registration/index.js";
import { RegistrationError } from "../shared/errors.js";

beforeEach(() => {
  _clearRegistrationStore();
});

describe("DK_VAT_THRESHOLD_DKK", () => {
  it("threshold is 50,000 DKK (ML § 48 stk. 1)", () => {
    expect(DK_VAT_THRESHOLD_DKK).toBe(50_000);
  });
});

describe("getCadencePolicy — ML §§ 57-58", () => {
  it("returns half_yearly for turnover < 5,000,000", () => {
    expect(getCadencePolicy(0)).toBe("half_yearly");
    expect(getCadencePolicy(50_000)).toBe("half_yearly");
    expect(getCadencePolicy(4_999_999)).toBe("half_yearly");
  });

  it("returns quarterly for turnover 5,000,000 - 49,999,999", () => {
    expect(getCadencePolicy(5_000_000)).toBe("quarterly");
    expect(getCadencePolicy(10_000_000)).toBe("quarterly");
    expect(getCadencePolicy(49_999_999)).toBe("quarterly");
  });

  it("returns monthly for turnover >= 50,000,000", () => {
    expect(getCadencePolicy(50_000_000)).toBe("monthly");
    expect(getCadencePolicy(100_000_000)).toBe("monthly");
  });
});

describe("S16 — createRegistration below threshold → not_registered", () => {
  it("status is not_registered when annual turnover < threshold", () => {
    const reg = createRegistration("tp-s16", "11111111", 30_000, "trace-s16");
    expect(reg.status).toBe("not_registered");
  });

  it("assigns correct cadence based on turnover (half_yearly for low turnover)", () => {
    const reg = createRegistration("tp-s16b", "11111112", 30_000, "trace-s16b");
    expect(reg.cadence).toBe("half_yearly");
  });

  it("stores taxpayer_id and cvr_number correctly", () => {
    const reg = createRegistration("tp-s16c", "22334455", 30_000, "trace-s16c");
    expect(reg.taxpayer_id).toBe("tp-s16c");
    expect(reg.cvr_number).toBe("22334455");
  });
});

describe("S17 — createRegistration at/above threshold → pending_registration", () => {
  it("status is pending_registration when annual turnover >= threshold", () => {
    const reg = createRegistration("tp-s17", "33333333", 50_000, "trace-s17");
    expect(reg.status).toBe("pending_registration");
  });

  it("status is pending_registration for large turnover", () => {
    const reg = createRegistration("tp-s17b", "44444444", 2_000_000, "trace-s17b");
    expect(reg.status).toBe("pending_registration");
  });
});

describe("checkThresholdBreach", () => {
  it("returns true when new turnover crosses threshold from below", () => {
    const reg = createRegistration("tp-breach", "55555555", 30_000, "trace-b1");
    expect(checkThresholdBreach(reg.registration_id, 60_000)).toBe(true);
  });

  it("returns false when current turnover already at/above threshold", () => {
    const reg = createRegistration("tp-breach2", "55555556", 50_000, "trace-b2");
    expect(checkThresholdBreach(reg.registration_id, 70_000)).toBe(false);
  });

  it("returns false when new turnover is still below threshold", () => {
    const reg = createRegistration("tp-breach3", "55555557", 20_000, "trace-b3");
    expect(checkThresholdBreach(reg.registration_id, 40_000)).toBe(false);
  });
});

describe("promoteToRegistered", () => {
  it("promotes pending_registration to registered and sets registered_at", () => {
    const reg = createRegistration("tp-promote", "66666666", 100_000, "trace-p1");
    expect(reg.status).toBe("pending_registration");
    const promoted = promoteToRegistered(reg.registration_id, "trace-p1");
    expect(promoted.status).toBe("registered");
    expect(promoted.registered_at).toBeDefined();
  });

  it("throws RegistrationError when promoting a not_registered record", () => {
    const reg = createRegistration("tp-promote2", "66666667", 10_000, "trace-p2");
    expect(() => promoteToRegistered(reg.registration_id, "trace-p2"))
      .toThrow(RegistrationError);
  });

  it("throws RegistrationError when re-promoting an already registered record", () => {
    const reg = createRegistration("tp-promote3", "66666668", 100_000, "trace-p3");
    promoteToRegistered(reg.registration_id, "trace-p3");
    expect(() => promoteToRegistered(reg.registration_id, "trace-p3"))
      .toThrow(RegistrationError);
  });
});

describe("deregister — S22 pattern", () => {
  it("deregisters a registered record and sets deregistered_at", () => {
    const reg = createRegistration("tp-deregister", "77777777", 100_000, "trace-d1");
    promoteToRegistered(reg.registration_id, "trace-d1");
    const deregistered = deregister(reg.registration_id, "trace-d1");
    expect(deregistered.status).toBe("deregistered");
    expect(deregistered.deregistered_at).toBeDefined();
  });

  it("throws RegistrationError when deregistering a not_registered record", () => {
    const reg = createRegistration("tp-deregister2", "77777778", 10_000, "trace-d2");
    expect(() => deregister(reg.registration_id, "trace-d2"))
      .toThrow(RegistrationError);
  });
});

describe("transferRegistration — S23 pattern", () => {
  it("marks source registration as transferred", () => {
    const reg = createRegistration("tp-transfer-src", "88888888", 100_000, "trace-t1");
    promoteToRegistered(reg.registration_id, "trace-t1");
    const transferred = transferRegistration(reg.registration_id, "tp-transfer-dst", "trace-t1");
    expect(transferred.status).toBe("transferred");
  });

  it("throws RegistrationError when transferring a non-registered record", () => {
    const reg = createRegistration("tp-transfer2", "88888889", 100_000, "trace-t2");
    // pending_registration — not yet promoted
    expect(() => transferRegistration(reg.registration_id, "tp-other", "trace-t2"))
      .toThrow(RegistrationError);
  });
});

describe("getRegistration and getActiveRegistrationForTaxpayer", () => {
  it("getRegistration returns the record by ID", () => {
    const reg = createRegistration("tp-get", "99999999", 100_000, "trace-g1");
    const found = getRegistration(reg.registration_id);
    expect(found?.registration_id).toBe(reg.registration_id);
  });

  it("getRegistration returns undefined for unknown ID", () => {
    expect(getRegistration("nonexistent")).toBeUndefined();
  });

  it("getActiveRegistrationForTaxpayer returns pending_registration record", () => {
    const reg = createRegistration("tp-active", "00000001", 100_000, "trace-a1");
    const found = getActiveRegistrationForTaxpayer("tp-active");
    expect(found?.registration_id).toBe(reg.registration_id);
  });

  it("getActiveRegistrationForTaxpayer returns undefined after deregistration", () => {
    const reg = createRegistration("tp-active2", "00000002", 100_000, "trace-a2");
    promoteToRegistered(reg.registration_id, "trace-a2");
    deregister(reg.registration_id, "trace-a2");
    expect(getActiveRegistrationForTaxpayer("tp-active2")).toBeUndefined();
  });
});
