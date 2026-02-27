import { describe, expect, it } from "vitest";
import { formatVatAmount, readAmount } from "./amount";

describe("amount formatting", () => {
  it("parses numeric strings consistently", () => {
    expect(readAmount("1234.56")).toBe(1234.56);
    expect(readAmount("1.234,56")).toBe(1234.56);
  });

  it("renders parsed numeric strings consistently", () => {
    expect(formatVatAmount("1234.56")).toBe("1.234,56");
    expect(formatVatAmount("1.234,56")).toBe("1.234,56");
  });
});
