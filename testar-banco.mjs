import pg from "pg";
import { loadEnvFile } from "node:process";

loadEnvFile(".env");

const { Client } = pg;

const client = new Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT || 5432),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  connectionTimeoutMillis: 5000,
});

try {
  await client.connect();

  console.log("Conexão com PostgreSQL realizada com sucesso!");

 const resultado = await client.query(`
  SELECT
    p.id,
    p.name,
    p.price,
    p.status,
    r.name AS region_name,
    (
      SELECT COUNT(*)
      FROM plot_images pi
      WHERE pi.plot_id = p.id
    ) AS total_images,
    (
      SELECT COUNT(*)
      FROM plot_characteristics pc
      WHERE pc.plot_id = p.id
    ) AS total_characteristics
  FROM plots p
  JOIN regions r ON r.id = p.region_id
  ORDER BY p.name;
`);

console.table(resultado.rows);

  
} catch (erro) {
  console.error("Erro ao conectar ao PostgreSQL:", erro.message);
  process.exitCode = 1;
} finally {
  await client.end();
}