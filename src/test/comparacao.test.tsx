import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lerComparacao, type Terreno } from "@/data/terrenos";
import { Route as catalogo } from "@/routes/terrenos.index";
import { Route as detalhe } from "@/routes/terrenos.$id";

vi.mock("@/components/exploration/ExploracaoSection", () => ({ ExploracaoSection: () => null }));

const terrenos: Terreno[] = ["a", "b", "c", "d"].map((id) => ({
  id,
  nome: `Lote ${id}`,
  region_id: "jezero",
  regiao: "Jezero",
  area: 1000,
  preco: 300000,
  status: "disponivel",
  descricao: "Terreno demonstrativo",
  imagens: ["/imagem.png"],
  caracteristicas: ["Plano"],
}));
const regioes = [
  {
    id: "jezero",
    nome: "Jezero",
    tipo: "Cratera",
    descricao: "Região",
    latitude: 18,
    longitude: 77,
    imagem: "/imagem.png",
    terrenos: terrenos.map((t) => t.id),
    fato: "Fato",
    fonte: "NASA",
    fonteUrl: "https://science.nasa.gov/mars/",
  },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function abrir(url = "/terrenos/", lotes = terrenos) {
  // Use the actual page components/search validation, replacing only database loaders.
  const root = createRootRoute({ component: Outlet });
  const lista = createRoute({
    getParentRoute: () => root,
    path: "/terrenos/",
    validateSearch: catalogo.options.validateSearch!,
    loader: () => ({ terrenos: lotes, regioes }),
    component: catalogo.options.component!,
  });
  const item = createRoute({
    getParentRoute: () => root,
    path: "/terrenos/$id",
    loader: ({ params }) => ({
      terreno: terrenos.find((t) => t.id === params.id)!,
      regiao: regioes[0],
    }),
    component: detalhe.options.component!,
  });
  const history = createMemoryHistory({ initialEntries: [url] });
  const router = createRouter({ routeTree: root.addChildren([lista, item]), history });
  await router.load();
  const view = render(<RouterProvider router={router} />);
  return { router, history, ...view };
}

function selecao() {
  const section = screen.queryByRole("region", { name: "Comparação de terrenos" });
  return section
    ? within(section)
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getByRole("link").textContent)
    : [];
}

