// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { options, on } = vi.hoisted(() => ({ options: vi.fn(), on: vi.fn() }));
vi.mock("pg", () => ({ Pool: class {
  constructor(config: unknown) { options(config); }
  on(event: string, listener: (error: unknown) => void) { on(event, listener); return this; }
} }));
beforeEach(() => {
  vi.resetModules();
  options.mockClear();
  on.mockClear();
  vi.stubEnv("VERCEL", "");
  for (const name of ["DATABASE_URL", "DATABASE_HOST", "DATABASE_SSL", "DATABASE_SSL_CA", "DATABASE_POOL_MAX"])
    vi.stubEnv(name, "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
it("preserves local configuration without enabling TLS implicitly", async () => {
  vi.stubEnv("DATABASE_HOST", "localhost");
  await import("@/server/db");
  expect(options.mock.calls[0]![0]).toMatchObject({ host: "localhost", max: 10, connectionTimeoutMillis: 5000 });
  expect(options.mock.calls[0]![0]).not.toHaveProperty("ssl");
});
it("fails explicitly on Vercel when DATABASE_URL is missing instead of using localhost", async () => {
  vi.stubEnv("VERCEL", "1");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(import("@/server/db")).rejects.toThrow("Configure DATABASE_URL");
  expect(options).not.toHaveBeenCalled();
  expect(log).toHaveBeenCalledWith("[mars-db]", expect.stringContaining("MARS_DB_URL_MISSING"));
});
it("rejects a pasted psql command without logging its contents", async () => {
  vi.stubEnv("DATABASE_URL", "psql postgresql://db.example.invalid/mars");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(import("@/server/db")).rejects.toThrow("DATABASE_URL inválida");
  expect(JSON.stringify(log.mock.calls)).not.toContain("db.example.invalid");
  expect(options).not.toHaveBeenCalled();
});
it("handles idle Pool errors without emitting the original error or connection details", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await import("@/server/db");
  expect(on).toHaveBeenCalledWith("error", expect.any(Function));
  const listener = on.mock.calls[0]![1] as (error: unknown) => void;
  expect(() => listener(Object.assign(new Error("sensitive provider detail"), { code: "ECONNRESET" }))).not.toThrow();
  expect(JSON.stringify(log.mock.calls)).toContain("ECONNRESET");
  expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive provider detail");
});
it("supports a managed URL, verified TLS and a per-instance connection budget", async () => {
  vi.stubEnv("DATABASE_URL", "postgresql://db.example.invalid/mars");
  vi.stubEnv("DATABASE_SSL", "true");
  vi.stubEnv("DATABASE_SSL_CA", "test-ca");
  vi.stubEnv("DATABASE_POOL_MAX", "2");
  await import("@/server/db");
  expect(options.mock.calls[0]![0]).toMatchObject({
    connectionString: "postgresql://db.example.invalid/mars", max: 2,
    ssl: { rejectUnauthorized: true, ca: "test-ca" }, allowExitOnIdle: true,
  });
});
it("resolves a URL-only deployment with the real pg parser, including TLS and URL precedence", async () => {
  vi.stubEnv("DATABASE_HOST", "localhost");
  vi.stubEnv("DATABASE_URL", "postgresql://fixture-role@db.example.invalid/mars?sslmode=verify-full");
  await import("@/server/db");
  const actual = await vi.importActual<typeof import("pg")>("pg");
  const client = new actual.Client(options.mock.calls[0]![0]);
  const resolved = (client as unknown as { connectionParameters: {
    host: string; database: string; user: string; ssl: false | { rejectUnauthorized?: boolean };
  } }).connectionParameters;
  expect(resolved.host).toBe("db.example.invalid");
  expect(resolved.database).toBe("mars");
  expect(resolved.user).toBe("fixture-role");
  expect(resolved.ssl).not.toBe(false);
  expect(resolved.ssl && resolved.ssl.rejectUnauthorized).not.toBe(false);
});
