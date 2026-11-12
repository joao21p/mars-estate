import { useState, type FormEvent } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { safeReturnTo } from '@/data/reservations';
import { useQueryClient } from "@tanstack/react-query";
import { loginSchema, signupSchema } from "@/data/auth";
import { login, signup } from "@/functions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode, returnTo }: { mode: "login" | "signup"; returnTo?: string }) {
  const registering = mode === "signup";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const parsed = (registering ? signupSchema : loginSchema).safeParse(Object.fromEntries(form));
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira seus dados.");
      return;
    }
    setPending(true);
    try {
      const result = await (registering ? signup : login)({ data: parsed.data });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      queryClient.setQueryData(["auth", "user"], result.user);
      await router.invalidate();
      await navigate({ to: safeReturnTo(returnTo) });
    } catch {
      setError("Não foi possível conectar. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mx-auto max-w-lg px-5 pb-24 pt-32">
      <div className="rounded-2xl border border-border bg-card p-7 shadow-glow">
        <p className="eyebrow">Sua jornada em Marte</p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          {registering ? "Crie sua conta" : "Entre no Mars Estate"}
        </h1>
        <p className="mb-7 mt-3 text-sm text-muted-foreground">
          Explore novos horizontes com sua conta Mars Estate.
        </p>
        <form onSubmit={submit} className="space-y-5">
          {registering && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={registering ? "new-password" : "current-password"}
              required
              minLength={12}
              maxLength={128}
              aria-describedby="password-help"
            />
            <p id="password-help" className="text-xs text-muted-foreground">
              Use de 12 a 128 caracteres. Espaços são permitidos.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" variant="hero" className="w-full" disabled={pending}>
            {pending ? "Aguarde…" : registering ? "Cadastrar" : "Entrar"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-muted-foreground">
          {registering ? "Já tem uma conta? " : "Ainda não tem conta? "}
          <Link className="text-primary underline" to={registering ? "/entrar" : "/cadastro"} search={{ returnTo: safeReturnTo(returnTo) }}>
            {registering ? "Entrar" : "Cadastrar"}
          </Link>
        </p>
      </div>
    </section>
  );
}
