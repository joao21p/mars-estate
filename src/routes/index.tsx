import { listarRegioesBanco } from "@/functions/regioes";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import habitat from "@/assets/habitat.jpg";
import { listarTerrenosBanco } from "@/functions/terrenos";
import { MarsExperience } from "@/components/exploration/MarsExperience";
import { PropertyCarousel } from "@/components/site/PropertyCarousel";
import { Reveal } from "@/components/site/Reveal";
import { AvisoConceitual, Steps } from "@/components/site/Steps";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mars Estate — Seu próximo horizonte está em Marte" },
      { name: "description", content: "Explore e reserve terrenos fictícios em Marte numa experiência de simulação imobiliária espacial." },
      { property: "og:title", content: "Mars Estate — Seu próximo horizonte está em Marte" },
      { property: "og:description", content: "Simulação imobiliária espacial com terrenos fictícios em Marte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const [terrenos, regioes] = await Promise.all([listarTerrenosBanco(), listarRegioesBanco()]);
    return { terrenos, regioes };
  },
  component: Index,
});

function Index() {
  const { terrenos, regioes } = Route.useLoaderData();
  return (
    <>
      <MarsExperience regioes={regioes} terrenos={terrenos} />

      <section className="mx-auto max-w-7xl px-5 py-24">
        <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">03 / Novas perspectivas</p>
            <h2 className="mt-3 text-3xl font-bold md:text-5xl">Além do horizonte.</h2>
          </div>
          <Link to="/terrenos" className="inline-flex items-center gap-1 text-sm text-copper hover:underline">
            Ver catálogo completo <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10"><PropertyCarousel terrenos={terrenos.filter((t) => t.status === "disponivel")} /></div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <Reveal>
        <p className="eyebrow">Como funciona</p>
        <h2 className="mb-10 mt-3 text-3xl font-bold md:text-5xl">Três passos até Marte</h2>
        <Steps />
        <div className="mt-6"><AvisoConceitual /></div>
        </Reveal>
      </section>

      <section className="relative overflow-hidden">
        <img src={habitat} alt="Habitat em domo em Marte" loading="lazy" width={1280} height={896} className="absolute inset-0 h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-fade-bottom" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-5 py-32">
          <h2 className="max-w-2xl text-3xl font-bold md:text-5xl">Uma nova fronteira, imaginada em detalhes.</h2>
          <Button asChild variant="hero" size="lg" className="mt-8">
            <Link to="/sobre">Conhecer o projeto</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
