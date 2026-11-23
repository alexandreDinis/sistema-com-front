import type { MesFaturamentoDTO, RelatorioAnualDTO } from '../types';

export type FiltroMesAnual = 'TODOS' | 'CRESCIMENTO' | 'QUEDA';

export interface ResumoAnualCalculado {
    mesesAtivos: number;
    mediaMensal: number;
    melhorMes: MesFaturamentoDTO | null;
    participacaoMelhorMes: number;
    diferencaAnual: number;
}

export interface TrimestreComparativo {
    numero: number;
    label: string;
    atual: number;
    anterior: number;
    diferenca: number;
    variacaoPercentual: number;
}

export function siglaMes(nomeMes?: string | null): string {
    if (!nomeMes) return '---';
    const trimmed = nomeMes.trim();
    return trimmed.slice(0, 3);
}

export function calcularParticipacaoMes(valorMes: number, totalAno: number): number {
    if (!totalAno || totalAno <= 0 || !valorMes || valorMes <= 0) return 0;
    return Math.min((valorMes / totalAno) * 100, 100);
}

export function calcularResumoAnual(relatorio: RelatorioAnualDTO): ResumoAnualCalculado {
    const meses = relatorio.mesesComFaturamento ?? [];
    const totalAtual = relatorio.faturamentoTotalAno ?? 0;
    const totalAnterior = relatorio.faturamentoTotalAnoAnterior ?? 0;
    const diferencaAnual =
        relatorio.diferencaAnual != null ? relatorio.diferencaAnual : totalAtual - totalAnterior;

    const mesesComMovimento = meses.filter((m) => (m.faturamento ?? 0) > 0);
    const mesesAtivos = mesesComMovimento.length;
    const mediaMensal = mesesAtivos > 0 ? totalAtual / mesesAtivos : 0;

    let melhorMes: MesFaturamentoDTO | null = null;
    for (const mes of mesesComMovimento) {
        if (!melhorMes || (mes.faturamento ?? 0) > (melhorMes.faturamento ?? 0)) {
            melhorMes = mes;
        }
    }

    const participacaoMelhorMes = melhorMes
        ? calcularParticipacaoMes(melhorMes.faturamento ?? 0, totalAtual)
        : 0;

    return {
        mesesAtivos,
        mediaMensal,
        melhorMes,
        participacaoMelhorMes,
        diferencaAnual,
    };
}

export function calcularTrimestres(meses: MesFaturamentoDTO[]): TrimestreComparativo[] {
    const defs = [
        { numero: 1, label: '1º Trimestre', meses: [1, 2, 3] },
        { numero: 2, label: '2º Trimestre', meses: [4, 5, 6] },
        { numero: 3, label: '3º Trimestre', meses: [7, 8, 9] },
        { numero: 4, label: '4º Trimestre', meses: [10, 11, 12] },
    ];

    return defs.map((q) => {
        const subset = meses.filter((m) => q.meses.includes(m.mes));
        const atual = subset.reduce((s, m) => s + (m.faturamento ?? 0), 0);
        const anterior = subset.reduce((s, m) => s + (m.faturamentoAnoAnterior ?? 0), 0);
        const diferenca = atual - anterior;
        const variacaoPercentual = anterior > 0 ? (diferenca / anterior) * 100 : atual > 0 ? 100 : 0;

        return {
            numero: q.numero,
            label: q.label,
            atual,
            anterior,
            diferenca,
            variacaoPercentual,
        };
    });
}

export function filtrarMesesAnual(
    meses: MesFaturamentoDTO[],
    filtro: FiltroMesAnual
): MesFaturamentoDTO[] {
    if (filtro === 'CRESCIMENTO') {
        return meses.filter((m) => (m.variacao ?? 0) > 0);
    }
    if (filtro === 'QUEDA') {
        return meses.filter((m) => (m.variacao ?? 0) < 0);
    }
    return meses;
}
