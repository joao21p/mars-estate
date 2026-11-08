import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-5 pb-10 pt-32">
      <p className="eyebrow animate-rise">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl animate-rise text-4xl font-bold md:text-6xl">{title}</h1>
      {children && <div className="mt-5 max-w-2xl text-muted-foreground">{children}</div>}
    </section>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-primary focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">{children}</main>
      <Footer />
    </>
  );
}
