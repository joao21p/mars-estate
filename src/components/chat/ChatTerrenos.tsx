import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { ChatPanel, type MensagemChat } from "./ChatPanel";

const boasVindas: MensagemChat = {
  autor: "assistente",
  texto:
    "Olá! Sou o Mars AI. Posso ajudar você a explorar terrenos fictícios em Marte. O que gostaria de saber?",
};

export function ChatTerrenos() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemChat[]>([boasVindas]);
  const [rascunho, setRascunho] = useState("");

  const enviar = (texto: string) => {
    const mensagem = texto.trim();
    if (!mensagem) return;
    setMensagens((anteriores) => [
      ...anteriores,
      { autor: "usuario", texto: mensagem },
      {
        autor: "assistente",
        texto:
          "A integração de IA do Mars AI está em desenvolvimento. Esta interface é demonstrativa: ainda não consulto terrenos nem gero recomendações. Você pode explorar as opções no catálogo.",
      },
    ]);
    setRascunho("");
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
      />
    </Sheet>
  );
}
