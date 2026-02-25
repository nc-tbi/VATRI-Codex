// audit/evidence-writer.ts - Append-only audit evidence store
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

// Shared process-level store so evidence remains visible across writer instances.
const durableStore: AuditRecord[] = [];

export class EvidenceWriter {
  write(input: WriteAuditRecordInput): AuditRecord {
    const record: AuditRecord = {
      record_id: randomUUID(),
      trace_id: input.trace_id,
      event_type: input.event_type,
      bounded_context: input.bounded_context,
      actor: input.actor,
      timestamp: new Date().toISOString(),
      payload: Object.freeze({ ...input.payload }),
    };
    durableStore.push(record);
    return record;
  }

  queryByTraceId(trace_id: string): readonly AuditRecord[] {
    return durableStore.filter((r) => r.trace_id === trace_id);
  }

  get recordCount(): number {
    return durableStore.length;
  }

  snapshot(): readonly AuditRecord[] {
    return Object.freeze([...durableStore]);
  }
}

export const evidenceWriter = new EvidenceWriter();
