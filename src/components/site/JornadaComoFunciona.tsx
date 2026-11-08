import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  ExternalLink,
  GitCompareArrows,
  MapPin,
  Maximize,
  MousePointerClick,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatarCoordenadas, type Regiao } from "@/data/regioes";
import {
  alternarComparacao,
  formatarArea,
  formatarPreco,
  MAX_COMPARACAO,
  type Terreno,
} from "@/data/terrenos";
import { cn } from "@/lib/utils";
import { InteresseDialog } from "./InteresseDialog";
import { AvisoConceitual } from "./Steps";
import { StatusBadge } from "./StatusBadge";
import { TagDado } from "./TagDado";

const ETAPAS = [
  { id: "descubra", titulo: "Descubra Marte", icon: Compass },
  { id: "explore", titulo: "Explore as regiões", icon: MousePointerClick },
  { id: "conheca", titulo: "Conheça os terrenos", icon: GitCompareArrows },
  { id: "simule", titulo: "Simule sua escolha", icon: Send },
] as const;

export function JornadaComoFunciona({ terrenos, regioes }: { terrenos: Terreno[]; regioes: Regiao[] }) {
  const [etapa, setEtapa] = useState(0);
  const [regiaoId, setRegiaoId] = useState<string | null>(null);
  const [comparacao, setComparacao] = useState<string[]>([]);
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);

  const regiao = regioes.find((r) => r.id === regiaoId) ?? null;
  const terrenosVisiveis = useMemo(
    () => (regiao ? terrenos.filter((t) => t.region_id === regiao.id) : terrenos),
    [regiao, terrenos],
  );
  const escolhido = terrenos.find((t) => t.id === escolhidoId) ?? null;
  const comparados = terrenos.filter((t) => comparacao.includes(t.id));

  const avancar = () => setEtapa((e) => Math.min(ETAPAS.length - 1, e + 1));
  const voltar = () => setEtapa((e) => Math.max(0, e - 1));
  const reiniciar = () => {
    setEtapa(0);
    setRegiaoId(null);
    setComparacao([]);
    setEscolhidoId(null);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24">
      {/* Linha do tempo / progresso */}
      <nav aria-label="Progresso da jornada" className="mb-10">
        <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {ETAPAS.map((e, i) => {
            const ativa = i === etapa;
            const concluida = i < etapa;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEtapa(i)}
                  aria-current={ativa ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                    ativa
                      ? "border-primary/60 bg-primary/10"
                      : concluida
                        ? "border-border bg-card hover:border-primary/40"
                        : "border-border bg-card/50 text-muted-foreground hover:border-primary/30",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs",
                      ativa ? "border-primary text-primary" : concluida ? "border-success/50 text-success" : "border-border",
                    )}
                    aria-hidden
                  >
                    {concluida ? <CheckCircle2 className="h-4 w-4" /> : `0${i + 1}`}
                  </span>
                  <span className="text-sm font-medium leading-tight">{e.titulo}</span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full bg-gradient-mars transition-all duration-500"
            style={{ width: `${((etapa + 1) / ETAPAS.length) * 100}%` }}
          />
        </div>
      </nav>

      <div key={etapa} className="animate-rise">
        {etapa === 0 && <EtapaDescubra regioes={regioes} onAvancar={avancar} />}
        {etapa === 1 && (
          <EtapaExplore regioes={regioes} regiaoId={regiaoId} onRegiao={setRegiaoId} onAvancar={avancar} onVoltar={voltar} />
        )}
        {etapa === 2 && (
          <EtapaConheca
            terrenos={terrenosVisiveis}
            regiao={regiao}
            comparacao={comparacao}
            comparados={comparados}
            escolhidoId={escolhidoId}
            onComparar={(id) => setComparacao((ids) => alternarComparacao(ids, id))}
            onEscolher={setEscolhidoId}
            onAvancar={avancar}
            onVoltar={voltar}
          />
        )}
        {etapa === 3 && (
          <EtapaSimule terreno={escolhido} onVoltar={voltar} onReiniciar={reiniciar} onEscolherTerreno={() => setEtapa(2)} />
        )}
      </div>
    </div>
  );
}

