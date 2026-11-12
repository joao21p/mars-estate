import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { getCurrentUser } from "@/functions/auth";
import { reservePlot } from "@/functions/reservations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReservationDialog({
  id,
  nome,
  available,
}: {
  id: string;
  nome: string;
  available: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const router = useRouter();
  async function login() {
    await navigate({ to: "/entrar", search: { returnTo: `/terrenos/${id}` } });
  }
  async function start() {
    setError("");
    setPending(true);
    setSuccess(false);
    try {
      if (!(await getCurrentUser())) {
        await login();
        return;
      }
      setOpen(true);
    } catch {
      setError("Não foi possível consultar a sessão. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  async function confirm() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await reservePlot({ data: id });
      if (!result.ok) {
        if (result.login) {
          await login();
          return;
        }
        setError(result.message);
      } else {
        setSuccess(true);
      }
      await router.invalidate();
    } catch {
      setError("Não foi possível confirmar. Consulte Minhas reservas antes de tentar novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Button
        variant="hero"
        size="lg"
        className="w-full"
        disabled={!available || pending}
        onClick={start}
      >
        {pending
          ? "Aguarde…"
          : available
            ? "Reservar terreno"
            : "Terreno indisponível para reserva"}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {success ? "Reserva fictícia confirmada" : `Reservar ${nome}?`}
            </DialogTitle>
            <DialogDescription>
              Simulação sem pagamento e sem qualquer direito de propriedade sobre Marte.
            </DialogDescription>
          </DialogHeader>
          {success ? (
            <div role="status">
              <p>Sua reserva de {nome} foi salva.</p>
              <Link to="/minhas-reservas" className="text-primary underline">
                Ver Minhas reservas
              </Link>
            </div>
          ) : (
            <Button onClick={confirm} disabled={pending || !available}>
              {pending ? "Confirmando…" : "Confirmar reserva fictícia"}
            </Button>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      {!open && error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
