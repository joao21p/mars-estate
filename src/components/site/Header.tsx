import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/terrenos", label: "Explorar Terrenos" },
  { to: "/como-funciona", label: "Como Funciona" },
  { to: "/sobre", label: "Sobre Nós" },
] as const;

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
      <span aria-hidden className="h-6 w-6 rounded-full bg-gradient-mars shadow-glow" />
      Mars Estate
    </Link>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <Button asChild variant="hero" size="sm">
            <Link to="/terrenos">Explorar Terrenos</Link>
          </Button>
        </div>
        <Button variant="ghost" size="icon"
          className="rounded-md p-2 md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open && (
        <nav aria-label="Menu móvel" className="border-t border-border bg-background px-5 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {links.map((l) => (
              <li key={l.to}>
                <Link to={l.to} onClick={() => setOpen(false)} className="block py-1">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
