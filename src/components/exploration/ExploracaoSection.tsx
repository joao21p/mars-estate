import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Minus, Pause, Play, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarCoordenadas, type Regiao } from "@/data/regioes";
import type { Terreno } from "@/data/terrenos";
import { cn } from "@/lib/utils";
import { GlobeBoundary, PlanetFallback } from "./MarsExperience";
import { PainelRegiao } from "./PainelRegiao";

const MarsGlobe = lazy(() => import("./MarsGlobe"));

export function ExploracaoSection({ terrenos, regioes, regiao, onRegiao }: { terrenos: Terreno[]; regioes: Regiao[]; regiao: string; onRegiao: (id: string) => void }) {
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(7.7);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLElement>(null);
  const selected = regiao === "todas" ? null : regiao;
  const region = regioes.find((r) => r.id === selected);
  const lots = terrenos.filter((t) => region && t.region_id === region.id);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const reset = () => { onRegiao("todas"); setZoom(7.7); setPaused(false); };

  return (
    <section ref={section} className="border-b border-border" aria-label="Exploração planetária de Marte">
      <div className="mx-auto max-w-7xl px-5 pb-12">
        <nav aria-label="Trilha de navegação" className="mb-5 flex flex-wrap items-center gap-2 font-mono text-xs text-muted-foreground">
          <button type="button" onClick={reset} className={cn("hover:text-foreground", !region && "text-telemetry")}>MARTE</button>
          {region && (
            <>
              <span aria-hidden>/</span>
              <span className="text-telemetry">{region.nome.toUpperCase()}</span>
            </>
          )}
        </nav>

        <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
          <div className="relative h-[380px] md:h-[540px]">
            <ClientOnly fallback={<PlanetFallback />}>
              <GlobeBoundary>
                <Suspense fallback={<PlanetFallback />}>
                  <MarsGlobe regioes={regioes} selected={selected} onSelect={onRegiao} paused={paused} zoom={zoom} active={visible} />
                </Suspense>
              </GlobeBoundary>
            </ClientOnly>
            <span className="pointer-events-none absolute left-2 top-2 font-mono text-[10px] text-muted-foreground">
              {region ? formatarCoordenadas(region.latitude, region.longitude) : "VISÃO GLOBAL"} · arraste para girar
            </span>
          </div>
          <PainelRegiao regiao={region} terrenos={lots} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex gap-1" role="group" aria-label="Controles do globo">
            <Button variant="glass" size="icon" title="Aproximar" aria-label="Aproximar" disabled={zoom <= 4.8} onClick={() => setZoom((z) => Math.max(4.8, z - 0.7))}><Plus /></Button>
            <Button variant="glass" size="icon" title="Afastar" aria-label="Afastar" disabled={zoom >= 10} onClick={() => setZoom((z) => Math.min(10, z + 0.7))}><Minus /></Button>
            <Button variant="glass" size="icon" title={paused ? "Retomar rotação" : "Pausar rotação"} aria-label={paused ? "Retomar rotação" : "Pausar rotação"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>
            <Button variant="glass" size="icon" title="Restaurar visão global" aria-label="Restaurar visão global" onClick={reset}><RotateCcw /></Button>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Regiões de Marte">
            <Button size="sm" variant={selected === null ? "secondary" : "ghost"} aria-pressed={selected === null} onClick={() => onRegiao("todas")}>Visão global</Button>
            {regioes.map((r) => (
              <Button key={r.id} size="sm" variant={selected === r.id ? "secondary" : "ghost"} aria-pressed={selected === r.id} onClick={() => onRegiao(r.id)}>{r.nome}</Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
