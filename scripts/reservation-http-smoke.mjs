// Run only against the disposable preview started with PGOPTIONS search_path.
import assert from "node:assert/strict";
import pg from "pg";
import { config } from "./reservation-test-schema.mjs";
import { toJSONAsync, fromCrossJSON } from "seroval";

const origin = "http://127.0.0.1:3012";
const schema = process.argv[2];
if (!/^mars_reservation_test_[a-z0-9_]+$/.test(schema ?? ""))
  throw new Error("Disposable schema required");
const db = new pg.Client({ ...config, options: `-c search_path=${schema}` });
await db.connect();
const cookies = new Map();
async function rpc(file, name, data, jar = "anonymous", method = "POST", extraHeaders = {}) {
  const source = await (await fetch(`${origin}/src/functions/${file}.ts`)).text();
  const line = source.split("\n").find((line) => line.startsWith(`export const ${name} =`));
  const id = line?.match(/createClientRpc\("([^"]+)"\)/)?.[1];
  assert.ok(id, "Vite function identifier");
  const payload = data === undefined ? undefined : JSON.stringify(await toJSONAsync({ data }));
  const response = await fetch(
    `${origin}/_serverFn/${id}${method === "GET" && payload ? "?payload=" + encodeURIComponent(payload) : ""}`,
    {
      method,
      headers: {
        origin,
        "sec-fetch-site": "same-origin",
        "x-tsr-serverFn": "true",
        accept: "application/json",
        ...(method === "POST" && payload ? { "content-type": "application/json" } : {}),
        ...(cookies.has(jar) ? { cookie: cookies.get(jar) } : {}),
        ...extraHeaders,
      },
      ...(method === "POST" && payload ? { body: payload } : {}),
      redirect: "manual",
    },
  );
  const cookie = response.headers.get("set-cookie");
  if (cookie) cookies.set(jar, cookie.split(";")[0]);
  assert.equal(response.status, 200, name);
  const json = await response.json();
  const result = response.headers.has("x-tss-serialized")
    ? fromCrossJSON(json, { refs: new Map() })
    : json;
  if (result?.error) throw result.error;
  return result && "result" in result ? result.result : result;
}
try {
  assert.equal((await db.query("SELECT current_schema() AS schema")).rows[0].schema, schema);
  await db.query(`INSERT INTO plots (id,name,region_id,area,price,status,description)
    SELECT 'teste-http-reservas','Terreno de teste HTTP',region_id,100,1,'disponivel','Simulação de teste'
    FROM plots LIMIT 1 ON CONFLICT (id) DO NOTHING`);
  // Guard BEFORE auth writes: a server using the permanent schema cannot see this marker.
  const catalog = await rpc("terrenos", "listarTerrenosBanco", undefined, "anonymous", "GET");
  assert.ok(
    catalog.some((p) => p.id === "teste-http-reservas"),
    "Preview must use disposable schema",
  );
  for (const path of ["/entrar", "/cadastro", "/terrenos", "/terrenos/borda-de-jezero"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    await response.text();
  }
  const protectedResponse = await fetch(origin + "/minhas-reservas", { redirect: "manual" });
  assert.equal(protectedResponse.status, 307);
  assert.ok(protectedResponse.headers.get("location").startsWith("/entrar?"));
  assert.equal((await rpc("reservations", "reservePlot", "teste-http-reservas")).login, true);
  await assert.rejects(
    rpc("reservations", "reservePlot", "teste-http-reservas", "anonymous", "POST", {
      origin: "https://evil.example",
      "sec-fetch-site": "cross-site",
    }),
  );
  assert.equal((await db.query("SELECT count(*)::int AS n FROM plot_reservations")).rows[0].n, 0);
  const stamp = Date.now();
  const first = {
    name: "Teste HTTP Um",
    email: `http-one-${stamp}@example.test`,
    password: "test only password 123",
  };
  const second = { ...first, name: "Teste HTTP Dois", email: `http-two-${stamp}@example.test` };
  assert.equal((await rpc("auth", "signup", first, "one")).ok, true);
  assert.equal((await rpc("reservations", "reservePlot", "teste-http-reservas", "one")).ok, true);
  const own = await rpc("reservations", "getReservations", undefined, "one", "GET");
  assert.equal(own.length, 1);
  const reservedPage = await (await fetch(origin + "/terrenos/teste-http-reservas")).text();
  assert.ok(reservedPage.includes("Terreno indisponível para reserva"));
  assert.equal((await rpc("auth", "logout", undefined, "one")).ok, true);
  assert.equal((await rpc("auth", "signup", second, "one")).ok, true);
  assert.deepEqual(await rpc("reservations", "getReservations", undefined, "one", "GET"), []);
  assert.equal((await rpc("reservations", "cancelReservation", own[0].id, "one")).ok, false);
  assert.equal((await rpc("reservations", "reservePlot", "teste-http-reservas", "one")).ok, false);
  assert.equal((await rpc("reservations", "reservePlot", "vale-ares", "one")).ok, false);
  assert.equal((await rpc("auth", "logout", undefined, "one")).ok, true);
  assert.equal((await rpc("auth", "login", first, "one")).ok, true);
  assert.equal((await rpc("reservations", "cancelReservation", own[0].id, "one")).ok, true);
  const availablePage = await (await fetch(origin + "/terrenos/teste-http-reservas")).text();
  assert.ok(availablePage.includes(">Reservar terreno<"));
  assert.equal((await rpc("auth", "logout", undefined, "one")).ok, true);
  assert.equal((await rpc("auth", "login", second, "one")).ok, true);
  assert.equal((await rpc("auth", "getCurrentUser", undefined, "one", "GET")).email, second.email);
  assert.equal((await rpc("auth", "logout", undefined, "one")).ok, true);
  console.log(
    "HTTP + real PostgreSQL passed: SSR, protected redirect, two signups, account switching, reserve, duplicate, sold, ownership, cancellation and effective availability. Browser UI remains unverified.",
  );
} finally {
  await db.end();
}
