import { describe, expect, it } from "vitest";
import { formatDateOnly, formatPeriod } from "./date";

describe("date formatting", () => {
  it("renders ISO datetimes as yyyy-mm-dd", () => {
    expect(formatDateOnly("2026-03-31T13:45:00Z")).toBe("2026-03-31");
    expect(formatDateOnly("2026-03-31T23:59:59+02:00")).toBe("2026-03-31");
  });

  it("renders period with date-only values", () => {
    expect(formatPeriod("2026-01-01T00:00:00Z", "2026-03-31T00:00:00Z")).toBe("2026-01-01 - 2026-03-31");
  });
});
