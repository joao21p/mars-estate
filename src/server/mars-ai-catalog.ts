import "@tanstack/react-start/server-only";
import { z } from "zod";
import { terrenoMarsAI } from "@/data/mars-ai";
import { pool } from "./db";
import { plotStatusSql } from './reservation-schema';

// Only public catalog columns. Model/user text never becomes SQL.
export async function consultarCatalogoMarsAI(ids: string[] | null = null) {
  const statusSql = await plotStatusSql(pool);
  const consulta = {
    text: `SELECT p.id, p.name AS nome, COALESCE(r.name, p.region_id) AS regiao,
      p.area, p.price AS preco, ${statusSql} AS status, COALESCE(p.description, '') AS descricao,
      COALESCE((SELECT json_agg(pc.name ORDER BY pc.id)
        FROM plot_characteristics pc WHERE pc.plot_id = p.id), '[]'::json) AS caracteristicas
      FROM plots p LEFT JOIN regions r ON r.id = p.region_id
      WHERE ($1::text[] IS NULL OR p.id::text = ANY($1::text[]))
      ORDER BY p.price, p.id LIMIT 101`,
    values: [ids],
    query_timeout: 5000,
  };
  // pg supports per-query query_timeout; @types/pg only declares it on clients.
  const resultado = await pool.query(consulta);
  // Fail closed rather than silently recommending from an incomplete catalog.
  return z.array(terrenoMarsAI).max(100).parse(resultado.rows);
}
