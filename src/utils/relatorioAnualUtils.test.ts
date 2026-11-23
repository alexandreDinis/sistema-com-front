import { describe, expect, it } from 'vitest';
import type { MesFaturamentoDTO, RelatorioAnualDTO } from '../types';
import {
    calcularParticipacaoMes,
    calcularResumoAnual,
    calcularTrimestres,
    filtrarMesesAnual,
    siglaMes,
} from './relatorioAnualUtils';

const mesesMock: MesFaturamentoDTO[] = [
    { mes: 1, nomeMes: 'Janeiro', faturamento: 10000, faturamentoAnoAnterior: 8000, variacao: 2000, variacaoPercentual: 25 },
    { mes: 2, nomeMes: 'Fevereiro', faturamento: 20000, faturamentoAnoAnterior: 22000, variacao: -2000, variacaoPercentual: -9.09 },
    { mes: 3, nomeMes: 'Março', faturamento: 0, faturamentoAnoAnterior: 5000, variacao: -5000, variacaoPercentual: -100 },
    { mes: 4, nomeMes: 'Abril', faturamento: 30000, faturamentoAnoAnterior: 20000, variacao: 10000, variacaoPercentual: 50 },
];

const relatorioMock: RelatorioAnualDTO = {
    ano: 2026,
    mesesComFaturamento: mesesMock,
    faturamentoTotalAno: 60000,
    faturamentoTotalAnoAnterior: 55000,
    diferencaAnual: 5000,
    crescimentoPercentualAnual: 9.09,
};

describe('relatorioAnualUtils', () => {
    it('calcula media mensal sobre meses ativos e identifica o melhor mes', () => {
        const resumo = calcularResumoAnual(relatorioMock);
        expect(resumo.mesesAtivos).toBe(3);
        expect(resumo.mediaMensal).toBe(20000);
        expect(resumo.melhorMes?.nomeMes).toBe('Abril');
        expect(resumo.participacaoMelhorMes).toBe(50);
    });

    it('consolida trimestres Q1-Q4 corretamente', () => {
        const qs = calcularTrimestres(mesesMock);
        expect(qs).toHaveLength(4);
        expect(qs[0].atual).toBe(30000);
        expect(qs[0].anterior).toBe(35000);
        expect(qs[0].diferenca).toBe(-5000);

        expect(qs[1].atual).toBe(30000);
        expect(qs[1].anterior).toBe(20000);
        expect(qs[1].variacaoPercentual).toBe(50);
    });

    it('filtra meses por crescimento ou queda e calcula participacao/sigla', () => {
        expect(filtrarMesesAnual(mesesMock, 'TODOS')).toHaveLength(4);
        expect(filtrarMesesAnual(mesesMock, 'CRESCIMENTO')).toHaveLength(2);
        expect(filtrarMesesAnual(mesesMock, 'QUEDA')).toHaveLength(2);

        expect(calcularParticipacaoMes(15000, 60000)).toBe(25);
        expect(calcularParticipacaoMes(100, 0)).toBe(0);
        expect(siglaMes('Fevereiro')).toBe('Fev');
    });
});
