import type { EntradaMarsAI } from "./mars-ai";

// Explicit monetary ceilings are enforced independently of model interpretation.
// More ambiguous wording is left to the model and shown as an interpreted criterion.
export function orcamentoDeclarado(entrada: EntradaMarsAI): number | null | undefined {
  let limite: number | null | undefined;
  for (const texto of [
    ...entrada.historico.filter((m) => m.autor === "usuario").map((m) => m.texto),
    entrada.mensagem,
  ]) {
    const normal = texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    const retirarTeto = [
      ...normal.matchAll(
        /sem (?:limite de orcamento|teto|limite de preco)|nao tenho limite de orcamento/g,
      ),
    ].at(-1);
    if (retirarTeto) limite = null;
    const padrao =
      /\b(ate|no maximo|orcamento(?: maximo)?(?: de)?|teto(?: de)?|limite(?: de)?)\s*(r\$\s*)?(\d[\d.,]*|um|meio)\s*(milhoes|milhao|mil)?\s*(reais?)?/g;
    for (const m of normal.matchAll(padrao)) {
      if (retirarTeto && m.index! < retirarTeto.index!) continue;
      // “Até três mil metros quadrados” is an area preference, not a budget.
      if (/^(?:m²|m2|metros|hectares|ha\b)/.test(normal.slice(m.index! + m[0].length).trimStart()))
        continue;
      if (!m[2] && !m[4] && !m[5] && ["ate", "no maximo"].includes(m[1]!)) continue;
      const valor =
        m[3] === "um"
          ? 1
          : m[3] === "meio"
            ? 0.5
            : Number(m[3]!.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
      const escala = m[4] === "mil" ? 1000 : m[4] ? 1000000 : 1;
      if (Number.isFinite(valor * escala) && valor >= 0) limite = valor * escala;
    }
  }
  return limite;
}
