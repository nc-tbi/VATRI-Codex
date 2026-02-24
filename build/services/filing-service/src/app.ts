// filing-service/src/app.ts — Fastify app factory
// Orchestrates the full filing pipeline: validation → rule evaluation → staged assessment → claim
// Source: design/01-vat-filing-assessment-solution-design.md §filing-service
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { filingRoutes } from "./routes/filing.js";

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

  // Health check — no auth required
  app.get("/health", async () => ({ status: "ok", service: "filing-service" }));

  app.register(filingRoutes, {
    prefix: "/vat-filings",
    sql: config.sql,
    kafka: config.kafka,
  });

  return app;
}
