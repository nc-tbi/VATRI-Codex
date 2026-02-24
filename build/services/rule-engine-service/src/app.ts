// rule-engine-service/src/app.ts — Fastify app factory
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import { ruleEngineRoutes } from "./routes/rule-engine.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    requestIdHeader: "x-trace-id",
    genReqId: () => crypto.randomUUID(),
  });

  app.register(sensible);
  app.get("/health", async () => ({ status: "ok", service: "rule-engine-service" }));
  app.register(ruleEngineRoutes, { prefix: "" });

  return app;
}
