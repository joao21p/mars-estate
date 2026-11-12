import { Link } from "@tanstack/react-router";
import { Logo } from "./Header";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="font-display text-xl font-semibold">Explore o impossível.</p>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Ciência, design e tecnologia em um projeto demonstrativo de portfólio. Uma experiência
            de exploração e comparação de terrenos fictícios em Marte.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">Navegação</span>
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Início
          </Link>
          <Link to="/terrenos" className="text-muted-foreground hover:text-foreground">
            Explorar Terrenos
          </Link>
          <Link to="/como-funciona" className="text-muted-foreground hover:text-foreground">
            Como Funciona
          </Link>
          <Link to="/sobre" className="text-muted-foreground hover:text-foreground">
            Sobre Nós
          </Link>
        </nav>
        <div className="space-y-2 text-sm text-muted-foreground">
          <span className="eyebrow">Imaginação com transparência</span>
          <p>
            Marte é real. Este mercado é imaginário. Terrenos, preços, habitats e reservas fazem
            parte de uma simulação, sem cobrança, compra ou direito de propriedade sobre Marte.
          </p>
        </div>
      </div>
      <div className="border-t border-border px-5 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mars Estate · Projeto de portfólio · Exploração fictícia
      </div>
    </footer>
  );
}
