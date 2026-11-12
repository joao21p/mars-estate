import "@tanstack/react-start/server-only";
import { z } from "zod";
import {
  entradaMarsAI,
  type EntradaMarsAI,
  type RespostaMarsAI,
  type TerrenoMarsAI,
} from "@/data/mars-ai";
import { fontesMarte } from "@/data/mars-science";
import { textoConversacionalSeguro } from "./mars-ai-safety";
import { orcamentoDeclarado } from "@/data/mars-ai-preferences";

export const respostaModelo = z
  .object({
    intencao: z.enum(["recomendar", "esclarecer", "sem_resultados", "ciencia", "fora_escopo"]),
    texto: z.string().trim().min(1).max(1600),
    ids: z.array(z.string().min(1).max(120)).max(3),
    preferencias: z
      .object({
        orcamentoMaximo: z.number().finite().nonnegative().nullable(),
        areaMinima: z.number().finite().nonnegative().nullable(),
        regiao: z.string().max(200).nullable(),
      })
      .strict(),
    destaques: z
      .array(
        z
          .object({ id: z.string().max(120), caracteristicas: z.array(z.string().max(200)).max(3) })
          .strict(),
      )
      .max(3),
    fontes: z.array(z.enum(["mars-facts", "humans-mars"])).max(2),
  })
  .strict();

interface Dependencias {
  apiKey: string | undefined;
  catalogo: (ids?: string[] | null) => Promise<TerrenoMarsAI[]>;
  gerar: (entrada: EntradaMarsAI, catalogo: TerrenoMarsAI[]) => Promise<string | undefined>;
  adquirir: () => (() => void) | null;
}
const falha = (texto: string): RespostaMarsAI => ({ ok: false, texto });
const interpretar = () =>
  falha("Não consegui interpretar a resposta do Mars AI. Tente reformular sua pergunta.");
