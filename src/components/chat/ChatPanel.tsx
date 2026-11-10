import { useEffect, useId, useRef } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface MensagemChat {
  autor: "usuario" | "assistente";
  texto: string;
}

interface ChatPanelProps {
  mensagens: MensagemChat[];
  rascunho: string;
  onRascunho: (texto: string) => void;
  onEnviar: (texto: string) => void;
}

const sugestoes = ["Qual é o terreno mais barato?", "Quais terrenos estão disponíveis?"];

export function ChatPanel({ mensagens, rascunho, onRascunho, onEnviar }: ChatPanelProps) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const historico = useRef<HTMLDivElement>(null);
  const campoId = useId();
  const ajudaId = useId();

  // Rola somente o histórico, sem deslocar a página sob o painel.
  useEffect(() => {
    if (historico.current) historico.current.scrollTop = historico.current.scrollHeight;
  }, [mensagens]);

  return (
    <SheetContent
      side="right"
      closeLabel="Fechar assistente Mars AI"
      className="inset-y-auto bottom-0 top-0 flex h-dvh w-full flex-col gap-0 border-copper/30 p-0 sm:w-full sm:max-w-md motion-reduce:animate-none motion-reduce:transition-none"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        campo.current?.focus();
        if (historico.current) historico.current.scrollTop = historico.current.scrollHeight;
      }}
    >
      <SheetHeader className="shrink-0 border-b border-border px-5 pb-5 pt-6 text-left">
        <SheetTitle className="flex items-center gap-2 pr-8 font-display text-2xl">
          <Sparkles className="h-5 w-5 text-copper" aria-hidden /> Mars AI
        </SheetTitle>
        <SheetDescription>
          Seu assistente para explorar Marte. IA em desenvolvimento.
        </SheetDescription>
      </SheetHeader>

      <div
        ref={historico}
        role="log"
        aria-label="Mensagens do Mars AI"
        aria-live="polite"
        aria-relevant="additions"
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5 focus-visible:outline focus-visible:outline-ring"
      >
        {mensagens.map((mensagem, index) => (
          <div
            key={index}
            className={cn("flex", mensagem.autor === "usuario" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
                mensagem.autor === "usuario"
                  ? "rounded-br-sm border-copper/40 bg-copper/15 text-foreground"
                  : "rounded-bl-sm border-border bg-muted/50 text-foreground",
              )}
            >
              <p className="mb-1 text-xs font-medium text-copper">
                {mensagem.autor === "usuario" ? "Você" : "Mars AI"}
              </p>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {mensagem.texto}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {mensagens.length === 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões de perguntas">
            {sugestoes.map((pergunta) => (
              <Button
                key={pergunta}
                type="button"
                variant="glass"
                size="sm"
                className="h-auto whitespace-normal py-2 text-left"
                onClick={() => {
                  onEnviar(pergunta);
                  campo.current?.focus();
                }}
              >
                {pergunta}
              </Button>
            ))}
          </div>
        )}
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            onEnviar(rascunho);
            campo.current?.focus();
          }}
        >
          <label htmlFor={campoId} className="sr-only">
            Mensagem para Mars AI
          </label>
          <div className="flex items-end gap-2">
            <Textarea
              id={campoId}
              ref={campo}
              value={rascunho}
              onChange={(event) => onRascunho(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              maxLength={2000}
              aria-describedby={ajudaId}
              placeholder="O que você quer explorar?"
              className="max-h-32 min-h-16 resize-none border-copper/30"
            />
            <Button
              type="submit"
              variant="hero"
              size="icon"
              disabled={!rascunho.trim()}
              aria-label="Enviar mensagem"
              className="h-11 w-11 shrink-0 motion-reduce:transform-none"
            >
              <Send aria-hidden />
            </Button>
          </div>
          <p id={ajudaId} className="text-xs leading-relaxed text-muted-foreground">
            Enter envia · Shift+Enter cria uma nova linha. Interface demonstrativa, sem IA
            conectada.
          </p>
        </form>
      </div>
    </SheetContent>
  );
}
