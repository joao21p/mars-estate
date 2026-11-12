// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { loginSchema, signupSchema } from "@/data/auth";
import { hashPassword, verifyPassword } from "@/server/auth-password";
import { createAuthService, digest } from "@/server/auth-service";
import type { Pool } from "pg";

describe("auth validation and password security", () => {
  it("normalizes email and validates all fields without trimming passwords", () => {
    expect(
      signupSchema.parse({
        name: "  Ana  ",
        email: " ANA@EXAMPLE.COM ",
        password: " space password ",
      }),
    ).toEqual({ name: "Ana", email: "ana@example.com", password: " space password " });
    expect(signupSchema.safeParse({ name: "A", email: "invalid", password: "short" }).success).toBe(
      false,
    );
    expect(loginSchema.safeParse({ email: "invalid@example.test", password: "x".repeat(129) }).success).toBe(
      false,
    );
  });
  it("uses salted scrypt and rejects wrong passwords and missing accounts", async () => {
    const first = await hashPassword("correct password");
    const second = await hashPassword("correct password");
    expect(first).not.toEqual(second);
    expect(first).not.toContain("correct password");
    expect(await verifyPassword("correct password", first)).toBe(true);
    expect(await verifyPassword("incorrect password", first)).toBe(false);
    expect(await verifyPassword("correct password")).toBe(false);
  }, 20000);
  it("rejects unauthenticated access before returning private data", async () => {
    const query = vi.fn();
    const service = createAuthService({ query, connect: vi.fn() } as unknown as Pool);
    expect(await service.current()).toBeNull();
    await expect(service.requireUser()).rejects.toThrow("Entre para acessar");
    expect(query).not.toHaveBeenCalled();
  });
  it("looks up only session hashes and enforces expiry in SQL", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const service = createAuthService({ query, connect: vi.fn() } as unknown as Pool);
    const token = "a".repeat(64);
    expect(await service.current(token)).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("s.expires_at > now()"), [
      digest(token),
    ]);
    await service.logout(token);
    expect(query).toHaveBeenLastCalledWith("DELETE FROM auth_sessions WHERE token_hash = $1", [
      digest(token),
    ]);
  });
  it("blocks attempts using atomic database counters before password work", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ attempts: 101 }] });
    const service = createAuthService({ query, connect: vi.fn() } as unknown as Pool);
    await expect(
      service.login({ email: "ana@example.com", password: "correct password" }),
    ).rejects.toThrow("Muitas tentativas");
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]![1][0]).toMatch(/^[a-f0-9]{64}$/);
  });
});
