import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatTerrenos } from "@/components/chat/ChatTerrenos";
import { SiteShell } from "@/components/site/Layout";

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
      within(painel).getByText("Seu assistente para explorar Marte. IA em desenvolvimento."),
    ).toBeInTheDocument();
    fireEvent.click(within(painel).getByRole("button", { name: "Fechar assistente Mars AI" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(botao).toHaveFocus());
    await abrir();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(botao).toHaveFocus());
  });

  it("envia pelo botão e Enter, preserva múltiplas linhas e só responde com o aviso demonstrativo", async () => {
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
    expect(
      within(log).getByText(/A integração de IA do Mars AI está em desenvolvimento/),
    ).toBeInTheDocument();
    expect(campo).toHaveValue("");
    expect(campo).toHaveFocus();
    fireEvent.change(campo, { target: { value: "Quais terrenos existem?" } });
    fireEvent.keyDown(campo, { key: "Enter", isComposing: true });
    expect(within(log).queryByText("Quais terrenos existem?")).not.toBeInTheDocument();
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(within(log).getByText("Quais terrenos existem?")).toBeInTheDocument();
    expect(
      within(log).getAllByText(/A integração de IA do Mars AI está em desenvolvimento/),
    ).toHaveLength(2);
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
    expect(
      within(log).getByText(/ainda não consulto terrenos nem gero recomendações/),
    ).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: "Meu rascunho" } });
    fireEvent.keyDown(campo, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const reaberto = await abrir();
    expect(within(reaberto.painel).getByRole("log")).toHaveTextContent(
      "Qual é o terreno mais barato?",
    );
    expect(reaberto.campo).toHaveValue("Meu rascunho");
  });
});
