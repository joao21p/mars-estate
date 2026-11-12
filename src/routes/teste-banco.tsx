import { createFileRoute } from "@tanstack/react-router";
import { listarTerrenosBanco } from "../functions/terrenos";

export const Route = createFileRoute("/teste-banco")({
  head: () => ({ meta: [{ title: 'Diagnóstico do catálogo | Mars Estate' }, { name: 'robots', content: 'noindex, nofollow' }] }),
  loader: async () => {
    return await listarTerrenosBanco();
  },
  component: TesteBanco,
});

function TesteBanco() {
  const terrenos = Route.useLoaderData();

  return (
    <main style={{ padding: "30px" }}>
      <h1>Teste de integração com PostgreSQL</h1>

      <p>Terrenos encontrados: {terrenos.length}</p>

      {terrenos.map((terreno) => (
        <div
          key={terreno.id}
          style={{
            border: "1px solid #ccc",
            padding: "15px",
            marginBottom: "10px",
          }}
        >
          <h2>{terreno.nome}</h2>
          <p>Região: {terreno.regiao}</p>
          <p>Área: {terreno.area} m²</p>
          <p>Preço: R$ {terreno.preco.toLocaleString("pt-BR")}</p>
          <p>Status: {terreno.status}</p>
          <h3>Características</h3>

<ul>
  {terreno.caracteristicas.map((caracteristica) => (
    <li key={caracteristica}>{caracteristica}</li>
  ))}
</ul>

<h3>Imagens</h3>

<div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
  {terreno.imagens.map((imagem) => (
    <img
      key={imagem}
      src={imagem}
      alt={`Imagem do terreno ${terreno.nome}`}
      style={{
        width: "200px",
        height: "130px",
        objectFit: "cover",
        borderRadius: "8px",
      }}
    />
  ))}
</div>
        </div>
      ))}
    </main>
  );
}
