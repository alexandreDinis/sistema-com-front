import { describe, expect, it } from 'vitest';
import { getContasReceberTabBadge } from './contasReceberUtils';

describe('getContasReceberTabBadge', () => {
    it('retorna null quando contadores ainda não foram carregados', () => {
        expect(getContasReceberTabBadge('PENDENTE', null)).toBeNull();
        expect(getContasReceberTabBadge('PARCIAL', null)).toBeNull();
    });

    it('retorna null para abas que não exibem contador (PAGO, BAIXADO, TODOS)', () => {
        const contadores = { pendentes: 5, pendentesVencidas: 1, parciais: 2, parciaisVencidas: 0 };
        expect(getContasReceberTabBadge('PAGO', contadores)).toBeNull();
        expect(getContasReceberTabBadge('BAIXADO', contadores)).toBeNull();
        expect(getContasReceberTabBadge('TODOS', contadores)).toBeNull();
    });

    it('sinaliza hasOverdue=true quando há contas pendentes vencidas', () => {
        const badge = getContasReceberTabBadge('PENDENTE', {
            pendentes: 12,
            pendentesVencidas: 3,
            parciais: 4,
            parciaisVencidas: 0,
        });
        expect(badge).toEqual({
            count: 12,
            overdueCount: 3,
            hasOverdue: true,
            tooltip: '3 conta(s) pendente(s) vencida(s)',
        });
    });

    it('sinaliza hasOverdue=true quando há contas parciais vencidas', () => {
        const badge = getContasReceberTabBadge('PARCIAL', {
            pendentes: 5,
            pendentesVencidas: 0,
            parciais: 4,
            parciaisVencidas: 2,
        });
        expect(badge).toEqual({
            count: 4,
            overdueCount: 2,
            hasOverdue: true,
            tooltip: '2 conta(s) parcial(is) vencida(s)',
        });
    });

    it('sinaliza hasOverdue=false quando não há vencidas', () => {
        const badgePendente = getContasReceberTabBadge('PENDENTE', {
            pendentes: 8,
            pendentesVencidas: 0,
            parciais: 2,
            parciaisVencidas: 0,
        });
        const badgeParcial = getContasReceberTabBadge('PARCIAL', {
            pendentes: 8,
            pendentesVencidas: 0,
            parciais: 2,
            parciaisVencidas: 0,
        });
        expect(badgePendente?.hasOverdue).toBe(false);
        expect(badgePendente?.count).toBe(8);
        expect(badgeParcial?.hasOverdue).toBe(false);
        expect(badgeParcial?.count).toBe(2);
    });
});
