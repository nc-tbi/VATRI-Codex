// assessment-service/src/app.ts — Fastify app factory
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import type { Kafka } from "kafkajs";
import { assessmentRoutes } from "./routes/assessment.js";

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
  app.get("/health", async () => ({ status: "ok", service: "assessment-service" }));
  app.register(assessmentRoutes, { prefix: "/assessments", sql: config.sql, kafka: config.kafka });

  return app;
}
