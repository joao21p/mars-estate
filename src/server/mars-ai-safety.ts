import { fontesMarte } from "@/data/mars-science";
import type { EntradaMarsAI, TerrenoMarsAI } from "@/data/mars-ai";

export function ocultarDadosPessoais(texto: string) {
  return texto
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[e-mail omitido]")
    .replace(
      /\b(?:bearer\s+\S+|[a-f0-9]{32,}|\d{3}\.\d{3}\.\d{3}-\d{2})\b/gi,
      "[identificador omitido]",
    )
    .replace(/(?:\+55\s*)?\(?\d{2}\)?[\s-]+9?\d{4}[\s-]?\d{4}\b/g, "[telefone omitido]")
    .replace(/\b\d{11}\b/g, "[identificador omitido]")
    .replace(
      /\b(senha|password|token|api[_ -]?key|chave de api)\s*(?::|=|é)\s*[^\n]+/gi,
      "$1: [omitido]",
    );
}
export function contextoPublico(entrada: EntradaMarsAI, catalogo: TerrenoMarsAI[]) {
  return {
    mensagem: ocultarDadosPessoais(entrada.mensagem),
    historico: entrada.historico.map((item) => ({
      ...item,
      texto: ocultarDadosPessoais(item.texto),
    })),
    // No descriptions, images, auth IDs, cookies, sessions or environment variables.
    catalogo: catalogo.map(({ id, nome, regiao, area, preco, status, caracteristicas }) => ({
      id,
      nome,
      regiao,
      area,
      preco,
      status,
      caracteristicas,
    })),
    ciencia: fontesMarte.map(({ id, contexto }) => ({ id, contexto })),
  };
}

// Conservative guard; commercial assertions belong to verified structured cards.
// This is not a semantic proof for every possible phrasing.
export function textoConversacionalSeguro(
  texto: string,
  ciencia: boolean,
  catalogo: TerrenoMarsAI[],
) {
  const normal = texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  if (
    /https?:|www\.|<[^>]+>|\[[^\]]*\]\(|\{\{|ignore.{0,30}(instruc|regra)|system\s*prompt/i.test(
      normal,
    )
  )
    return false;
  if (
    /[$€£]|\b(?:reais|brl|usd|dolares|desconto|gratuito|pagamento confirmado|reserva confirmada|reservei|comprei|vendido|reservado|disponiveis|disponivel|custa|preco|mil|milhao|milhoes)\b/i.test(
      normal,
    )
  )
    return false;
  if (
    /\b(?:sua|a)\s+(?:reserva|compra)\s+(?:foi|esta)\b|propriedade.{0,20}(garantid|confirmad)|garant[oa].{0,30}(reserva|preco|disponibilidade)/i.test(
      normal,
    )
  )
    return false;
  if (
    !ciencia &&
    /\p{N}|\b(?:mil|milhao|milhoes|custa|preco|hectares|metros quadrados)\b/u.test(normal)
  )
    return false;
  if (ciencia) {
    const numerosDoContexto = new Set(
      fontesMarte.flatMap((f) =>
        [...f.contexto.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", "."))),
      ),
    );
    if (
      [...normal.matchAll(/\d+(?:[.,]\d+)?/g)].some(
        (m) => !numerosDoContexto.has(Number(m[0].replace(",", "."))),
      )
    )
      return false;
  }
  if (
    catalogo.some((item) =>
      normal.includes(item.nome.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()),
    )
  )
    return false;
  return true;
}
