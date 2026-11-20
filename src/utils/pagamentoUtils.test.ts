import { describe, it, expect } from 'vitest';
import { classificarPagamento, diferencaDiasIso, formatarMesCompleto } from './pagamentoUtils';
import type { ContaPagar } from '../types';

const faturaNubankNovembro: ContaPagar = {
    id: 53,
    descricao: 'Fatura Nubanck PJ - 2026-11',
    valor: 1350,
    dataCompetencia: '2026-11-19', // Fecha dia 19/11
    dataVencimento: '2026-11-26', // Vence dia 26/11
    status: 'PENDENTE',
    tipo: 'FATURA_CARTAO',
    mesReferencia: '2026-11',
    dataCriacao: '2026-11-01T10:00:00',
};

describe('pagamentoUtils (4 níveis de alerta)', () => {
    it('Nível 1 (NORMAL): pagamento na data do vencimento', () => {
        const res = classificarPagamento(faturaNubankNovembro, '2026-11-26');
        expect(res.nivel).toBe('NORMAL');
        expect(res.podeConfirmar).toBe(true);
        expect(res.diasAntecipacao).toBe(0);
        expect(res.mesImpactoCaixa).toBe('Novembro/2026');
    });

    it('Nível 2 (ANTECIPADO): pagamento após fechamento (19/11) e 7 dias antes do vencimento (26/11)', () => {
        const res = classificarPagamento(faturaNubankNovembro, '2026-11-19');
        expect(res.nivel).toBe('ANTECIPADO');
        expect(res.podeConfirmar).toBe(true);
        expect(res.diasAntecipacao).toBe(7);
        expect(res.mensagem).toContain('7 dia(s) antes');
    });

    it('Nível 3 (FATURA_FUTURA): pagamento antes do fechamento real da fatura (ex.: 18/11 ou em outubro)', () => {
        const resAntesFechamento = classificarPagamento(faturaNubankNovembro, '2026-11-18');
        expect(resAntesFechamento.nivel).toBe('FATURA_FUTURA');
        expect(resAntesFechamento.podeConfirmar).toBe(true);

        const resEmOutubro = classificarPagamento(faturaNubankNovembro, '2026-10-26');
        expect(resEmOutubro.nivel).toBe('FATURA_FUTURA');
        expect(resEmOutubro.mesImpactoCaixa).toBe('Outubro/2026');
    });

    it('Nível 4 (BLOQUEADO): conta já PAGA ou CANCELADA bloqueia novo pagamento', () => {
        const contaPaga: ContaPagar = {
            ...faturaNubankNovembro,
            status: 'PAGO',
            dataPagamento: '2026-10-26',
        };
        const resPago = classificarPagamento(contaPaga, '2026-11-19');
        expect(resPago.nivel).toBe('BLOQUEADO');
        expect(resPago.podeConfirmar).toBe(false);
        expect(resPago.mensagem).toContain('Estorno');

        const contaCancelada: ContaPagar = {
            ...faturaNubankNovembro,
            status: 'CANCELADO',
        };
        const resCancelada = classificarPagamento(contaCancelada, '2026-11-19');
        expect(resCancelada.nivel).toBe('BLOQUEADO');
        expect(resCancelada.podeConfirmar).toBe(false);
    });

    it('deve calcular diferença de dias e formatar mês de impacto no caixa corretamente', () => {
        expect(diferencaDiasIso('2026-11-19', '2026-11-26')).toBe(7);
        expect(formatarMesCompleto('2026-11-19')).toBe('Novembro/2026');
    });
});
