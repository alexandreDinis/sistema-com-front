import type { ContaPagar } from '../types';

export type ImpostoStatusFilter = 'ALL' | 'PENDENTE' | 'PAGO' | 'CANCELADO';

export interface ImpostoAnualStats {
    totalAnual: number;
    totalPago: number;
    qtdPago: number;
    totalPendente: number;
    qtdPendente: number;
    mediaMensal: number;
    totalGuiasAno: number;
}

export function filterImpostosByYearAndStatus(
    impostos: ContaPagar[] | undefined,
    ano: number,
    statusFilter: ImpostoStatusFilter
): ContaPagar[] {
    if (!impostos) return [];
    const prefix = `${ano}-`;

    return impostos.filter((item) => {
        const matchYear =
            typeof item.dataCompetencia === 'string' && item.dataCompetencia.startsWith(prefix);
        if (!matchYear) return false;

        if (statusFilter === 'CANCELADO') return item.status === 'CANCELADO';
        if (item.status === 'CANCELADO') return false;

        if (statusFilter === 'ALL') return true;
        if (statusFilter === 'PAGO') return item.status === 'PAGO';
        return item.status !== 'PAGO';
    });
}

export function calcularStatsImpostoAnual(
    impostos: ContaPagar[] | undefined,
    ano: number
): ImpostoAnualStats {
    const ativasDoAno = filterImpostosByYearAndStatus(impostos, ano, 'ALL');

    let totalAnual = 0;
    let totalPago = 0;
    let qtdPago = 0;
    let totalPendente = 0;
    let qtdPendente = 0;

    for (const item of ativasDoAno) {
        const valor = Number(item.valor) || 0;
        totalAnual += valor;
        if (item.status === 'PAGO') {
            totalPago += valor;
            qtdPago += 1;
        } else {
            totalPendente += valor;
            qtdPendente += 1;
        }
    }

    const mediaMensal = ativasDoAno.length > 0 ? totalAnual / ativasDoAno.length : 0;

    return {
        totalAnual,
        totalPago,
        qtdPago,
        totalPendente,
        qtdPendente,
        mediaMensal,
        totalGuiasAno: ativasDoAno.length,
    };
}

export function hasDasCompetenciaDuplicada(
    impostos: ContaPagar[] | undefined,
    dataCompetencia: string
): boolean {
    if (!impostos || !dataCompetencia || dataCompetencia.length < 7) return false;
    const mesPrefix = dataCompetencia.slice(0, 7); // YYYY-MM
    return impostos.some(
        (item) =>
            item.status !== 'CANCELADO' &&
            typeof item.dataCompetencia === 'string' &&
            item.dataCompetencia.startsWith(mesPrefix)
    );
}

export function validateDasForm(params: {
    valor: string;
    dataCompetencia: string;
    dataVencimento: string;
}): string | null {
    const parsed = Number.parseFloat(params.valor.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 'Informe um valor de DAS válido maior que R$ 0,00.';
    }
    if (!params.dataCompetencia) {
        return 'Informe a data de competência.';
    }
    if (!params.dataVencimento) {
        return 'Informe a data de vencimento.';
    }
    return null;
}
