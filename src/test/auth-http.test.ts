// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  deleteCookie: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  current: vi.fn(),
  requireUser: vi.fn(),
}));
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: mocks.request,
  getCookie: mocks.getCookie,
  setCookie: mocks.setCookie,
  deleteCookie: mocks.deleteCookie,
  setResponseHeader: vi.fn(),
}));
vi.mock("@/server/db", () => ({ pool: {} }));
vi.mock("@/server/auth-service", () => ({
  SESSION_SECONDS: 604800,
  createAuthService: () => mocks,
}));
import { assertAuthOrigin, mutateAuth } from "@/server/auth";

describe("auth HTTP boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });
  it("rejects cross-origin and missing Origin for mutations", () => {
    for (const origin of [undefined, "https://evil.example"]) {
      const request = new Request("https://mars.example/action", {
        method: "POST",
        ...(origin ? { headers: { origin } } : {}),
      });
      expect(() => assertAuthOrigin(request)).toThrow("Requisição inválida");
    }
    expect(() =>
      assertAuthOrigin(
        new Request("https://mars.example/action", {
          method: "POST",
          headers: { origin: "https://mars.example" },
        }),
      ),
    ).not.toThrow();
  });
  it("sets a production HttpOnly host cookie and never returns the token", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ORIGIN", "https://mars.example");
    mocks.request.mockReturnValue(
      new Request("https://mars.example/action", {
        method: "POST",
        headers: { origin: "https://mars.example" },
      }),
    );
    const user = { id: "id", name: "Ana", email: "ana@example.com" };
    mocks.login.mockResolvedValue({ token: "secret", user });
    expect(await mutateAuth("login", {})).toEqual({ ok: true, user });
    expect(mocks.setCookie).toHaveBeenCalledWith(
      "__Host-mars_session",
      "secret",
      expect.objectContaining({
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      }),
    );
    mocks.getCookie.mockReturnValue("secret");
    await mutateAuth("logout");
    expect(mocks.logout).toHaveBeenCalledWith("secret");
    expect(mocks.deleteCookie).toHaveBeenCalledWith(
      "__Host-mars_session",
      expect.objectContaining({ secure: true, path: "/" }),
    );
  });
  it("rejects CSRF before calling the service and hides unexpected errors", async () => {
    mocks.request.mockReturnValue(new Request("http://localhost/action", { method: "POST" }));
    expect((await mutateAuth("signup", {})).ok).toBe(false);
    expect(mocks.signup).not.toHaveBeenCalled();
    mocks.request.mockReturnValue(
      new Request("http://localhost/action", {
        method: "POST",
        headers: { origin: "http://localhost" },
      }),
    );
    mocks.signup.mockRejectedValue(new Error("sensitive database error"));
    expect(await mutateAuth("signup", {})).toEqual({
      ok: false,
      message: "Autenticação indisponível. Tente novamente mais tarde.",
    });
  });
});
