// validation-service/src/app.ts — Fastify app factory (stateless)
import Fastify, { type FastifyInstance } from "fastify";
import sensible from "@fastify/sensible";
import { validationRoutes } from "./routes/validation.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    requestIdHeader: "x-trace-id",
    genReqId: () => crypto.randomUUID(),
  });

  app.register(sensible);
  app.get("/health", async () => ({ status: "ok", service: "validation-service" }));
  app.register(validationRoutes, { prefix: "/validations" });

  return app;
}
