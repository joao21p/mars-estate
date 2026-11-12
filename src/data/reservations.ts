import { z } from "zod";

// PostgreSQL uses varchar(50) slug IDs, not UUIDs, for plots.
export const plotIdSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const reservationIdSchema = z.string().uuid();
export type Reservation = {
  id: string;
  plot_id: string;
  plot_name: string;
  status: "active" | "cancelled";
  created_at: string;
  cancelled_at: string | null;
};
export type ReservationResult = { ok: true } | { ok: false; message: string; login?: boolean };

// Explicit allowlist, shared by login/signup and their links. No arbitrary URLs.
export function safeReturnTo(value: unknown): string {
  if (value === "/minhas-reservas") return value;
  if (
    typeof value === "string" &&
    /^\/terrenos\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) &&
    value.slice("/terrenos/".length).length <= 50
  )
    return value;
  return "/conta";
}
