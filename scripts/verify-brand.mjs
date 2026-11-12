// Read-only HTTP/SSR and build artifact verification. No browser automation or writes.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { JSDOM } from "jsdom";

const origin = new URL(process.argv[2] || "http://127.0.0.1:3016").origin;
const pages = [
  ["/", "Mars Estate | Explore o impossível"],
  ["/terrenos", "Explorar terrenos | Mars Estate"],
  ["/como-funciona", "Como funciona | Mars Estate"],
  ["/sobre", "Sobre o projeto | Mars Estate"],
  ["/terrenos/borda-de-jezero", "Borda de Jezero | Mars Estate"],
  ["/entrar", "Entrar | Mars Estate"],
  ["/cadastro", "Criar conta | Mars Estate"],
];
const publicRoot = new URL("../public/", import.meta.url);
const buildRoot = new URL("../.output/public/", import.meta.url);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const [pathname, title] of pages) {
  // Two independent document requests exercise hard refresh, not client-side cached metadata.
  for (let refresh = 0; refresh < 2; refresh++) {
    const response = await fetch(origin + pathname, { cache: "no-store" });
    assert.equal(response.status, 200, pathname);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;
    assert.equal(document.title, title);
    assert.equal(document.querySelectorAll("head title").length, 1);
    const meta = (selector) => {
      const elements = document.querySelectorAll(`head meta[${selector}]`);
      assert.equal(elements.length, 1, `${pathname}: unique ${selector}`);
      return elements[0].getAttribute("content");
    };
    const description = meta('name="description"');
    assert.match(description, /fictíci|simulaç/i);
    assert.equal(meta('property="og:title"'), title);
    assert.equal(meta('name="twitter:title"'), title);
    assert.equal(meta('property="og:description"'), description);
    assert.equal(meta('name="twitter:description"'), description);
    assert.equal(meta('property="og:url"'), origin + pathname);
    assert.equal(meta('property="og:image"'), origin + "/social/mars-estate.png");
    assert.equal(meta('name="twitter:image"'), origin + "/social/mars-estate.png");
    assert.equal(meta('name="twitter:card"'), "summary_large_image");
    assert.equal(meta('property="og:image:width"'), "1200");
    assert.equal(meta('property="og:image:height"'), "630");
    assert.ok(
      document.querySelector('link[rel="icon"][type="image/svg+xml"][href="/favicon.svg"]'),
    );
    assert.ok(
      document.querySelector('link[rel="shortcut icon"][href="/favicon.ico?v=mars-estate-1"]'),
    );
    assert.match(
      document.querySelector("footer").textContent,
      /projeto demonstrativo de portfólio/i,
    );
    assert.doesNotMatch(document.querySelector("footer").textContent, /lovable/i);
    if (["/entrar", "/cadastro"].includes(pathname)) assert.match(meta('name="robots"'), /noindex/);
    dom.window.close();
  }
  console.log(`SSR + refresh passed: ${pathname}`);
}
const assets = [
  ["favicon.svg", "image/svg+xml"],
  ["favicon.ico", "image/"],
  ["favicon-32x32.png", "image/png"],
  ["apple-touch-icon.png", "image/png"],
  ["social/mars-estate.png", "image/png"],
  ["social/mars-estate.svg", "image/svg+xml"],
];
for (const [path, mime] of assets) {
  const response = await fetch(`${origin}/${path}`, { cache: "no-store" });
  assert.equal(response.status, 200, path);
  assert.ok(response.headers.get("content-type")?.startsWith(mime), path);
  const served = Buffer.from(await response.arrayBuffer());
  const source = await readFile(new URL(path, publicRoot));
  const built = await readFile(new URL(path, buildRoot));
  assert.equal(hash(source), hash(built), `${path} copied unchanged to build`);
  assert.equal(hash(source), hash(served), `${path} served correctly`);
  if (path.endsWith(".png")) {
    assert.equal(served.toString("hex", 0, 8), "89504e470d0a1a0a");
    const size = path.startsWith("social/")
      ? [1200, 630]
      : path.startsWith("apple")
        ? [180, 180]
        : [32, 32];
    assert.deepEqual([served.readUInt32BE(16), served.readUInt32BE(20)], size);
  }
  if (path.endsWith(".ico")) {
    assert.equal(served.readUInt16LE(2), 1);
    assert.equal(served.readUInt16LE(4), 3);
    assert.deepEqual([served[6], served[22], served[38]], [16, 32, 48]);
  }
  console.log(`Asset + build passed: ${path}`);
}