function NavegacaoEtapas({
  onVoltar,
  onAvancar,
  avancarRotulo = "Próxima etapa",
  avancarDesabilitado,
  dica,
}: {
  onVoltar?: () => void;
  onAvancar?: () => void;
  avancarRotulo?: string;
  avancarDesabilitado?: boolean;
  dica?: string;
}) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3">
      {onVoltar && (
        <Button variant="glass" size="lg" onClick={onVoltar}>
          <ArrowLeft aria-hidden /> Voltar
        </Button>
      )}
      {onAvancar && (
        <Button variant="hero" size="lg" onClick={onAvancar} disabled={avancarDesabilitado}>
          {avancarRotulo} <ArrowRight aria-hidden />
        </Button>
      )}
      {dica && <p className="text-sm text-muted-foreground">{dica}</p>}
    </div>
  );
}

/* Etapa 1 — Descubra Marte */
function EtapaDescubra({ regioes, onAvancar }: { regioes: Regiao[]; onAvancar: () => void }) {
  return (
    <section aria-label="Etapa 1: Descubra Marte" className="grid items-center gap-8 lg:grid-cols-2">
      <div>
        <p className="eyebrow">Etapa 1 · Descubra Marte</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Um planeta inteiro para imaginar.</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          O Mars Estate é uma experiência conceitual de exploração imobiliária: você navega por
          regiões reais de Marte — como <strong className="text-foreground">Olympus Mons</strong>, o
          maior vulcão do Sistema Solar, e <strong className="text-foreground">Valles Marineris</strong>,
          um sistema de cânions com mais de 4.000 km — e escolhe terrenos fictícios em uma simulação
          completa, da descoberta à manifestação de interesse.
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <TagDado nivel="cientifico" className="mt-0.5" />
            <span className="text-muted-foreground">Geografia e fatos das regiões vêm de fontes como NASA e Mars Trek.</span>
          </li>
          <li className="flex items-start gap-3">
            <TagDado nivel="ficticio" className="mt-0.5" />
            <span className="text-muted-foreground">Terrenos, preços e disponibilidade são inventados para a simulação.</span>
          </li>
        </ul>
        <NavegacaoEtapas onAvancar={onAvancar} avancarRotulo="Explorar as regiões" />
      </div>
      <div className="relative overflow-hidden rounded-xl border border-border">
        <img
          src={regioes.find((r) => r.id === "olympus")?.imagem}
          alt="Ilustração artística da superfície de Marte ao entardecer"
          className="aspect-[4/3] w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-x-0 bottom-0 bg-fade-bottom p-5 pt-16">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <TagDado nivel="ilustrativo" /> Imagem conceitual, sem valor cartográfico
          </p>
        </div>
      </div>
    </section>
  );
}

/* Etapa 2 — Explore as regiões */
function EtapaExplore({
  regioes,
  regiaoId,
  onRegiao,
  onAvancar,
  onVoltar,
}: {
  regioes: Regiao[];
  regiaoId: string | null;
  onRegiao: (id: string | null) => void;
  onAvancar: () => void;
  onVoltar: () => void;
}) {
  const regiao = regioes.find((r) => r.id === regiaoId) ?? null;
  return (
    <section aria-label="Etapa 2: Explore as regiões">
      <p className="eyebrow">Etapa 2 · Explore as regiões</p>
      <h2 className="mt-3 text-3xl font-bold md:text-4xl">Nove regiões, nove paisagens.</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Selecione uma região para ver o que a ciência sabe sobre ela — e o que a simulação imagina.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Regiões de Marte">
          {regioes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRegiao(r.id)}
              aria-pressed={regiaoId === r.id}
              className={cn(
                "group overflow-hidden rounded-lg border text-left transition-all duration-300 hover:-translate-y-0.5",
                regiaoId === r.id ? "border-primary shadow-glow" : "border-border bg-card hover:border-primary/40",
              )}
            >
              <img
                src={r.imagem}
                alt=""
                loading="lazy"
                className="aspect-[5/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <span className="block p-3">
                <span className="block text-sm font-semibold">{r.nome}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.tipo}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start" aria-live="polite">
          {regiao ? (
            <article key={regiao.id} className="region-panorama rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">{regiao.nome}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {formatarCoordenadas(regiao.latitude, regiao.longitude)} · referência aproximada
                  </p>
                </div>
                <TagDado nivel="cientifico" />
              </div>
              <p className="mt-4 text-sm leading-relaxed">{regiao.fato}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Fonte:{" "}
                <a
                  href={regiao.fonteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-telemetry underline-offset-2 hover:underline"
                >
                  {regiao.fonte} <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
              <div className="mt-5 border-t border-border pt-4">
                <TagDado nivel="baseado" />
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{regiao.descricao}</p>
              </div>
              <Button asChild variant="glass" size="sm" className="mt-5">
                <Link to="/terrenos" search={{ regiao: regiao.id }}>
                  Ver no catálogo <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </article>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Selecione uma região ao lado para ver seus detalhes científicos e conceituais.
            </div>
          )}
        </div>
      </div>

      <NavegacaoEtapas
        onVoltar={onVoltar}
        onAvancar={onAvancar}
        avancarRotulo="Conhecer os terrenos"
        dica={regiao ? `Região selecionada: ${regiao.nome}` : "Você pode avançar sem selecionar uma região."}
      />
    </section>
  );
}

