// audit/evidence-writer.ts — Append-only audit evidence store
// ADR-003: audit evidence must be immutable and queryable by trace_id.
// No record may be mutated or deleted after writing.

import type { AuditRecord, AuditEventType } from "../shared/types.js";
import { randomUUID } from "node:crypto";

export interface WriteAuditRecordInput {
  trace_id: string;
  event_type: AuditEventType;
  bounded_context: string;
  actor: string;
  payload: Record<string, unknown>;
}

export class EvidenceWriter {
  // ADR-003: append-only — never mutate or delete existing records.
  private readonly store: AuditRecord[] = [];

  write(input: WriteAuditRecordInput): AuditRecord {
    const record: AuditRecord = {
      record_id: randomUUID(),
      trace_id: input.trace_id,
      event_type: input.event_type,
      bounded_context: input.bounded_context,
      actor: input.actor,
      timestamp: new Date().toISOString(),
      payload: Object.freeze({ ...input.payload }), // immutable snapshot
    };
    // ADR-003: push only — no splice, update, or delete allowed.
    this.store.push(record);
    return record;
  }

  /** Return all evidence records for a given trace_id. */
  queryByTraceId(trace_id: string): readonly AuditRecord[] {
    return this.store.filter((r) => r.trace_id === trace_id);
  }

  /** Return total record count (useful for tests and health checks). */
  get recordCount(): number {
    return this.store.length;
  }

  /** Return a frozen snapshot of all records (for testing and reporting). */
  snapshot(): readonly AuditRecord[] {
    return Object.freeze([...this.store]);
  }
}

/** Shared singleton instance for Phase 1. Each bounded context writes to the same store
 *  so trace_id queries span the full filing lifecycle. */
export const evidenceWriter = new EvidenceWriter();
