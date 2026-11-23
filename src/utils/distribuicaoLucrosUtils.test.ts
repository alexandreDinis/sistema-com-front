import { describe, expect, it } from 'vitest';
import type { ContaPagar } from '../types';
import {
    calcularContasPendentesNoMes,
    calcularRetiradasNoAno,
    calcularRetiradasNoMes,
    calcularSaldoRetiradaMensal,
    filterDistribuicoesByStatus,
    validateRetiradaForm,
} from './distribuicaoLucrosUtils';

const MOCK_DISTRIBUICOES = [
    { id: 1, valor: 5000, dataCompetencia: '2026-11-05', dataVencimento: '2026-11-10', status: 'PENDENTE' },
    { id: 2, valor: 3000, dataCompetencia: '2026-11-20', dataVencimento: '2026-11-25', status: 'PAGO' },
    { id: 3, valor: 6000, dataCompetencia: '2026-10-15', dataVencimento: '2026-10-20', status: 'PAGO' },
    { id: 4, valor: 1500, dataCompetencia: '2026-11-01', dataVencimento: '2026-11-28', status: 'VENCIDO' },
    { id: 5, valor: 2000, dataCompetencia: '2026-12-01', dataVencimento: '2026-12-10', status: 'PENDENTE' },
] as ContaPagar[];

describe('distribuicaoLucrosUtils', () => {
    it('soma apenas contas ainda pendentes ou vencidas com vencimento no mês selecionado', () => {
        // Novembro 2026: id 1 (5000 PENDENTE) + id 4 (1500 VENCIDO) = 6500; ignora id 2 (PAGO) e id 5 (Dezembro)
        expect(calcularContasPendentesNoMes(MOCK_DISTRIBUICOES, 11, 2026)).toBe(6500);
        expect(calcularContasPendentesNoMes(MOCK_DISTRIBUICOES, 12, 2026)).toBe(2000);
        expect(calcularContasPendentesNoMes(MOCK_DISTRIBUICOES, 10, 2026)).toBe(0);
    });

    it('calcula saldo usando Todo o Caixa ou Entradas do Mês menos contas pendentes do mês', () => {
        const porCaixa = calcularSaldoRetiradaMensal({
            base: 'CAIXA',
            entradasMes: 22400,
            caixaTotal: 24500,
            pendentesMes: 6500,
        });
        expect(porCaixa).toEqual({
            baseValor: 24500,
            pendentesMes: 6500,
            saldoCalculado: 18000,
        });

        const porMes = calcularSaldoRetiradaMensal({
            base: 'MES',
            entradasMes: 22400,
            caixaTotal: 24500,
            pendentesMes: 6500,
        });
        expect(porMes).toEqual({
            baseValor: 22400,
            pendentesMes: 6500,
            saldoCalculado: 15900,
        });
    });

    it('soma corretamente as retiradas do mês e do ano selecionado', () => {
        expect(calcularRetiradasNoMes(MOCK_DISTRIBUICOES, 11, 2026)).toBe(9500);
        expect(calcularRetiradasNoMes(MOCK_DISTRIBUICOES, 10, 2026)).toBe(6000);
        expect(calcularRetiradasNoAno(MOCK_DISTRIBUICOES, 2026)).toBe(17500);
        expect(calcularRetiradasNoAno(MOCK_DISTRIBUICOES, 2025)).toBe(0);
    });

    it('filtra histórico por status', () => {
        expect(filterDistribuicoesByStatus(MOCK_DISTRIBUICOES, 'ALL')).toHaveLength(5);
        expect(filterDistribuicoesByStatus(MOCK_DISTRIBUICOES, 'PAGO')).toHaveLength(2);
        expect(filterDistribuicoesByStatus(MOCK_DISTRIBUICOES, 'PENDENTE')).toHaveLength(3);
    });

    it('valida formulário de retirada corretamente', () => {
        expect(
            validateRetiradaForm({
                valor: '0',
                dataCompetencia: '2026-11-23',
                dataVencimento: '2026-11-23',
            })
        ).toContain('maior que');
        expect(
            validateRetiradaForm({
                valor: '2500',
                dataCompetencia: '2026-11-23',
                dataVencimento: '2026-11-23',
            })
        ).toBeNull();
    });
});
