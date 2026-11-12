import { createServerFn } from "@tanstack/react-start";
import { entradaMarsAI, type RespostaMarsAI } from "@/data/mars-ai";

export const conversarMarsAI = createServerFn({ method: "POST" })
  .validator((entrada: unknown) => {
    const resultado = entradaMarsAI.safeParse(entrada);
    return resultado.success ? resultado.data : null;
  })
  .handler(async ({ data }): Promise<RespostaMarsAI> => {
    if (!data) return { ok: false, texto: "Envie uma mensagem de até 2.000 caracteres e um histórico curto." };
    const { responderMarsAI } = await import("@/server/mars-ai");
    return responderMarsAI(data);
  });
