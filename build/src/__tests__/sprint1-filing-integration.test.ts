import { describe, expect, it } from "vitest";
import { processFiling } from "../filing/index.js";
import { evidenceWriter } from "../audit/evidence-writer.js";
import { ValidationFailedError } from "../shared/errors.js";
import { getSprint1Fixture } from "./fixtures/sprint1.fixtures.js";

describe("Sprint 1 integration and audit suite [gate:A]", () => {
  it("[scenario:S01][risk:tier_1] processes payable filing end-to-end", () => {
    const fixture = getSprint1Fixture("S01");
    const result = processFiling(fixture.filing, {
      taxpayer_id: fixture.filing.taxpayer_id,
    });

    expect(result.success).toBe(true);
    expect(result.context.state).toBe("claim_created");
    expect(result.context.assessment?.result_type).toBe(fixture.expected_result_type);
    expect(result.context.claim_intent?.claim_amount).toBe(10000);
  });

  it("[scenario:S02][risk:tier_1] processes refund filing end-to-end", () => {
    const fixture = getSprint1Fixture("S02");
    const result = processFiling(fixture.filing, {
      taxpayer_id: fixture.filing.taxpayer_id,
    });

    expect(result.success).toBe(true);
    expect(result.context.state).toBe("claim_created");
    expect(result.context.assessment?.result_type).toBe(fixture.expected_result_type);
    expect(result.context.claim_intent?.claim_amount).toBe(5000);
  });

  it("[scenario:S03][risk:tier_1] processes zero filing without validation errors", () => {
    const fixture = getSprint1Fixture("S03");
    const result = processFiling(fixture.filing, {
      taxpayer_id: fixture.filing.taxpayer_id,
    });

    expect(result.success).toBe(true);
    expect(result.context.state).toBe("claim_created");
    expect(result.context.assessment?.result_type).toBe(fixture.expected_result_type);
    expect(result.context.claim_intent?.claim_amount).toBe(0);
  });

  it("[scenario:S20][risk:tier_1] blocks contradictory filing before assessment", () => {
    const fixture = getSprint1Fixture("S20");

    expect(() =>
      processFiling(fixture.filing, {
        taxpayer_id: fixture.filing.taxpayer_id,
      }),
    ).toThrow(ValidationFailedError);
  });

  it("[scenario:S01][risk:tier_1] writes trace-correlated append-only evidence", () => {
    const fixture = getSprint1Fixture("S01");
    const before = evidenceWriter.snapshot();

    processFiling(fixture.filing, {
      taxpayer_id: fixture.filing.taxpayer_id,
    });

    const after = evidenceWriter.snapshot();
    const traceRecords = evidenceWriter.queryByTraceId(fixture.filing.trace_id);
    const traceEventTypes = new Set(traceRecords.map((record) => record.event_type));

    expect(after.length).toBeGreaterThan(before.length);
    expect(traceEventTypes.has("filing_received")).toBe(true);
    expect(traceEventTypes.has("filing_validated")).toBe(true);
    expect(traceEventTypes.has("filing_assessed")).toBe(true);
    expect(traceEventTypes.has("claim_created")).toBe(true);
  });
});
