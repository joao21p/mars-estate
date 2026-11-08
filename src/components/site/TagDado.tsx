import { cn } from "@/lib/utils";

export type NivelDado = "cientifico" | "baseado" | "ilustrativo" | "ficticio";

const CONFIG: Record<NivelDado, { rotulo: string; classe: string; descricao: string }> = {
  cientifico: { rotulo: "Dado científico", classe: "border-telemetry/50 text-telemetry", descricao: "Fato verificado em fonte científica reconhecida (NASA)." },
  baseado: { rotulo: "Baseado em ciência", classe: "border-success/50 text-success", descricao: "Descrição inspirada em referência científica, sem precisão cartográfica." },
  ilustrativo: { rotulo: "Ilustração", classe: "border-warning/50 text-warning", descricao: "Imagem ou esquema artístico, sem valor cartográfico." },
  ficticio: { rotulo: "Fictício", classe: "border-copper/50 text-copper", descricao: "Dado inventado para a simulação imobiliária." },
};

export function TagDado({ nivel, className }: { nivel: NivelDado; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", CONFIG[nivel].classe, className)}>
      {CONFIG[nivel].rotulo}
    </span>
  );
}

export function LegendaDados() {
  return (
    <dl className="grid gap-2 text-xs sm:grid-cols-2">
      {(Object.keys(CONFIG) as NivelDado[]).map((nivel) => (
        <div key={nivel} className="flex items-start gap-2">
          <dt className="shrink-0"><TagDado nivel={nivel} /></dt>
          <dd className="text-muted-foreground">{CONFIG[nivel].descricao}</dd>
        </div>
      ))}
    </dl>
  );
}
