import { describe, expect, it } from "vitest";
import { clearSession, getAccessToken, getStoredUser, persistSession } from "./service";

describe("auth session service", () => {
  it("persists and clears session data", () => {
    clearSession();
    persistSession({
      trace_id: "t1",
      session_id: "s1",
      access_token: "a1",
      refresh_token: "r1",
      expires_in: 900,
      user: { subject_id: "u1", role: "admin", taxpayer_scope: null },
    });

    expect(getAccessToken()).toBe("a1");
    expect(getStoredUser()?.role).toBe("admin");

    clearSession();
    expect(getAccessToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });
});

