import { describe, expect, it } from "vitest";
import { buildRecurringPeriods } from "../../../../services/registration-service/src/db/repository.js";

describe("Phase 4 registration obligation seeding schedule [gate:C][backlog:TB-S4B-OBL-01]", () => {
  it("[case:TC-PORTAL-OBL-01] creates 2 half-yearly periods from effective date horizon", () => {
    const periods = buildRecurringPeriods("half_yearly", "2026-02-14");
    expect(periods).toHaveLength(2);
    expect(periods[0]).toEqual({
      tax_period_start: "2026-01-01",
      tax_period_end: "2026-06-30",
      due_date: "2026-08-01",
    });
    expect(periods[1]).toEqual({
      tax_period_start: "2026-07-01",
      tax_period_end: "2026-12-31",
      due_date: "2027-02-01",
    });
  });

  it("[case:TC-PORTAL-OBL-02] creates 4 quarterly periods from effective date horizon", () => {
    const periods = buildRecurringPeriods("quarterly", "2026-05-03");
    expect(periods).toHaveLength(4);
    expect(periods[0].tax_period_start).toBe("2026-04-01");
    expect(periods[0].tax_period_end).toBe("2026-06-30");
    expect(periods[3].tax_period_start).toBe("2027-01-01");
    expect(periods[3].tax_period_end).toBe("2027-03-31");
  });
});
