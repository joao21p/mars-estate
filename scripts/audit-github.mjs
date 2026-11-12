import { execFileSync } from "node:child_process";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createHash } from "node:crypto";

// Read-only Git audit. Never print matching values, lines, remote URLs or author emails.
const git = (args, options = {}) => execFileSync("git", args, { maxBuffer: 256 * 1024 * 1024, ...options });
const lines = (args) => git(args, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
const files = (args) => git(args, { encoding: "utf8" }).split("\0").filter(Boolean);
const env = parseEnv(await readFile(".env", "utf8").catch(() => ""));
const known = Object.entries(env)
  .filter(([name, value]) => /(?:PASSWORD|SECRET|TOKEN|API_KEY|DATABASE_URL)$/.test(name) && value.length >= 6)
  .flatMap(([name, value]) => [[name, Buffer.from(value)], [name, Buffer.from(encodeURIComponent(value))]]);
const patterns = [
  ["Gemini/Google API key", /AIza[\w-]{35}/],
  ["GitHub token", /(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{30,}/],
  ["AWS access key", /(?:AKIA|ASIA)[A-Z0-9]{16}/],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----/],
  ["database URL with credentials", /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s@]+@/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["JWT-shaped value", /eyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}/],
  ["literal secret assignment", /(?:GEMINI_API_KEY|DATABASE_PASSWORD|(?:access|api)[_-]?key|(?:auth|access|refresh)[_-]?token|client[_-]?secret)\s*["']?\s*[:=]\s*["'][A-Za-z0-9_+\/-]{24,}["']/i],
];
const privatePath = (name) =>
  /(?:^|\/)(?:\.env(?:\.[^/]*)?|exports|backups?|\.pgpass|\.pg_service\.conf|\.npmrc|credentials[^/]*\.json|service-account[^/]*\.json)(?:\/|$)/i.test(name) && !name.endsWith(".env.example")
  || /\.(?:dump|backup|bak|dmp|pgdump|pem|key|p12|pfx|sql(?:\.gz|\.zip)?|dump\.gz|backup\.gz)$/i.test(name) && !/^migrations\/[^/]+\.sql$/.test(name);
