// amendment-service/src/app.ts — Fastify app factory
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { amendmentRoutes } from "./routes/amendment.js";

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
  app.get("/health", async () => ({ status: "ok", service: "amendment-service" }));
  app.register(amendmentRoutes, { prefix: "/amendments", sql: config.sql, kafka: config.kafka });

  return app;
}
