import { useEffect, useId, useRef } from "react";
import { Send, Sparkles, LoaderCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { formatarArea, formatarPreco, STATUS_LABEL } from "@/data/terrenos";
import { MAX_MENSAGEM, type RecomendacaoMarsAI } from "@/data/mars-ai";
import type { FonteMarte } from "@/data/mars-science";

export interface MensagemChat {
  autor: "usuario" | "assistente";
  texto: string;
  terrenos?: RecomendacaoMarsAI[];
  fontes?: FonteMarte[];
  criterios?: string[];
  erro?: boolean;
}

interface ChatPanelProps {
  mensagens: MensagemChat[];
  rascunho: string;
  onRascunho: (texto: string) => void;
  onEnviar: (texto: string) => void;
  enviando: boolean;
  onRepetir: () => void;
}

const sugestoes = [
  "Qual é o terreno mais barato?",
  "Quais terrenos estão disponíveis?",
  "Como é a atmosfera de Marte?",
];

export function ChatPanel({
  mensagens,
  rascunho,
  onRascunho,
  onEnviar,
  enviando,
  onRepetir,
}: ChatPanelProps) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const historico = useRef<HTMLDivElement>(null);
  const campoId = useId();
  const ajudaId = useId();

  // Rola somente o histórico, sem deslocar a página sob o painel.
  useEffect(() => {
    if (historico.current) historico.current.scrollTop = historico.current.scrollHeight;
  }, [mensagens, enviando]);

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
          Vamos conversar sobre Marte e encontrar um terreno para sua exploração fictícia.
        </SheetDescription>
      </SheetHeader>

      <div
        ref={historico}
        role="log"
        aria-label="Mensagens do Mars AI"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={enviando}
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
                  : mensagem.erro
                    ? "rounded-bl-sm border-destructive/40 bg-destructive/5 text-foreground"
                    : "rounded-bl-sm border-border bg-muted/50 text-foreground",
              )}
            >
              <p className="mb-1 text-xs font-medium text-copper">
                {mensagem.autor === "usuario" ? "Você" : "Mars AI"}
              </p>
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                {mensagem.texto}
              </p>
              {mensagem.criterios?.length ? (
                <ul
                  className="mt-2 space-y-1 text-xs text-muted-foreground"
                  aria-label="Preferências interpretadas"
                >
                  {mensagem.criterios.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              ) : null}
              {mensagem.fontes?.length ? (
                <div className="mt-3 space-y-1 text-xs">
                  <p className="text-muted-foreground">Ciência real · referências consultáveis</p>
                  {mensagem.fontes.map((f) => (
                    <a
                      key={f.id}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-copper underline"
                    >
                      {f.titulo}
                    </a>
                  ))}
                </div>
              ) : null}
              {mensagem.terrenos?.map((terreno) => (
                <div
                  key={terreno.id}
                  className="mt-3 space-y-1 rounded-xl border border-copper/30 bg-background p-3"
                >
                  <Link
                    to="/terrenos/$id"
                    params={{ id: terreno.id }}
                    className="font-medium text-copper underline underline-offset-4"
                  >
                    {terreno.nome}
                  </Link>
                  <p>
                    {terreno.regiao} · {formatarArea(terreno.area)}
                  </p>
                  <p>
                    {formatarPreco(terreno.preco)} · {STATUS_LABEL[terreno.status]}
                  </p>
                  {terreno.motivos?.length ? (
                    <div className="pt-2">
                      <p className="font-medium text-copper">Por que considerar este terreno?</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {terreno.motivos.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p>{terreno.descricao}</p>
                  <p>{terreno.caracteristicas.join(" · ")}</p>
                  <p className="text-xs text-muted-foreground">
                    Dados do catálogo no momento da resposta. Valores fictícios.
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
        {enviando && (
          <p role="status" className="flex items-center gap-2 text-sm text-copper">
            <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Consultando suas preferências e preparando a resposta…
          </p>
        )}
        {!enviando && mensagens.at(-1)?.erro && (
          <Button variant="outline" size="sm" onClick={onRepetir}>
            <RotateCcw aria-hidden />
            Tentar novamente
          </Button>
        )}
      </div>

      <div className="shrink-0 space-y-3 border-t border-border bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {!mensagens.at(-1)?.erro && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sugestões de perguntas">
            {(mensagens.length === 1
              ? sugestoes
              : mensagens.at(-1)?.terrenos?.length
                ? ["Por que a primeira opção combina comigo?", "E se eu priorizar uma área maior?"]
                : ["Quero explorar terrenos", "E a água em Marte?"]
            ).map((pergunta) => (
              <Button
                key={pergunta}
                type="button"
                variant="glass"
                size="sm"
                disabled={enviando}
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
              maxLength={MAX_MENSAGEM}
              aria-describedby={ajudaId}
              placeholder="O que você quer explorar?"
              className="max-h-32 min-h-16 resize-none border-copper/30"
            />
            <Button
              type="submit"
              variant="hero"
              size="icon"
              disabled={enviando || !rascunho.trim() || rascunho.trim().length > MAX_MENSAGEM}
              aria-label="Enviar mensagem"
              className="h-11 w-11 shrink-0 motion-reduce:transform-none"
            >
              <Send aria-hidden />
            </Button>
          </div>
          <p id={ajudaId} className="text-xs leading-relaxed text-muted-foreground">
            Enter envia · Shift+Enter cria uma nova linha. Sua mensagem e um histórico curto são
            enviados ao Google Gemini. Não envie dados pessoais. Terrenos e valores fictícios. A
            conversa pode conter imprecisões; preços e status aparecem nos cards verificados.
            Reservas só são confirmadas nos detalhes.
          </p>
        </form>
      </div>
    </SheetContent>
  );
}
