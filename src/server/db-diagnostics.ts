import "@tanstack/react-start/server-only";

type DatabaseOperation = "pool.configuration" | "pool.idle" | "catalog.regions" | "catalog.plots" | "catalog.plot";
const networkCodes = new Set([
  "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNRESET", "EPIPE",
  "CERT_HAS_EXPIRED", "DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "ERR_TLS_CERT_ALTNAME_INVALID",
  "MARS_DB_URL_MISSING", "MARS_DB_URL_INVALID",
]);

export function logDatabaseFailure(operation: DatabaseOperation, error: unknown) {
  const failure = error as { code?: unknown; message?: unknown; cause?: { code?: unknown } } | null;
  const candidate = failure?.code ?? failure?.cause?.code;
  const code = typeof candidate === "string" && (networkCodes.has(candidate) || /^[0-9A-Z]{5}$/.test(candidate))
    ? candidate : "UNKNOWN";
  const category = code.startsWith("MARS_DB_") ? "configuration"
    : code === "28P01" || code === "28000" ? "authentication"
    : code === "42P01" || code === "42703" || code === "3D000" ? "database-or-schema"
    : code === "42501" ? "permissions"
    : code === "53300" ? "connection-limit"
    : code.includes("CERT") || code.includes("ISSUER") || code.includes("SIGNATURE") ? "tls"
    : code === "ETIMEDOUT" || (typeof failure?.message === "string" && /timeout|timed out/i.test(failure.message)) ? "timeout"
    : networkCodes.has(code) ? "network" : "database";
  // Never log Error, message, stack/cause, URL, host, user, SQL, parameters or cookies.
  // The existing global SSR error logger expands Error causes, so don't attach the original.
  console.error("[mars-db]", JSON.stringify({
    operation, code, category,
    connectionSource: process.env["DATABASE_URL"] ? "DATABASE_URL" : "individual-fields",
  }));
}

export async function runDatabaseOperation<T>(operation: DatabaseOperation, action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    logDatabaseFailure(operation, error);
    throw new Error("Consulta ao banco indisponível. Consulte o diagnóstico [mars-db] no servidor.");
  }
}
