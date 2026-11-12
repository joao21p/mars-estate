import { loadEnvFile } from "node:process";
import pg from "pg";
loadEnvFile(".env");
const db = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  connectionTimeoutMillis: 5000,
});
try {
  await db.connect();
  for (const sql of [
    "SELECT table_name,column_name,data_type,udt_name,character_maximum_length FROM information_schema.columns WHERE table_schema=current_schema() AND table_name IN ('plots','auth_users','auth_sessions') ORDER BY table_name,ordinal_position",
    "SELECT id,status FROM plots ORDER BY id LIMIT 20",
    "SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='plots'::regclass",
    "SELECT current_user, has_database_privilege(current_database(), 'CREATE') AS can_create_schema",
  ])
    console.log(JSON.stringify((await db.query(sql)).rows));
} finally {
  await db.end();
}
