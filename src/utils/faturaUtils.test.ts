import { describe, it, expect } from 'vitest';
import { calcularMesReferenciaFatura, formatarDataLocal } from './faturaUtils';

describe('faturaUtils', () => {
    it('deve jogar despesa após o dia de fechamento para a fatura do mês seguinte', () => {
        const result = calcularMesReferenciaFatura('2026-11-25', 20);
        expect(result).toEqual({
            mesReferencia: '2026-12',
            labelMes: 'Dezembro/2026',
            caiuProximoMes: true,
        });
    });

    it('deve manter despesa no mesmo mês quando data é anterior ou igual ao fechamento', () => {
        expect(calcularMesReferenciaFatura('2026-11-15', 20)).toEqual({
            mesReferencia: '2026-11',
            labelMes: 'Novembro/2026',
            caiuProximoMes: false,
        });

        expect(calcularMesReferenciaFatura('2026-11-20', 20)).toEqual({
            mesReferencia: '2026-11',
            labelMes: 'Novembro/2026',
            caiuProximoMes: false,
        });
    });

    it('deve virar o ano corretamente em compras após fechamento de dezembro', () => {
        const result = calcularMesReferenciaFatura('2026-12-26', 25);
        expect(result).toEqual({
            mesReferencia: '2027-01',
            labelMes: 'Janeiro/2027',
            caiuProximoMes: true,
        });
    });

    it('deve usar dia 25 como padrão quando diaFechamento não for informado', () => {
        expect(calcularMesReferenciaFatura('2026-11-25')?.mesReferencia).toBe('2026-11');
        expect(calcularMesReferenciaFatura('2026-11-26')?.mesReferencia).toBe('2026-12');
    });

    it('deve formatar data ISO sem deslocamento de fuso horário', () => {
        expect(formatarDataLocal('2026-11-15')).toBe('15/11/2026');
        expect(formatarDataLocal('2026-01-01T00:00:00Z')).toBe('01/01/2026');
        expect(formatarDataLocal(null)).toBe('—');
    });
});
