import assert from "node:assert/strict";

// Read-only smoke: no signup, login, reservation, Gemini call or database mutation.
const base = process.argv[2] || "http://127.0.0.1:4173";
const pages = ["/", "/sobre", "/como-funciona", "/terrenos", "/entrar", "/cadastro", "/teste-banco", "/teste-regioes"];
let catalog;
for (const pathname of pages) {
  let response = await fetch(new URL(pathname, base), { redirect: "manual", signal: AbortSignal.timeout(15000) });
  // Router canonicalizes the validated default returnTo on auth form URLs.
  if (["/entrar", "/cadastro"].includes(pathname) && response.status === 307) {
    const canonical = new URL(response.headers.get("location"), base);
    assert.equal(canonical.origin, new URL(base).origin);
    assert.equal(canonical.pathname, pathname);
    response = await fetch(canonical, { redirect: "manual", signal: AbortSignal.timeout(15000) });
  }
  assert.equal(response.status, 200, `${pathname}: HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") || "", /text\/html/);
  const html = await response.text();
  assert.match(html, /Mars Estate/);
  if (pathname === "/terrenos") catalog = html;
  console.info(`GET ${pathname}: 200, HTML SSR`);
}
const detail = catalog.match(/href="(\/terrenos\/[^"?#]+)"/);
assert.ok(detail, "O catálogo SSR precisa conter um link para detalhes vindo do banco.");
const response = await fetch(new URL(detail[1], base));
assert.equal(response.status, 200, "Detalhe do catálogo");
assert.match(await response.text(), /Mars Estate/);
console.info("GET detalhe do catálogo: 200, HTML SSR");
for (const pathname of ["/conta", "/minhas-reservas"]) {
  const response = await fetch(new URL(pathname, base), { redirect: "manual" });
  assert.equal(response.status, 307, pathname);
  assert.match(response.headers.get("location") || "", /^\/entrar\?/);
  assert.match(response.headers.get("cache-control") || "", /no-store/);
  console.info(`GET ${pathname}: 307 para entrar, no-store`);
}
const missing = await fetch(new URL("/__smoke_missing_page__", base), { redirect: "manual" });
assert.equal(missing.status, 404);
console.info("GET rota inexistente: 404");
const assets = new Set(["/favicon.svg", "/social/mars-estate.png", "/images/regions/jezero.png"]);
for (const match of catalog.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)) assets.add(match[1]);
assert.ok(assets.size > 3, "HTML deve referenciar assets do build");
for (const asset of assets) {
  const response = await fetch(new URL(asset, base));
  assert.equal(response.status, 200, asset);
  assert.doesNotMatch(response.headers.get("content-type") || "", /text\/html/);
  await response.arrayBuffer();
}
console.info(`Assets: ${assets.size} respostas 200 com conteúdo não HTML. Smoke somente leitura concluído.`);
