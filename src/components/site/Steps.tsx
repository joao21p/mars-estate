import { Compass, MousePointerClick, Send } from "lucide-react";

const passos = [
  { icon: Compass, titulo: "Explore as regiões de Marte", texto: "Navegue por crateras, cânions e planícies fictícias com imagens e descrições detalhadas." },
  { icon: MousePointerClick, titulo: "Escolha um terreno fictício", texto: "Compare área, localização e preço demonstrativo usando os filtros do catálogo." },
  { icon: Send, titulo: "Registre seu interesse", texto: "Sinalize os lotes que mais chamaram sua atenção dentro da plataforma." },
];

export function Steps() {
  return (
    <ol className="grid gap-6 md:grid-cols-3">
      {passos.map((p, i) => (
        <li key={p.titulo} className="relative rounded-xl border border-border bg-card p-7">
          <span className="font-display text-5xl font-bold text-gradient-mars">0{i + 1}</span>
          <p.icon className="absolute right-6 top-7 h-6 w-6 text-muted-foreground" aria-hidden />
          <h3 className="mt-5 text-lg font-semibold">{p.titulo}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
        </li>
      ))}
    </ol>
  );
}

export function AvisoConceitual() {
  return (
    <p className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-muted-foreground">
      <strong className="text-foreground">Importante:</strong> Mars Estate é uma experiência
      conceitual. Nada nesta plataforma representa a aquisição de propriedade imobiliária real em
      Marte.
    </p>
  );
}
