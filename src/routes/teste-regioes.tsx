
import { createFileRoute } from "@tanstack/react-router";
import { listarRegioesBanco } from "../functions/regioes";

export const Route = createFileRoute("/teste-regioes")({
  head: () => ({ meta: [{ title: 'Diagnóstico de regiões | Mars Estate' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  loader: () => listarRegioesBanco(),
  component: TesteRegioes,
});

function TesteRegioes() {
  const regioes = Route.useLoaderData();

  return (
    <main style={{ padding: "120px 24px 40px" }}>
      <h1>Teste das regiões do PostgreSQL</h1>

      <p>Total de regiões: {regioes.length}</p>

      {regioes.map((regiao) => (
        <section
          key={regiao.id}
          style={{
            border: "1px solid #777",
            padding: 20,
            marginTop: 20,
            borderRadius: 8,
          }}
        >
          <h2>{regiao.nome}</h2>
          <p>Tipo: {regiao.tipo}</p>
          <p>Descrição: {regiao.descricao}</p>
          <p>Latitude: {regiao.latitude}</p>
          <p>Longitude: {regiao.longitude}</p>
          <p>Terrenos: {regiao.terrenos.join(", ")}</p>
          <p>Fato científico: {regiao.fato}</p>

          {regiao.imagem && (
            <img
              src={regiao.imagem}
              alt={regiao.nome}
              style={{
                width: 300,
                maxWidth: "100%",
                marginTop: 12,
              }}
            />
          )}
        </section>
      ))}
    </main>
  );
}
