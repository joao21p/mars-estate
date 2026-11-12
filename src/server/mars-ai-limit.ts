import "@tanstack/react-start/server-only";

// Global to this process, including development HMR. No claimed user identity.
// Restart/multiple instances need a shared persistent counter; see docs/mars-ai.md.
export function criarLimiteMarsAI() {
  let minuto: number[] = [];
  let dia: number[] = [];
  let emAndamento = 0;
  return {
    adquirir(agora = Date.now()): (() => void) | null {
      minuto = minuto.filter((instante) => instante > agora - 60000);
      dia = dia.filter((instante) => instante > agora - 86400000);
      if (emAndamento >= 1 || minuto.length >= 4 || dia.length >= 100) return null;
      minuto.push(agora);
      dia.push(agora);
      emAndamento++;
      let liberado = false;
      return () => { if (!liberado) { emAndamento--; liberado = true; } };
    },
  };
}

const estado = globalThis as typeof globalThis & { limiteMarsAI?: ReturnType<typeof criarLimiteMarsAI> };
export const limiteMarsAI = estado.limiteMarsAI ??= criarLimiteMarsAI();
