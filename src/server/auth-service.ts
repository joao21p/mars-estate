import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { loginSchema, signupSchema, type AuthUser } from "@/data/auth";
import { AuthError, hashPassword, verifyPassword } from "./auth-password";

export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
type Database = Pick<Pool, "query" | "connect">;
type StoredUser = AuthUser & { password_hash: string };

export function createAuthService(db: Database) {
  async function limit(action: string, email: string) {
    // Shared DB buckets survive restarts and work across application instances.
    for (const [subject, max] of [
      ["global", 100],
      [email, 10],
    ] as const) {
      const result = await db.query<{ attempts: number }>(
        `
        INSERT INTO auth_rate_limits AS limits (key, attempts, expires_at)
        VALUES ($1, 1, now() + interval '15 minutes')
        ON CONFLICT (key) DO UPDATE SET
          attempts = CASE WHEN limits.expires_at <= now() THEN 1 ELSE limits.attempts + 1 END,
          expires_at = CASE WHEN limits.expires_at <= now() THEN now() + interval '15 minutes' ELSE limits.expires_at END
        RETURNING attempts`,
        [digest(`${action}:${subject}`)],
      );
      if (result.rows[0]!.attempts > max)
        throw new AuthError("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
    }
  }

  async function session(client: Pick<PoolClient, "query">, user: AuthUser, previous?: string) {
    const token = randomBytes(32).toString("hex");
    if (previous)
      await client.query("DELETE FROM auth_sessions WHERE token_hash = $1", [digest(previous)]);
    await client.query(
      "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
      [digest(token), user.id, new Date(Date.now() + SESSION_SECONDS * 1000)],
    );
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  return {
    async signup(input: unknown, previous?: string) {
      const parsed = signupSchema.safeParse(input);
      if (!parsed.success)
        throw new AuthError("Confira nome, e-mail e senha (12 a 128 caracteres).");
      const { name, email, password } = parsed.data;
      await limit("signup", email);
      const passwordHash = await hashPassword(password);
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<AuthUser>(
          `INSERT INTO auth_users (id, name, email, password_hash)
          VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id, name, email`,
          [randomUUID(), name, email, passwordHash],
        );
        if (!result.rows[0])
          throw new AuthError(
            "Não foi possível cadastrar com esses dados. Tente entrar ou use outro e-mail.",
          );
        const created = await session(client, result.rows[0], previous);
        await client.query("COMMIT");
        return created;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async login(input: unknown, previous?: string) {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) throw new AuthError("E-mail ou senha inválidos.");
      await limit("login", parsed.data.email);
      const result = await db.query<StoredUser>(
        "SELECT id, name, email, password_hash FROM auth_users WHERE email = $1",
        [parsed.data.email],
      );
      const user = result.rows[0];
      if (!(await verifyPassword(parsed.data.password, user?.password_hash)) || !user)
        throw new AuthError("E-mail ou senha inválidos.");
      return session(db, user, previous);
    },
    async current(token?: string): Promise<AuthUser | null> {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
      const result = await db.query<AuthUser>(
        `SELECT u.id, u.name, u.email FROM auth_sessions s
        JOIN auth_users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
        [digest(token)],
      );
      return result.rows[0] ?? null;
    },
    async logout(token?: string) {
      if (token) await db.query("DELETE FROM auth_sessions WHERE token_hash = $1", [digest(token)]);
    },
    async requireUser(token?: string) {
      const user = await this.current(token);
      if (!user) throw new AuthError("Entre para acessar sua conta.");
      return user;
    },
  };
}
