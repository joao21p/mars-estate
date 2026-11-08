import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Image as ImageIcon, Mountain } from "lucide-react";
import { formatarCoordenadas, type Regiao } from "@/data/regioes";
import { formatarArea, formatarPreco, type Terreno } from "@/data/terrenos";
import { Button } from "@/components/ui/button";
import { LegendaDados, TagDado } from "@/components/site/TagDado";

function MapaEsquematico({ regiao, terrenos }: { regiao: Regiao; terrenos: Terreno[] }) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-background/70" role="img" aria-label={`Mapa esquemático ilustrativo de ${regiao.nome}`}>
      <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden>
        {Array.from({ length: 7 }).map((_, i) => (
          <ellipse key={i} cx="200" cy="150" rx={36 + i * 26} ry={24 + i * 18} fill="none" stroke="var(--copper)" strokeOpacity={0.4 - i * 0.05} strokeWidth="1" strokeDasharray={i % 2 ? "4 4" : undefined} />
        ))}
        <line x1="0" y1="150" x2="400" y2="150" stroke="var(--telemetry)" strokeOpacity="0.25" strokeWidth="1" />
        <line x1="200" y1="0" x2="200" y2="300" stroke="var(--telemetry)" strokeOpacity="0.25" strokeWidth="1" />
      </svg>
      {terrenos.map((t, i) => (
        <span key={t.id} className="absolute flex items-center gap-1.5 font-mono text-[10px] text-telemetry" style={{ left: `${28 + i * 22}%`, top: `${36 + (i % 3) * 14}%` }}>
          <span className="h-2 w-2 rounded-full bg-primary shadow-glow" aria-hidden /> {t.nome}
        </span>
      ))}
      <span className="absolute bottom-2 right-3 font-mono text-[10px] text-muted-foreground">esquema ilustrativo · sem escala</span>
    </div>
  );
}

export function PainelRegiao({ regiao, terrenos }: { regiao: Regiao | undefined; terrenos: Terreno[] }) {
  const [visao, setVisao] = useState<"imagem" | "mapa">("imagem");

  if (!regiao) {
    return (
      <aside className="flex flex-col justify-center rounded-xl border border-dashed border-border p-6">
        <p className="eyebrow">Painel regional</p>
        <h2 className="mt-2 text-2xl font-bold">Selecione uma região</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Toque em um marcador no globo ou escolha uma região abaixo para ver dados científicos,
          coordenadas de referência e os terrenos fictícios associados.
        </p>
        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Como lemos os dados</p>
          <LegendaDados />
        </div>
      </aside>
    );
  }

  return (
    <aside key={regiao.id} className="region-panorama flex flex-col rounded-xl border border-border bg-card/60 p-5 backdrop-blur-sm" aria-live="polite" aria-label={`Região ${regiao.nome}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{regiao.tipo}</p>
          <h2 className="mt-1 text-2xl font-bold">{regiao.nome}</h2>
        </div>
        <div className="flex gap-1" role="group" aria-label="Alternar visualização da região">
          <Button variant={visao === "imagem" ? "secondary" : "ghost"} size="icon" title="Imagem ilustrativa" aria-label="Imagem ilustrativa" aria-pressed={visao === "imagem"} onClick={() => setVisao("imagem")}><ImageIcon /></Button>
          <Button variant={visao === "mapa" ? "secondary" : "ghost"} size="icon" title="Mapa esquemático com terrenos" aria-label="Mapa esquemático com terrenos" aria-pressed={visao === "mapa"} onClick={() => setVisao("mapa")}><Mountain /></Button>
        </div>
      </div>

      <div className="mt-4">
        {visao === "imagem" ? (
          <figure>
            <img src={regiao.imagem} alt={`Paisagem conceitual de ${regiao.nome}`} loading="lazy" width={1280} height={896} className="aspect-[4/3] w-full rounded-lg border border-border object-cover" />
            <figcaption className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <TagDado nivel="ilustrativo" /> Representação artística, não uma fotografia da região.
            </figcaption>
          </figure>
        ) : (
          <div>
            <MapaEsquematico regiao={regiao} terrenos={terrenos} />
            <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
              <TagDado nivel="ilustrativo" /> Curvas de nível e posições meramente ilustrativas.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{regiao.descricao}</p>

      <div className="mt-4 rounded-lg border border-border bg-background/60 p-3">
        <TagDado nivel="cientifico" />
        <p className="mt-2 text-sm">{regiao.fato}</p>
        <p className="mt-1.5 font-mono text-[11px] text-telemetry">{formatarCoordenadas(regiao.latitude, regiao.longitude)} · referência aproximada</p>
      </div>

      <div className="mt-4">
        <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <TagDado nivel="ficticio" /> Terrenos da simulação nesta região
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {terrenos.map((t) => (
            <Button key={t.id} asChild variant="glass" size="sm">
              <Link to="/terrenos/$id" params={{ id: t.id }}>{t.nome} · {formatarArea(t.area)} <ArrowRight /></Link>
            </Button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{terrenos.map((t) => formatarPreco(t.preco)).join(" · ")} · valores fictícios</p>
      </div>

      <details className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none font-medium text-foreground">Fontes e dados</summary>
        <ul className="mt-2 space-y-1.5">
          <li>· <a href={regiao.fonteUrl} target="_blank" rel="noreferrer" className="text-copper hover:underline">{regiao.fonte}</a> — fatos e coordenadas de referência.</li>
          <li>· <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noreferrer" className="text-copper hover:underline">NASA Mars Trek</a> / MOLA (MGS) — base dos mapas topográficos de referência.</li>
          <li>· Imagens e esquemas: ilustrações geradas, sem valor cartográfico.</li>
          <li>· Terrenos, preços e disponibilidade: fictícios, parte da simulação.</li>
        </ul>
      </details>
    </aside>
  );
}
