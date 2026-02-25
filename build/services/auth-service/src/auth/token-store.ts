import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { Sql } from "postgres";

export type UserRole = "admin" | "taxpayer";

export interface UserRecord {
  subject_id: string;
  username: string;
  role: UserRole;
  passwordHash: string;
  taxpayer_scope: string | null;
}

export interface RefreshEntry {
  subject_id: string;
  issued_at: string;
  expires_at: string;
}

export class AuthTokenStore {
  constructor(private readonly sql: Sql) {}

  async ensureSchema(): Promise<void> {
    await this.sql`CREATE SCHEMA IF NOT EXISTS auth`;
    await this.sql`
      CREATE TABLE IF NOT EXISTS auth.users (
        subject_id UUID PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        role TEXT NOT NULL CHECK (role IN ('admin', 'taxpayer')),
        password_hash TEXT NOT NULL,
        taxpayer_scope TEXT NULL,
        is_seeded_admin BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.sql`
      CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
        refresh_token TEXT PRIMARY KEY,
        subject_id UUID NOT NULL REFERENCES auth.users(subject_id) ON DELETE CASCADE,
        issued_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await this.sql`CREATE INDEX IF NOT EXISTS idx_auth_refresh_subject ON auth.refresh_tokens(subject_id)`;
    await this.sql`
      CREATE INDEX IF NOT EXISTS idx_auth_refresh_active
      ON auth.refresh_tokens(expires_at)
      WHERE revoked_at IS NULL
    `;
  }

  async seedAdminUser(username: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, 10);
    await this.sql`
      INSERT INTO auth.users (
        subject_id, username, role, password_hash, taxpayer_scope, is_seeded_admin
      ) VALUES (
        ${randomUUID()}, ${username}, 'admin', ${passwordHash}, NULL, TRUE
      )
      ON CONFLICT (username) DO UPDATE
      SET role = 'admin',
          password_hash = EXCLUDED.password_hash,
          taxpayer_scope = NULL,
          is_seeded_admin = TRUE
      WHERE auth.users.is_seeded_admin = TRUE
    `;
  }

  async findUserByUsername(username: string): Promise<UserRecord | null> {
    const rows = await this.sql`
      SELECT subject_id, username, role, password_hash, taxpayer_scope
      FROM auth.users
      WHERE username = ${username}
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      subject_id: String(row.subject_id),
      username: String(row.username),
      role: row.role as UserRole,
      passwordHash: String(row.password_hash),
      taxpayer_scope: row.taxpayer_scope ? String(row.taxpayer_scope) : null,
    };
  }

  async findUserById(subject_id: string): Promise<UserRecord | null> {
    const rows = await this.sql`
      SELECT subject_id, username, role, password_hash, taxpayer_scope
      FROM auth.users
      WHERE subject_id = ${subject_id}::uuid
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      subject_id: String(row.subject_id),
      username: String(row.username),
      role: row.role as UserRole,
      passwordHash: String(row.password_hash),
      taxpayer_scope: row.taxpayer_scope ? String(row.taxpayer_scope) : null,
    };
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async storeRefreshToken(token: string, entry: RefreshEntry): Promise<void> {
    await this.sql`
      INSERT INTO auth.refresh_tokens (
        refresh_token, subject_id, issued_at, expires_at, revoked_at
      ) VALUES (
        ${token},
        ${entry.subject_id}::uuid,
        ${entry.issued_at}::timestamptz,
        ${entry.expires_at}::timestamptz,
        NULL
      )
      ON CONFLICT (refresh_token) DO UPDATE
      SET subject_id = EXCLUDED.subject_id,
          issued_at = EXCLUDED.issued_at,
          expires_at = EXCLUDED.expires_at,
          revoked_at = NULL
    `;
  }

  async lookupRefreshToken(token: string): Promise<RefreshEntry | null> {
    const rows = await this.sql`
      SELECT subject_id, issued_at, expires_at
      FROM auth.refresh_tokens
      WHERE refresh_token = ${token}
        AND revoked_at IS NULL
      LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    return {
      subject_id: String(row.subject_id),
      issued_at: new Date(String(row.issued_at)).toISOString(),
      expires_at: new Date(String(row.expires_at)).toISOString(),
    };
  }

  async revokeRefreshToken(token: string): Promise<void> {
    await this.sql`
      UPDATE auth.refresh_tokens
      SET revoked_at = NOW()
      WHERE refresh_token = ${token}
        AND revoked_at IS NULL
    `;
  }
}
