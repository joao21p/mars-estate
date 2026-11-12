import { execFileSync } from "node:child_process";
import { readFile, readdir, stat } from "node:fs/promises";
import { parseEnv } from "node:util";
import path from "node:path";

// Never print values, matching lines, database content or provider responses.
const env = parseEnv(await readFile(".env", "utf8").catch(() => ""));
const secrets = Object.entries({ ...env, ...process.env })
  .filter(([name, value]) => /(?:PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL)$/.test(name) && value?.length >= 6)
  .flatMap(([name, value]) => [[name, Buffer.from(value)], [name, Buffer.from(encodeURIComponent(value))]]);
const candidates = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" })
  .split("\0").filter(Boolean);
const privatePath = (file) => /(?:^|\/)(?:\.env(?:\..*)?|\.pgpass|backups|exports)(?:\/|$)/i.test(file) && !file.endsWith(".env.example")
  || /\.(?:dump|backup|pem|key|p12|pfx|sql(?:\.gz|\.zip)?)$/i.test(file) && !/^migrations\/[^/]+\.sql$/.test(file);
const tokenPatterns = [
  /AIza[\w-]{35}/,
  /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{30,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /postgres(?:ql)?:\/\/[^\s/:]+:[^\s@]+@/,
];
const findings = new Set();
async function inspect(file, publicFile = false) {
  const bytes = await readFile(file);
  for (const [name, value] of secrets) {
    if (bytes.includes(value)) findings.add(`${file}: valor privado (${name})`);
  }
  if (tokenPatterns.some((pattern) => pattern.test(bytes.toString("utf8")))) findings.add(`${file}: possível credencial embutida`);
  if (publicFile && /\.(?:[cm]?js|map|html|json|css)$/.test(file)) {
    if (/(?:GEMINI_API_KEY|DATABASE_PASSWORD|DATABASE_URL|node:crypto|scrypt\$131072|GoogleGenAI|generativelanguage\.googleapis\.com|password_hash|token_hash)/.test(bytes.toString("utf8")))
      findings.add(`${file}: identificador de implementação privada no bundle público`);
  }
}
for (const file of candidates) {
  if (privatePath(file)) findings.add(`${file}: arquivo privado elegível para Git`);
  if ((await stat(file).catch(() => null))?.isFile()) await inspect(file);
}
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const name = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(name));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}
let publicCount = 0;
for (const dir of ["public", "dist/client", ".output/public", ".vercel/output/static"]) {
  for (const file of await walk(dir)) {
    publicCount++;
    if (privatePath(file.slice(dir.length + 1))) findings.add(`${file}: arquivo privado público`);
    await inspect(file, true);
  }
}
if (publicCount === 0) throw new Error("Nenhum arquivo público encontrado para auditar.");
let serverCount = 0;
for (const dir of [".output/server", ".vercel/output/functions"]) {
  for (const file of await walk(dir)) {
    serverCount++;
    await inspect(file);
  }
}
if (findings.size) {
  for (const finding of findings) console.error(finding);
  process.exitCode = 1;
} else console.info(`Auditoria OK: ${candidates.length} arquivos elegíveis para Git; ${publicCount} arquivos públicos; ${serverCount} arquivos de servidor; sem correspondências de segredos conhecidos ou padrões de credenciais.`);
console.info("Escopo: árvore atual e arquivos públicos existentes; não certifica histórico Git nem ausência de todo dado pessoal. Não publica valores.");
