// obligation-service/src/app.ts — Fastify app factory
// Manages obligation lifecycle and preliminary assessment supersession
// Source: architecture/delivery/capability-to-backlog-mapping.md §Phase 2 Epic E5
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { obligationRoutes } from "./routes/obligation.js";

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

  app.get("/health", async () => ({ status: "ok", service: "obligation-service" }));

  app.register(obligationRoutes, {
    prefix: "/obligations",
    sql: config.sql,
    kafka: config.kafka,
  });

  return app;
}
