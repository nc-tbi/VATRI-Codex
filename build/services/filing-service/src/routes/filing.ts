import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { createHash, randomUUID } from "node:crypto";
import {
  processFiling,
  type CanonicalFiling,
  FilingStateError,
  ValidationFailedError,
} from "@tax-core/domain";
import { FilingRepository, type FilingAlterEventRecord } from "../db/repository.js";
import { FilingEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface AlterState {
  alter_id: string;
  field_deltas: Record<string, unknown>;
  status: "applied" | "undone";
}

function getHeaderValue(input: string | string[] | undefined): string | null {
  if (!input) return null;
  return Array.isArray(input) ? input[0] ?? null : input;
}

function getAdminContext(req: FastifyRequest): { actor_subject_id: string | null; actor_role: string } | null {
  const actor_role = getHeaderValue(req.headers["x-user-role"] as string | string[] | undefined)
    ?? getHeaderValue(req.headers["x-role"] as string | string[] | undefined);
  if (actor_role !== "admin") return null;
  const actor_subject_id = getHeaderValue(req.headers["x-subject-id"] as string | string[] | undefined);
  return { actor_subject_id, actor_role };
}

function deriveAlterStates(events: FilingAlterEventRecord[]): AlterState[] {
  const states = new Map<string, AlterState>();
  for (const event of events) {
    if (event.event_type === "alter") {
      states.set(event.alter_id, {
        alter_id: event.alter_id,
        field_deltas: event.field_deltas ?? {},
        status: "applied",
      });
      continue;
    }
    const target = states.get(event.alter_id);
    if (!target) continue;
    target.status = event.event_type === "undo" ? "undone" : "applied";
  }
  return Array.from(states.values());
}

function applyAlters(base: Record<string, unknown>, states: AlterState[]): Record<string, unknown> {
  return states
    .filter((entry) => entry.status === "applied")
    .reduce((acc, entry) => ({ ...acc, ...entry.field_deltas }), { ...base });
}

function snapshotHash(snapshot: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export async function filingRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new FilingRepository(opts.sql);
  const publisher = new FilingEventPublisher(opts.kafka);
  const inProcessIdempotency = new Map<string, Record<string, unknown>>();

  app.post<{ Body: CanonicalFiling }>("/", async (req, reply) => {
    const filing = req.body;
    const traceId = req.id;

    try {
      const replay = inProcessIdempotency.get(filing.filing_id);
      if (replay) {
        return reply.status(200).send({ ...replay, trace_id: traceId, idempotent: true });
      }

      const existing = await repo.findFiling(filing.filing_id);
      if (existing) {
        return reply.status(200).send({ ...existing, trace_id: traceId, idempotent: true });
      }

      const result = processFiling(
        { ...filing, trace_id: traceId },
        { taxpayer_id: filing.taxpayer_id },
      );
      const ctx = result.context;
      const inserted = await repo.saveFiling(ctx.filing, ctx.assessment!, ctx.claim_intent!);
      if (inserted === false) {
        const duplicate = await repo.findFiling(ctx.filing.filing_id);
        return reply.status(409).send({
          error: "DUPLICATE_FILING",
          filing_id: ctx.filing.filing_id,
          trace_id: traceId,
          filing: duplicate,
        });
      }

      await publisher.publishFilingReceived(ctx.filing, traceId);
      if (ctx.assessment) await publisher.publishFilingAssessed(ctx.assessment, traceId);
      if (ctx.claim_intent) await publisher.publishClaimCreated(ctx.claim_intent, traceId);

      const response = {
        filing_id: ctx.filing.filing_id,
        state: ctx.state,
        trace_id: traceId,
        assessment: ctx.assessment,
        claim_intent: ctx.claim_intent,
      };
      inProcessIdempotency.set(ctx.filing.filing_id, response);
      return reply.status(201).send(response);
    } catch (err) {
      if (err instanceof ValidationFailedError) {
        return reply.status(422).send({ error: "VALIDATION_FAILED", message: err.message, trace_id: traceId });
      }
      if (err instanceof FilingStateError) {
        return reply.status(409).send({ error: "STATE_ERROR", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  app.get<{ Querystring: { taxpayer_id?: string; tax_period_end?: string } }>("/", async (req, reply) => {
    const { taxpayer_id, tax_period_end } = req.query;
    if (!taxpayer_id) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "taxpayer_id is required", trace_id: req.id });
    }
    const filings = await repo.findByTaxpayerId(taxpayer_id, tax_period_end);
    return reply.send({ trace_id: req.id, taxpayer_id, filings });
  });

  app.get<{ Params: { filing_id: string } }>("/:filing_id", async (req, reply) => {
    const { filing_id } = req.params;
    const record = await repo.findFiling(filing_id);
    if (!record) {
      return reply.status(404).send({ error: "NOT_FOUND", filing_id, trace_id: req.id });
    }
    const history = await repo.findAlterEvents(filing_id);
    const states = deriveAlterStates(history);
    const effective_state = applyAlters(record, states);
    return reply.send({ ...effective_state, trace_id: req.id });
  });

  app.post<{ Params: { filing_id: string }; Body: { field_deltas: Record<string, unknown> } }>(
    "/:filing_id/alter",
    async (req, reply) => {
      const adminCtx = getAdminContext(req);
      if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

      const { filing_id } = req.params;
      const { field_deltas } = req.body ?? {};
      const traceId = req.id;
      if (!field_deltas || typeof field_deltas !== "object") {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "field_deltas object is required", trace_id: traceId });
      }

      const base = await repo.findFiling(filing_id);
      if (!base) return reply.status(404).send({ error: "NOT_FOUND", filing_id, trace_id: traceId });

      const events = await repo.findAlterEvents(filing_id);
      const beforeState = applyAlters(base, deriveAlterStates(events));
      const alter_id = randomUUID();
      const afterState = applyAlters(beforeState, [{ alter_id, field_deltas, status: "applied" }]);

      await repo.saveAlterEvent({
        event_id: randomUUID(),
        filing_id,
        event_type: "alter",
        alter_id,
        field_deltas,
        actor_subject_id: adminCtx.actor_subject_id,
        actor_role: adminCtx.actor_role,
        trace_id: traceId,
        before_snapshot_hash: snapshotHash(beforeState),
        after_snapshot_hash: snapshotHash(afterState),
        created_at: new Date().toISOString(),
      });

      return reply.send({ trace_id: traceId, filing_id, alter_id, effective_state: afterState });
    }
  );

  app.post<{ Params: { filing_id: string } }>("/:filing_id/undo", async (req, reply) => {
    const adminCtx = getAdminContext(req);
    if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

    const { filing_id } = req.params;
    const traceId = req.id;
    const base = await repo.findFiling(filing_id);
    if (!base) return reply.status(404).send({ error: "NOT_FOUND", filing_id, trace_id: traceId });

    const events = await repo.findAlterEvents(filing_id);
    const currentStates = deriveAlterStates(events);
    const lastApplied = [...currentStates].reverse().find((entry) => entry.status === "applied");
    if (!lastApplied) {
      return reply.status(409).send({ error: "NOTHING_TO_UNDO", filing_id, trace_id: traceId });
    }

    const beforeState = applyAlters(base, currentStates);
    const projectedStates = currentStates.map((entry) =>
      entry.alter_id === lastApplied.alter_id ? { ...entry, status: "undone" as const } : entry
    );
    const afterState = applyAlters(base, projectedStates);

    await repo.saveAlterEvent({
      event_id: randomUUID(),
      filing_id,
      event_type: "undo",
      alter_id: lastApplied.alter_id,
      field_deltas: null,
      actor_subject_id: adminCtx.actor_subject_id,
      actor_role: adminCtx.actor_role,
      trace_id: traceId,
      before_snapshot_hash: snapshotHash(beforeState),
      after_snapshot_hash: snapshotHash(afterState),
      created_at: new Date().toISOString(),
    });

    return reply.send({
      trace_id: traceId,
      filing_id,
      undone_alter_id: lastApplied.alter_id,
      effective_state: afterState,
    });
  });

  app.post<{ Params: { filing_id: string } }>("/:filing_id/redo", async (req, reply) => {
    const adminCtx = getAdminContext(req);
    if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

    const { filing_id } = req.params;
    const traceId = req.id;
    const base = await repo.findFiling(filing_id);
    if (!base) return reply.status(404).send({ error: "NOT_FOUND", filing_id, trace_id: traceId });

    const events = await repo.findAlterEvents(filing_id);
    const currentStates = deriveAlterStates(events);
    const lastUndone = [...currentStates].reverse().find((entry) => entry.status === "undone");
    if (!lastUndone) {
      return reply.status(409).send({ error: "NOTHING_TO_REDO", filing_id, trace_id: traceId });
    }

    const beforeState = applyAlters(base, currentStates);
    const projectedStates = currentStates.map((entry) =>
      entry.alter_id === lastUndone.alter_id ? { ...entry, status: "applied" as const } : entry
    );
    const afterState = applyAlters(base, projectedStates);

    await repo.saveAlterEvent({
      event_id: randomUUID(),
      filing_id,
      event_type: "redo",
      alter_id: lastUndone.alter_id,
      field_deltas: null,
      actor_subject_id: adminCtx.actor_subject_id,
      actor_role: adminCtx.actor_role,
      trace_id: traceId,
      before_snapshot_hash: snapshotHash(beforeState),
      after_snapshot_hash: snapshotHash(afterState),
      created_at: new Date().toISOString(),
    });

    return reply.send({
      trace_id: traceId,
      filing_id,
      redone_alter_id: lastUndone.alter_id,
      effective_state: afterState,
    });
  });
}
