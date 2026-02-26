import { beforeEach, describe, expect, it, vi } from "vitest";

interface AuthUser {
  subject_id: string;
  username: string;
  role: "admin" | "taxpayer";
  passwordHash: string;
  taxpayer_scope: string | null;
  password_change_required: boolean;
}

const usersByUsername = new Map<string, AuthUser>();
const usersById = new Map<string, AuthUser>();
const refreshTokens = new Map<string, { subject_id: string; issued_at: string; expires_at: string }>();

function seedUser(): AuthUser {
  const user: AuthUser = {
    subject_id: "11111111-1111-1111-1111-111111111111",
    username: "first-login-user",
    role: "admin",
    passwordHash: "initial-pass",
    taxpayer_scope: null,
    password_change_required: true,
  };
  usersByUsername.set(user.username, user);
  usersById.set(user.subject_id, user);
  return user;
}

const authStoreMock = {
  ensureSchema: vi.fn(async () => {}),
  seedAdminUser: vi.fn(async () => {}),
  findUserByUsername: vi.fn(async (username: string) => usersByUsername.get(username) ?? null),
  findUserById: vi.fn(async (subject_id: string) => usersById.get(subject_id) ?? null),
  verifyPassword: vi.fn(async (plaintext: string, hash: string) => plaintext === hash),
  storeRefreshToken: vi.fn(
    async (refreshToken: string, entry: { subject_id: string; issued_at: string; expires_at: string }) => {
      refreshTokens.set(refreshToken, entry);
    },
  ),
  lookupRefreshToken: vi.fn(async (refreshToken: string) => refreshTokens.get(refreshToken) ?? null),
  revokeRefreshToken: vi.fn(async (refreshToken: string) => {
    refreshTokens.delete(refreshToken);
  }),
  changePassword: vi.fn(async (subject_id: string, newPassword: string) => {
    const user = usersById.get(subject_id);
    if (!user) return;
    user.passwordHash = newPassword;
    user.password_change_required = false;
  }),
};

vi.mock("../../../../services/auth-service/src/auth/token-store.js", () => {
  return {
    AuthTokenStore: class AuthTokenStore {
      async ensureSchema(...args: unknown[]): Promise<void> {
        await authStoreMock.ensureSchema(...args);
      }
      async seedAdminUser(...args: unknown[]): Promise<void> {
        await authStoreMock.seedAdminUser(...args);
      }
      async findUserByUsername(...args: unknown[]): Promise<unknown> {
        return authStoreMock.findUserByUsername(...args);
      }
      async findUserById(...args: unknown[]): Promise<unknown> {
        return authStoreMock.findUserById(...args);
      }
      async verifyPassword(...args: unknown[]): Promise<boolean> {
        return authStoreMock.verifyPassword(...args);
      }
      async storeRefreshToken(...args: unknown[]): Promise<void> {
        await authStoreMock.storeRefreshToken(...args);
      }
      async lookupRefreshToken(...args: unknown[]): Promise<unknown> {
        return authStoreMock.lookupRefreshToken(...args);
      }
      async revokeRefreshToken(...args: unknown[]): Promise<void> {
        await authStoreMock.revokeRefreshToken(...args);
      }
      async changePassword(...args: unknown[]): Promise<void> {
        await authStoreMock.changePassword(...args);
      }
    },
  };
});

describe("Phase 4 auth first-login contract [gate:C][backlog:TB-S4B-01]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersByUsername.clear();
    usersById.clear();
    refreshTokens.clear();
    seedUser();
    process.env.SESSION_SIGNING_KEY = "local-dev-signing-key-20260225-min-32-characters";
    process.env.ADMIN_SEED_ENABLED = "false";
  });

  it("[case:TC-PORTAL-AUTH-01] returns password_change_required=true for first login", async () => {
    const { buildApp } = await import("../../../../services/auth-service/src/app.js");
    const app = buildApp({ sql: {} as never });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "first-login-user", password: "initial-pass" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().password_change_required).toBe(true);
    await app.close();
  });

  it("[case:TC-PORTAL-AUTH-02] accepts authenticated first-login password change", async () => {
    const { buildApp } = await import("../../../../services/auth-service/src/app.js");
    const app = buildApp({ sql: {} as never });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "first-login-user", password: "initial-pass" },
    });
    const accessToken = login.json().access_token as string;

    const change = await app.inject({
      method: "POST",
      url: "/auth/change-password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { current_password: "initial-pass", new_password: "new-pass-001" },
    });

    expect(change.statusCode).toBe(200);
    expect(change.json().password_change_required).toBe(false);
    expect(authStoreMock.changePassword).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it("[case:TC-PORTAL-AUTH-03] returns password_change_required=false after password update", async () => {
    const { buildApp } = await import("../../../../services/auth-service/src/app.js");
    const app = buildApp({ sql: {} as never });

    const firstLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "first-login-user", password: "initial-pass" },
    });
    const accessToken = firstLogin.json().access_token as string;

    await app.inject({
      method: "POST",
      url: "/auth/change-password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { current_password: "initial-pass", new_password: "new-pass-001" },
    });

    const secondLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "first-login-user", password: "new-pass-001" },
    });

    expect(secondLogin.statusCode).toBe(200);
    expect(secondLogin.json().password_change_required).toBe(false);
    await app.close();
  });

  it("[case:TC-PORTAL-AUTH-04] returns deterministic error envelope on password-change failure", async () => {
    const { buildApp } = await import("../../../../services/auth-service/src/app.js");
    const app = buildApp({ sql: {} as never });

    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { username: "first-login-user", password: "initial-pass" },
    });
    const accessToken = login.json().access_token as string;

    const change = await app.inject({
      method: "POST",
      url: "/auth/change-password",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { current_password: "wrong-pass", new_password: "new-pass-001" },
    });

    expect(change.statusCode).toBe(401);
    expect(change.json().error).toBe("INVALID_CREDENTIALS");
    expect(change.json().message).toBeTypeOf("string");
    expect(change.json().trace_id).toBeTypeOf("string");
    await app.close();
  });
});
