import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .email("Informe um e-mail válido.");
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(12, "Use pelo menos 12 caracteres.").max(128, "Use até 128 caracteres."),
});
export const signupSchema = loginSchema.extend({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(100, "Use até 100 caracteres."),
});
export type AuthUser = { id: string; name: string; email: string };
export type AuthResult = { ok: true; user: AuthUser | null } | { ok: false; message: string };
