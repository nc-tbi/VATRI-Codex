import type { FastifyInstance, FastifyPluginOptions, FastifyRequest } from "fastify";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { createHash, randomUUID } from "node:crypto";
import {
  createAmendment,
  type StagedAssessment,
  AmendmentError,
  ManualLegalRoutingRequiredError,
} from "@tax-core/domain";
import { AmendmentRepository, type AmendmentAlterEventRecord } from "../db/repository.js";
import { AmendmentEventPublisher } from "../events/publisher.js";

interface RouteOptions extends FastifyPluginOptions {
  sql: Sql;
  kafka: Kafka;
}

interface AmendmentBody {
  original_filing_id: string;
  taxpayer_id: string;
  tax_period_end: string;
  original_assessment: StagedAssessment;
  new_assessment: StagedAssessment;
}

interface AlterState {
  alter_id: string;
  field_deltas: Record<string, unknown>;
  status: "applied" | "undone";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
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

function deriveAlterStates(events: AmendmentAlterEventRecord[]): AlterState[] {
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

export async function amendmentRoutes(app: FastifyInstance, opts: RouteOptions): Promise<void> {
  const repo = new AmendmentRepository(opts.sql);
  const publisher = new AmendmentEventPublisher(opts.kafka);

  app.post<{ Body: AmendmentBody }>("/", async (req, reply) => {
    const { original_filing_id, taxpayer_id, tax_period_end, original_assessment, new_assessment } = req.body;
    const traceId = req.id;

    if (!original_filing_id || !taxpayer_id || !tax_period_end || !original_assessment || !new_assessment) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "original_filing_id, taxpayer_id, tax_period_end, original_assessment, new_assessment are required", trace_id: traceId });
    }
    if (original_assessment.filing_id !== original_filing_id) {
      return reply.status(422).send({ error: "AMENDMENT_ERROR", message: "original_assessment.filing_id must match original_filing_id", trace_id: traceId });
    }

    try {
      const amendment = createAmendment(
        taxpayer_id,
        tax_period_end,
        original_assessment,
        new_assessment,
        traceId
      );
      await repo.saveAmendment(amendment);
      await publisher.publishAmendmentCreated(amendment, traceId);
      return reply.status(201).send({
        trace_id: traceId,
        idempotent: false,
        amendment_id: amendment.amendment_id,
        amendment,
      });
    } catch (err) {
      if (err instanceof ManualLegalRoutingRequiredError) {
        return reply.status(422).send({
          error: "MANUAL_LEGAL_ROUTING_REQUIRED",
          message: err.message,
          trace_id: traceId,
          tax_period_end: err.taxPeriodEnd,
          cutoff_date: err.cutoffDate,
        });
      }
      if (err instanceof AmendmentError) {
        return reply.status(422).send({ error: "AMENDMENT_ERROR", message: err.message, trace_id: traceId });
      }
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  app.get<{ Querystring: { taxpayer_id?: string; tax_period_end?: string } }>(
    "/",
    async (req, reply) => {
      const { taxpayer_id, tax_period_end } = req.query;
      if (!taxpayer_id) {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "taxpayer_id is required", trace_id: req.id });
      }
      const amendments = await repo.findByTaxpayerId(taxpayer_id, tax_period_end);
      return reply.send({ trace_id: req.id, taxpayer_id, amendments });
    }
  );

  app.get<{ Params: { filing_id: string } }>("/:filing_id", async (req, reply) => {
    const { filing_id } = req.params;
    const records = await repo.findByFilingId(filing_id);
    return reply.send({ trace_id: req.id, filing_id, amendments: records });
  });

