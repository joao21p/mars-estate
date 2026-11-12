import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Columns2, MapPin, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarArea, formatarPreco } from "@/data/terrenos";
import { obterTerrenoBanco } from "@/functions/terrenos";
import { StatusBadge } from "@/components/site/StatusBadge";
import { InteresseDialog } from "@/components/site/InteresseDialog";
import { ReservationDialog } from '@/components/site/ReservationDialog';
import { TagDado } from "@/components/site/TagDado";
import { cn } from "@/lib/utils";
import { listarRegioesBanco } from "@/functions/regioes";
import { formatarCoordenadas, regiaoDoTerreno } from "@/data/regioes";
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/terrenos/$id")({
  loader: async ({ params }) => {
    const [terreno, regioes] = await Promise.all([
      obterTerrenoBanco({ data: params.id }),
      listarRegioesBanco(),
    ]);

    if (!terreno) throw notFound();

    return { terreno, regiao: regiaoDoTerreno(terreno, regioes) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? siteMetadata(`${loaderData.terreno.nome} | Mars Estate`, `Explore ${loaderData.terreno.nome}, um terreno fictício do Mars Estate. Compare paisagens e características nesta simulação, sem propriedade real.`, `/terrenos/${encodeURIComponent(loaderData.terreno.id)}`)
      : [...siteMetadata('Terreno não encontrado | Mars Estate', 'Este terreno não foi encontrado no catálogo fictício do Mars Estate.'), { name: "robots", content: "noindex" }],
  }),
  pendingComponent: () => (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-32" role="status" aria-label="Carregando terreno">
      <div className="aspect-[16/9] animate-pulse rounded-xl bg-muted" />
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 pb-24 pt-40 text-center">
      <h1 className="text-3xl font-bold">Terreno não encontrado</h1>
      <p className="mt-3 text-muted-foreground">Este lote não existe ou foi removido do catálogo.</p>
      <Button asChild variant="hero" className="mt-6"><Link to="/terrenos">Voltar ao catálogo</Link></Button>
    </div>
  ),
  component: Detalhe,
});

function Detalhe() {
  const { terreno: t, regiao } = Route.useLoaderData();
  const [ativa, setAtiva] = useState(0);
  return (
    <article className="mx-auto max-w-7xl animate-in fade-in px-5 pb-24 pt-28 duration-700">
      <nav aria-label="Trilha de navegação" className="flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
        <Link to="/terrenos" className="hover:text-foreground">MARTE</Link>
        {regiao && (
          <>
            <span aria-hidden>/</span>
            <Link to="/terrenos" search={{ regiao: regiao.id }} className="hover:text-foreground">{regiao.nome.toUpperCase()}</Link>
          </>
        )}
        <span aria-hidden>/</span>
        <span className="text-telemetry">{t.nome.toUpperCase()}</span>
      </nav>
      <Link to="/terrenos" className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Voltar à exploração
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-xl border border-border">
            <img key={ativa} src={t.imagens[ativa]} alt={`${t.nome} — imagem ${ativa + 1}`} width={1280} height={896} className="aspect-[4/3] w-full animate-in fade-in object-cover duration-500" />
          </div>
          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <TagDado nivel="ilustrativo" /> Imagens conceituais da região, não fotografias do terreno.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3" role="group" aria-label="Galeria">
            {t.imagens.map((src, i) => (
              <Button variant="ghost" key={i} onClick={() => setAtiva(i)} aria-label={`Ver imagem ${i + 1}`} aria-pressed={ativa === i}
                className={cn("h-auto overflow-hidden rounded-lg border-2 p-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", ativa === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100")}>
                <img src={src} alt="" loading="lazy" width={1280} height={896} className="aspect-[4/3] w-full object-cover" />
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <StatusBadge status={t.status} />
          <div>
            <h1 className="text-4xl font-bold md:text-5xl">{t.nome}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" /> {t.regiao}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">ID da simulação: {t.id}</p>
          </div>
          <p className="leading-relaxed text-muted-foreground">{t.descricao}</p>
          {regiao && (
            <p className="flex flex-wrap items-center gap-2 font-mono text-xs text-telemetry">
              {formatarCoordenadas(regiao.latitude, regiao.longitude)} <TagDado nivel="ilustrativo" /> localização de referência da região
            </p>
          )}
          <dl className="grid grid-cols-2 gap-4 border-y border-border py-5">
            <div>
              <dt className="flex items-center gap-1 text-xs text-muted-foreground"><Maximize className="h-3 w-3" /> Área</dt>
              <dd className="mt-1 font-display text-xl font-semibold">{formatarArea(t.area)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Preço demonstrativo</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-gradient-mars">{formatarPreco(t.preco)}</dd>
            </div>
          </dl>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 eyebrow">Características do relevo <TagDado nivel="ficticio" /></h2>
            <ul className="mt-3 space-y-2">
              {t.caracteristicas.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-copper" aria-hidden /> {c}</li>
              ))}
            </ul>
          </div>
          {regiao && (
            <div className="rounded-lg border border-border bg-card/60 p-4">
              <TagDado nivel="cientifico" />
              <p className="mt-2 text-sm">{regiao.fato}</p>
              <details className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none font-medium text-foreground">Fontes e dados</summary>
                <ul className="mt-2 space-y-1.5">
                  <li>· <a href={regiao.fonteUrl} target="_blank" rel="noreferrer" className="text-copper hover:underline">{regiao.fonte}</a> — fato e coordenadas de referência da região.</li>
                  <li>· <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer" className="text-copper hover:underline">NASA Mars Trek</a> / MOLA (MGS) — mapas topográficos de referência.</li>
                  <li>· Terreno, área, preço, disponibilidade e características: fictícios, parte da simulação.</li>
                </ul>
              </details>
            </div>
          )}
          <div className="space-y-3">
            <ReservationDialog id={t.id} nome={t.nome} available={t.status === 'disponivel'} />
            <InteresseDialog nome={t.nome} disabled={t.status === "vendido"} />
            <Button asChild variant="glass" size="lg" className="w-full">
              <Link to="/terrenos" search={{ comparar: t.id }}><Columns2 /> Comparar com outros terrenos</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Terreno e preço fictícios. Não há venda, pagamento ou reserva real.</p>
        </div>
      </div>
    </article>
  );
}
