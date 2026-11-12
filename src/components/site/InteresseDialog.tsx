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
            Prévia de mensagem, sem envio ou armazenamento. Para reservar na simulação, use “Reservar terreno” nos detalhes. Este formulário não cria conta nem reserva.
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
              <Label htmlFor="msg">Mensagem de exemplo (opcional)</Label>
              <Textarea id="msg" rows={3} maxLength={1000} placeholder="O que você gostaria de saber sobre este terreno?" />
            </div>
            <Button type="submit" variant="hero" className="w-full">
              Simular mensagem — não envia
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
