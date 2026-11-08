import { Component, lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { ClientOnly, Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowRight, Crosshair, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Regiao } from '@/data/regioes';
import { formatarArea, formatarPreco, type Terreno } from '@/data/terrenos';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import surface from '@/assets/mars-surface.jpg';

const MarsGlobe = lazy(() => import('./MarsGlobe'));

export function PlanetFallback() {
  return <div className="flex h-full items-center justify-center"><div className="planet-fallback" style={{ backgroundImage: `url(${surface})` }} role="img" aria-label="Marte, representação ilustrativa" /></div>;
}
export class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? <PlanetFallback /> : this.props.children; }
}

export function MarsExperience({ terrenos, regioes }: { terrenos: Terreno[]; regioes: Regiao[] }) {
  const [exploring, setExploring] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(7.7);
  const [visible, setVisible] = useState(true);
  const section = useRef<HTMLElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const region = regioes.find((r) => r.id === selected);
  const lots = terrenos.filter((t) => region && t.region_id === region.id);
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  function select(id: string) { setSelected(id); setExploring(true); }
  return <>
    <section ref={section} className="mission-opening relative overflow-hidden border-b border-border" aria-label="Exploração de Marte">
      <div className={`absolute inset-x-0 top-16 h-[350px] transition-all duration-700 md:bottom-0 md:top-0 md:h-auto ${exploring ? '' : 'md:left-[27%]'}`}>
        <ClientOnly fallback={<PlanetFallback />}><GlobeBoundary><Suspense fallback={<PlanetFallback />}><MarsGlobe regioes={regioes} selected={selected} onSelect={select} paused={paused} zoom={zoom} active={visible} /></Suspense></GlobeBoundary></ClientOnly>
      </div>
      <div className="pointer-events-none relative mx-auto max-w-7xl px-5 pt-28">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2 font-mono"><span className="h-1.5 w-1.5 rounded-full bg-telemetry" /> MARS / EXPEDIÇÃO 001</span>
          <span className="hidden font-mono sm:block">MISSÃO CONCEITUAL · 04</span>
        </div>
      </div>
      {!exploring ? <div className="pointer-events-none relative mx-auto max-w-7xl px-5 pb-6 pt-[280px] md:pb-24 md:pt-44">
        <p className="eyebrow animate-rise">O futuro tem um novo endereço</p>
        <h1 className="mt-4 max-w-xl animate-rise text-5xl font-bold leading-none md:text-8xl">Mars<br /><span className="text-copper">Estate.</span></h1>
        <p className="mt-5 max-w-sm animate-rise text-lg text-muted-foreground">Descubra seu lugar no planeta vermelho.</p>
        <div className="pointer-events-auto mt-7 flex flex-wrap gap-3">
          <Button variant="hero" size="lg" onClick={() => setExploring(true)}><Crosshair /> Iniciar exploração <ArrowRight /></Button>
          <Button asChild variant="glass" size="lg"><Link to="/terrenos">Ver terrenos</Link></Button>
        </div>
        <p className="mt-5 font-mono text-xs text-muted-foreground">01 / ÓRBITA MARCIANA <span className="ml-4 text-telemetry">8 REGIÕES</span></p>
      </div> : <div className="pointer-events-none relative mx-auto max-w-7xl px-5 pb-8 pt-[320px] md:pt-[540px]">
        <div className="pointer-events-auto mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><p className="eyebrow">02 / Reconhecimento</p><h1 className="mt-2 text-2xl font-bold">{region?.nome ?? 'Explorar Marte'}</h1></div>
          <div className="flex gap-2">
            <Button variant="glass" size="icon" title="Aproximar" aria-label="Aproximar" disabled={zoom <= 4.8} onClick={() => setZoom((z) => Math.max(4.8, z - .7))}><Plus /></Button>
            <Button variant="glass" size="icon" title="Afastar" aria-label="Afastar" disabled={zoom >= 10} onClick={() => setZoom((z) => Math.min(10, z + .7))}><Minus /></Button>
            <Button variant="glass" size="icon" title={paused ? 'Retomar rotação' : 'Pausar rotação'} aria-label={paused ? 'Retomar rotação' : 'Pausar rotação'} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>
            <Button variant="glass" size="icon" title="Restaurar globo" aria-label="Restaurar globo" onClick={() => { setSelected(null); setZoom(7.7); setPaused(false); }}><RotateCcw /></Button>
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2" aria-label="Regiões de Marte">{regioes.map((r) => <Button key={r.id} variant={selected === r.id ? 'secondary' : 'ghost'} size="sm" aria-pressed={selected === r.id} onClick={() => select(r.id)}>{r.nome}</Button>)}</div>
        {region && <Button className="pointer-events-auto mt-4" variant="hero" onClick={() => details.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })}>Descobrir região <ArrowDown /></Button>}
      </div>}
    </section>
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 text-xs text-muted-foreground">
        <span className="font-mono text-telemetry">{exploring ? '02 / EXPLORAÇÃO' : '01 / EM ÓRBITA'} → 03 / TERRENOS → 04 / DESCOBERTA</span>
        <span>Simulação · terrenos, coordenadas e preços fictícios</span>
      </div>
    </div>
    {region && <div ref={details} className="scroll-mt-20" aria-live="polite">
      <section key={region.id} className="region-panorama relative overflow-hidden">
        <img src={region.imagem} alt={`Paisagem conceitual de ${region.nome}`} loading="lazy" width={1280} height={896} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-fade-bottom" />
        <div className="relative mx-auto max-w-7xl px-5 pb-12 pt-52 md:pt-72">
          <Button variant="glass" onClick={() => { setSelected(null); section.current?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth' }); }}><ArrowLeft /> Voltar ao globo</Button>
          <p className="eyebrow mt-8">{region.tipo}</p><h2 className="mt-2 text-4xl font-bold md:text-6xl">{region.nome}</h2>
          <p className="mt-4 max-w-xl text-muted-foreground">{region.descricao}</p>
          <p className="mt-3 font-mono text-xs text-telemetry">{Math.abs(region.latitude)}° {region.latitude < 0 ? 'S' : 'N'} / {Math.abs(region.longitude)}° {region.longitude < 0 ? 'O' : 'L'} · localização ilustrativa</p>
          <div className="mt-8 flex flex-wrap gap-4">{lots.map((t) => <Button key={t.id} asChild variant="hero" size="lg"><Link to="/terrenos/$id" params={{ id: t.id }}>{t.nome} · {formatarArea(t.area)} <ArrowRight /></Link></Button>)}</div>
          <p className="mt-3 text-sm text-muted-foreground">{lots.map((t) => formatarPreco(t.preco)).join(' · ')} · valores fictícios</p>
        </div>
      </section>
    </div>}
  </>;
}