// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getCookie: vi.fn(),
  mutate: vi.fn(),
  list: vi.fn(),
  header: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: mocks.request,
  getCookie: mocks.getCookie,
  setResponseHeader: mocks.header,
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
}));
vi.mock("@/server/db", () => ({ pool: {} }));
vi.mock("@/server/reservation-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/server/reservation-service")>();
  return { ...original, createReservationService: () => mocks };
});
import { listReservations, mutateReservation } from "@/server/reservations";
import { AuthError } from "@/server/auth-password";
import { ReservationError } from "@/server/reservation-service";
beforeEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  mocks.getCookie.mockReturnValue("session-only");
  mocks.request.mockReturnValue(
    new Request("http://localhost/action", {
      method: "POST",
      headers: { origin: "http://localhost" },
    }),
  );
});
describe("reservations HTTP boundary", () => {
  it("rejects cross-site and missing Origin before mutations", async () => {
    for (const headers of [
      {},
      { origin: "https://evil.example" },
      { origin: "http://localhost", "sec-fetch-site": "cross-site" },
    ]) {
      mocks.request.mockReturnValue(
        new Request("http://localhost/action", { method: "POST", headers }),
      );
      expect((await mutateReservation("reserve", "borda-de-jezero")).ok).toBe(false);
    }
    expect(mocks.mutate).not.toHaveBeenCalled();
  });
  it("passes only session cookie as identity and disables caching", async () => {
    expect(await mutateReservation("reserve", "borda-de-jezero")).toEqual({ ok: true });
    expect(mocks.mutate).toHaveBeenCalledWith("reserve", "borda-de-jezero", "session-only");
    expect(mocks.header).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
  it("handles expired sessions, conflicts and unexpected errors without leaking details", async () => {
    mocks.mutate.mockRejectedValueOnce(new AuthError("Entre para acessar sua conta."));
    expect(await mutateReservation("reserve", "x")).toMatchObject({ ok: false, login: true });
    mocks.mutate.mockRejectedValueOnce(new ReservationError("Este terreno já está reservado."));
    expect(await mutateReservation("reserve", "x")).toEqual({
      ok: false,
      message: "Este terreno já está reservado.",
    });
    mocks.mutate.mockRejectedValueOnce(new Error("database credentials"));
    expect(await mutateReservation("cancel", "x")).toEqual({
      ok: false,
      message: "Reservas indisponíveis. Tente novamente mais tarde.",
    });
  });
  it("protects listing and preserves the login return destination", async () => {
    mocks.list.mockRejectedValueOnce(new AuthError("Entre para acessar sua conta."));
    await expect(listReservations()).rejects.toMatchObject({
      options: { to: "/entrar", search: { returnTo: "/minhas-reservas" } },
    });
    mocks.list.mockResolvedValueOnce([]);
    expect(await listReservations()).toEqual([]);
    expect(mocks.list).toHaveBeenCalledWith("session-only");
  });
});