const findings = [];
const piiReview = [];
function inspect(bytes, context) {
  const kinds = new Set();
  for (const [name, value] of known) if (bytes.includes(value)) kinds.add(`known private value: ${name}`);
  const content = bytes.toString("utf8");
  for (const [kind, pattern] of patterns) if (pattern.test(content)) kinds.add(kind);
  if (privatePath(context.path || "")) kinds.add("private file path");
  for (const kind of kinds) findings.push({ ...context, kind });
  if (context.scope === "working-tree" && !context.binary) {
    const emails = [...content.matchAll(/[A-Za-z0-9._%+-]+@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g)];
    const unexpectedEmails = emails.filter(([, domain]) => !/(?:^|\.)(?:example\.(?:com|org|net|test|invalid)|localhost|test\.com|example)$/i.test(domain));
    const personalPattern = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\(\d{2}\)\s*\d{4,5}[- ]?\d{4}\b/;
    if (unexpectedEmails.length || personalPattern.test(content)) piiReview.push({ path: context.path, emailCandidates: unexpectedEmails.length, personalPattern: personalPattern.test(content) });
  }
}
const tracked = files(["ls-files", "--cached", "-z"]);
const candidates = [...new Set(files(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]))].sort();
const changed = [...new Set([...files(["diff", "--name-only", "-z", "HEAD"]), ...files(["ls-files", "--others", "--exclude-standard", "-z"])])].sort();
const inventory = [];
for (const name of candidates) {
  if (!(await stat(name).catch(() => null))?.isFile()) continue;
  const bytes = await readFile(name);
  const binary = bytes.includes(0);
  inspect(bytes, { scope: "working-tree", path: name, binary });
  if (changed.includes(name)) inventory.push({ path: name, bytes: bytes.length, binary, sha256: createHash("sha256").update(bytes).digest("hex") });
}
const indexEntries = files(["ls-files", "--stage", "-z"]).map(entry => {
  const tab = entry.indexOf("\t");
  const [mode, id, stage] = entry.slice(0, tab).split(" ");
  return { mode, id, stage, path: entry.slice(tab + 1) };
});
const indexBatch = git(["cat-file", "--batch"], { input: indexEntries.map(entry => entry.id).join("\n") + "\n" });
let indexOffset = 0;
for (const entry of indexEntries) {
  const end = indexBatch.indexOf(10, indexOffset);
  const size = Number(indexBatch.subarray(indexOffset, end).toString("utf8").split(" ")[2]);
  inspect(indexBatch.subarray(end + 1, end + 1 + size), { scope: "git-index", path: entry.path, object: entry.id.slice(0, 12) });
  if (entry.stage !== "0") findings.push({ scope: "git-index", path: entry.path, kind: "unresolved merge stage" });
  indexOffset = end + 1 + size + 1;
}
const objects = new Map();
for (const line of lines(["rev-list", "--objects", "--all"])) {
  const split = line.indexOf(" ");
  objects.set(split < 0 ? line : line.slice(0, split), split < 0 ? "" : line.slice(split + 1));
}
const metadata = git(["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"], { encoding: "utf8", input: [...objects.keys()].join("\n") + "\n" });
const selected = metadata.trim().split("\n").map(line => line.split(" ")).filter(([, type]) => ["blob", "commit", "tag"].includes(type));
const batch = git(["cat-file", "--batch"], { input: selected.map(([id]) => id).join("\n") + "\n" });
let offset = 0;
let blobCount = 0;
for (const [id, type, sizeText] of selected) {
  const end = batch.indexOf(10, offset);
  const size = Number(sizeText);
  const content = batch.subarray(end + 1, end + 1 + size);
  if (type === "blob") blobCount++;
  // Author/committer identities are Git metadata; only messages are searched as content.
  const inspected = type === "commit" || type === "tag" ? content.subarray(content.indexOf(Buffer.from("\n\n")) + 2) : content;
  inspect(inspected, { scope: "history", object: id.slice(0, 12), type, path: objects.get(id) });
  offset = end + 1 + size + 1;
}
const shallow = lines(["rev-parse", "--is-shallow-repository"])[0];
const branch = lines(["branch", "--show-current"])[0];
const refs = lines(["for-each-ref", "--format=%(refname)"]);
let origin = { configured: false };
try {
  const remote = lines(["remote", "get-url", "origin"])[0];
  if (/^https?:\/\//.test(remote)) {
    const url = new URL(remote);
    origin = { configured: true, host: url.hostname, credentialsInHttpsUrl: !!(url.username || url.password) };
  } else origin = { configured: true, host: remote.match(/(?:@|\/\/)([^/:]+)/)?.[1] || "unknown", credentialsInHttpsUrl: false };
} catch { /* No remote URL is printed, even on failure. */ }
// rev-list assigns only one representative path to each blob. Check all tree paths too.
const historicalPaths = new Set();
for (const ref of refs) {
  for (const entry of files(["ls-tree", "-r", "--full-tree", "-z", ref])) {
    const name = entry.slice(entry.indexOf("\t") + 1);
    historicalPaths.add(name);
  }
}
for (const commit of lines(["rev-list", "--all"])) {
  for (const entry of files(["ls-tree", "-r", "--full-tree", "-z", commit]))
    historicalPaths.add(entry.slice(entry.indexOf("\t") + 1));
}
for (const name of historicalPaths) if (privatePath(name)) findings.push({ scope: "history-tree-path", path: name, kind: "private file path" });
const result = {
  auditedAt: new Date().toISOString(), branch, origin, shallow, reachableCommits: Number(lines(["rev-list", "--all", "--count"])[0]),
  refs, reachableObjects: objects.size, reachableBlobsScanned: blobCount, historicalPathsScanned: historicalPaths.size, currentFilesScanned: candidates.length, indexBlobsScanned: indexEntries.length,
  changedFiles: inventory, trackedPrivatePaths: tracked.filter(privatePath), findings, piiReview,
  limits: "Local --all refs only; no fetch, external clones, unreachable objects, reflogs or hidden remote refs. Patterns and known .env values >=6 characters; no OCR/steganography or exhaustive PII recognition. Git author metadata excluded from PII review.",
};
await mkdir("exports/github-audit-2026-11-12", { recursive: true });
await writeFile("exports/github-audit-2026-11-12/report.json", JSON.stringify(result, null, 2) + "\n");
console.info(JSON.stringify({ branch, origin, shallow, reachableCommits: result.reachableCommits,
  refsScanned: refs.length, reachableObjects: result.reachableObjects, reachableBlobsScanned: blobCount,
  historicalPathsScanned: historicalPaths.size, currentFilesScanned: candidates.length, changedFiles: inventory.length,
  indexBlobsScanned: indexEntries.length,
  trackedPrivatePaths: result.trackedPrivatePaths, findings, piiReview, report: "exports/github-audit-2026-11-12/report.json", limits: result.limits }, null, 2));
if (findings.length || result.trackedPrivatePaths.length) process.exitCode = 1;
