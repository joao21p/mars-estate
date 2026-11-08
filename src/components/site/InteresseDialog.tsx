import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function InteresseDialog({ nome, disabled }: { nome: string; disabled?: boolean }) {
  const [enviado, setEnviado] = useState(false);
  return (
    <Dialog onOpenChange={(o) => !o && setEnviado(false)}>
      <DialogTrigger asChild>
        <Button variant="hero" size="lg" className="w-full" disabled={disabled}>
          {disabled ? "Terreno indisponível" : "Tenho interesse"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Interesse em {nome}</DialogTitle>
          <DialogDescription>
            Formulário demonstrativo. Nenhum dado é enviado e nenhuma compra é realizada.
          </DialogDescription>
        </DialogHeader>
        {enviado ? (
          <div className="flex gap-3 rounded-lg border border-border bg-muted p-4 text-sm" role="status">
            <Info className="h-5 w-5 shrink-0 text-copper" aria-hidden />
            <p>
              Demonstração concluída. Nenhum dado foi enviado ou armazenado. Não houve compra nem reserva real.
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado(true);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" required autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="msg">Mensagem (opcional)</Label>
              <Textarea id="msg" rows={3} />
            </div>
            <Button type="submit" variant="hero" className="w-full">
              Registrar interesse
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
