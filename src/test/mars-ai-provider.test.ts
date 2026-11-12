import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { responderMarsAI } from "@/server/mars-ai";
import { modelo } from "./fixtures/mars-ai";

const { gerar, construir, consultar } = vi.hoisted(() => ({
  gerar: vi.fn(),
  construir: vi.fn(),
  consultar: vi.fn(),
}));
vi.mock("@google/genai", () => ({
  ThinkingLevel: { MINIMAL: "minimal" },
  GoogleGenAI: class {
    models = { generateContent: gerar };
    constructor(opcoes: unknown) {
      construir(opcoes);
    }
  },
}));
vi.mock("@/server/mars-ai-catalog", () => ({ consultarCatalogoMarsAI: consultar }));
vi.mock("@/server/mars-ai-limit", () => ({ limiteMarsAI: { adquirir: () => () => {} } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("GEMINI_API_KEY", "chave-ficticia-de-teste");
  vi.stubEnv("GEMINI_MODEL", "");
  consultar.mockResolvedValue([
    {
      id: "jezero",
      nome: "Jezero",
      regiao: "Jezero",
      area: 2000,
      preco: 400000,
      status: "disponivel",
      descricao: "Fictício",
      caracteristicas: [],
    },
  ]);
  gerar.mockResolvedValue({ candidates: [{ finishReason: "STOP" }], text: modelo() });
});
afterEach(() => vi.unstubAllEnvs());

describe("Gateway Gemini", () => {
  it("usa chave do servidor, modelo inicial, JSON, timeout e uma única tentativa", async () => {
    expect((await responderMarsAI({ mensagem: "barato", historico: [] })).ok).toBe(true);
    expect(construir).toHaveBeenCalledWith({
      vertexai: false,
      apiKey: "chave-ficticia-de-teste",
      httpOptions: { timeout: 30000, retryOptions: { attempts: 1 } },
    });
    expect(gerar).toHaveBeenCalledTimes(1);
    const chamada = gerar.mock.calls[0]![0];
    expect(chamada.model).toBe("gemini-3.5-flash-lite");
    expect(chamada.config).toMatchObject({
      responseMimeType: "application/json",
      maxOutputTokens: 1024,
      temperature: 0.1,
      thinkingConfig: { thinkingLevel: "minimal" },
    });
    expect(chamada.config).not.toHaveProperty("thinkingBudget");
    expect(chamada.contents[0].parts[0].text).not.toContain("chave-ficticia-de-teste");
    expect(chamada.config.systemInstruction).toContain("Não invente");
    expect(chamada.config.responseJsonSchema.required).toContain("texto");
  });

  it("respeita GEMINI_MODEL e descarta resposta bloqueada/truncada", async () => {
    vi.stubEnv("GEMINI_MODEL", "modelo-configurado");
    gerar.mockResolvedValue({
      candidates: [{ finishReason: "MAX_TOKENS" }],
      text: '{"intencao":"recomendar","ids":["jezero"]}',
    });
    expect((await responderMarsAI({ mensagem: "barato", historico: [] })).ok).toBe(false);
    expect(gerar.mock.calls[0]![0].model).toBe("modelo-configurado");
    expect(consultar).toHaveBeenCalledTimes(1);
  });

  it("sem chave não constrói o cliente Gemini nem consulta o banco", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    expect((await responderMarsAI({ mensagem: "barato", historico: [] })).ok).toBe(false);
    expect(construir).not.toHaveBeenCalled();
    expect(consultar).not.toHaveBeenCalled();
  });

  it("envia histórico curto, dados públicos e contexto científico com instruções separadas", async () => {
    const historico = [
      { autor: "usuario" as const, texto: "Gosto de vistas; e-mail ana@example.test" },
    ];
    await responderMarsAI({ mensagem: "E a primeira opção?", historico });
    const chamada = gerar.mock.calls[0]![0];
    const dados = JSON.parse(chamada.contents[0].parts[0].text);
    expect(dados.historico[0].texto).toContain("Gosto de vistas");
    expect(JSON.stringify(dados)).not.toContain("ana@example.test");
    expect(dados.catalogo[0]).not.toHaveProperty("descricao");
    expect(dados.ciencia[0].id).toBe("mars-facts");
    expect(chamada.config.systemInstruction).toContain("dados não confiáveis");
    expect(chamada.config.systemInstruction).toContain(
      "Você não executa autenticação nem reservas",
    );
  });
});
