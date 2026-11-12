import { listarRegioesBanco } from "@/functions/regioes";
import { createFileRoute } from "@tanstack/react-router";
import { JornadaComoFunciona } from "@/components/site/JornadaComoFunciona";
import { PageHeader } from "@/components/site/Layout";
import { listarTerrenosBanco } from "@/functions/terrenos";
import { siteMetadata } from '@/lib/site-metadata';

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: siteMetadata('Como funciona | Mars Estate', 'Conheça a jornada do Mars Estate: explore Marte, compare terrenos fictícios e experimente reservas simuladas. Sem compra ou propriedade real.', '/como-funciona'),
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
