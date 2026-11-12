// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const { options } = vi.hoisted(() => ({ options: vi.fn() }));
vi.mock("pg", () => ({ Pool: class { constructor(config: unknown) { options(config); } } }));
beforeEach(() => {
  vi.resetModules();
  options.mockClear();
  for (const name of ["DATABASE_URL", "DATABASE_HOST", "DATABASE_SSL", "DATABASE_SSL_CA", "DATABASE_POOL_MAX"])
    vi.stubEnv(name, "");
});
afterEach(() => vi.unstubAllEnvs());
it("preserves local configuration without enabling TLS implicitly", async () => {
  vi.stubEnv("DATABASE_HOST", "localhost");
  await import("@/server/db");
  expect(options.mock.calls[0]![0]).toMatchObject({ host: "localhost", max: 10, connectionTimeoutMillis: 5000 });
  expect(options.mock.calls[0]![0]).not.toHaveProperty("ssl");
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
