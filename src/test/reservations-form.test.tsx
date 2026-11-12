import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReservationDialog } from "@/components/site/ReservationDialog";
import { safeReturnTo } from "@/data/reservations";
const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  reserve: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/functions/auth", () => ({ getCurrentUser: mocks.current }));
vi.mock("@/functions/reservations", () => ({ reservePlot: mocks.reserve }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(cleanup);
function show(available = true) {
  render(<ReservationDialog id="borda-de-jezero" nome="Borda de Jezero" available={available} />);
}
it("rejects open redirects, encoding, query injection and malformed IDs", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/terrenos/%2f%2fevil",
    "/terrenos/x?next=//evil",
    "/conta#x",
    null,
  ])
    expect(safeReturnTo(value)).toBe("/conta");
  expect(safeReturnTo("/terrenos/borda-de-jezero")).toBe("/terrenos/borda-de-jezero");
  expect(safeReturnTo("/minhas-reservas")).toBe("/minhas-reservas");
});
it("redirects anonymous visitors to login with validated plot return", async () => {
  mocks.current.mockResolvedValue(null);
  show();
  fireEvent.click(screen.getByRole("button", { name: "Reservar terreno" }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/entrar",
      search: { returnTo: "/terrenos/borda-de-jezero" },
    }),
  );
  expect(mocks.reserve).not.toHaveBeenCalled();
});
it("confirms the plot and shows success only after the server resolves", async () => {
  mocks.current.mockResolvedValue({ id: "user" });
  let resolve!: (value: { ok: true }) => void;
  mocks.reserve.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  show();
  fireEvent.click(screen.getByRole("button", { name: "Reservar terreno" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar reserva fictícia" }));
  expect(screen.queryByText("Reserva fictícia confirmada")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirmando…" })).toBeDisabled();
  resolve({ ok: true });
  expect(await screen.findByText("Reserva fictícia confirmada")).toBeInTheDocument();
  expect(mocks.reserve).toHaveBeenCalledWith({ data: "borda-de-jezero" });
  expect(mocks.invalidate).toHaveBeenCalled();
});
it("shows server rejection and disables unavailable plots", async () => {
  mocks.current.mockResolvedValue({ id: "user" });
  mocks.reserve.mockResolvedValue({ ok: false, message: "Este terreno já está reservado." });
  show();
  fireEvent.click(screen.getByRole("button", { name: "Reservar terreno" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirmar reserva fictícia" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("já está reservado");
  expect(screen.queryByText("Reserva fictícia confirmada")).not.toBeInTheDocument();
  cleanup();
  show(false);
  expect(screen.getByRole("button", { name: "Terreno indisponível para reserva" })).toBeDisabled();
});
