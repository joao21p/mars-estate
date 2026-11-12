import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentUser, logout } from "@/functions/auth";
import { Button } from "@/components/ui/button";

export function AuthControls() {
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setMounted(true);
  }, []);
  const queryClient = useQueryClient();
  const router = useRouter();
  const {
    data: user,
    isPending,
    isError,
  } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: () => getCurrentUser(),
    enabled: mounted,
    retry: false,
    staleTime: 0,
    refetchInterval: 60_000,
  });
  async function signOut() {
    setPending(true);
    setError("");
    try {
      const result = await logout();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      queryClient.setQueryData(["auth", "user"], null);
      await router.invalidate();
    } catch {
      setError("Não foi possível sair. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {isPending ? (
        <span className="text-muted-foreground" role="status">
          Consultando sessão…
        </span>
      ) : user ? (
        <>
          <Link to="/minhas-reservas" className="text-primary">Minhas reservas</Link>
          <Link to="/conta" className="max-w-40 truncate text-primary">
            {user.name}
          </Link>
          <Button size="sm" variant="outline" onClick={signOut} disabled={pending}>
            {pending ? "Saindo…" : "Sair"}
          </Button>
        </>
      ) : (
        <>
          <Link to="/entrar" search={{ returnTo: '/conta' }}>Entrar</Link>
          <Button asChild size="sm" variant="hero">
            <Link to="/cadastro" search={{ returnTo: '/conta' }}>Cadastrar</Link>
          </Button>
        </>
      )}
      {isError && (
        <span role="status" className="text-xs text-muted-foreground">
          Sessão indisponível
        </span>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