/* Etapa 3 — Conheça os terrenos */
function EtapaConheca({
  terrenos,
  regiao,
  comparacao,
  comparados,
  escolhidoId,
  onComparar,
  onEscolher,
  onAvancar,
  onVoltar,
}: {
  terrenos: Terreno[];
  regiao: Regiao | null;
  comparacao: string[];
  comparados: Terreno[];
  escolhidoId: string | null;
  onComparar: (id: string) => void;
  onEscolher: (id: string) => void;
  onAvancar: () => void;
  onVoltar: () => void;
}) {
  const maxArea = Math.max(...comparados.map((t) => t.area), 1);
  const maxPreco = Math.max(...comparados.map((t) => t.preco), 1);

  return (
    <section aria-label="Etapa 3: Conheça os terrenos">
      <p className="eyebrow">Etapa 3 · Conheça os terrenos</p>
      <h2 className="mt-3 text-3xl font-bold md:text-4xl">
        {regiao ? `Terrenos em ${regiao.nome}` : "Terrenos demonstrativos"}
      </h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Compare área e preço, abra os detalhes e escolha um terreno para simular seu interesse.
      </p>

      <div className="mt-6">
        <AvisoConceitual />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {terrenos.map((t) => {
          const escolhido = escolhidoId === t.id;
          const emComparacao = comparacao.includes(t.id);
          return (
            <article
              key={t.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-lg border bg-card transition-all duration-300",
                escolhido ? "border-primary shadow-glow" : "border-border",
              )}
            >
              <div className="relative">
                <img src={t.imagens[0]} alt={`Paisagem da região ${t.regiao}`} loading="lazy" className="aspect-[5/3] w-full object-cover" />
                <StatusBadge status={t.status} className="absolute left-3 top-3" />
                <TagDado nivel="ficticio" className="absolute right-3 top-3 bg-background/70 backdrop-blur" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="text-lg font-semibold">{t.nome}</h3>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" aria-hidden /> {t.regiao}
                  </p>
                </div>
                <p className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Maximize className="h-3 w-3" aria-hidden /> {formatarArea(t.area)}
                  </span>
                  <span className="font-display font-semibold">
                    {formatarPreco(t.preco)} <span className="text-xs font-normal text-muted-foreground">demo</span>
                  </span>
                </p>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="glass" size="sm">Detalhes</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="font-display">{t.nome}</DialogTitle>
                        <DialogDescription>{t.regiao}</DialogDescription>
                      </DialogHeader>
                      <img src={t.imagens[0]} alt={`Paisagem da região ${t.regiao}`} className="aspect-[5/3] w-full rounded-lg object-cover" />
                      <div className="flex items-center gap-2">
                        <StatusBadge status={t.status} />
                        <TagDado nivel="ficticio" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{t.descricao}</p>
                      <ul className="flex flex-wrap gap-2">
                        {t.caracteristicas.map((c) => (
                          <li key={c} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{c}</li>
                        ))}
                      </ul>
                      <p className="flex items-center justify-between border-t border-border pt-3 text-sm">
                        <span>{formatarArea(t.area)}</span>
                        <span className="font-display text-lg font-semibold">{formatarPreco(t.preco)} <span className="text-xs font-normal text-muted-foreground">demo</span></span>
                      </p>
                      <Button asChild variant="glass" size="sm">
                        <Link to="/terrenos/$id" params={{ id: t.id }}>
                          Abrir ficha completa <ArrowRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </Button>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant={emComparacao ? "secondary" : "ghost"}
                    size="sm"
                    aria-pressed={emComparacao}
                    disabled={!emComparacao && comparacao.length >= MAX_COMPARACAO}
                    title={!emComparacao && comparacao.length >= MAX_COMPARACAO ? `Limite de ${MAX_COMPARACAO} terrenos na comparação` : undefined}
                    onClick={() => onComparar(t.id)}
                  >
                    <GitCompareArrows className="h-4 w-4" aria-hidden /> Comparar
                  </Button>
                  <Button
                    variant={escolhido ? "hero" : "ghost"}
                    size="sm"
                    aria-pressed={escolhido}
                    disabled={t.status !== "disponivel"}
                    onClick={() => onEscolher(t.id)}
                  >
                    {escolhido ? "Escolhido" : t.status === "disponivel" ? "Escolher" : "Indisponível"}
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {comparados.length > 0 && (
        <div className="mt-8 rounded-xl border border-border bg-card p-5" aria-live="polite">
          <h3 className="font-display text-lg font-semibold">
            Comparação <span className="text-sm font-normal text-muted-foreground">({comparados.length} de {MAX_COMPARACAO})</span>
          </h3>
          <div className="mt-4 space-y-4">
            {comparados.map((t) => (
              <div key={t.id} className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
                <p className="text-sm font-medium">{t.nome}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-telemetry transition-all duration-500" style={{ width: `${(t.area / maxArea) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono text-xs text-muted-foreground">{formatarArea(t.area)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-mars transition-all duration-500" style={{ width: `${(t.preco / maxPreco) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-mono text-xs text-muted-foreground">{formatarPreco(t.preco)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Barras proporcionais ao maior valor da seleção. Valores fictícios.</p>
        </div>
      )}

      <NavegacaoEtapas
        onVoltar={onVoltar}
        onAvancar={onAvancar}
        avancarRotulo="Simular minha escolha"
        avancarDesabilitado={!escolhidoId}
        {...(escolhidoId ? {} : { dica: "Escolha um terreno disponível para avançar." })}
      />
    </section>
  );
}

/* Etapa 4 — Simule sua escolha */
function EtapaSimule({
  terreno,
  onVoltar,
  onReiniciar,
  onEscolherTerreno,
}: {
  terreno: Terreno | null;
  onVoltar: () => void;
  onReiniciar: () => void;
  onEscolherTerreno: () => void;
}) {
  if (!terreno) {
    return (
      <section aria-label="Etapa 4: Simule sua escolha" className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="text-muted-foreground">Nenhum terreno selecionado ainda.</p>
        <Button variant="hero" size="lg" className="mt-5" onClick={onEscolherTerreno}>
          Escolher um terreno <ArrowRight aria-hidden />
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="Etapa 4: Simule sua escolha" className="grid items-start gap-8 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-primary/50 bg-card shadow-glow">
        <div className="relative">
          <img src={terreno.imagens[0]} alt={`Paisagem da região ${terreno.regiao}`} className="aspect-[5/3] w-full object-cover" />
          <StatusBadge status={terreno.status} className="absolute left-3 top-3" />
        </div>
        <div className="p-6">
          <p className="eyebrow">Sua escolha na simulação</p>
          <h2 className="mt-2 text-2xl font-bold">{terreno.nome}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {terreno.regiao}
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Área conceitual</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{formatarArea(terreno.area)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Preço demonstrativo</dt>
              <dd className="mt-1 font-display text-lg font-semibold">{formatarPreco(terreno.preco)}</dd>
            </div>
          </dl>
          <ul className="mt-4 flex flex-wrap gap-2">
            {terreno.caracteristicas.map((c) => (
              <li key={c} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{c}</li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <p className="eyebrow">Etapa 4 · Simule sua escolha</p>
        <h2 className="mt-3 text-3xl font-bold md:text-4xl">Registre seu interesse — de mentira.</h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          O formulário abaixo é uma demonstração: ele valida os campos e mostra uma confirmação,
          mas <strong className="text-foreground">nada é enviado, armazenado, comprado ou reservado</strong>.
          Não pedimos pagamento, documentos ou dados sensíveis.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <TagDado nivel="ficticio" />
          <span className="text-xs text-muted-foreground">Terreno, preço e disponibilidade inventados para a simulação.</span>
        </div>
        <div className="mt-6 max-w-sm">
          <InteresseDialog nome={terreno.nome} disabled={terreno.status !== "disponivel"} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="glass" onClick={onVoltar}>
            <ArrowLeft aria-hidden /> Voltar
          </Button>
          <Button variant="ghost" onClick={onReiniciar}>Refazer a jornada</Button>
          <Button asChild variant="ghost">
            <Link to="/terrenos">Explorar o catálogo completo <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
