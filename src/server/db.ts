import "@tanstack/react-start/server-only";
import { Pool } from "pg";

export const pool = new Pool({
  // Managed providers usually supply a pooled URL. Existing local settings still work.
  connectionString: process.env["DATABASE_URL"],
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
