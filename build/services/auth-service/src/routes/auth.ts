import type { FastifyInstance, FastifyPluginOptions } from "fastify";
import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";
import { AuthTokenStore, type UserRecord } from "../auth/token-store.js";

const ACCESS_TOKEN_EXPIRY_SECONDS = 900;
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface AuthRouteOptions extends FastifyPluginOptions {
  store: AuthTokenStore;
}

const CVR_RE = /^\d{8}$/;

function sendError(
  reply: {
    status: (statusCode: number) => { send: (body: unknown) => unknown };
  },
  statusCode: number,
  traceId: string,
  error: string,
  message: string,
) {
  return reply.status(statusCode).send({ error, message, trace_id: traceId });
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
  type ErrorReply = Parameters<typeof sendError>[0];
  type AuthenticatedUserResult =
    | { ok: true; user: UserRecord }
    | { ok: false; statusCode: number; code: string; message: string };

  app.post<{ Body: { username: string; password: string } }>("/login", async (req, reply) => {
    const { username, password } = req.body ?? {};
    const traceId = req.id;

    if (!username || !password) {
      return sendError(reply, 400, traceId, "BAD_REQUEST", "username and password are required");
    }

    const user = await store.findUserByUsername(username);
    if (!user || !(await store.verifyPassword(password, user.passwordHash))) {
      return sendError(reply, 401, traceId, "INVALID_CREDENTIALS", "username or password is incorrect");
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
      password_change_required: user.password_change_required,
      user: { subject_id: user.subject_id, role: user.role, taxpayer_scope: user.taxpayer_scope },
    });
  });

  async function resolveAuthenticatedUser(authHeader: string | undefined): Promise<AuthenticatedUserResult> {
    if (!authHeader?.startsWith("Bearer ")) {
      return { ok: false, statusCode: 401, code: "MISSING_TOKEN", message: "missing bearer token" };
    }
    try {
      const { payload } = await jwtVerify(authHeader.slice(7), getSigningKey());
      if (typeof payload.sub !== "string" || payload.sub.length === 0) {
        return { ok: false, statusCode: 401, code: "INVALID_TOKEN", message: "token subject is missing" };
      }
      const user = await store.findUserById(payload.sub);
      if (!user) {
        return { ok: false, statusCode: 401, code: "USER_NOT_FOUND", message: "authenticated user not found" };
      }
      return { ok: true, user };
    } catch {
      return { ok: false, statusCode: 401, code: "INVALID_TOKEN", message: "bearer token is invalid or expired" };
    }
  }

  async function handlePasswordChange(
    req: { body?: { current_password?: string; new_password?: string }; headers: { authorization?: string }; id: string },
    reply: ErrorReply,
  ) {
    const traceId = req.id;
    const auth = await resolveAuthenticatedUser(req.headers.authorization);
    if (!auth.ok) {
      return sendError(reply, auth.statusCode, traceId, auth.code, auth.message);
    }

    const { current_password, new_password } = req.body ?? {};
    if (!current_password || !new_password) {
      return sendError(
        reply,
        400,
        traceId,
        "BAD_REQUEST",
        "current_password and new_password are required",
      );
    }
    if (new_password.length < 8) {
      return sendError(reply, 400, traceId, "BAD_REQUEST", "new_password must be at least 8 characters");
    }

    const passwordMatches = await store.verifyPassword(current_password, auth.user.passwordHash);
    if (!passwordMatches) {
      return sendError(reply, 401, traceId, "INVALID_CREDENTIALS", "current_password is incorrect");
    }

    await store.changePassword(auth.user.subject_id, new_password);
    return reply.status(200).send({
      trace_id: traceId,
      message: "password changed",
      password_change_required: false,
    });
  }

  app.post<{ Body: { current_password: string; new_password: string } }>("/change-password", async (req, reply) =>
    handlePasswordChange(req, reply),
  );

  // Backwards-compatible alias used by older portal clients.
  app.post<{ Body: { current_password: string; new_password: string } }>("/password", async (req, reply) =>
    handlePasswordChange(req, reply),
  );

  app.post<{ Body: { taxpayer_id?: string; cvr_number?: string; new_password?: string } }>(
    "/first-login/password",
    async (req, reply) => {
      const traceId = req.id;
      const { taxpayer_id, cvr_number, new_password } = req.body ?? {};

      if (!taxpayer_id || !cvr_number || !new_password) {
        return sendError(
          reply,
          400,
          traceId,
          "BAD_REQUEST",
          "taxpayer_id, cvr_number, and new_password are required",
        );
      }
      if (!CVR_RE.test(cvr_number)) {
        return sendError(reply, 400, traceId, "BAD_REQUEST", "cvr_number must be 8 digits");
      }
      if (new_password.length < 12) {
        return sendError(reply, 400, traceId, "BAD_REQUEST", "new_password must be at least 12 characters");
      }

      const validIdentity = await store.isValidTaxpayerRegistrationIdentity(taxpayer_id, cvr_number);
      if (!validIdentity) {
        return sendError(reply, 401, traceId, "INVALID_CREDENTIALS", "taxpayer identity could not be verified");
      }

      const taxpayerUser = await store.findTaxpayerUserByScope(taxpayer_id);
      if (taxpayerUser) {
        if (!taxpayerUser.password_change_required) {
          return sendError(reply, 409, traceId, "STATE_ERROR", "first-login password has already been set");
        }
        await store.changePassword(taxpayerUser.subject_id, new_password);
        return reply.status(200).send({
          trace_id: traceId,
          message: "password changed",
          password_change_required: false,
        });
      }

      const usernameCollision = await store.findUserByUsername(taxpayer_id);
      if (usernameCollision && usernameCollision.role !== "taxpayer") {
        return sendError(
          reply,
          409,
          traceId,
          "STATE_ERROR",
          "taxpayer username cannot be provisioned due to existing non-taxpayer user",
        );
      }

      await store.createTaxpayerUserWithPassword(taxpayer_id, new_password);
      return reply.status(200).send({
        trace_id: traceId,
        message: "password created",
        password_change_required: false,
      });
    },
  );

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
      return sendError(reply, 400, traceId, "BAD_REQUEST", "refresh_token is required");
    }

    const entry = await store.lookupRefreshToken(refresh_token);
    if (!entry) {
      return sendError(reply, 401, traceId, "INVALID_REFRESH_TOKEN", "refresh_token is invalid");
    }
    if (new Date(entry.expires_at) < new Date()) {
      await store.revokeRefreshToken(refresh_token);
      return sendError(reply, 401, traceId, "REFRESH_TOKEN_EXPIRED", "refresh_token has expired");
    }

    const user = await store.findUserById(entry.subject_id);
    if (!user) {
      return sendError(reply, 401, traceId, "USER_NOT_FOUND", "user no longer exists");
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
      password_change_required: user.password_change_required,
      user: { subject_id: user.subject_id, role: user.role, taxpayer_scope: user.taxpayer_scope },
    });
  });

  app.get("/me", async (req, reply) => {
    const traceId = req.id;
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return sendError(reply, 401, traceId, "MISSING_TOKEN", "missing bearer token");
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
      return sendError(reply, 401, traceId, "INVALID_TOKEN", "bearer token is invalid or expired");
    }
  });
}
