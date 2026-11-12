import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { plotIdSchema, reservationIdSchema, type Reservation } from "@/data/reservations";
import { createAuthService, digest } from "./auth-service";
import { AuthError } from "./auth-password";
import { reservationsTableExists } from "./reservation-schema";

type Database = Pick<Pool, "query" | "connect">;
export class ReservationError extends Error {}
export function createReservationService(db: Database) {
  const auth = createAuthService(db);
  async function requireSchema() {
    if (!(await reservationsTableExists(db)))
      throw new ReservationError(
        "As reservas ainda não estão habilitadas. Você pode continuar explorando o catálogo.",
      );
  }
  async function limit(userId: string) {
    const result = await db.query<{ attempts: number }>(
      `
      INSERT INTO auth_rate_limits AS limits (key, attempts, expires_at)
      VALUES ($1, 1, now() + interval '15 minutes')
      ON CONFLICT (key) DO UPDATE SET
        attempts = CASE WHEN limits.expires_at <= now() THEN 1 ELSE limits.attempts + 1 END,
        expires_at = CASE WHEN limits.expires_at <= now() THEN now() + interval '15 minutes' ELSE limits.expires_at END
      RETURNING attempts`,
      [digest("reservations:" + userId)],
    );
    if (result.rows[0]!.attempts > 30)
      throw new ReservationError("Muitas solicitações. Aguarde 15 minutos.");
  }
  return {
    async list(token?: string): Promise<Reservation[]> {
      const user = await auth.requireUser(token);
      await requireSchema();
      const result = await db.query(
        `
        SELECT r.id, r.plot_id, p.name AS plot_name, r.status, r.created_at, r.cancelled_at
        FROM plot_reservations r JOIN plots p ON p.id = r.plot_id
        WHERE r.user_id = $1 ORDER BY r.created_at DESC, r.id`,
        [user.id],
      );
      return result.rows.map((r) => ({
        ...r,
        created_at: r.created_at.toISOString(),
        cancelled_at: r.cancelled_at?.toISOString() ?? null,
      }));
    },
    async mutate(action: "reserve" | "cancel", input: unknown, token?: string) {
      const user = await auth.requireUser(token);
      await requireSchema();
      await limit(user.id);
      const parsed = (action === "reserve" ? plotIdSchema : reservationIdSchema).safeParse(input);
      if (!parsed.success) throw new ReservationError("Identificador inválido.");
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        // Validate and lock the session in this transaction, including concurrent logout.
        const session = await client.query(
          `SELECT user_id FROM auth_sessions
          WHERE token_hash = $1 AND user_id = $2 AND expires_at > now() FOR SHARE`,
          [digest(token!), user.id],
        );
        if (!session.rows.length) throw new AuthError("Entre para acessar sua conta.");
        if (action === "reserve") {
          const plots = await client.query("SELECT status FROM plots WHERE id = $1 FOR UPDATE", [
            parsed.data,
          ]);
          if (!plots.rows.length) throw new ReservationError("Terreno não encontrado.");
          if (plots.rows[0].status !== "disponivel")
            throw new ReservationError("Terreno indisponível para reserva.");
          const active = await client.query(
            "SELECT id FROM plot_reservations WHERE plot_id = $1 AND status = 'active'",
            [parsed.data],
          );
          if (active.rows.length) throw new ReservationError("Este terreno já está reservado.");
          await client.query(
            "INSERT INTO plot_reservations (id, user_id, plot_id) VALUES ($1, $2, $3)",
            [randomUUID(), user.id, parsed.data],
          );
        } else {
          const result = await client.query(
            `UPDATE plot_reservations
            SET status = 'cancelled', cancelled_at = clock_timestamp()
            WHERE id = $1 AND user_id = $2 AND status = 'active' RETURNING id`,
            [parsed.data, user.id],
          );
          if (!result.rows.length)
            throw new ReservationError("Reserva ativa não encontrada para sua conta.");
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        if ((error as { code?: string }).code === "23505")
          throw new ReservationError("Este terreno já está reservado.");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
