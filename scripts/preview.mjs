import { readFile } from "node:fs/promises";

// Execute the actual Nitro production server, with runtime environment variables.
const metadata = JSON.parse(await readFile(new URL("../.output/nitro.json", import.meta.url), "utf8")
  .catch(() => { throw new Error("Execute npm run build:local antes de npm run preview."); }));
if (metadata.preset !== "node-server") {
  throw new Error("Este artefato não é um servidor Node local. Execute npm run build:local. O build Vercel exige a plataforma Vercel.");
}
process.env.NODE_ENV = "production";
process.env.HOST ||= "127.0.0.1";
process.env.PORT ||= "4173";
await import("../.output/server/index.mjs");