const dinheiro = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });
const normalizar = (valor: string) => valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export async function executarMarsAI(
  entrada: EntradaMarsAI,
  deps: Dependencias,
): Promise<RespostaMarsAI> {
  const validacao = entradaMarsAI.safeParse(entrada);
  if (!validacao.success)
    return falha("Envie uma mensagem de até 2.000 caracteres e um histórico curto.");
  if (!deps.apiKey?.trim())
    return falha("O Mars AI ainda não está configurado. Você pode explorar o catálogo.");
  const liberar = deps.adquirir();
  if (!liberar)
    return falha("O Mars AI atingiu o limite temporário de uso. Tente novamente mais tarde.");
  try {
    const catalogo = await deps.catalogo();
    if (JSON.stringify(catalogo).length > 40000)
      return falha(
        "Não consegui consultar todo o catálogo agora. Explore os terrenos pela página do catálogo.",
      );
    const bruto = await deps.gerar(validacao.data, catalogo);
    if (!bruto || bruto.length > 6000) return interpretar();
    let json: unknown;
    try {
      json = JSON.parse(bruto);
    } catch {
      return interpretar();
    }
    const resultado = respostaModelo.safeParse(json);
    if (!resultado.success) return interpretar();
    const { intencao, ids, preferencias, destaques, fontes } = resultado.data;
    const tetoExplicito = orcamentoDeclarado(validacao.data);
    if (tetoExplicito !== undefined) preferencias.orcamentoMaximo = tetoExplicito;
    const unicos = [...new Set(ids)];
    if (
      unicos.some((id) => !catalogo.some((t) => t.id === id)) ||
      (intencao === "recomendar" ? !unicos.length : unicos.length > 0) ||
      destaques.some(
        (d) =>
          !unicos.includes(d.id) ||
          d.caracteristicas.some(
            (c) => !catalogo.find((t) => t.id === d.id)?.caracteristicas.includes(c),
          ),
      ) ||
      (intencao !== "ciencia" && fontes.length > 0) ||
      (preferencias.regiao !== null &&
        !catalogo.some((t) => normalizar(t.regiao) === normalizar(preferencias.regiao!)))
    )
      return interpretar();
    const seguro = textoConversacionalSeguro(
      resultado.data.texto,
      intencao === "ciencia",
      catalogo,
    );
    const alternativas = {
      recomendar:
        "Separei algumas opções para você explorar. Qual delas combina mais com o que você imaginou?",
      esclarecer: "O que você quer priorizar: orçamento, espaço ou paisagem?",
      sem_resultados:
        "Não encontrei uma opção que atenda a tudo. Qual preferência você gostaria de flexibilizar?",
      ciencia:
        "Posso ajudar com a ciência de Marte. Você quer conversar sobre atmosfera, água ou exploração?",
      fora_escopo:
        "Posso conversar sobre Marte e ajudar a explorar esta simulação. O que você gostaria de descobrir?",
    };
    const texto = seguro ? resultado.data.texto : alternativas[intencao];
    if (intencao !== "recomendar") {
      return {
        ok: true,
        texto: intencao === "ciencia" && !fontes.length ? alternativas.ciencia : texto,
        terrenos: [],
        ...(intencao === "ciencia" && fontes.length
          ? {
              fontes: fontesMarte
                .filter((f) => fontes.includes(f.id))
                .map(({ id, titulo, url }) => ({ id, titulo, url })),
            }
          : {}),
      };
    }
    // Reread IDs after inference. All commercial fields and reasons use this snapshot.
    const atuais = await deps.catalogo(unicos);
    const terrenos = unicos.flatMap((id) => {
      const t = atuais.find((t) => t.id === id && t.status === "disponivel");
      if (
        !t ||
        catalogo.find((t) => t.id === id)?.status !== "disponivel" ||
        (preferencias.orcamentoMaximo !== null && t.preco > preferencias.orcamentoMaximo) ||
        (preferencias.areaMinima !== null && t.area < preferencias.areaMinima) ||
        (preferencias.regiao && normalizar(t.regiao) !== normalizar(preferencias.regiao))
      )
        return [];
      const motivos: string[] = [];
      if (preferencias.orcamentoMaximo !== null)
        motivos.push(`Cabe no orçamento considerado de ${dinheiro(preferencias.orcamentoMaximo)}.`);
      if (preferencias.areaMinima !== null)
        motivos.push(
          `A área de ${t.area.toLocaleString("pt-BR")} m² atende ao mínimo considerado.`,
        );
      if (preferencias.regiao)
        motivos.push(`Fica na região que você está explorando: ${t.regiao}.`);
      for (const c of destaques.find((d) => d.id === id)?.caracteristicas ?? [])
        if (t.caracteristicas.includes(c)) motivos.push(`Para o perfil que você procura: ${c}.`);
      if (!motivos.length)
        motivos.push(
          t.caracteristicas.length
            ? `Um destaque para sua exploração: ${t.caracteristicas[0]}.`
            : `Uma opção para explorar a região ${t.regiao}.`,
        );
      return [{ ...t, motivos }];
    });
    const criterios: string[] = [];
    if (preferencias.orcamentoMaximo !== null)
      criterios.push(`Orçamento interpretado: até ${dinheiro(preferencias.orcamentoMaximo)}`);
    if (preferencias.areaMinima !== null)
      criterios.push(
        `Área mínima interpretada: ${preferencias.areaMinima.toLocaleString("pt-BR")} m²`,
      );
    if (preferencias.regiao) criterios.push(`Região interpretada: ${preferencias.regiao}`);
    return {
      ok: true,
      texto: terrenos.length
        ? texto
        : "Nenhuma das sugestões atende aos critérios com os dados atuais. Quer ajustar o orçamento, a área ou a região?",
      terrenos,
      criterios,
    };
  } catch (erro) {
    const status =
      typeof erro === "object" && erro !== null && "status" in erro ? Number(erro.status) : 0;
    const nome = erro instanceof Error ? erro.name : "";
    if (status === 429)
      return falha(
        "A cota do Mars AI foi atingida. Tente novamente mais tarde ou explore o catálogo.",
      );
    if (nome === "AbortError" || nome === "TimeoutError" || status === 504 || status === 408)
      return falha("O Mars AI demorou para responder. Tente novamente em instantes.");
    if ([400, 401, 403, 404].includes(status))
      return falha(
        "O Mars AI está indisponível por uma configuração do serviço. Explore o catálogo por enquanto.",
      );
    return falha(
      "Não foi possível acessar o Mars AI ou o catálogo agora. Verifique sua conexão e tente novamente.",
    );
  } finally {
    liberar();
  }
}
