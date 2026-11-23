import type { ContaPagar } from '../types';

export type RetiradaCalcBase = 'CAIXA' | 'MES';
export type DistribuicaoStatusFilter = 'ALL' | 'PENDENTE' | 'PAGO';

export function calcularContasPendentesNoMes(
    contasPagar: ContaPagar[] | undefined,
    mes: number,
    ano: number
): number {
    if (!contasPagar || contasPagar.length === 0) return 0;
    const prefix = `${ano}-${String(mes).padStart(2, '0')}`;

    return contasPagar
        .filter(
            (c) =>
                c.status !== 'PAGO' &&
                c.status !== 'CANCELADO' &&
                typeof c.dataVencimento === 'string' &&
                c.dataVencimento.startsWith(prefix)
        )
        .reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
}

export function calcularSaldoRetiradaMensal(params: {
    base: RetiradaCalcBase;
    entradasMes: number;
    caixaTotal: number;
    pendentesMes: number;
}): {
    baseValor: number;
    pendentesMes: number;
    saldoCalculado: number;
} {
    const entradas = Number.isFinite(params.entradasMes) ? params.entradasMes : 0;
    const caixa = Number.isFinite(params.caixaTotal) ? params.caixaTotal : 0;
    const pendentes = Number.isFinite(params.pendentesMes) ? params.pendentesMes : 0;
    const baseValor = params.base === 'CAIXA' ? caixa : entradas;

    return {
        baseValor,
        pendentesMes: pendentes,
        saldoCalculado: baseValor - pendentes,
    };
}

export function calcularRetiradasNoMes(
    distribuicoes: ContaPagar[] | undefined,
    mes: number,
    ano: number
): number {
    if (!distribuicoes || distribuicoes.length === 0) return 0;
    const prefix = `${ano}-${String(mes).padStart(2, '0')}`;

    return distribuicoes
        .filter((d) => typeof d.dataCompetencia === 'string' && d.dataCompetencia.startsWith(prefix))
        .reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
}

export function calcularRetiradasNoAno(
    distribuicoes: ContaPagar[] | undefined,
    ano: number
): number {
    if (!distribuicoes || distribuicoes.length === 0) return 0;
    const prefix = `${ano}-`;

    return distribuicoes
        .filter((d) => typeof d.dataCompetencia === 'string' && d.dataCompetencia.startsWith(prefix))
        .reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
}

export function filterDistribuicoesByStatus(
    distribuicoes: ContaPagar[] | undefined,
    filter: DistribuicaoStatusFilter
): ContaPagar[] {
    if (!distribuicoes) return [];
    if (filter === 'ALL') return distribuicoes;
    if (filter === 'PAGO') {
        return distribuicoes.filter((d) => d.status === 'PAGO');
    }
    return distribuicoes.filter((d) => d.status !== 'PAGO');
}

export function validateRetiradaForm(params: {
    valor: string;
    dataCompetencia: string;
    dataVencimento: string;
}): string | null {
    const parsed = Number.parseFloat(params.valor.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return 'Informe um valor válido maior que R$ 0,00.';
    }
    if (!params.dataCompetencia) {
        return 'Informe a data de competência.';
    }
    if (!params.dataVencimento) {
        return 'Informe a data de vencimento.';
    }
    return null;
}
