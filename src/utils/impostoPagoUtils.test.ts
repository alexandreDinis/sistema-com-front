import { describe, expect, it } from 'vitest';
import type { ContaPagar } from '../types';
import {
    calcularStatsImpostoAnual,
    filterImpostosByYearAndStatus,
    hasDasCompetenciaDuplicada,
    validateDasForm,
} from './impostoPagoUtils';

const MOCK_GUIAS = [
    { id: 1, valor: 1344, dataCompetencia: '2026-11-01', status: 'PENDENTE' },
    { id: 2, valor: 1200, dataCompetencia: '2026-10-01', status: 'PAGO' },
    { id: 3, valor: 1056, dataCompetencia: '2026-09-01', status: 'PAGO' },
    { id: 4, valor: 5000, dataCompetencia: '2026-08-01', status: 'CANCELADO' },
    { id: 5, valor: 900, dataCompetencia: '2025-12-01', status: 'PAGO' },
] as ContaPagar[];

describe('impostoPagoUtils', () => {
    it('calcula total anual, pago, pendente e média ignorando guias canceladas', () => {
        const stats = calcularStatsImpostoAnual(MOCK_GUIAS, 2026);
        expect(stats.totalAnual).toBe(3600);
        expect(stats.totalPago).toBe(2256);
        expect(stats.qtdPago).toBe(2);
        expect(stats.totalPendente).toBe(1344);
        expect(stats.qtdPendente).toBe(1);
        expect(stats.mediaMensal).toBe(1200);
        expect(stats.totalGuiasAno).toBe(3);
    });

    it('filtra guias por ano e status separando canceladas', () => {
        expect(filterImpostosByYearAndStatus(MOCK_GUIAS, 2026, 'ALL')).toHaveLength(3);
        expect(filterImpostosByYearAndStatus(MOCK_GUIAS, 2026, 'PAGO')).toHaveLength(2);
        expect(filterImpostosByYearAndStatus(MOCK_GUIAS, 2026, 'PENDENTE')).toHaveLength(1);
        expect(filterImpostosByYearAndStatus(MOCK_GUIAS, 2026, 'CANCELADO')).toHaveLength(1);
        expect(filterImpostosByYearAndStatus(MOCK_GUIAS, 2025, 'ALL')).toHaveLength(1);
    });

    it('detecta competência duplicada apenas em guias ativas (ignora canceladas)', () => {
        expect(hasDasCompetenciaDuplicada(MOCK_GUIAS, '2026-11-15')).toBe(true);
        expect(hasDasCompetenciaDuplicada(MOCK_GUIAS, '2026-08-15')).toBe(false);
    });

    it('valida formulário de DAS corretamente', () => {
        expect(
            validateDasForm({
                valor: '-10',
                dataCompetencia: '2026-11-01',
                dataVencimento: '2026-12-20',
            })
        ).toContain('maior que');
        expect(
            validateDasForm({
                valor: '1344.00',
                dataCompetencia: '2026-11-01',
                dataVencimento: '2026-12-20',
            })
        ).toBeNull();
    });
});