describe("Comparação pela URL", () => {
  it("mostra a barra ao selecionar, mantém ao filtrar e oculta ao limpar", async () => {
    const { router } = await abrir("/terrenos/?regiao=jezero");
    expect(screen.queryByRole("complementary", { name: "Seleção para comparação" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Comparar Lote a" }));
    const barra = await screen.findByRole("complementary", { name: "Seleção para comparação" });
    expect(within(barra).getByRole("status")).toHaveTextContent("1 de 3 terrenos selecionados");
    fireEvent.click(screen.getByRole("button", { name: "Comparar Lote b" }));
    await waitFor(() => expect(within(barra).getByRole("status")).toHaveTextContent("2 de 3"));
    fireEvent.change(screen.getByRole("textbox", { name: "Pesquisar por nome" }), { target: { value: "nenhum" } });
    expect(screen.getByText("Nenhum terreno encontrado")).toBeInTheDocument();
    expect(barra).toBeInTheDocument();
    expect(selecao()).toEqual(["Lote a", "Lote b"]);
    fireEvent.click(within(barra).getByRole("button", { name: "Limpar seleção de comparação" }));
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Seleção para comparação" })).not.toBeInTheDocument());
    expect(selecao()).toEqual([]);
    expect(router.state.location.search).toEqual({ regiao: "jezero" });
  });

  it.each([false, true])("rola até a tabela e transfere foco (movimento reduzido: %s)", async (reduced) => {
    const originalMatchMedia = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...originalMatchMedia(query), matches: reduced,
    }));
    const scrollIntoView = vi.fn();
    const previous = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: scrollIntoView });
    try {
      await abrir("/terrenos/?comparar=a");
      const tabela = screen.getByRole("region", { name: "Comparação de terrenos" });
      fireEvent.click(screen.getByRole("button", { name: "Ver comparação" }));
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: reduced ? "instant" : "smooth", block: "start" });
      expect(scrollIntoView.mock.contexts[0]).toBe(tabela);
      expect(tabela).toHaveFocus();
    } finally {
      if (previous) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", previous);
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("renderiza a tabela com os três IDs da URL JSON codificada relatada", async () => {
    const ids = ["estacao-hellas", "borda-de-jezero", "encosta-olympus"];
    const lotes = ids.map((id, index) => ({ ...terrenos[index]!, id }));
    await abrir(
      "/terrenos?comparar=%5B%22estacao-hellas%22%2C%22borda-de-jezero%22%2C%22encosta-olympus%22%5D",
      lotes,
    );
    expect(selecao()).toEqual(["Lote a", "Lote b", "Lote c"]);
    const tabela = screen.getByRole("table");
    for (const id of ids) {
      expect(tabela.querySelector(`a[href="/terrenos/${id}"]`)).toBeInTheDocument();
    }
  });

  it("normaliza IDs duplicados, inexistentes e entradas inválidas com limite de três", () => {
    expect(lerComparacao(["inexistente", "a", "a", 1, "b", "c", "d"], terrenos)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(lerComparacao("a", terrenos)).toEqual(["a"]);
    expect(lerComparacao({}, terrenos)).toEqual([]);
  });

  it("adiciona até três, remove pelos dois controles e limpa o parâmetro", async () => {
    const { router } = await abrir();
    for (const id of ["a", "b", "c"]) {
      fireEvent.click(screen.getByRole("button", { name: `Comparar Lote ${id}` }));
      await waitFor(() => expect(selecao()).toContain(`Lote ${id}`));
    }
    fireEvent.click(screen.getByRole("button", { name: "Comparar Lote d" }));
    expect(screen.getByText("Você pode comparar até 3 terrenos por vez.")).toBeInTheDocument();
    expect(selecao()).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Remover da comparação Lote a" }));
    await waitFor(() => expect(selecao()).toEqual(["Lote b", "Lote c"]));
    fireEvent.click(screen.getByRole("button", { name: "Remover Lote b" }));
    await waitFor(() => expect(selecao()).toEqual(["Lote c"]));
    fireEvent.click(screen.getByRole("button", { name: "Limpar comparação" }));
    await waitFor(() => expect(selecao()).toEqual([]));
    expect(router.state.location.search).not.toHaveProperty("comparar");
  });

  it("restaura após remontar e acompanha voltar/avançar preservando região", async () => {
    const first = await abrir("/terrenos/?comparar=a&regiao=jezero");
    expect(selecao()).toEqual(["Lote a"]);
    fireEvent.click(screen.getByRole("button", { name: "Comparar Lote b" }));
    await waitFor(() => expect(selecao()).toEqual(["Lote a", "Lote b"]));
    const url = first.router.state.location.href;
    first.history.back();
    await waitFor(() => expect(selecao()).toEqual(["Lote a"]));
    first.history.forward();
    await waitFor(() => expect(selecao()).toEqual(["Lote a", "Lote b"]));
    first.unmount();
    const second = await abrir(url);
    expect(selecao()).toEqual(["Lote a", "Lote b"]);
    expect(screen.getByRole("button", { name: "Jezero" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Todas as regiões" }));
    await waitFor(() => expect(second.router.state.location.search).not.toHaveProperty("regiao"));
    expect(selecao()).toEqual(["Lote a", "Lote b"]);
    second.history.back();
    await waitFor(() => expect(second.router.state.location.search).toHaveProperty("regiao", "jezero"));
    fireEvent.click(screen.getByRole("button", { name: "Limpar comparação" }));
    await waitFor(() => expect(selecao()).toEqual([]));
    expect(second.router.state.location.search).toEqual({ regiao: "jezero" });
    fireEvent.click(screen.getByRole("button", { name: "Todas as regiões" }));
    await waitFor(() => expect(second.router.state.location.search).not.toHaveProperty("regiao"));
    second.history.back();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Jezero" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    const limpa = second.router.state.location.href;
    second.unmount();
    await abrir(limpa);
    expect(selecao()).toEqual([]);
  });

  it("aceita a seleção pelo botão real da página de detalhes", async () => {
    await abrir("/terrenos/a");
    fireEvent.click(screen.getByRole("link", { name: "Comparar com outros terrenos" }));
    await waitFor(() => expect(selecao()).toEqual(["Lote a"]));
    fireEvent.click(screen.getByRole("button", { name: "Comparar Lote b" }));
    await waitFor(() => expect(selecao()).toEqual(["Lote a", "Lote b"]));
  });
});
