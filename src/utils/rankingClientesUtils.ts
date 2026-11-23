import type { RankingCliente } from '../types';

export type OrdemRankingClientes = 'VALOR' | 'OS' | 'TICKET';

export interface ResumoRankingClientes {
    faturamentoTotal: number;
    totalClientes: number;
    totalOS: number;
    ticketMedioOS: number;
    ticketMedioCliente: number;
    top3Valor: number;
    concentracaoTop3: number;
}

const normalizeText = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export function calcularTicketMedio(cliente: Pick<RankingCliente, 'valorTotal' | 'quantidadeOS'>): number {
    if (!cliente.quantidadeOS || cliente.quantidadeOS <= 0) return 0;
    return (cliente.valorTotal || 0) / cliente.quantidadeOS;
}

export function calcularParticipacaoCliente(valorCliente: number, faturamentoTotal: number): number {
    if (!faturamentoTotal || faturamentoTotal <= 0 || !valorCliente || valorCliente <= 0) return 0;
    return Math.min((valorCliente / faturamentoTotal) * 100, 100);
}

export function calcularResumoRanking(clientes: RankingCliente[]): ResumoRankingClientes {
    const totalClientes = clientes.length;
    const faturamentoTotal = clientes.reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    const totalOS = clientes.reduce((acc, c) => acc + (c.quantidadeOS || 0), 0);

    const ticketMedioOS = totalOS > 0 ? faturamentoTotal / totalOS : 0;
    const ticketMedioCliente = totalClientes > 0 ? faturamentoTotal / totalClientes : 0;

    const ordenadosPorValor = [...clientes].sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0));
    const top3Valor = ordenadosPorValor.slice(0, 3).reduce((acc, c) => acc + (c.valorTotal || 0), 0);
    const concentracaoTop3 = faturamentoTotal > 0 ? Math.min((top3Valor / faturamentoTotal) * 100, 100) : 0;

    return {
        faturamentoTotal,
        totalClientes,
        totalOS,
        ticketMedioOS,
        ticketMedioCliente,
        top3Valor,
        concentracaoTop3,
    };
}

export function filtrarEOrdenarRanking(
    clientes: RankingCliente[],
    busca: string,
    ordem: OrdemRankingClientes
): RankingCliente[] {
    const termo = normalizeText(busca);
    const filtrados = termo
        ? clientes.filter((c) => normalizeText(c.nomeFantasia || '').includes(termo))
        : [...clientes];

    return filtrados.sort((a, b) => {
        if (ordem === 'OS') {
            return (b.quantidadeOS || 0) - (a.quantidadeOS || 0) || (b.valorTotal || 0) - (a.valorTotal || 0);
        }
        if (ordem === 'TICKET') {
            return calcularTicketMedio(b) - calcularTicketMedio(a);
        }
        return (b.valorTotal || 0) - (a.valorTotal || 0);
    });
}
