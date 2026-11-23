import { describe, expect, it } from 'vitest';
import {
    getAliquotaWarning,
    hasTributacaoChanges,
    parseAliquotaDecimal,
    simularImpactoTributario,
} from './tributacaoUtils';

describe('tributacaoUtils', () => {
    it('converte percentual para decimal e rejeita valores inválidos', () => {
        expect(parseAliquotaDecimal('6.00')).toBe(0.06);
        expect(parseAliquotaDecimal('11,20')).toBe(0.112);
        expect(parseAliquotaDecimal('0')).toBe(0);
        expect(parseAliquotaDecimal('-1')).toBeNull();
        expect(parseAliquotaDecimal('105')).toBeNull();
        expect(parseAliquotaDecimal('abc')).toBeNull();
    });

    it('emite avisos para alíquota 0% ou acima de 35%', () => {
        expect(getAliquotaWarning('6.00')).toBeNull();
        expect(getAliquotaWarning('0')).toContain('0,00%');
        expect(getAliquotaWarning('40')).toContain('35%');
    });

    it('simula impacto tributário no DRE corretamente', () => {
        const res = simularImpactoTributario(30000, '6.00');
        expect(res.aliquotaPct).toBeCloseTo(6, 2);
        expect(res.imposto).toBeCloseTo(1800, 2);
        expect(res.receitaLiquida).toBeCloseTo(28200, 2);
    });

    it('detecta alterações não salvas no formulário tributário', () => {
        const base = {
            aliquotaPercent: '6.00',
            regime: 'SIMPLES_NACIONAL' as const,
            uf: 'SP' as const,
        };
        expect(hasTributacaoChanges(base, { ...base })).toBe(false);
        expect(hasTributacaoChanges({ ...base, aliquotaPercent: '11.20' }, base)).toBe(true);
        expect(hasTributacaoChanges({ ...base, uf: 'RJ' }, base)).toBe(true);
    });
});
