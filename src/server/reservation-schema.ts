import type { Pool } from "pg";

// Inspect the same search_path as catalog/reservation queries. No startup DDL or cached
// negative result: a manually applied migration takes effect on the next request.
export async function reservationsTableExists(db: Pick<Pool, "query">): Promise<boolean> {
  const result = await db.query<{ available: boolean }>(
    "SELECT to_regclass('plot_reservations') IS NOT NULL AS available",
  );
  const available = result.rows[0]?.available;
  if (typeof available !== "boolean")
    throw new Error("Não foi possível verificar a configuração de reservas.");
  return available;
}

export async function plotStatusSql(db: Pick<Pool, "query">): Promise<string> {
  return (await reservationsTableExists(db))
    ? "CASE WHEN p.status = 'disponivel' AND EXISTS (SELECT 1 FROM plot_reservations pr WHERE pr.plot_id = p.id AND pr.status = 'active') THEN 'reservado' ELSE p.status END"
    : "p.status";
}
