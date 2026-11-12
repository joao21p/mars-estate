// @vitest-environment node
import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import pg from "pg";
import { expect, it } from "vitest";
import { createAuthService, digest } from "@/server/auth-service";

// Opt-in: temporary tables on one real connection; rollback leaves existing tables untouched.
it.skipIf(process.env["AUTH_TEST_POSTGRES"] !== "1")(
  "PostgreSQL: signup, duplicates, login, persisted session, expiry, logout and limits",
  async () => {
    loadEnvFile(".env");
    const client = new pg.Client({
      host: process.env["DATABASE_HOST"],
      port: Number(process.env["DATABASE_PORT"] || 5432),
      database: process.env["DATABASE_NAME"],
      user: process.env["DATABASE_USER"],
      password: process.env["DATABASE_PASSWORD"],
      connectionTimeoutMillis: 4000,
    });
    await client.connect();
    try {
      await client.query("BEGIN");
      const migration = await readFile(
        new URL("../../migrations/20261111_001_auth.sql", import.meta.url),
        "utf8",
      );
      await client.query(
        migration
          .replace(/^BEGIN;|^COMMIT;/gm, "")
          .replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE IF NOT EXISTS"),
      );
      const query: typeof client.query = client.query.bind(client);
      const db = {
        query,
        connect: async () => ({
          query: (text: string, values?: unknown[]) =>
            query(
              text === "BEGIN"
                ? "SAVEPOINT signup_test"
                : text === "COMMIT"
                  ? "RELEASE SAVEPOINT signup_test"
                  : text === "ROLLBACK"
                    ? "ROLLBACK TO SAVEPOINT signup_test"
                    : text,
              values,
            ),
          release() {},
        }),
      } as unknown as pg.Pool;
      const service = createAuthService(db);
      const input = { name: "Ana", email: " ANA@EXAMPLE.COM ", password: "correct password" };
      const created = await service.signup(input);
      // Reapplying the additive migration preserves data (temporary tables only).
      await client.query(
        migration
          .replace(/^BEGIN;|^COMMIT;/gm, "")
          .replaceAll("CREATE TABLE IF NOT EXISTS", "CREATE TEMP TABLE IF NOT EXISTS"),
      );
      expect(created.user.email).toBe("ana@example.com");
      const stored = await query("SELECT password_hash FROM auth_users WHERE id = $1", [
        created.user.id,
      ]);
      expect(stored.rows[0].password_hash).toMatch(/^scrypt\$/);
      expect((await query("SELECT token_hash FROM auth_sessions")).rows[0].token_hash).toBe(
        digest(created.token),
      );
      await expect(service.signup(input)).rejects.toThrow("Não foi possível cadastrar");
      await expect(service.login({ ...input, password: "wrong password" })).rejects.toThrow(
        "E-mail ou senha inválidos",
      );
      await expect(service.login({ ...input, email: "missing@example.com" })).rejects.toThrow(
        "E-mail ou senha inválidos",
      );
      const signedIn = await service.login(input, created.token);
      expect(await service.current(created.token)).toBeNull();
      expect(await createAuthService(db).current(signedIn.token)).toEqual(created.user);
      await query("UPDATE auth_sessions SET expires_at = now() - interval '1 second'");
      expect(await service.current(signedIn.token)).toBeNull();
      await expect(service.requireUser(signedIn.token)).rejects.toThrow("Entre para acessar");
      const fresh = await service.login(input);
      await service.logout(fresh.token);
      expect(await service.current(fresh.token)).toBeNull();
      await query("UPDATE auth_rate_limits SET attempts = 10 WHERE key = $1", [
        digest("login:ana@example.com"),
      ]);
      await expect(service.login(input)).rejects.toThrow("Muitas tentativas");
      await query("UPDATE auth_rate_limits SET attempts = 10 WHERE key = $1", [
        digest("signup:ana@example.com"),
      ]);
      await expect(service.signup(input)).rejects.toThrow("Muitas tentativas");
    } finally {
      await client.query("ROLLBACK");
      await client.end();
    }
  },
  20000,
);
