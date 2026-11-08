import { Link } from "@tanstack/react-router";
import { Logo } from "./Header";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Uma experiência conceitual de simulação imobiliária espacial.
          </p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
          <span className="eyebrow mb-1">Navegação</span>
          <Link to="/" className="text-muted-foreground hover:text-foreground">Início</Link>
          <Link to="/terrenos" className="text-muted-foreground hover:text-foreground">Explorar Terrenos</Link>
          <Link to="/como-funciona" className="text-muted-foreground hover:text-foreground">Como Funciona</Link>
          <Link to="/sobre" className="text-muted-foreground hover:text-foreground">Sobre Nós</Link>
        </nav>
        <div className="space-y-2 text-sm text-muted-foreground">
          <span className="eyebrow">Aviso</span>
          <p>
            Mars Estate é uma plataforma fictícia. Todos os terrenos, preços e indicadores são
            demonstrativos e não representam ofertas reais nem a aquisição de propriedade em Marte.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mars Estate · Projeto conceitual
      </div>
    </footer>
  );
}
