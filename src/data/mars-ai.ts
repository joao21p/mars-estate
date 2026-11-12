import { z } from "zod";
import type { FonteMarte } from "./mars-science";

export const MAX_MENSAGEM = 2000;
export const MAX_HISTORICO = 8;
export const entradaMarsAI = z
  .object({
    mensagem: z.string().trim().min(1).max(MAX_MENSAGEM),
    historico: z
      .array(
        z
          .object({
            autor: z.enum(["usuario", "assistente"]),
            texto: z.string().trim().min(1).max(MAX_MENSAGEM),
          })
          .strict(),
      )
      .max(MAX_HISTORICO),
  })
  .strict()
  .refine(
    (entrada) =>
      entrada.mensagem.length +
        entrada.historico.reduce((total, item) => total + item.texto.length, 0) <=
      10000,
    "Conversa muito longa",
  );

export const terrenoMarsAI = z.object({
  id: z.string().min(1).max(120),
  nome: z.string().min(1).max(200),
  regiao: z.string().min(1).max(200),
  area: z.coerce.number().finite().positive(),
  preco: z.coerce.number().finite().nonnegative(),
  status: z.enum(["disponivel", "reservado", "vendido"]),
  descricao: z.string().max(2000),
  caracteristicas: z.array(z.string().max(200)).max(30),
});

export type EntradaMarsAI = z.infer<typeof entradaMarsAI>;
export type TerrenoMarsAI = z.infer<typeof terrenoMarsAI>;
export type RecomendacaoMarsAI = TerrenoMarsAI & { motivos?: string[] };
export type RespostaMarsAI =
  | {
      ok: true;
      texto: string;
      terrenos: RecomendacaoMarsAI[];
      fontes?: FonteMarte[];
      criterios?: string[];
    }
  | { ok: false; texto: string };
