import type { CartaoCredito, ContaPagar, LimiteDisponivelDTO } from '../types';

export type NivelUsoLimite = 'ok' | 'warn' | 'crit';

export interface RegraCicloCartao {
    venceNoMesmoMes: boolean;
    resumoCurto: string;
    resumoDetalhado: string;
}

export interface ResumoLimitesCartoes {
    totalCartoes: number;
    cartoesComLimite: number;
    limiteTotal: number;
    limiteUtilizado: number;
    limiteDisponivel: number;
    percentualGlobal: number;
}

export interface FormCartaoInput {
    nome: string;
    diaFechamento: number;
    diaVencimento: number;
    limite: string;
}

const normalizeText = (value: string): string =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

export function descreverRegraCiclo(
    diaFechamento?: number | null,
    diaVencimento?: number | null
): RegraCicloCartao {
    const fech = diaFechamento && diaFechamento >= 1 && diaFechamento <= 31 ? diaFechamento : 25;
    const venc = diaVencimento && diaVencimento >= 1 && diaVencimento <= 31 ? diaVencimento : 5;
    const venceNoMesmoMes = venc > fech;

    return {
        venceNoMesmoMes,
        resumoCurto: venceNoMesmoMes ? 'Vence no mesmo mês' : 'Vence no mês seguinte',
        resumoDetalhado: `Compras até o dia ${fech} entram na fatura do mês atual (vencimento dia ${venc} ${venceNoMesmoMes ? 'do mesmo mês' : 'do mês seguinte'}). Compras após o dia ${fech} vão para a fatura seguinte.`,
    };
}

export function calcularUsoLimite(info?: LimiteDisponivelDTO | null): {
    percentual: number;
    nivel: NivelUsoLimite;
} {
    if (!info || !info.limiteTotal || info.limiteTotal <= 0) {
        return { percentual: 0, nivel: 'ok' };
    }
    const utilizado = Math.max(info.limiteUtilizado ?? 0, 0);
    const percentual = Math.min(Math.round((utilizado / info.limiteTotal) * 100), 100);
    const nivel: NivelUsoLimite = percentual >= 90 ? 'crit' : percentual >= 70 ? 'warn' : 'ok';
    return { percentual, nivel };
}

export function consolidarLimitesCartoes(
    cartoes: CartaoCredito[],
    limitesPorId: Record<number, LimiteDisponivelDTO | undefined>
): ResumoLimitesCartoes {
    let cartoesComLimite = 0;
    let limiteTotal = 0;
    let limiteUtilizado = 0;
    let limiteDisponivel = 0;

    for (const cartao of cartoes) {
        const info = limitesPorId[cartao.id];
        const total = info?.limiteTotal ?? cartao.limite ?? null;
        if (total != null && total > 0) {
            cartoesComLimite += 1;
            limiteTotal += total;
            const usado = Math.max(info?.limiteUtilizado ?? 0, 0);
            const disp = info?.limiteDisponivel != null ? Math.max(info.limiteDisponivel, 0) : Math.max(total - usado, 0);
            limiteUtilizado += usado;
            limiteDisponivel += disp;
        }
    }

    const percentualGlobal = limiteTotal > 0 ? Math.min(Math.round((limiteUtilizado / limiteTotal) * 100), 100) : 0;

    return {
        totalCartoes: cartoes.length,
        cartoesComLimite,
        limiteTotal,
        limiteUtilizado,
        limiteDisponivel,
        percentualGlobal,
    };
}

export function filtrarCartoesPorBusca(cartoes: CartaoCredito[], busca: string): CartaoCredito[] {
    const termo = normalizeText(busca);
    if (!termo) return cartoes;
    return cartoes.filter((c) => normalizeText(c.nome).includes(termo));
}

export function contarFaturasAbertasPorCartao(contasPendentes: ContaPagar[]): {
    totalAbertas: number;
    porCartao: Record<number, number>;
} {
    const porCartao: Record<number, number> = {};
    let totalAbertas = 0;

    for (const conta of contasPendentes) {
        if (conta.tipo !== 'FATURA_CARTAO' || conta.status !== 'PENDENTE') continue;
        totalAbertas += 1;
        if (conta.cartao?.id != null) {
            porCartao[conta.cartao.id] = (porCartao[conta.cartao.id] ?? 0) + 1;
        }
    }

    return { totalAbertas, porCartao };
}

export function validarFormularioCartao(input: FormCartaoInput): string | null {
    if (!input.nome.trim()) {
        return 'Informe o nome do cartão.';
    }
    if (!Number.isInteger(input.diaFechamento) || input.diaFechamento < 1 || input.diaFechamento > 31) {
        return 'O dia de fechamento deve estar entre 1 e 31.';
    }
    if (!Number.isInteger(input.diaVencimento) || input.diaVencimento < 1 || input.diaVencimento > 31) {
        return 'O dia de vencimento deve estar entre 1 e 31.';
    }
    if (input.limite.trim() !== '') {
        const valorLimite = Number(input.limite);
        if (Number.isNaN(valorLimite) || valorLimite < 0) {
            return 'Informe um valor de limite válido (maior ou igual a zero).';
        }
    }
    return null;
}
