import { describe, expect, it } from 'vitest';
import { alternarComparacao, listarTerrenos, ordenarTerrenos, MAX_COMPARACAO } from '@/data/terrenos';
import { filtrarTerrenos, regiaoDoTerreno, REGIOES } from '@/data/regioes';

const defaults = { busca: '', status: 'todos' as const, precoMax: Infinity, areaMin: 0 };
describe('Exploração e filtros', () => {
  it('uses region_id for new lots and regions without manual associations', async () => {
    const [base] = await listarTerrenos();
    const terreno = { ...base!, id: 'novo-terreno', region_id: 'nova-regiao' };
    const regiao = { ...REGIOES[0]!, id: 'nova-regiao', terrenos: [] };
    expect(filtrarTerrenos([terreno], { ...defaults, regiao: regiao.id })).toEqual([terreno]);
    expect(regiaoDoTerreno(terreno, [regiao])).toBe(regiao);
    expect(filtrarTerrenos([terreno], { ...defaults, regiao: 'outra-regiao' })).toEqual([]);
    expect(filtrarTerrenos([terreno], { ...defaults, regiao: 'todas' })).toEqual([terreno]);
    expect(regiaoDoTerreno(terreno, [])).toBeUndefined();
  });
  it('selecting Valles Marineris returns its associated lot', async () => {
    expect(filtrarTerrenos(await listarTerrenos(), { ...defaults, regiao: 'marineris' }).map((t) => t.id)).toEqual(['mirante-marineris']);
  });
  it('selecting Arabia Terra returns its associated lot', async () => {
    expect(filtrarTerrenos(await listarTerrenos(), { ...defaults, regiao: 'arabia' }).map((t) => t.id)).toEqual(['terra-arabia']);
  });
  it('searches lot names immediately without case sensitivity', async () => {
    expect(filtrarTerrenos(await listarTerrenos(), { ...defaults, busca: ' JEZERO ' }).map((t) => t.id)).toEqual(['borda-de-jezero']);
  });
  it('combines availability, price and area filters', async () => {
    expect(filtrarTerrenos(await listarTerrenos(), { ...defaults, status: 'disponivel', precoMax: 820000, areaMin: 3000 }).map((t) => t.id)).toEqual(['planicie-utopia', 'terra-arabia']);
  });
  it('every lot belongs to a selectable region', async () => {
    expect((await listarTerrenos()).filter((t) => !regiaoDoTerreno(t, REGIOES))).toEqual([]);
  });
  it('every region carries a verified fact and a source', () => {
    expect(REGIOES.filter((r) => !r.fato || !r.fonte || !r.fonteUrl.startsWith('https://'))).toEqual([]);
  });
});

describe('Ordenação do catálogo', () => {
  it('sorts by price ascending and descending', async () => {
    const terrenos = await listarTerrenos();
    const precos = ordenarTerrenos(terrenos, 'preco-asc').map((t) => t.preco);
    expect(precos).toEqual([...precos].sort((a, b) => a - b));
    expect(ordenarTerrenos(terrenos, 'preco-desc')[0]?.id).toBe('encosta-olympus');
  });
  it('sorts by area and by name in pt-BR', async () => {
    const terrenos = await listarTerrenos();
    const areas = ordenarTerrenos(terrenos, 'area-asc').map((t) => t.area);
    expect(areas).toEqual([...areas].sort((a, b) => a - b));
    expect(ordenarTerrenos(terrenos, 'nome')[0]?.id).toBe('anel-gale');
  });
});

describe('Comparação de terrenos', () => {
  it(`accepts at most ${MAX_COMPARACAO} lots`, () => {
    const tres = alternarComparacao(alternarComparacao(alternarComparacao([], 'a'), 'b'), 'c');
    expect(tres).toEqual(['a', 'b', 'c']);
    expect(alternarComparacao(tres, 'd')).toEqual(tres);
  });
  it('removes a lot already in the comparison', () => {
    expect(alternarComparacao(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});
