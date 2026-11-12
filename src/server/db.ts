import "@tanstack/react-start/server-only";
import { Pool } from "pg";
import { logDatabaseFailure } from "./db-diagnostics";

const connectionString = process.env["DATABASE_URL"];
// Vercel must never silently use pg's localhost/OS-user defaults.
if (process.env["VERCEL"] === "1" && !connectionString) {
  logDatabaseFailure("pool.configuration", { code: "MARS_DB_URL_MISSING" });
  throw new Error("Configure DATABASE_URL no ambiente deste deployment Vercel.");
}
if (connectionString) {
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) throw new Error();
  } catch {
    logDatabaseFailure("pool.configuration", { code: "MARS_DB_URL_INVALID" });
    throw new Error("DATABASE_URL inválida. Use somente a URI PostgreSQL, sem comando psql ou aspas externas.");
  }
}

export const pool = new Pool({
  // Managed providers usually supply a pooled URL. Existing local settings still work.
  connectionString,
  host: process.env["DATABASE_HOST"],
  port: Number(process.env["DATABASE_PORT"] || 5432),
  database: process.env["DATABASE_NAME"],
  user: process.env["DATABASE_USER"],
  password: process.env["DATABASE_PASSWORD"],
  ...(process.env["DATABASE_SSL"] === "true" ? {
    ssl: {
      rejectUnauthorized: true,
      ...(process.env["DATABASE_SSL_CA"] ? { ca: process.env["DATABASE_SSL_CA"] } : {}),
    },
  } : {}),
  max: Number(process.env["DATABASE_POOL_MAX"] || 10),
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 10000,
  allowExitOnIdle: true,
});

// A remote server may close an idle connection; an unhandled pg Pool 'error'
// would terminate the function process. pg has already removed the broken client.
pool.on("error", (error) => logDatabaseFailure("pool.idle", error));
