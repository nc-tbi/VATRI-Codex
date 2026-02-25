// claim-orchestrator/src/app.ts — Fastify app factory
// ADR-004: outbox + queue + idempotency for reliable claim dispatch
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
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
  const allowedOrigins = (
    process.env.SERVICE_ALLOWED_ORIGINS ?? "http://127.0.0.1:3000,http://localhost:3000"
  )
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Origin not allowed"), false);
    },
    allowedHeaders: ["content-type", "authorization", "x-user-role", "x-subject-id", "x-role", "x-trace-id"],
  });
  app.get("/health", async () => ({ status: "ok", service: "claim-orchestrator" }));
  app.register(claimRoutes, { prefix: "/claims", sql: config.sql, kafka: config.kafka });

  return app;
}
