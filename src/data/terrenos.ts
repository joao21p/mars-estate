import crater from "@/assets/crater.jpg";
import valley from "@/assets/valley.jpg";
import habitat from "@/assets/habitat.jpg";
import hero from "@/assets/hero-mars.jpg";

export type StatusTerreno = "disponivel" | "reservado" | "vendido";

export interface Terreno {
  id: string;
  nome: string;
  regiao: string;
  region_id: string;
  area: number; // m²
  preco: number; // R$ demonstrativo
  status: StatusTerreno;
  descricao: string;
  caracteristicas: string[];
  imagens: string[];
}

export const STATUS_LABEL: Record<StatusTerreno, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
};

// Dados fictícios. Substituir por chamada à API em etapa futura.
const TERRENOS: Terreno[] = [
  {
    id: "borda-de-jezero",
    region_id: "jezero",
    nome: "Borda de Jezero",
    regiao: "Cratera Jezero, Setor Norte",
    area: 2400,
    preco: 480000,
    status: "disponivel",
    descricao:
      "Lote na borda elevada de uma antiga cratera, com vista panorâmica para o leito de um delta fictício. Ideal para quem busca horizonte amplo.",
    caracteristicas: ["Vista panorâmica", "Terreno elevado", "Solo rochoso estável"],
    // Borda de Jezero
imagens: [
  "/images/regions/jezero.png",
  "/images/regions/jezero-paisagem.png",
  "/images/plots/jezero-base.png",
],
  },
  {
    id: "mirante-marineris",
    region_id: "marineris",
    nome: "Mirante Marineris",
    regiao: "Valles Marineris, Platô Leste",
    area: 5200,
    preco: 1250000,
    status: "disponivel",
    descricao:
      "Platô à beira do maior sistema de cânions do planeta. Paredões em camadas de cobre formam um cenário dramático ao entardecer.",
    caracteristicas: ["Beira de cânion", "Pôr do sol marcante", "Grande extensão"],
    // Mirante Marineris
imagens: [
  "/images/regions/marineris.png",
  "/images/regions/marineris-paisagem.png",
  "/images/plots/marineris-base.png",
],
  },
  {
    id: "domo-acidalia",
    region_id: "acidalia",
    nome: "Domo Acidália",
    regiao: "Acidalia Planitia",
    area: 1800,
    preco: 690000,
    status: "reservado",
    descricao:
      "Área plana preparada para um habitat em domo conceitual, próxima a uma colônia fictícia de pesquisa.",
    caracteristicas: ["Base para habitat", "Terreno plano", "Próximo à colônia"],
    imagens: [
  "/images/regions/acidalia.png",
  "/images/regions/acidalia-paisagem.png",
  "/images/plots/acidalia-base.png",
],
  },
  {
    id: "encosta-olympus",
    region_id: "olympus",
    nome: "Encosta Olympus",
    regiao: "Olympus Mons, Flanco Oeste",
    area: 8000,
    preco: 2100000,
    status: "disponivel",
    descricao:
      "Grande lote nas encostas suaves do maior vulcão do Sistema Solar. Altitude e silêncio absolutos.",
    caracteristicas: ["Alta altitude", "Encosta suave", "Lote premium"],
    imagens: [
  "/images/regions/olympus.png",
  "/images/plots/olympus-paisagem.png",
  "/images/plots/olympus-base.png",
],
  },
  {
    id: "vale-ares",
    region_id: "ares",
    nome: "Vale Ares",
    regiao: "Ares Vallis",
    area: 1200,
    preco: 290000,
    status: "vendido",
    descricao:
      "Lote compacto em um vale de antigos canais, com relevo protegido contra ventos fictícios.",
    caracteristicas: ["Relevo protegido", "Lote compacto", "Acesso facilitado"],
    imagens: [
  "/images/regions/ares.png",
  "/images/regions/ares-paisagem.png",
  "/images/plots/ares-base.png",
],
  },
  {
    id: "planicie-utopia",
    region_id: "utopia",
    nome: "Planície Utopia",
    regiao: "Utopia Planitia",
    area: 3600,
    preco: 820000,
    status: "disponivel",
    descricao:
      "Ampla planície de horizonte limpo, ideal para projetos conceituais de expansão modular.",
    caracteristicas: ["Horizonte limpo", "Expansão modular", "Solo uniforme"],
    imagens: [
  "/images/regions/utopia.png",
  "/images/regions/utopia-paisagem.png",
  "/images/plots/utopia-base.png",
],
  },
  {
    id: "anel-gale",
    region_id: "gale",
    nome: "Anel Gale",
    regiao: "Cratera Gale, Anel Interno",
    area: 2800,
    preco: 560000,
    status: "reservado",
    descricao:
      "Lote no anel interno de uma cratera emblemática, com formações rochosas em camadas ao redor.",
    caracteristicas: ["Formações em camadas", "Interior de cratera", "Microclima fictício"],
    imagens: [
  "/images/regions/gale.png",
  "/images/regions/gale-paisagem.png",
  "/images/plots/gale-base.png",
],
  },
  {
    id: "estacao-hellas",
    region_id: "hellas",
    nome: "Estação Hellas",
    regiao: "Hellas Planitia",
    area: 4500,
    preco: 990000,
    status: "disponivel",
    descricao:
      "Terreno na planície mais profunda do planeta, com estrutura de habitat conceitual já idealizada.",
    caracteristicas: ["Planície profunda", "Habitat conceitual", "Pressão atmosférica maior"],
    imagens: [
  "/images/regions/hellas.png",
  "/images/regions/hellas-paisagem.png",
  "/images/plots/hellas-base.png",
],
  },
  {
    id: "terra-arabia",
    region_id: "arabia",
    nome: "Terra Arabia",
    regiao: "Arabia Terra, Planalto Sul",
    area: 3100,
    preco: 640000,
    status: "disponivel",
    descricao:
      "Lote em terreno antigo e craterizado, com vista fictícia para a transição entre as terras altas do sul e as planícies do norte.",
    caracteristicas: ["Terreno antigo", "Vista de transição", "Solo craterizado"],
    imagens: [
  "/images/regions/arabia.png",
  "/images/regions/arabia-paisagem.png",
  "/images/plots/arabia-base.png",
],
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function listarTerrenos(): Promise<Terreno[]> {
  await delay(400);
  return TERRENOS;
}

export async function obterTerreno(id: string): Promise<Terreno | undefined> {
  await delay(250);
  return TERRENOS.find((t) => t.id === id);
}

export type OrdemTerrenos = "padrao" | "preco-asc" | "preco-desc" | "area-asc" | "area-desc" | "nome";

export function ordenarTerrenos(terrenos: Terreno[], ordem: OrdemTerrenos): Terreno[] {
  const lista = [...terrenos];
  switch (ordem) {
    case "preco-asc": return lista.sort((a, b) => a.preco - b.preco);
    case "preco-desc": return lista.sort((a, b) => b.preco - a.preco);
    case "area-asc": return lista.sort((a, b) => a.area - b.area);
    case "area-desc": return lista.sort((a, b) => b.area - a.area);
    case "nome": return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    default: return lista;
  }
}

export const MAX_COMPARACAO = 3;

/** Aceita o link individual dos detalhes e listas da URL, usando apenas IDs atuais. */
export function lerComparacao(valor: unknown, terrenos: Pick<Terreno, "id">[]): string[] {
  const candidatos = typeof valor === "string" ? [valor] : Array.isArray(valor) ? valor : [];
  const validos = new Set(terrenos.map((terreno) => terreno.id));
  const ids = candidatos.filter((id): id is string => typeof id === "string" && validos.has(id));
  return [...new Set(ids)].slice(0, MAX_COMPARACAO);
}

/** Adiciona ou remove um terreno da comparação, sem ultrapassar o limite. */
export function alternarComparacao(ids: string[], id: string, max = MAX_COMPARACAO): string[] {
  if (ids.includes(id)) return ids.filter((i) => i !== id);
  if (ids.length >= max) return ids;
  return [...ids, id];
}

export const formatarPreco = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatarArea = (v: number) => `${v.toLocaleString("pt-BR")} m²`;
