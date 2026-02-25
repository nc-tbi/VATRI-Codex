import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import type { Sql } from "postgres";
import { authRoutes } from "./routes/auth.js";
import { AuthTokenStore } from "./auth/token-store.js";

export interface AppConfig {
  sql: Sql;
}

export function buildApp(config: AppConfig): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "info" },
    requestIdHeader: "x-trace-id",
    genReqId: () => crypto.randomUUID(),
  });

  const store = new AuthTokenStore(config.sql);
  const allowedOrigins = (
    process.env.AUTH_ALLOWED_ORIGINS ?? "http://127.0.0.1:3000,http://localhost:3000"
  )
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

  app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
        return;
      }
      cb(new Error("Origin not allowed"), false);
    },
  });
  app.register(sensible);
  app.get("/health", async () => ({ status: "ok", service: "auth-service" }));
  app.register(authRoutes, { prefix: "/auth", store });

  app.addHook("onReady", async () => {
    await store.ensureSchema();
    if (process.env.ADMIN_SEED_ENABLED === "true") {
      if (process.env.NODE_ENV === "production") {
        throw new Error("FATAL: ADMIN_SEED_ENABLED must not be true in production");
      }
      const username = process.env.ADMIN_SEED_USERNAME ?? "admin";
      const password = process.env.ADMIN_SEED_PASSWORD ?? "admin";
      await store.seedAdminUser(username, password);
      app.log.info({ username }, "Seeded admin user");
    }
  });

  return app;
}
