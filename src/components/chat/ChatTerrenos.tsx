import { useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ChatPanel, type MensagemChat } from "./ChatPanel";
import { conversarMarsAI } from "@/functions/mars-ai";
import { MAX_HISTORICO, MAX_MENSAGEM } from "@/data/mars-ai";

const boasVindas: MensagemChat = {
  autor: "assistente",
  texto:
    "Olá! Sou o Mars AI. Posso ajudar você a explorar terrenos fictícios em Marte. O que gostaria de saber?",
};

export function ChatTerrenos() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([boasVindas]);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ocupado = useRef(false);
  const ultimaTentativa = useRef("");

  const enviar = async (texto: string, repetir = false) => {
    const mensagem = texto.trim();
    if (!mensagem || mensagem.length > MAX_MENSAGEM || ocupado.current) return;
    ocupado.current = true;
    ultimaTentativa.current = mensagem;
    setEnviando(true);
    // Keep the transport bounded independently of the visible conversation.
    const base = repetir ? mensagens.slice(0, -2) : mensagens;
    const historico = base
      .filter((item) => item !== boasVindas && !item.erro)
      .slice(-MAX_HISTORICO)
      .map(({ autor, texto: conteudo, terrenos }) => ({
        autor,
        texto:
          `${conteudo.slice(0, autor === "assistente" ? 600 : 1000)}${terrenos?.length ? `\nIDs citados, na ordem: ${terrenos.map((terreno) => terreno.id).join(", ")}` : ""}`.slice(
            0,
            1000,
          ),
      }));
    setMensagens((anteriores) => [
      ...(repetir ? anteriores.slice(0, -2) : anteriores).slice(-39),
      { autor: "usuario", texto: mensagem },
    ]);
    if (!repetir) setRascunho("");
    try {
      const resposta = await conversarMarsAI({
        data: { mensagem, historico },
        signal: AbortSignal.timeout(35000),
      });
      setMensagens((anteriores) => [
        ...anteriores,
        {
          autor: "assistente",
          texto: resposta.texto,
          terrenos: resposta.ok ? resposta.terrenos : [],
          erro: !resposta.ok,
          ...(resposta.ok && resposta.fontes ? { fontes: resposta.fontes } : {}),
          ...(resposta.ok && resposta.criterios ? { criterios: resposta.criterios } : {}),
        },
      ]);
    } catch {
      setMensagens((anteriores) => [
        ...anteriores,
        {
          autor: "assistente",
          erro: true,
          texto: "Não consegui receber a resposta do Mars AI. Tente novamente em instantes.",
        },
      ]);
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  };

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      {/* Espaço no fim da página para o botão não bloquear os últimos controles. */}
      <div className="h-24" aria-hidden />
      <SheetTrigger asChild>
        <Button
          variant="hero"
          aria-label="Abrir assistente Mars AI"
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-40 h-12 rounded-full border border-copper/40 px-4 shadow-glow motion-reduce:transform-none"
        >
          <MessageCircle aria-hidden />
          <span>Mars AI</span>
        </Button>
      </SheetTrigger>
      <ChatPanel
        mensagens={mensagens}
        rascunho={rascunho}
        onRascunho={setRascunho}
        onEnviar={enviar}
        enviando={enviando}
        onRepetir={() => enviar(ultimaTentativa.current, true)}
      />
    </Sheet>
  );
}
