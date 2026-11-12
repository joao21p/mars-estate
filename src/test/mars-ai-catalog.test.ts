import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarCatalogoMarsAI } from "@/server/mars-ai-catalog";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db", () => ({ pool: { query } }));
const lote = {
  id: "jezero",
  nome: "Jezero",
  regiao: "Jezero",
  area: "2000",
  preco: "400000.50",
  status: "disponivel",
  descricao: "Fictício",
  caracteristicas: ["Elevado"],
  segredo: "nunca enviar",
};
beforeEach(() => query.mockReset());

describe("Consulta pública do Mars AI", () => {
  it("continua lendo dados reais do catálogo antes da migração de reservas", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ available: false }] })
      .mockResolvedValueOnce({ rows: [lote] });
    expect(await consultarCatalogoMarsAI()).toMatchObject([{ id: lote.id, preco: 400000.5 }]);
    const consulta = query.mock.calls[1]![0];
    expect(consulta.text).toContain("p.status AS status");
    expect(consulta.text).not.toContain("FROM plot_reservations");
  });
  it("retorna só campos públicos, converte números e parametriza IDs sem interpolação SQL", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ available: true }] })
      .mockResolvedValueOnce({ rows: [lote] });
    const ids = ["'; DROP TABLE plots; --"];
    const catalogo = await consultarCatalogoMarsAI(ids);
    const consulta = query.mock.calls[1]![0];
    expect(consulta.text).not.toContain(ids[0]);
    expect(consulta.values).toEqual([ids]);
    expect(consulta.text).toContain("ANY($1::text[])");
    expect(consulta.text).toContain("LIMIT 101");
    expect(consulta.query_timeout).toBe(5000);
    expect(catalogo[0]).toMatchObject({ area: 2000, preco: 400000.5 });
    expect(catalogo[0]).not.toHaveProperty("segredo");
  });

  it("rejeita catálogo incompleto ou dados inválidos sem devolvê-los ao modelo", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ available: true }] })
      .mockResolvedValueOnce({ rows: Array(101).fill(lote) });
    await expect(consultarCatalogoMarsAI()).rejects.toThrow();
    query
      .mockResolvedValueOnce({ rows: [{ available: true }] })
      .mockResolvedValueOnce({ rows: [{ ...lote, preco: "não é preço" }] });
    await expect(consultarCatalogoMarsAI()).rejects.toThrow();
  });
});
