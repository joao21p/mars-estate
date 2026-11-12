import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChatTerrenos } from "@/components/chat/ChatTerrenos";
import { SiteShell } from "@/components/site/Layout";
import { conversarMarsAI } from "@/functions/mars-ai";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";

vi.mock("@/functions/mars-ai", () => ({ conversarMarsAI: vi.fn() }));
beforeEach(() => {
  vi.mocked(conversarMarsAI).mockReset();
  vi.mocked(conversarMarsAI).mockResolvedValue({
    ok: true,
    texto: "Qual região você procura?",
    terrenos: [],
  });
});

vi.mock("@/components/site/Header", () => ({ Header: () => <header>Cabeçalho</header> }));
vi.mock("@/components/site/Footer", () => ({ Footer: () => <footer>Rodapé</footer> }));

afterEach(cleanup);

async function abrir() {
  const botao = screen.getByRole("button", { name: "Abrir assistente Mars AI" });
  botao.focus();
  fireEvent.click(botao);
  const painel = await screen.findByRole("dialog", { name: "Mars AI" });
  const campo = within(painel).getByRole("textbox", { name: "Mensagem para Mars AI" });
  await waitFor(() => expect(campo).toHaveFocus());
  return { botao, painel, campo };
}

describe("Interface Mars AI", () => {
  it("integra ao layout, abre com mensagem inicial e fecha devolvendo o foco", async () => {
    render(
      <SiteShell>
        <p>Conteúdo da página</p>
      </SiteShell>,
    );
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const { painel, botao } = await abrir();
    expect(
      within(painel).getByText(
        "Olá! Sou o Mars AI. Posso ajudar você a explorar terrenos fictícios em Marte. O que gostaria de saber?",
      ),
    ).toBeInTheDocument();
    expect(
      within(painel).getByText(
        "Vamos conversar sobre Marte e encontrar um terreno para sua exploração fictícia.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(within(painel).getByRole("button", { name: "Fechar assistente Mars AI" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(botao).toHaveFocus());
    await abrir();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(botao).toHaveFocus());
  });

  it("envia pelo botão e Enter, preserva múltiplas linhas e consulta o servidor", async () => {
    render(<ChatTerrenos />);
    const { painel, campo } = await abrir();
    const enviar = within(painel).getByRole("button", { name: "Enviar mensagem" });
    const log = within(painel).getByRole("log", { name: "Mensagens do Mars AI" });
    expect(enviar).toBeDisabled();
    fireEvent.change(campo, { target: { value: "   " } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(within(log).queryByText("Você")).not.toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "Quero explorar\nMarte" } });
    fireEvent.keyDown(campo, { key: "Enter", shiftKey: true });
    expect(within(log).queryByText("Você")).not.toBeInTheDocument();
    expect(campo).toHaveValue("Quero explorar\nMarte");
    fireEvent.click(enviar);
    expect(within(log).getByText("Quero explorar Marte")).toHaveTextContent("Quero explorar Marte");
    await within(log).findByText("Qual região você procura?");
    expect(conversarMarsAI).toHaveBeenCalledWith(
      expect.objectContaining({ data: { mensagem: "Quero explorar\nMarte", historico: [] } }),
    );
    await waitFor(() => expect(enviar).toBeDisabled());
    expect(campo).toHaveValue("");
    expect(campo).toHaveFocus();
    fireEvent.change(campo, { target: { value: "Quais terrenos existem?" } });
    fireEvent.keyDown(campo, { key: "Enter", isComposing: true });
    expect(within(log).queryByText("Quais terrenos existem?")).not.toBeInTheDocument();
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(within(log).getByText("Quais terrenos existem?")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(log).getAllByText("Qual região você procura?")).toHaveLength(2),
    );
    expect(conversarMarsAI).toHaveBeenCalledTimes(2);
    expect(campo).toHaveValue("");
  });

  it("envia sugestões e preserva histórico e rascunho ao reabrir", async () => {
    render(<ChatTerrenos />);
    const { painel, campo } = await abrir();
    expect(
      within(painel).getByRole("button", { name: "Quais terrenos estão disponíveis?" }),
    ).toBeInTheDocument();
    fireEvent.click(within(painel).getByRole("button", { name: "Qual é o terreno mais barato?" }));
    const log = within(painel).getByRole("log");
    expect(within(log).getByText("Qual é o terreno mais barato?")).toBeInTheDocument();
    await within(log).findByText("Qual região você procura?");
    fireEvent.change(campo, { target: { value: "Meu rascunho" } });
    fireEvent.keyDown(campo, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const reaberto = await abrir();
    expect(within(reaberto.painel).getByRole("log")).toHaveTextContent(
      "Qual é o terreno mais barato?",
    );
    expect(reaberto.campo).toHaveValue("Meu rascunho");
  });

  it("bloqueia envios duplicados e informa falha de rede sem perder o histórico", async () => {
    let rejeitar!: (motivo: Error) => void;
    vi.mocked(conversarMarsAI).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejeitar = reject;
        }),
    );
    render(<ChatTerrenos />);
    const { painel, campo } = await abrir();
    fireEvent.change(campo, { target: { value: "Até 500 mil" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(within(painel).getByRole("status")).toHaveTextContent("Consultando");
    expect(within(painel).getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    fireEvent.change(campo, { target: { value: "Nova mensagem" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(conversarMarsAI).toHaveBeenCalledTimes(1);
    rejeitar(new Error("rede"));
    await within(painel).findByText(
      "Não consegui receber a resposta do Mars AI. Tente novamente em instantes.",
    );
    expect(within(painel).getByText("Até 500 mil")).toBeInTheDocument();
    expect(campo).toHaveValue("Nova mensagem");
    expect(within(painel).getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });

  it("mostra a mensagem amigável retornada pelo servidor", async () => {
    vi.mocked(conversarMarsAI).mockResolvedValue({
      ok: false,
      texto: "Cota temporariamente esgotada.",
    });
    render(<ChatTerrenos />);
    const { painel } = await abrir();
    fireEvent.click(within(painel).getByRole("button", { name: "Qual é o terreno mais barato?" }));
    await within(painel).findByText("Cota temporariamente esgotada.");
  });

  it("repete manualmente após erro sem duplicar a pergunta nem enviar a falha no histórico", async () => {
    vi.mocked(conversarMarsAI)
      .mockRejectedValueOnce(new Error("rede"))
      .mockResolvedValueOnce({ ok: true, texto: "Vamos explorar as paisagens?", terrenos: [] });
    render(<ChatTerrenos />);
    const { painel, campo } = await abrir();
    fireEvent.click(within(painel).getByRole("button", { name: "Qual é o terreno mais barato?" }));
    const repetir = await within(painel).findByRole("button", { name: "Tentar novamente" });
    fireEvent.change(campo, { target: { value: "Meu próximo assunto" } });
    fireEvent.click(repetir);
    await within(painel).findByText("Vamos explorar as paisagens?");
    expect(conversarMarsAI).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: { mensagem: "Qual é o terreno mais barato?", historico: [] },
      }),
    );
    expect(within(painel).getAllByText("Qual é o terreno mais barato?")).toHaveLength(1);
    expect(campo).toHaveValue("Meu próximo assunto");
    expect(
      within(painel).queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument();
  });

  it("mostra ciência e fontes estáticas e mantém sugestões de acompanhamento", async () => {
    vi.mocked(conversarMarsAI).mockResolvedValue({
      ok: true,
      texto: "A atmosfera é fina e rica em dióxido de carbono.",
      terrenos: [],
      fontes: [
        {
          id: "mars-facts",
          titulo: "NASA — Fatos sobre Marte",
          url: "https://science.nasa.gov/mars/facts/",
        },
      ],
    });
    render(<ChatTerrenos />);
    const { painel } = await abrir();
    fireEvent.click(within(painel).getByRole("button", { name: "Como é a atmosfera de Marte?" }));
    const fonte = await within(painel).findByRole("link", { name: "NASA — Fatos sobre Marte" });
    expect(fonte).toHaveAttribute("href", "https://science.nasa.gov/mars/facts/");
    expect(within(painel).getByRole("button", { name: "E a água em Marte?" })).toBeInTheDocument();
  });

  it("renderiza recomendações do servidor com link interno, preço e status", async () => {
    vi.mocked(conversarMarsAI).mockResolvedValue({
      ok: true,
      texto: "Opção encontrada no catálogo.",
      criterios: ["Orçamento interpretado: até R$ 500.000"],
      terrenos: [
        {
          id: "borda-jezero",
          nome: "Borda de Jezero",
          regiao: "Jezero",
          area: 2000,
          preco: 123456,
          status: "disponivel",
          descricao: "Paisagem fictícia",
          caracteristicas: ["Elevado"],
          motivos: ["Para sua exploração: Elevado."],
        },
      ],
    });
    const raiz = createRootRoute({ component: ChatTerrenos });
    const detalhe = createRoute({ getParentRoute: () => raiz, path: "/terrenos/$id" });
    const router = createRouter({
      routeTree: raiz.addChildren([detalhe]),
      history: createMemoryHistory({ initialEntries: ["/"] }),
    });
    render(<RouterProvider router={router} />);
    await screen.findByRole("button", { name: "Abrir assistente Mars AI" });
    const { painel } = await abrir();
    fireEvent.click(within(painel).getByRole("button", { name: "Qual é o terreno mais barato?" }));
    const link = await within(painel).findByRole("link", { name: "Borda de Jezero" });
    expect(link).toHaveAttribute("href", "/terrenos/borda-jezero");
    expect(within(painel).getByText(/123\.456/)).toHaveTextContent("Disponível");
    expect(within(painel).getByText("Paisagem fictícia")).toBeInTheDocument();
    expect(within(painel).getByText("Para sua exploração: Elevado.")).toBeInTheDocument();
    expect(
      within(painel).getByRole("list", { name: "Preferências interpretadas" }),
    ).toHaveTextContent("500.000");
    const campo = within(painel).getByRole("textbox", { name: "Mensagem para Mars AI" });
    await waitFor(() => expect(within(painel).queryByRole("status")).not.toBeInTheDocument());
    fireEvent.change(campo, { target: { value: "Quero saber sobre a primeira opção" } });
    fireEvent.keyDown(campo, { key: "Enter" });
    await waitFor(() => expect(conversarMarsAI).toHaveBeenCalledTimes(2));
    expect(conversarMarsAI).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: {
          mensagem: "Quero saber sobre a primeira opção",
          historico: [
            { autor: "usuario", texto: "Qual é o terreno mais barato?" },
            {
              autor: "assistente",
              texto: "Opção encontrada no catálogo.\nIDs citados, na ordem: borda-jezero",
            },
          ],
        },
      }),
    );
  });
});