  app.post<{ Params: { amendment_id: string }; Body: { field_deltas: Record<string, unknown> } }>(
    "/:amendment_id/alter",
    async (req, reply) => {
      const adminCtx = getAdminContext(req);
      if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

      const { amendment_id } = req.params;
      const { field_deltas } = req.body ?? {};
      const traceId = req.id;
      if (!isUuid(amendment_id)) {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "amendment_id must be UUID", trace_id: traceId });
      }
      if (!field_deltas || typeof field_deltas !== "object") {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "field_deltas object is required", trace_id: traceId });
      }
      if (Array.isArray(field_deltas)) {
        return reply.status(400).send({ error: "BAD_REQUEST", message: "field_deltas must be a JSON object", trace_id: traceId });
      }

      const base = await repo.findByAmendmentId(amendment_id);
      if (!base) return reply.status(404).send({ error: "NOT_FOUND", amendment_id, trace_id: traceId });

      const events = await repo.findAlterEvents(amendment_id);
      const beforeState = applyAlters(base, deriveAlterStates(events));
      const alter_id = randomUUID();
      const afterState = applyAlters(beforeState, [{ alter_id, field_deltas, status: "applied" }]);

      try {
        await repo.saveAlterEvent({
          event_id: randomUUID(),
          amendment_id,
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

        return reply.send({ trace_id: traceId, amendment_id, alter_id, effective_state: afterState });
      } catch (err) {
        req.log.error(err);
        return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
      }
    }
  );

  app.post<{ Params: { amendment_id: string } }>("/:amendment_id/undo", async (req, reply) => {
    const adminCtx = getAdminContext(req);
    if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

    const { amendment_id } = req.params;
    const traceId = req.id;
    if (!isUuid(amendment_id)) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "amendment_id must be UUID", trace_id: traceId });
    }
    const base = await repo.findByAmendmentId(amendment_id);
    if (!base) return reply.status(404).send({ error: "NOT_FOUND", amendment_id, trace_id: traceId });

    const events = await repo.findAlterEvents(amendment_id);
    const currentStates = deriveAlterStates(events);
    const lastApplied = [...currentStates].reverse().find((entry) => entry.status === "applied");
    if (!lastApplied) {
      return reply.status(409).send({ error: "NOTHING_TO_UNDO", amendment_id, trace_id: traceId });
    }

    const beforeState = applyAlters(base, currentStates);
    const projectedStates = currentStates.map((entry) =>
      entry.alter_id === lastApplied.alter_id ? { ...entry, status: "undone" as const } : entry
    );
    const afterState = applyAlters(base, projectedStates);

    try {
      await repo.saveAlterEvent({
        event_id: randomUUID(),
        amendment_id,
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
        amendment_id,
        undone_alter_id: lastApplied.alter_id,
        effective_state: afterState,
      });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });

  app.post<{ Params: { amendment_id: string } }>("/:amendment_id/redo", async (req, reply) => {
    const adminCtx = getAdminContext(req);
    if (!adminCtx) return reply.status(403).send({ error: "FORBIDDEN", trace_id: req.id });

    const { amendment_id } = req.params;
    const traceId = req.id;
    if (!isUuid(amendment_id)) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "amendment_id must be UUID", trace_id: traceId });
    }
    const base = await repo.findByAmendmentId(amendment_id);
    if (!base) return reply.status(404).send({ error: "NOT_FOUND", amendment_id, trace_id: traceId });

    const events = await repo.findAlterEvents(amendment_id);
    const currentStates = deriveAlterStates(events);
    const lastUndone = [...currentStates].reverse().find((entry) => entry.status === "undone");
    if (!lastUndone) {
      return reply.status(409).send({ error: "NOTHING_TO_REDO", amendment_id, trace_id: traceId });
    }

    const beforeState = applyAlters(base, currentStates);
    const projectedStates = currentStates.map((entry) =>
      entry.alter_id === lastUndone.alter_id ? { ...entry, status: "applied" as const } : entry
    );
    const afterState = applyAlters(base, projectedStates);

    try {
      await repo.saveAlterEvent({
        event_id: randomUUID(),
        amendment_id,
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
        amendment_id,
        redone_alter_id: lastUndone.alter_id,
        effective_state: afterState,
      });
    } catch (err) {
      req.log.error(err);
      return reply.status(500).send({ error: "INTERNAL_ERROR", trace_id: traceId });
    }
  });
}
