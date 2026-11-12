// @vitest-environment node
import { loadEnvFile } from "node:process";
import pg from "pg";
import { expect, it, vi } from "vitest";
import { plotStatusSql, reservationsTableExists } from "@/server/reservation-schema";

it("uses base plot status only when metadata confirms the reservations table is absent", async () => {
  const db = {
    query: vi.fn().mockResolvedValue({ rows: [{ available: false }] }),
  } as unknown as pg.Pool;
  expect(await plotStatusSql(db)).toBe("p.status");
  expect(db.query).toHaveBeenCalledWith(
    "SELECT to_regclass('plot_reservations') IS NOT NULL AS available",
  );
});
it("does not cache absence: a manually applied migration enables active reservation checks", async () => {
  const query = vi
    .fn()
    .mockResolvedValueOnce({ rows: [{ available: false }] })
    .mockResolvedValueOnce({ rows: [{ available: true }] });
  const db = { query } as unknown as pg.Pool;
  expect(await plotStatusSql(db)).toBe("p.status");
  expect(await plotStatusSql(db)).toContain(
    "FROM plot_reservations pr WHERE pr.plot_id = p.id AND pr.status = 'active'",
  );
});
it("does not hide database failures or malformed metadata behind an availability fallback", async () => {
  const failure = Object.assign(new Error("permission denied"), { code: "42501" });
  const query = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce({ rows: [] });
  const db = { query } as unknown as pg.Pool;
  await expect(plotStatusSql(db)).rejects.toBe(failure);
  await expect(reservationsTableExists(db)).rejects.toThrow("configuração");
});

it.skipIf(process.env["RESERVATIONS_TEST_POSTGRES"] !== "1")(
  "PostgreSQL: catalog before/after migration and cancellation, preserving original statuses",
  async () => {
    loadEnvFile(".env");
    const db = new pg.Client({
      host: process.env["DATABASE_HOST"],
      port: Number(process.env["DATABASE_PORT"] || 5432),
      database: process.env["DATABASE_NAME"],
      user: process.env["DATABASE_USER"],
      password: process.env["DATABASE_PASSWORD"],
      connectionTimeoutMillis: 5000,
    });
    await db.connect();
    try {
      await db.query("BEGIN");
      // Explicitly hide public tables: all writes below target transaction-local temporary tables.
      await db.query("SET LOCAL search_path TO pg_temp");
      await db.query("CREATE TEMP TABLE plots (id varchar(50) PRIMARY KEY, status varchar(20))");
      await db.query(
        "INSERT INTO plots VALUES ('available','disponivel'),('sold','vendido'),('legacy','reservado')",
      );
      const statuses = async () =>
        (
          await db.query(
            `SELECT p.id, ${await plotStatusSql(db)} AS status FROM plots p ORDER BY p.id`,
          )
        ).rows;
      expect(await reservationsTableExists(db)).toBe(false);
      const before = await statuses();
      expect(before).toEqual([
        { id: "available", status: "disponivel" },
        { id: "legacy", status: "reservado" },
        { id: "sold", status: "vendido" },
      ]);
      await db.query("CREATE TEMP TABLE plot_reservations (plot_id varchar(50), status text)");
      await db.query("INSERT INTO plot_reservations VALUES ('available','active')");
      expect(await reservationsTableExists(db)).toBe(true);
      expect((await statuses())[0].status).toBe("reservado");
      await db.query("UPDATE plot_reservations SET status='cancelled'");
      expect(await statuses()).toEqual(before);
      // A missing unrelated relation must still raise the original error (no broad catch/retry).
      await expect(
        db.query(`SELECT ${await plotStatusSql(db)} FROM missing_plots p`),
      ).rejects.toMatchObject({ code: "42P01" });
    } finally {
      await db.query("ROLLBACK");
      await db.end();
    }
  },
  20000,
);
