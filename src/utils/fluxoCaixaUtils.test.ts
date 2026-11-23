import { describe, expect, it } from 'vitest';
import {
    buildExtratoFluxoCaixa,
    calcularProporcaoFluxo,
    filterExtratoFluxoCaixa,
} from './fluxoCaixaUtils';

describe('fluxoCaixaUtils', () => {
    const entradas = [
        { data: '2026-11-10', descricao: 'OS #131', categoria: 'Recebimento de OS', valor: 4000 },
        { data: '2026-11-22', descricao: 'OS #142', categoria: 'Recebimento de OS', valor: 6000 },
    ];
    const saidas = [
        { data: '2026-11-15', descricao: 'Aluguel Galpão', categoria: 'Ocupação', valor: 3000 },
    ];

    it('unifica entradas e saídas ordenadas por data decrescente', () => {
        const extrato = buildExtratoFluxoCaixa(entradas, saidas);
        expect(extrato).toHaveLength(3);
        expect(extrato[0]).toMatchObject({ data: '2026-11-22', tipo: 'ENTRADA' });
        expect(extrato[1]).toMatchObject({ data: '2026-11-15', tipo: 'SAIDA' });
        expect(extrato[2]).toMatchObject({ data: '2026-11-10', tipo: 'ENTRADA' });
    });

    it('filtra por tipo e busca sem sensibilidade a acentos', () => {
        const extrato = buildExtratoFluxoCaixa(entradas, saidas);
        expect(filterExtratoFluxoCaixa(extrato, 'ENTRADA', '')).toHaveLength(2);
        expect(filterExtratoFluxoCaixa(extrato, 'SAIDA', '')).toHaveLength(1);
        expect(filterExtratoFluxoCaixa(extrato, 'ALL', 'galpao')).toHaveLength(1);
        expect(filterExtratoFluxoCaixa(extrato, 'ALL', 'ocupacao')).toHaveLength(1);
    });

    it('calcula proporção de entradas e saídas', () => {
        const prop = calcularProporcaoFluxo(7000, 3000);
        expect(prop.entradasPct).toBeCloseTo(70, 1);
        expect(prop.saidasPct).toBeCloseTo(30, 1);
        expect(calcularProporcaoFluxo(0, 0)).toEqual({ entradasPct: 0, saidasPct: 0 });
    });
});
