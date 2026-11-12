// Disposable schema only. Never applies migrations or writes to public tables.
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import pg from "pg";
loadEnvFile(".env");
export const config = {
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  connectionTimeoutMillis: 5000,
};
export async function createTestSchema(schema) {
  if (!/^mars_reservation_test_[a-z0-9_]+$/.test(schema)) throw new Error("Invalid test schema");
  const client = new pg.Client(config);
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    // LIKE copies the actual ID types, checks and indexes, without production FK references.
    for (const table of ["regions", "plots", "plot_images", "plot_characteristics"]) {
      await client.query(`CREATE TABLE "${table}" (LIKE public."${table}" INCLUDING ALL)`);
      await client.query(
        `INSERT INTO "${table}" OVERRIDING SYSTEM VALUE SELECT * FROM public."${table}"`,
      );
    }
    for (const file of ["20261111_001_auth.sql", "20261111_002_reservations.sql"])
      await client.query(await readFile(new URL("../migrations/" + file, import.meta.url), "utf8"));
  } finally {
    await client.end();
  }
}
export async function dropTestSchema(schema) {
  if (!/^mars_reservation_test_[a-z0-9_]+$/.test(schema)) throw new Error("Invalid test schema");
  const client = new pg.Client(config);
  await client.connect();
  try {
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await client.end();
  }
}
if (process.argv[1]?.endsWith("reservation-test-schema.mjs")) {
  const [action, schema] = process.argv.slice(2);
  if (action === "create") await createTestSchema(schema);
  else if (action === "drop") await dropTestSchema(schema);
  else
    throw new Error(
      "Usage: node scripts/reservation-test-schema.mjs create|drop mars_reservation_test_<suffix>",
    );
  console.log(`Test schema ${action}: ${schema}`);
}
