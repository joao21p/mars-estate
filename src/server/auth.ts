import {
  deleteCookie,
  getCookie,
  getRequest,
  setCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";
import type { AuthResult } from "@/data/auth";
import { pool } from "./db";
import { createAuthService, SESSION_SECONDS } from "./auth-service";
import { AuthError } from "./auth-password";

const service = createAuthService(pool);
export const cookieName = () =>
  process.env["NODE_ENV"] === "production" ? "__Host-mars_session" : "mars_session";
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "lax" as const,
  path: "/",
});

export function assertAuthOrigin(request: Request, configuredOrigin = process.env["AUTH_ORIGIN"]) {
  const origin = request.headers.get("origin");
  const expected = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(request.url).origin;
  if (process.env["NODE_ENV"] === "production" && !configuredOrigin)
    throw new AuthError("Autenticação indisponível. Configure a origem da aplicação.");
  if (
    request.method !== "POST" ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AuthError("Requisição inválida. Atualize a página e tente novamente.");
  }
}

export async function mutateAuth(
  action: "signup" | "login" | "logout",
  data?: unknown,
): Promise<AuthResult> {
  setResponseHeader("Cache-Control", "no-store");
  try {
    assertAuthOrigin(getRequest());
    const previous = getCookie(cookieName());
    if (action === "logout") {
      await service.logout(previous);
      deleteCookie(cookieName(), cookieOptions());
      return { ok: true, user: null };
    }
    const result = await service[action](data, previous);
    setCookie(cookieName(), result.token, { ...cookieOptions(), maxAge: SESSION_SECONDS });
    return { ok: true, user: result.user };
  } catch (error) {
    // Never serialize database errors, credentials or session tokens to clients/logs.
    return {
      ok: false,
      message:
        error instanceof AuthError
          ? error.message
          : "Autenticação indisponível. Tente novamente mais tarde.",
    };
  }
}

export async function currentUser(required = false) {
  setResponseHeader("Cache-Control", "no-store");
  const token = getCookie(cookieName());
  try {
    return required ? await service.requireUser(token) : await service.current(token);
  } catch (error) {
    if (error instanceof AuthError) return null;
    throw new Error("Não foi possível consultar a sessão. Tente novamente.");
  }
}
