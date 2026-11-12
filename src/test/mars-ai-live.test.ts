// @vitest-environment node
import { loadEnvFile } from "node:process";
import { expect, it, vi } from "vitest";
import type { EntradaMarsAI, RespostaMarsAI } from "@/data/mars-ai";

vi.mock("@google/genai", async (importOriginal) => {
  const original = await importOriginal<typeof import("@google/genai")>();
  return {
    ...original,
    GoogleGenAI: class extends original.GoogleGenAI {
      constructor(options: ConstructorParameters<typeof original.GoogleGenAI>[0]) {
        super(options);
        const generate = this.models.generateContent.bind(this.models);
        this.models.generateContent = async (...args) => {
          try {
            return await generate(...args);
          } catch (error) {
            // Only safe status diagnostics. Never output provider messages, request bodies or keys.
            const e = error as { name?: string; status?: number; cause?: { code?: string } };
            console.info(
              "Live provider failure:",
              JSON.stringify({ name: e.name, status: e.status, networkCode: e.cause?.code }),
            );
            throw error;
          }
        };
      }
    },
  };
});

// Explicit opt-in: four real Gemini calls. Requires a disposable PostgreSQL schema.
it.skipIf(process.env["MARS_AI_TEST_LIVE"] !== "1")(
  "Gemini + PostgreSQL: orçamento, acompanhamento, ciência e ausência de resultados",
  async () => {
    loadEnvFile(".env");
    const { pool } = await import("@/server/db");
    const { responderMarsAI } = await import("@/server/mars-ai");
    try {
      const schema = (await pool.query("SELECT current_schema() AS schema")).rows[0].schema;
      expect(schema).toMatch(/^mars_reservation_test_[a-z0-9_]+$/);
      const primeira = await responderMarsAI({
        mensagem:
          "Quero o terreno mais barato que esteja disponível, com orçamento de até 500 mil reais.",
        historico: [],
      });
      expect(primeira.ok, primeira.texto).toBe(true);
      if (!primeira.ok) return;
      expect(primeira.terrenos.length).toBeGreaterThan(0);
      expect(primeira.terrenos.every((t) => t.status === "disponivel" && t.preco <= 500000)).toBe(
        true,
      );
      expect(primeira.terrenos[0]?.motivos?.length).toBeGreaterThan(0);
      const entrada: EntradaMarsAI = {
        mensagem: "E a primeira opção? Por que combina com o que pedi?",
        historico: [
          { autor: "usuario", texto: "Tenho até 500 mil reais e quero o mais barato." },
          {
            autor: "assistente",
            texto: `${primeira.texto.slice(0, 600)}\nIDs citados, na ordem: ${primeira.terrenos.map((t) => t.id).join(", ")}`,
          },
        ],
      };
      const acompanhamento = await responderMarsAI(entrada);
      expect(acompanhamento.ok, acompanhamento.texto).toBe(true);
      if (acompanhamento.ok) expect(acompanhamento.terrenos[0]?.id).toBe(primeira.terrenos[0]?.id);
      const ciencia = await responderMarsAI({
        mensagem:
          "Por que a atmosfera de Marte não é respirável? É ciência real ou ficção do site?",
        historico: [],
      });
      expect(ciencia.ok, ciencia.texto).toBe(true);
      if (ciencia.ok) {
        expect(ciencia.terrenos).toEqual([]);
        expect(ciencia.fontes?.length).toBeGreaterThan(0);
        expect(ciencia.texto.toLowerCase()).toMatch(/carbono|oxigênio|respir/);
      }
      const vazio = await responderMarsAI({
        mensagem: "Quero um terreno disponível por até um real, sem ultrapassar esse orçamento.",
        historico: [],
      });
      expect(vazio.ok, vazio.texto).toBe(true);
      if (vazio.ok) expect(vazio.terrenos).toEqual([]);
      for (const resposta of [primeira, acompanhamento, ciencia, vazio] as RespostaMarsAI[])
        expect(resposta.texto).not.toMatch(/R\$|reserva (?:foi |está )?confirmada/);
    } finally {
      await pool.end();
    }
  },
  180000,
);
