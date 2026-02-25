import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { AuthTokenStore, type UserRecord } from "../auth/token-store.js";

const ACCESS_TOKEN_EXPIRY_SECONDS = 900;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface AuthRouteOptions extends FastifyPluginOptions {
  store: AuthTokenStore;
}

function getSigningKey(): Uint8Array {
  const key = process.env.SESSION_SIGNING_KEY?.trim();
  if (!key) {
    throw new Error("FATAL: SESSION_SIGNING_KEY is required");
  }
  return new TextEncoder().encode(key);
}

async function signAccessToken(user: UserRecord, traceId: string): Promise<string> {
  return new SignJWT({
    sub: user.subject_id,
    role: user.role,
    taxpayer_scope: user.taxpayer_scope,
    type: "access",
    trace_id: traceId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_EXPIRY_SECONDS}s`)
    .sign(getSigningKey());
}

async function issueRefreshToken(store: AuthTokenStore, subject_id: string): Promise<{ token: string; expires_at: string }> {
  const token = randomUUID();
  const issued_at = new Date().toISOString();
  const expires_at = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 86400 * 1000).toISOString();
  await store.storeRefreshToken(token, { subject_id, issued_at, expires_at });
  return { token, expires_at };
}

export async function authRoutes(app: FastifyInstance, opts: AuthRouteOptions): Promise<void> {
  const store = opts.store;

  app.post<{ Body: { username: string; password: string } }>("/login", async (req, reply) => {
    const { username, password } = req.body ?? {};
    const traceId = req.id;

    if (!username || !password) {
      return reply.status(400).send({
        error: "BAD_REQUEST",
        message: "username and password are required",
        trace_id: traceId,
      });
    }

    const user = await store.findUserByUsername(username);
    if (!user || !(await store.verifyPassword(password, user.passwordHash))) {
      return reply.status(401).send({ error: "INVALID_CREDENTIALS", trace_id: traceId });
    }

    const access_token = await signAccessToken(user, traceId);
    const { token: refresh_token } = await issueRefreshToken(store, user.subject_id);
    const session_id = randomUUID();

    return reply.status(200).send({
      trace_id: traceId,
      session_id,
      access_token,
      refresh_token,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: { subject_id: user.subject_id, role: user.role, taxpayer_scope: user.taxpayer_scope },
    });
  });

  app.post<{ Body: { refresh_token?: string } }>("/logout", async (req, reply) => {
    const { refresh_token } = req.body ?? {};
    const traceId = req.id;
    if (refresh_token) await store.revokeRefreshToken(refresh_token);
    return reply.status(200).send({ trace_id: traceId, message: "logged out" });
  });

  app.post<{ Body: { refresh_token: string } }>("/refresh", async (req, reply) => {
    const { refresh_token } = req.body ?? {};
    const traceId = req.id;

    if (!refresh_token) {
      return reply.status(400).send({ error: "BAD_REQUEST", message: "refresh_token is required", trace_id: traceId });
    }

    const entry = await store.lookupRefreshToken(refresh_token);
    if (!entry) {
      return reply.status(401).send({ error: "INVALID_REFRESH_TOKEN", trace_id: traceId });
    }
    if (new Date(entry.expires_at) < new Date()) {
      await store.revokeRefreshToken(refresh_token);
      return reply.status(401).send({ error: "REFRESH_TOKEN_EXPIRED", trace_id: traceId });
    }

    const user = await store.findUserById(entry.subject_id);
    if (!user) {
      return reply.status(401).send({ error: "USER_NOT_FOUND", trace_id: traceId });
    }

    await store.revokeRefreshToken(refresh_token);
    const { token: new_refresh_token } = await issueRefreshToken(store, user.subject_id);
    const access_token = await signAccessToken(user, traceId);
    const session_id = randomUUID();

    return reply.status(200).send({
      trace_id: traceId,
      session_id,
      access_token,
      refresh_token: new_refresh_token,
      expires_in: ACCESS_TOKEN_EXPIRY_SECONDS,
      user: { subject_id: user.subject_id, role: user.role, taxpayer_scope: user.taxpayer_scope },
    });
  });

  app.get("/me", async (req, reply) => {
    const traceId = req.id;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "MISSING_TOKEN", trace_id: traceId });
    }

    try {
      const { payload } = await jwtVerify(authHeader.slice(7), getSigningKey());
      return reply.send({
        trace_id: traceId,
        user: {
          subject_id: payload.sub,
          role: payload["role"],
          taxpayer_scope: (payload["taxpayer_scope"] as string | null) ?? null,
        },
      });
    } catch {
      return reply.status(401).send({ error: "INVALID_TOKEN", trace_id: traceId });
    }
  });
}
