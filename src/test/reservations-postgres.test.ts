// @vitest-environment node
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { expect, it } from "vitest";
import { createAuthService } from "@/server/auth-service";
import { createReservationService } from "@/server/reservation-service";

it.skipIf(process.env["RESERVATIONS_TEST_POSTGRES"] !== "1")(
  "PostgreSQL: two accounts, ownership, race, rollback, cancellation and limits",
  async () => {
    loadEnvFile(".env");
    const schema = `mars_reservation_test_${Date.now()}`;
    const config = {
      host: process.env["DATABASE_HOST"],
      port: Number(process.env["DATABASE_PORT"] || 5432),
      database: process.env["DATABASE_NAME"],
      user: process.env["DATABASE_USER"],
      password: process.env["DATABASE_PASSWORD"],
      connectionTimeoutMillis: 5000,
    };
    const admin = new pg.Client(config);
    await admin.connect();
    let db: pg.Pool | undefined;
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      await admin.query(`SET search_path TO ${schema}`);
      await admin.query("CREATE TABLE plots (LIKE public.plots INCLUDING ALL)");
      await admin.query("INSERT INTO plots SELECT * FROM public.plots");
      for (const file of ["20261111_001_auth.sql"])
        await admin.query(
          await readFile(new URL(`../../migrations/${file}`, import.meta.url), "utf8"),
        );
      db = new pg.Pool({ ...config, options: `-c search_path=${schema}`, max: 8 });
      const auth = createAuthService(db);
      const reservations = createReservationService(db);
      const input = { name: "Conta Um", email: "one@example.test", password: "test password 123" };
      const a = await auth.signup(input);
      const second = { ...input, name: "Conta Dois", email: "two@example.test" };
      const b = await auth.signup(second, a.token);
      expect(await auth.current(a.token)).toBeNull();
      expect((await auth.current(b.token))?.id).toBe(b.user.id);
      await auth.logout(b.token);
      const aLogin = await auth.login(input);
      expect((await auth.current(aLogin.token))?.id).toBe(a.user.id);
      await auth.logout(aLogin.token);
      const bLogin = await auth.login(second);
      expect((await auth.current(bLogin.token))?.id).toBe(b.user.id);
      const aAgain = await auth.login(input);
      await expect(reservations.list()).rejects.toThrow("Entre");
      await expect(reservations.mutate("reserve", "borda-de-jezero")).rejects.toThrow("Entre");
      await expect(reservations.list(aAgain.token)).rejects.toThrow("ainda não estão habilitadas");
      await expect(reservations.mutate("reserve", "borda-de-jezero", aAgain.token)).rejects.toThrow(
        "ainda não estão habilitadas",
      );
      // Apply only in this newly created disposable schema. The next request detects it.
      await admin.query(
        await readFile(
          new URL("../../migrations/20261111_002_reservations.sql", import.meta.url),
          "utf8",
        ),
      );
      expect(await reservations.list(aAgain.token)).toEqual([]);
      await expect(reservations.mutate("reserve", "vale-ares", aAgain.token)).rejects.toThrow(
        "indisponível",
      );
      await expect(reservations.mutate("reserve", "anel-gale", aAgain.token)).rejects.toThrow(
        "indisponível",
      );
      await expect(reservations.mutate("reserve", "missing", aAgain.token)).rejects.toThrow(
        "não encontrado",
      );
      await expect(
        reservations.mutate("reserve", "'; DROP TABLE plots", aAgain.token),
      ).rejects.toThrow("inválido");
      await expect(
        reservations.mutate(
          "reserve",
          { plot_id: "borda-de-jezero", user_id: b.user.id },
          aAgain.token,
        ),
      ).rejects.toThrow("inválido");
      const race = await Promise.allSettled([
        reservations.mutate("reserve", "borda-de-jezero", aAgain.token),
        reservations.mutate("reserve", "borda-de-jezero", bLogin.token),
      ]);
      expect(race.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(race.filter((r) => r.status === "rejected")).toHaveLength(1);
      const all = await db.query("SELECT * FROM plot_reservations WHERE status = 'active'");
      expect(all.rows).toHaveLength(1);
      const owner = all.rows[0].user_id === a.user.id ? aAgain : bLogin;
      const other = owner === aAgain ? bLogin : aAgain;
      expect(await reservations.list(other.token)).toEqual([]);
      expect(await reservations.list(owner.token)).toHaveLength(1);
      await expect(reservations.mutate("cancel", all.rows[0].id, other.token)).rejects.toThrow(
        "sua conta",
      );
      await expect(reservations.mutate("reserve", "borda-de-jezero", owner.token)).rejects.toThrow(
        "reservado",
      );
      // Unique index also protects callers outside the application transaction protocol.
      await expect(
        db.query(
          "INSERT INTO plot_reservations (id,user_id,plot_id) VALUES (gen_random_uuid(),$1,$2)",
          [other.user.id, "borda-de-jezero"],
        ),
      ).rejects.toMatchObject({ code: "23505" });
      const effective = async () =>
        (
          await db!.query(`SELECT CASE WHEN p.status = 'disponivel' AND EXISTS
      (SELECT 1 FROM plot_reservations r WHERE r.plot_id=p.id AND r.status='active') THEN 'reservado' ELSE p.status END AS status
      FROM plots p WHERE id='borda-de-jezero'`)
        ).rows[0].status;
      expect(await effective()).toBe("reservado");
      await reservations.mutate("cancel", all.rows[0].id, owner.token);
      expect(await effective()).toBe("disponivel");
      expect((await reservations.list(owner.token))[0]).toMatchObject({
        status: "cancelled",
        cancelled_at: expect.any(String),
      });
      await reservations.mutate("reserve", "borda-de-jezero", other.token);
      expect(await effective()).toBe("reservado");
      await db.query("UPDATE auth_rate_limits SET attempts=30");
      await expect(reservations.mutate("reserve", "encosta-olympus", owner.token)).rejects.toThrow(
        "Muitas",
      );
      expect(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM plot_reservations WHERE plot_id='encosta-olympus'",
          )
        ).rows[0].n,
      ).toBe(0);
    } finally {
      await db?.end();
      // Only the exact disposable schema generated by this test is removed.
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  },
  30000,
);
