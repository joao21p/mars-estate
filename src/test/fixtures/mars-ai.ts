export function modelo(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    intencao: "recomendar",
    texto: "Pensei em uma opção para você explorar. Quer priorizar a paisagem ou o espaço?",
    ids: ["jezero"],
    preferencias: { orcamentoMaximo: null, areaMinima: null, regiao: null },
    destaques: [],
    fontes: [],
    ...overrides,
  });
}
