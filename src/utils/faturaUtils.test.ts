import { describe, it, expect } from 'vitest';
import type { ContaPagar } from '../types';
import {
    calcularMesReferenciaFatura,
    filtrarFaturasDoCartao,
    formatarCategoriaDespesa,
    formatarDataLocal,
    formatarMesReferenciaFatura,
    resumirFaturasPorCartao,
} from './faturaUtils';

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

    it('deve formatar mês de referência e categoria de despesa', () => {
        expect(formatarMesReferenciaFatura('2026-11')).toBe('Novembro / 2026');
        expect(formatarMesReferenciaFatura(null)).toBe('—');
        expect(formatarCategoriaDespesa('COMBUSTIVEL')).toBe('Combustível');
        expect(formatarCategoriaDespesa('FERRAMENTAS')).toBe('Ferramentas');
    });

    it('deve resumir e filtrar faturas por cartão e status corretamente', () => {
        const contas: ContaPagar[] = [
            {
                id: 1,
                descricao: 'Fatura Nubank 11/2026',
                valor: 1500,
                dataCompetencia: '2026-11-25',
                dataVencimento: '2026-12-05',
                status: 'PENDENTE',
                tipo: 'FATURA_CARTAO',
                mesReferencia: '2026-11',
                cartao: { id: 10, nome: 'Nubank', diaFechamento: 25, diaVencimento: 5, ativo: true },
                dataCriacao: '2026-11-01',
            },
            {
                id: 2,
                descricao: 'Fatura Nubank 10/2026',
                valor: 900,
                dataCompetencia: '2026-10-25',
                dataVencimento: '2026-11-05',
                status: 'PAGO',
                tipo: 'FATURA_CARTAO',
                mesReferencia: '2026-10',
                cartao: { id: 10, nome: 'Nubank', diaFechamento: 25, diaVencimento: 5, ativo: true },
                dataCriacao: '2026-10-01',
            },
            {
                id: 3,
                descricao: 'Imposto DAS',
                valor: 400,
                dataCompetencia: '2026-11-01',
                dataVencimento: '2026-11-20',
                status: 'PENDENTE',
                tipo: 'IMPOSTOS',
                dataCriacao: '2026-11-01',
            },
        ];

        const resumo = resumirFaturasPorCartao(contas);
        expect(resumo[10]).toEqual({ abertasCount: 1, totalAberto: 1500, totalFaturas: 2 });

        expect(filtrarFaturasDoCartao(contas, 10, 'PENDENTE')).toHaveLength(1);
        expect(filtrarFaturasDoCartao(contas, 10, 'PAGO')).toHaveLength(1);
        expect(filtrarFaturasDoCartao(contas, 10, 'TODAS')).toHaveLength(2);
    });
});
