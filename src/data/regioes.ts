import crater from '@/assets/crater.jpg';
import valley from '@/assets/valley.jpg';
import habitat from '@/assets/habitat.jpg';
import hero from '@/assets/hero-mars.jpg';
import type { Terreno, StatusTerreno } from './terrenos';

export interface Regiao {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  latitude: number;
  longitude: number;
  imagem: string;
  terrenos: string[];
  /** Fato científico verificado sobre a região. */
  fato: string;
  fonte: string;
  fonteUrl: string;
}

const NASA = 'NASA — Mars Exploration Program';
const NASA_URL = 'https://science.nasa.gov/mars/';
const TREK = 'NASA — Mars Trek';
const TREK_URL = 'https://trek.nasa.gov/mars/';

// Coordenadas de referência aproximadas (centros das regiões), não um mapa científico.
export const REGIOES: Regiao[] = [
  { id: 'marineris', nome: 'Valles Marineris', tipo: 'Cânions e platôs', descricao: 'Horizontes vertiginosos. Um sistema de cânions que transforma a paisagem em camadas de tempo.', latitude: -14, longitude: -59, imagem: valley, terrenos: ['mirante-marineris'], fato: 'Sistema de cânions com mais de 4.000 km de extensão e até cerca de 7 km de profundidade.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'olympus', nome: 'Olympus Mons', tipo: 'Paisagem vulcânica', descricao: 'Uma nova perspectiva nas encostas do maior vulcão do Sistema Solar.', latitude: 18, longitude: -133, imagem: hero, terrenos: ['encosta-olympus'], fato: 'Maior vulcão conhecido do Sistema Solar, com cerca de 22 km de altura e aproximadamente 600 km de diâmetro.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'jezero', nome: 'Cratera Jezero', tipo: 'Cratera e antigo delta', descricao: 'Rochas, vestígios de um antigo delta e uma paisagem que guarda histórias de outro mundo.', latitude: 18, longitude: 77, imagem: crater, terrenos: ['borda-de-jezero'], fato: 'Abriga um antigo delta de rio; local de pouso do rover Perseverance em 2021.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'acidalia', nome: 'Acidalia Planitia', tipo: 'Planície do norte', descricao: 'Extensões abertas e horizontes tranquilos para imaginar habitats de uma futura missão.', latitude: 46, longitude: -30, imagem: habitat, terrenos: ['domo-acidalia'], fato: 'Vasta planície nas terras baixas do hemisfério norte marciano.', fonte: TREK, fonteUrl: TREK_URL },
  { id: 'ares', nome: 'Ares Vallis', tipo: 'Vale de canais', descricao: 'Canais antigos desenham caminhos sinuosos entre planícies rochosas.', latitude: 10, longitude: -25, imagem: valley, terrenos: ['vale-ares'], fato: 'Antigo canal de escoamento; local de pouso da sonda Mars Pathfinder em 1997.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'utopia', nome: 'Utopia Planitia', tipo: 'Planície de impacto', descricao: 'Uma paisagem ampla para imaginar possibilidades de expansão além da Terra.', latitude: 42, longitude: 118, imagem: hero, terrenos: ['planicie-utopia'], fato: 'Maior bacia de impacto reconhecida em Marte; local de pouso da Viking 2 em 1976.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'gale', nome: 'Cratera Gale', tipo: 'Formações sedimentares', descricao: 'Um anfiteatro natural de camadas rochosas e contrastes marcianos.', latitude: -5, longitude: 138, imagem: crater, terrenos: ['anel-gale'], fato: 'Contém o Monte Sharp, com cerca de 5,5 km de camadas sedimentares; explorada pelo rover Curiosity desde 2012.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'hellas', nome: 'Hellas Planitia', tipo: 'Bacia de impacto', descricao: 'Profundidade monumental e uma vasta planície para imaginar uma estação distante.', latitude: -42, longitude: 70, imagem: habitat, terrenos: ['estacao-hellas'], fato: 'Uma das maiores bacias de impacto do Sistema Solar, com cerca de 9 km de profundidade.', fonte: NASA, fonteUrl: NASA_URL },
  { id: 'arabia', nome: 'Arabia Terra', tipo: 'Terras altas antigas', descricao: 'Terreno antigo e densamente craterizado, na fronteira entre as terras altas do sul e as planícies do norte.', latitude: 21, longitude: 5, imagem: crater, terrenos: ['terra-arabia'], fato: 'Uma das regiões mais antigas e craterizadas de Marte, na transição entre terras altas e baixas.', fonte: TREK, fonteUrl: TREK_URL },
];

export function regiaoDoTerreno(terreno: Pick<Terreno, "region_id">, regioes: Regiao[]) {
  return regioes.find((regiao) => regiao.id === terreno.region_id);
}

export function formatarCoordenadas(latitude: number, longitude: number) {
  return `${Math.abs(latitude)}° ${latitude < 0 ? 'S' : 'N'} / ${Math.abs(longitude)}° ${longitude < 0 ? 'O' : 'L'}`;
}

export interface FiltrosTerrenos {
  busca: string;
  status: 'todos' | StatusTerreno;
  precoMax: number;
  areaMin: number;
  regiao?: string;
}

export function filtrarTerrenos(terrenos: Terreno[], filtros: FiltrosTerrenos) {
  return terrenos.filter((t) =>
    t.nome.toLocaleLowerCase('pt-BR').includes(filtros.busca.trim().toLocaleLowerCase('pt-BR')) &&
    (filtros.status === 'todos' || t.status === filtros.status) &&
    t.preco <= filtros.precoMax && t.area >= filtros.areaMin &&
    (!filtros.regiao || filtros.regiao === "todas" || t.region_id === filtros.regiao),
  );
}
