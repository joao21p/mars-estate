import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { getReservations, cancelReservation } from "@/functions/reservations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Reservation } from "@/data/reservations";
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/minhas-reservas")({
  loader: () => getReservations(),
  staleTime: 0,
  gcTime: 0,
  headers: () => ({ "Cache-Control": "no-store" }),
  head: () => ({
    meta: [...siteMetadata('Minhas reservas | Mars Estate', 'Consulte suas reservas fictícias no Mars Estate. Sem pagamento ou propriedade real.', '/minhas-reservas'), { name: "robots", content: "noindex" }],
  }),
  component: Reservations,
  errorComponent: () => (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-32">
      <h1 className="font-display text-3xl font-bold">Minhas reservas</h1>
      <p role="alert" className="my-5 text-muted-foreground">
        As reservas estão temporariamente indisponíveis. Você pode continuar explorando o catálogo e
        tentar novamente mais tarde.
      </p>
      <Link to="/terrenos" className="text-primary underline">
        Explorar terrenos
      </Link>
    </section>
  ),
});
function Reservations() {
  const reservations = Route.useLoaderData();
  const router = useRouter();
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function cancel() {
    if (!selected || pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await cancelReservation({ data: selected.id });
      if (!result.ok) setError(result.message);
      else {
        setMessage(`Reserva de ${selected.plot_name} cancelada.`);
        setSelected(null);
      }
      await router.invalidate();
    } catch {
      setError("Não foi possível confirmar o cancelamento. Atualize a página.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-32">
      <p className="eyebrow">Sua jornada em Marte</p>
      <h1 className="mt-3 font-display text-3xl font-bold">Minhas reservas</h1>
      <p className="my-5 text-sm text-muted-foreground">
        Reservas fictícias, sem pagamento ou direito de propriedade sobre Marte.
      </p>
      {message && (
        <p role="status" className="mb-4 text-primary">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-destructive">
          {error}
        </p>
      )}
      {!reservations.length && (
        <p>
          Você ainda não tem reservas.{" "}
          <Link to="/terrenos" className="text-primary underline">
            Explorar terrenos
          </Link>
        </p>
      )}
      <ul className="space-y-4">
        {reservations.map((r) => (
          <li key={r.id} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">
              <Link
                to="/terrenos/$id"
                params={{ id: r.plot_id }}
                className="text-primary underline"
              >
                {r.plot_name}
              </Link>
            </h2>
            <p className="text-sm">
              {r.status === "active" ? "Ativa" : "Cancelada"} ·{" "}
              <time dateTime={r.created_at}>
                {new Date(r.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
              </time>
            </p>
            {r.cancelled_at && (
              <p className="text-xs text-muted-foreground">
                Cancelada em{" "}
                <time dateTime={r.cancelled_at}>
                  {new Date(r.cancelled_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </time>
              </p>
            )}
            {r.status === "active" && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(r);
                  setError("");
                }}
                disabled={pending}
              >
                Cancelar reserva de {r.plot_name}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !pending) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar reserva?</DialogTitle>
            <DialogDescription>
              A reserva fictícia de {selected?.plot_name} será cancelada.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={cancel} disabled={pending}>
            {pending ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
