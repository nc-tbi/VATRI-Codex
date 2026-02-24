// claim-orchestrator/src/app.ts — Fastify app factory
// ADR-004: outbox + queue + idempotency for reliable claim dispatch
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { claimRoutes } from "./routes/claim.js";

export interface AppConfig {
  sql: Sql;
  kafka: Kafka;
}

export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    requestIdHeader: "x-trace-id",
    genReqId: () => crypto.randomUUID(),
  });

  app.register(sensible);
  app.get("/health", async () => ({ status: "ok", service: "claim-orchestrator" }));
  app.register(claimRoutes, { prefix: "/claims", sql: config.sql, kafka: config.kafka });

  return app;
}
