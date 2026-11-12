import { getCookie, getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";
import type { ReservationResult } from "@/data/reservations";
import { pool } from "./db";
import { assertAuthOrigin, cookieName } from "./auth";
import { AuthError } from "./auth-password";
import { createReservationService, ReservationError } from "./reservation-service";

const service = createReservationService(pool);
export async function listReservations() {
  setResponseHeader("Cache-Control", "no-store");
  try {
    return await service.list(getCookie(cookieName()));
  } catch (error) {
    if (error instanceof AuthError)
      throw redirect({ to: "/entrar", search: { returnTo: "/minhas-reservas" } });
    throw new Error("Não foi possível consultar suas reservas. Tente novamente.");
  }
}
export async function mutateReservation(
  action: "reserve" | "cancel",
  data: unknown,
): Promise<ReservationResult> {
  setResponseHeader("Cache-Control", "no-store");
  try {
    assertAuthOrigin(getRequest());
    await service.mutate(action, data, getCookie(cookieName()));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof AuthError || error instanceof ReservationError
          ? error.message
          : "Reservas indisponíveis. Tente novamente mais tarde.",
      ...(error instanceof AuthError && error.message === "Entre para acessar sua conta."
        ? { login: true }
        : {}),
    };
  }
}
