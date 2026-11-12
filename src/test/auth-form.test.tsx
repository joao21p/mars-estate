import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/AuthForm";

const mocks = vi.hoisted(() => ({ login: vi.fn(), signup: vi.fn(), navigate: vi.fn() }));
vi.mock("@/functions/auth", () => ({ login: mocks.login, signup: mocks.signup }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: async () => {} }),
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function form(mode: "login" | "signup") {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <AuthForm mode={mode} />
    </QueryClientProvider>,
  );
  return client;
}
describe("auth forms", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);
  it("validates signup locally before contacting the server", async () => {
    form("signup");
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "A" } });
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "correct password" } });
    fireEvent.submit(screen.getByRole("button", { name: "Cadastrar" }).closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("pelo menos 2");
    expect(mocks.signup).not.toHaveBeenCalled();
  });
  it("submits normalized login, updates header cache and opens the protected account", async () => {
    const user = { id: "id", name: "Ana", email: "ana@example.com" };
    mocks.login.mockResolvedValue({ ok: true, user });
    const client = form("login");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ANA@EXAMPLE.COM" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "correct password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/conta" }));
    expect(mocks.login).toHaveBeenCalledWith({
      data: { email: "ana@example.com", password: "correct password" },
    });
    expect(client.getQueryData(["auth", "user"])).toEqual(user);
  });
  it("shows generic server errors without navigating", async () => {
    mocks.login.mockResolvedValue({ ok: false, message: "E-mail ou senha inválidos." });
    form("login");
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "ana@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "wrong password" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha inválidos.");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
