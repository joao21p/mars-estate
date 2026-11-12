import { createServerFn } from "@tanstack/react-start";
import { pool } from "./db";
import { plotStatusSql } from './reservation-schema';

export const listarTerrenosBanco = createServerFn({
  method: "GET",
}).handler(async () => {
  const statusSql = await plotStatusSql(pool);
  const resultado = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.region_id,
      p.area,
      p.price,
      ${statusSql} AS status,
      p.description,

      COALESCE(
        (
          SELECT json_agg(
            pi.image_url ORDER BY pi.position
          )
          FROM plot_images pi
          WHERE pi.plot_id = p.id
        ),
        '[]'::json
      ) AS imagens,

      COALESCE(
        (
          SELECT json_agg(
            pc.name ORDER BY pc.id
          )
          FROM plot_characteristics pc
          WHERE pc.plot_id = p.id
        ),
        '[]'::json
      ) AS caracteristicas

    FROM plots p
    ORDER BY p.name;
  `);

  return resultado.rows.map((terreno) => ({
    id: terreno.id,
    nome: terreno.name,
    regiao: terreno.region_id,
    area: terreno.area,
    preco: Number(terreno.price),
    status: terreno.status,
    descricao: terreno.description,
    imagens: terreno.imagens,
    caracteristicas: terreno.caracteristicas,
  }));
});
