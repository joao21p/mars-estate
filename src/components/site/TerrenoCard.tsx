import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Maximize } from "lucide-react";
import { formatarArea, formatarPreco, type Terreno } from "@/data/terrenos";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";

export function TerrenoCard({ terreno }: { terreno: Terreno }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg bg-card transition-all duration-500 hover:-translate-y-1 hover:shadow-glow">
      <div className="relative aspect-[5/4] overflow-hidden">
        <img
          src={terreno.imagens[0]}
          alt={`Paisagem da região ${terreno.regiao}`}
          loading="lazy"
          width={1280}
          height={896}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <StatusBadge status={terreno.status} className="absolute left-3 top-3" />
        <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-background/80 px-5 py-3 text-sm text-muted-foreground opacity-0 backdrop-blur-sm transition-all group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">{terreno.caracteristicas.slice(0, 2).join(' · ')}</div>
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div>
          <h3 className="text-xl font-semibold">{terreno.nome}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" aria-hidden /> {terreno.regiao}
          </p>
        </div>
        <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Maximize className="h-3 w-3" aria-hidden /> {formatarArea(terreno.area)}
            </p>
            <p className="mt-1 font-display text-lg font-semibold">
              {formatarPreco(terreno.preco)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">demo</span>
            </p>
          </div>
          <Button asChild variant="glass" size="sm">
          <Link
            to="/terrenos/$id"
            params={{ id: terreno.id }}
            aria-label={`Ver detalhes de ${terreno.nome}`}
          >
            Detalhes <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}

export function TerrenoCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-10 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
