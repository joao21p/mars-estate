
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { StatusTerreno, Terreno } from "../data/terrenos";

type TerrenoBanco = {
  id: string;
  name: string;
  region_id: string;
  region_name: string;
  area: number;
  price: string;
  status: StatusTerreno;
  description: string;
  imagens: string[];
  caracteristicas: string[];
};

function converterTerreno(terreno: TerrenoBanco): Terreno {
  return {
    id: terreno.id,
    nome: terreno.name,
    regiao: terreno.region_name,
    region_id: terreno.region_id,
    area: Number(terreno.area),
    preco: Number(terreno.price),
    status: terreno.status,
    descricao: terreno.description,
    imagens: terreno.imagens,
    caracteristicas: terreno.caracteristicas,
  };
}

// Busca todos os terrenos cadastrados no PostgreSQL
export const listarTerrenosBanco = createServerFn({
  method: "GET",
}).handler(async () => {
  const { setResponseHeader } = await import('@tanstack/react-start/server');
  setResponseHeader('Cache-Control', 'no-store');
  const { pool } = await import("../server/db");
  const { runDatabaseOperation } = await import("../server/db-diagnostics");
  return runDatabaseOperation("catalog.plots", async () => {
  const { plotStatusSql } = await import('../server/reservation-schema');
  const statusSql = await plotStatusSql(pool);

  const resultado = await pool.query<TerrenoBanco>(`
    SELECT
      p.id,
      p.name,
      p.region_id,
      COALESCE(r.name, p.region_id) AS region_name,
      p.area,
      p.price,
      ${statusSql} AS status,
      p.description,
      COALESCE(
        (
          SELECT json_agg(pi.image_url ORDER BY pi.position)
          FROM plot_images pi
          WHERE pi.plot_id = p.id
        ),
        '[]'::json
      ) AS imagens,
      COALESCE(
        (
          SELECT json_agg(pc.name ORDER BY pc.id)
          FROM plot_characteristics pc
          WHERE pc.plot_id = p.id
        ),
        '[]'::json
      ) AS caracteristicas
    FROM plots p
    LEFT JOIN regions r ON r.id = p.region_id
    ORDER BY p.name;
  `);

  return resultado.rows.map(converterTerreno);
  });
});

// Busca apenas um terreno pelo seu ID
export const obterTerrenoBanco = createServerFn({
  method: "GET",
})
  .validator(z.string().min(1))
  .handler(async ({ data: id }) => {
    const { setResponseHeader } = await import('@tanstack/react-start/server');
    setResponseHeader('Cache-Control', 'no-store');
    const { pool } = await import("../server/db");
    const { runDatabaseOperation } = await import("../server/db-diagnostics");
    return runDatabaseOperation("catalog.plot", async () => {
    const { plotStatusSql } = await import('../server/reservation-schema');
    const statusSql = await plotStatusSql(pool);

    const resultado = await pool.query<TerrenoBanco>(
      `
      SELECT
        p.id,
        p.name,
        p.region_id,
        COALESCE(r.name, p.region_id) AS region_name,
        p.area,
        p.price,
        ${statusSql} AS status,
        p.description,
        COALESCE(
          (
            SELECT json_agg(pi.image_url ORDER BY pi.position)
            FROM plot_images pi
            WHERE pi.plot_id = p.id
          ),
          '[]'::json
        ) AS imagens,
        COALESCE(
          (
            SELECT json_agg(pc.name ORDER BY pc.id)
            FROM plot_characteristics pc
            WHERE pc.plot_id = p.id
          ),
          '[]'::json
        ) AS caracteristicas
      FROM plots p
      LEFT JOIN regions r ON r.id = p.region_id
      WHERE p.id = $1;
      `,
      [id]
    );

    const terreno = resultado.rows[0];

    return terreno ? converterTerreno(terreno) : null;
    });
  });
