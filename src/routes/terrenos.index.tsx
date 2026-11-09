import { listarRegioesBanco } from "@/functions/regioes";
import { createFileRoute } from "@tanstack/react-router";
import { listarTerrenosBanco } from "@/functions/terrenos";
import { useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { ArrowUpDown, Columns2, Search, SearchX, X } from "lucide-react";
import { filtrarTerrenos } from "@/data/regioes";
import { ExploracaoSection } from "@/components/exploration/ExploracaoSection";
import { STATUS_LABEL } from "@/data/terrenos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  alternarComparacao,
  lerComparacao,
  formatarArea,
  formatarPreco,
  ordenarTerrenos,
  MAX_COMPARACAO,
  type OrdemTerrenos,
  type StatusTerreno,
} from "@/data/terrenos";
import { TerrenoCard, TerrenoCardSkeleton } from "@/components/site/TerrenoCard";
import { PageHeader } from "@/components/site/Layout";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terrenos/")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { comparar?: string | string[]; regiao?: string } = {};
    const comparar = search["comparar"];
    if (typeof comparar === "string") out.comparar = comparar;
    else if (Array.isArray(comparar)) {
      out.comparar = comparar.filter((id): id is string => typeof id === "string");
    }
    if (typeof search["regiao"] === "string") out.regiao = search["regiao"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Explorar Terrenos — Mars Estate" },
      { name: "description", content: "Explore regiões de Marte no globo interativo e descubra terrenos fictícios com filtros por preço, área e disponibilidade." },
      { property: "og:title", content: "Explorar Terrenos — Mars Estate" },
      { property: "og:description", content: "Exploração planetária interativa com catálogo de terrenos fictícios em Marte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const [terrenos, regioes] = await Promise.all([listarTerrenosBanco(), listarRegioesBanco()]);
    return { terrenos, regioes };
  },
  pendingComponent: () => (
    <>
      <PageHeader eyebrow="Exploração planetária" title="Explorar terrenos" />
      <div className="mx-auto grid max-w-7xl gap-6 px-5 pb-24 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Carregando terrenos">
        {Array.from({ length: 6 }).map((_, i) => <TerrenoCardSkeleton key={i} />)}
      </div>
    </>
  ),
  errorComponent: ({ reset }) => (
    <div className="mx-auto max-w-xl px-5 pb-24 pt-40 text-center">
      <h1 className="text-3xl font-bold">Não foi possível carregar os terrenos</h1>
      <p className="mt-3 text-muted-foreground">Tente novamente em instantes.</p>
      <Button variant="hero" className="mt-6" onClick={reset}>Tentar novamente</Button>
    </div>
  ),
  component: Catalogo,
});

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Catalogo() {
  const { terrenos, regioes } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tabelaComparacao = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  const precoMaxTotal = Math.max(0, ...terrenos.map((t) => t.preco));
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | StatusTerreno>("todos");
  const [precoMax, setPrecoMax] = useState(precoMaxTotal);
  const [areaMin, setAreaMin] = useState(0);
  const regiao = search.regiao && regioes.some((r) => r.id === search.regiao) ? search.regiao : "todas";
  const setRegiao = (id: string) => {
    void navigate({
      search: (anterior) => {
        const { regiao: _regiao, ...resto } = anterior;
        return id === "todas" ? resto : { ...resto, regiao: id };
      },
      resetScroll: false,
    });
  };
  const [ordem, setOrdem] = useState<OrdemTerrenos>("padrao");
  const comparados = lerComparacao(search.comparar, terrenos);
  const [aviso, setAviso] = useState("");
  const setComparados = (atualizar: (ids: string[]) => string[]) => {
    setAviso("");
    void navigate({
      search: (anterior) => {
        const { comparar: _comparar, ...resto } = anterior;
        const ids = atualizar(lerComparacao(anterior.comparar, terrenos));
        return ids.length ? { ...resto, comparar: ids } : resto;
      },
      resetScroll: false,
    });
  };
  const comparacao = terrenos.filter((t) => comparados.includes(t.id));
  const verComparacao = () => {
    tabelaComparacao.current?.scrollIntoView({
      behavior: reducedMotion ? "instant" : "smooth",
      block: "start",
    });
    tabelaComparacao.current?.focus({ preventScroll: true });
  };

  const filtrados = useMemo(
    () => ordenarTerrenos(filtrarTerrenos(terrenos, { busca, status, precoMax, areaMin, regiao }), ordem),
    [terrenos, busca, status, precoMax, areaMin, regiao, ordem],
  );

  const limpar = () => {
    setBusca("");
    setStatus("todos");
    setPrecoMax(precoMaxTotal);
    setAreaMin(0);
    setRegiao("todas");
    setOrdem("padrao");
  };

  const alternar = (id: string) => {
    const depois = alternarComparacao(comparados, id);
    if (depois === comparados && !comparados.includes(id)) {
      setAviso(`Você pode comparar até ${MAX_COMPARACAO} terrenos por vez.`);
      return;
    }
    setAviso("");
    setComparados((ids) => alternarComparacao(ids, id));
  };

  return (
    <>
      <PageHeader eyebrow="Exploração planetária" title="Explorar terrenos">
        Gire o globo, selecione uma região e descubra os terrenos da simulação. Dados científicos e fictícios são sempre identificados.
      </PageHeader>

      <ExploracaoSection regioes={regioes} terrenos={terrenos} regiao={regiao} onRegiao={setRegiao} />

      <section className="mx-auto max-w-7xl px-5 pb-24 pt-12" aria-label="Catálogo de terrenos">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Catálogo da simulação</h2>
          <p className="text-xs text-muted-foreground">Terrenos, preços e disponibilidade fictícios.</p>
        </div>

        <div className="grid gap-4 border-y border-border py-5 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="busca" className="text-xs text-muted-foreground">Pesquisar por nome</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Ex.: Jezero" className="h-10 pl-9" />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="status" className="text-xs text-muted-foreground">Disponibilidade</label>
            <select id="status" className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="todos">Todos</option>
              <option value="disponivel">Disponível</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="preco" className="flex justify-between text-xs text-muted-foreground">
              Preço máximo <span className="text-foreground">{formatarPreco(precoMax)}</span>
            </label>
            <input id="preco" type="range" min={200000} max={precoMaxTotal} step={50000} value={precoMax} onChange={(e) => setPrecoMax(Number(e.target.value))} className="h-10 w-full accent-primary" />
          </div>
          <div className="space-y-2">
            <label htmlFor="area" className="flex justify-between text-xs text-muted-foreground">
              Área mínima <span className="text-foreground">{formatarArea(areaMin)}</span>
            </label>
            <input id="area" type="range" min={0} max={8000} step={200} value={areaMin} onChange={(e) => setAreaMin(Number(e.target.value))} className="h-10 w-full accent-primary" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por região">
            <Button size="sm" variant={regiao === "todas" ? "secondary" : "ghost"} aria-pressed={regiao === "todas"} onClick={() => setRegiao("todas")}>Todas as regiões</Button>
            {regioes.map((r) => <Button key={r.id} size="sm" variant={regiao === r.id ? "secondary" : "ghost"} aria-pressed={regiao === r.id} onClick={() => setRegiao(r.id)}>{r.nome}</Button>)}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="ordem" className="flex items-center gap-1.5 text-xs text-muted-foreground"><ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> Ordenar</label>
            <select id="ordem" className={selectCls + " w-auto"} value={ordem} onChange={(e) => setOrdem(e.target.value as OrdemTerrenos)}>
              <option value="padrao">Padrão</option>
              <option value="preco-asc">Menor preço</option>
              <option value="preco-desc">Maior preço</option>
              <option value="area-asc">Menor área</option>
              <option value="area-desc">Maior área</option>
              <option value="nome">Nome (A–Z)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground" aria-live="polite">
          <span>{filtrados.length} {filtrados.length === 1 ? "terreno encontrado" : "terrenos encontrados"}</span>
          <Button variant="link" size="sm" onClick={limpar}>Limpar filtros</Button>
        </div>

        {comparacao.length > 0 && (
          <aside
            aria-label="Seleção para comparação"
            className="sticky top-20 z-30 mt-6 flex flex-col gap-3 rounded-xl border border-copper/40 bg-background p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="flex items-center gap-2 text-sm font-medium" role="status" aria-live="polite">
              <Columns2 className="h-4 w-4 shrink-0 text-copper" aria-hidden />
              {comparacao.length} de {MAX_COMPARACAO} terrenos selecionados
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="hero" className="flex-1 sm:flex-none" aria-controls="comparacao-terrenos" onClick={verComparacao}>
                Ver comparação
              </Button>
              <Button variant="glass" className="flex-1 sm:flex-none" aria-label="Limpar seleção de comparação" onClick={() => setComparados(() => [])}>
                <X aria-hidden /> Limpar
              </Button>
            </div>
          </aside>
        )}

        {filtrados.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border py-20 text-center">
            <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <h2 className="mt-4 text-xl font-semibold">Nenhum terreno encontrado</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ajuste os filtros para ampliar sua busca.</p>
            <Button variant="glass" className="mt-6" onClick={limpar}>Limpar filtros</Button>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtrados.map((t) => (
              <div key={t.id} className="animate-in fade-in duration-500">
                <TerrenoCard terreno={t} />
                <Button variant="ghost" size="sm" className="mt-2" aria-pressed={comparados.includes(t.id)} onClick={() => alternar(t.id)}>
                  <Columns2 /> {comparados.includes(t.id) ? "Remover da comparação" : "Comparar"} <span className="sr-only">{t.nome}</span>
                </Button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-sm text-warning" role="status" aria-live="polite">{aviso}</p>

        {comparacao.length > 0 && (
          <section id="comparacao-terrenos" ref={tabelaComparacao} tabIndex={-1} className="mt-12 scroll-mt-64 border-t border-border pt-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper sm:scroll-mt-48" aria-label="Comparação de terrenos">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Comparação · {comparacao.length} de {MAX_COMPARACAO}</h2>
              <Button variant="ghost" onClick={() => setComparados(() => [])}><X /> Limpar comparação</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-3">Terreno</th>
                    <th className="p-3">Região</th>
                    <th className="p-3">Área</th>
                    <th className="p-3">Preço fictício</th>
                    <th className="p-3">Relevo</th>
                    <th className="p-3">Status</th>
                    <th className="p-3"><span className="sr-only">Remover</span></th>
                  </tr>
                </thead>
                <tbody>
                  {comparacao.map((t) => (
                    <tr key={t.id} className="border-t border-border align-top">
                      <td className="p-3"><Link to="/terrenos/$id" params={{ id: t.id }} className="text-copper hover:underline">{t.nome}</Link></td>
                      <td className="p-3 text-muted-foreground">{t.regiao}</td>
                      <td className="p-3">{formatarArea(t.area)}</td>
                      <td className="p-3">{formatarPreco(t.preco)}</td>
                      <td className="p-3 text-muted-foreground">{t.caracteristicas.join(" · ")}</td>
                      <td className="p-3">{STATUS_LABEL[t.status]}</td>
                      <td><Button variant="ghost" size="icon" title={`Remover ${t.nome}`} aria-label={`Remover ${t.nome}`} onClick={() => setComparados((ids) => ids.filter((id) => id !== t.id))}><X /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Comparação de dados fictícios da simulação — nenhuma característica inventada indica superioridade real de um terreno.</p>
          </section>
        )}
      </section>
    </>
  );
}
