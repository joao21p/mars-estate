import { createServerFn } from "@tanstack/react-start";
import type { Regiao } from "../data/regioes";

// Mantém o acesso ao PostgreSQL no servidor, como nas funções de terrenos.
export const listarRegioesBanco = createServerFn({
  method: "GET",
}).handler(async (): Promise<Regiao[]> => {
  const { pool } = await import("../server/db");

  const resultado = await pool.query<Regiao>(`
    SELECT
      r.id,
      r.name AS nome,
      r.type AS tipo,
      r.description AS descricao,
      r.latitude,
      r.longitude,
      r.image_url AS imagem,
      r.fact AS fato,
      r.source AS fonte,
      r.source_url AS "fonteUrl",
      COALESCE(
        (
          SELECT json_agg(p.id ORDER BY p.id)
          FROM plots p
          WHERE p.region_id = r.id
        ),
        '[]'::json
      ) AS terrenos
    FROM regions r
    ORDER BY r.name;
  `);

  return resultado.rows;
});
