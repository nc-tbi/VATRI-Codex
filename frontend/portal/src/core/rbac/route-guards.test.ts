import { describe, expect, it } from "vitest";
import { canAccess, requiresAuth } from "./route-guards";

describe("route guards", () => {
  it("requires auth for protected routes", () => {
    expect(requiresAuth("/overview")).toBe(true);
    expect(requiresAuth("/login")).toBe(false);
  });

  it("blocks taxpayer from admin routes", () => {
    expect(canAccess("/admin/cadence", "taxpayer")).toBe(false);
    expect(canAccess("/admin/cadence", "admin")).toBe(true);
  });
});

