import { listarRegioesBanco } from "@/functions/regioes";
import { createFileRoute } from "@tanstack/react-router";
import { JornadaComoFunciona } from "@/components/site/JornadaComoFunciona";
import { PageHeader } from "@/components/site/Layout";
import { listarTerrenosBanco } from "@/functions/terrenos";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como Funciona — Mars Estate" },
      { name: "description", content: "Percorra uma simulação interativa em quatro etapas: descubra Marte, explore regiões reais, compare terrenos fictícios e simule seu interesse." },
      { property: "og:title", content: "Como Funciona — Mars Estate" },
      { property: "og:description", content: "Uma jornada interativa em quatro etapas pela exploração conceitual de terrenos fictícios em Marte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async () => {
    const [terrenos, regioes] = await Promise.all([listarTerrenosBanco(), listarRegioesBanco()]);
    return { terrenos, regioes };
  },
  component: ComoFuncionaPage,
});

function ComoFuncionaPage() {
  const { terrenos, regioes } = Route.useLoaderData();
  return (
    <>
      <PageHeader eyebrow="Como funciona" title="Uma jornada em quatro etapas.">
        Da descoberta do planeta à simulação de interesse: percorra o caminho completo de um
        explorador do Mars Estate — sem compra, sem reserva, sem dados reais.
      </PageHeader>
      <JornadaComoFunciona regioes={regioes} terrenos={terrenos} />
    </>
  );
}
