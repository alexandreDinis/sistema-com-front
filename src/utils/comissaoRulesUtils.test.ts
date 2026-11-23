import { describe, expect, it } from 'vitest';
import type { RegraComissaoRequest } from '../types';
import {
    formatRuleDate,
    getTipoRegraLabel,
    isRegraExpirada,
    simularComissaoPorFaixas,
    validateRegraComissao,
} from './comissaoRulesUtils';

const BASE_REGRA: RegraComissaoRequest = {
    nome: 'Tabela 2026',
    tipoRegra: 'FAIXA_FATURAMENTO',
    dataInicio: '2026-01-01',
    faixas: [
        { minFaturamento: 0, maxFaturamento: 15000, porcentagem: 25, descricao: 'Inicial' },
        { minFaturamento: 15000.01, maxFaturamento: 30000, porcentagem: 30, descricao: 'Intermediária' },
        { minFaturamento: 30000.01, maxFaturamento: null, porcentagem: 35, descricao: 'Alta' },
    ],
};

describe('comissaoRulesUtils', () => {
    it('valida regra progressiva correta sem erros nem avisos', () => {
        const res = validateRegraComissao(BASE_REGRA);
        expect(res.errors).toEqual([]);
        expect(res.warnings).toEqual([]);
    });

    it('detecta dataFim anterior a dataInicio e faixa intermediária sem limite', () => {
        const res = validateRegraComissao({
            ...BASE_REGRA,
            dataFim: '2025-12-31',
            faixas: [
                { minFaturamento: 0, maxFaturamento: null, porcentagem: 20, descricao: 'Aberta' },
                { minFaturamento: 10000, maxFaturamento: null, porcentagem: 30, descricao: 'Segunda' },
            ],
        });

        expect(res.errors.some((e) => e.includes('data de fim'))).toBe(true);
        expect(res.errors.some((e) => e.includes('sem limite máximo'))).toBe(true);
    });

    it('emite aviso quando há lacuna entre faixas', () => {
        const res = validateRegraComissao({
            ...BASE_REGRA,
            faixas: [
                { minFaturamento: 0, maxFaturamento: 10000, porcentagem: 20, descricao: 'F1' },
                { minFaturamento: 12000, maxFaturamento: null, porcentagem: 30, descricao: 'F2' },
            ],
        });

        expect(res.errors).toEqual([]);
        expect(res.warnings).toHaveLength(1);
    });

    it('simula comissão corretamente para valores dentro das faixas', () => {
        const sim = simularComissaoPorFaixas(BASE_REGRA.faixas, 24000);
        expect(sim.faixa?.descricao).toBe('Intermediária');
        expect(sim.comissao).toBeCloseTo(7200, 2);

        const simAlta = simularComissaoPorFaixas(BASE_REGRA.faixas, 50000);
        expect(simAlta.faixa?.descricao).toBe('Alta');
        expect(simAlta.comissao).toBeCloseTo(17500, 2);
    });

    it('formata datas, rótulos e verifica expiração', () => {
        expect(formatRuleDate('2026-11-23')).toBe('23/11/2026');
        expect(getTipoRegraLabel('FAIXA_FATURAMENTO')).toBe('Faixas de Faturamento');
        expect(isRegraExpirada('2020-01-01', new Date(2026, 10, 23))).toBe(true);
        expect(isRegraExpirada('2027-01-01', new Date(2026, 10, 23))).toBe(false);
    });
});
