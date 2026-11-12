// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { logDatabaseFailure, runDatabaseOperation } from "@/server/db-diagnostics";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it("keeps SQLSTATE diagnostic while removing provider messages, details, stack and cause", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = Object.assign(new Error("private provider message", { cause: new Error("private cause") }), {
    code: "28P01", detail: "private row", query: "private SQL", password: "private password",
  });
  let caught: unknown;
  try { await runDatabaseOperation("catalog.plots", async () => { throw error; }); }
  catch (value) { caught = value; }
  expect(caught).toBeInstanceOf(Error);
  expect((caught as Error).message).toContain("[mars-db]");
  expect((caught as Error).cause).toBeUndefined();
  const output = JSON.stringify(log.mock.calls);
  expect(output).toContain("28P01");
  expect(output).toContain("authentication");
  expect(output).not.toContain("private");
});

it.each([
  [{ code: "42P01" }, "database-or-schema"],
  [{ code: "42501" }, "permissions"],
  [{ code: "53300" }, "connection-limit"],
  [{ code: "SELF_SIGNED_CERT_IN_CHAIN" }, "tls"],
  [{ message: "Connection terminated due to connection timeout" }, "timeout"],
  [{ cause: { code: "ECONNREFUSED" } }, "network"],
])("classifies a database failure using safe fields", (error, category) => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  logDatabaseFailure("catalog.regions", error);
  expect(JSON.parse(log.mock.calls[0]![1] as string)).toMatchObject({ operation: "catalog.regions", category });
});

it("does not print arbitrary code values or the configured URL", () => {
  vi.stubEnv("DATABASE_URL", "postgresql://db.example.invalid/mars");
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  logDatabaseFailure("catalog.regions", { code: "unexpected-private-value" });
  const output = JSON.stringify(log.mock.calls);
  expect(output).toContain("UNKNOWN");
  expect(output).not.toContain("unexpected-private-value");
  expect(output).not.toContain("example.invalid");
});

it("preserves successful query results without logging", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = { rows: [{ id: "public-example" }] };
  expect(await runDatabaseOperation("catalog.regions", async () => result)).toBe(result);
  expect(log).not.toHaveBeenCalled();
});
