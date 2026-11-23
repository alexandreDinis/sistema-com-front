import type { ContaPagar } from '../types';

const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export type FiltroStatusFatura = 'PENDENTE' | 'PAGO' | 'TODAS';

export interface ResumoFaturasCartao {
    abertasCount: number;
    totalAberto: number;
    totalFaturas: number;
}

export interface PreviaFatura {
    mesReferencia: string;
    labelMes: string;
    caiuProximoMes: boolean;
}

/**
 * Calcula o mês de referência da fatura (yyyy-MM) usando a mesma regra do backend:
 * se o dia da despesa for maior que o dia de fechamento, cai na fatura do mês seguinte.
 */
export function calcularMesReferenciaFatura(
    dataDespesa: string,
    diaFechamento?: number | null
): PreviaFatura | null {
    if (!dataDespesa || !/^\d{4}-\d{2}-\d{2}/.test(dataDespesa)) {
        return null;
    }

    const [anoStr, mesStr, diaStr] = dataDespesa.slice(0, 10).split('-');
    let ano = Number(anoStr);
    let mes = Number(mesStr); // 1-12
    const dia = Number(diaStr);

    if (!ano || !mes || !dia) {
        return null;
    }

    const fechamento = diaFechamento && diaFechamento > 0 ? diaFechamento : 25;
    const caiuProximoMes = dia > fechamento;

    if (caiuProximoMes) {
        mes += 1;
        if (mes > 12) {
            mes = 1;
            ano += 1;
        }
    }

    const mesPadded = String(mes).padStart(2, '0');
    return {
        mesReferencia: `${ano}-${mesPadded}`,
        labelMes: `${NOMES_MESES[mes - 1]}/${ano}`,
        caiuProximoMes,
    };
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para DD/MM/YYYY sem sofrer deslocamento de fuso horário.
 */
export function formatarDataLocal(dataIso?: string | null): string {
    if (!dataIso) return '—';
    const match = dataIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return new Date(dataIso).toLocaleDateString('pt-BR');
}

export function formatarMesReferenciaFatura(mesReferencia?: string | null): string {
    if (!mesReferencia) return '—';
    const match = mesReferencia.match(/^(\d{4})-(\d{2})$/);
    if (!match) return mesReferencia;
    const ano = Number(match[1]);
    const mesIdx = Number(match[2]) - 1;
    if (mesIdx < 0 || mesIdx > 11) return mesReferencia;
    return `${NOMES_MESES[mesIdx]} / ${ano}`;
}

export function resumirFaturasPorCartao(contas: ContaPagar[]): Record<number, ResumoFaturasCartao> {
    const mapa: Record<number, ResumoFaturasCartao> = {};

    for (const conta of contas) {
        if (conta.tipo !== 'FATURA_CARTAO' || conta.cartao?.id == null) continue;
        const cid = conta.cartao.id;
        if (!mapa[cid]) {
            mapa[cid] = { abertasCount: 0, totalAberto: 0, totalFaturas: 0 };
        }
        mapa[cid].totalFaturas += 1;
        if (conta.status === 'PENDENTE') {
            mapa[cid].abertasCount += 1;
            mapa[cid].totalAberto += conta.valor || 0;
        }
    }

    return mapa;
}

export function filtrarFaturasDoCartao(
    contas: ContaPagar[],
    cartaoId: number | null,
    filtro: FiltroStatusFatura
): ContaPagar[] {
    if (cartaoId == null) return [];

    return contas
        .filter((c) => {
            if (c.tipo !== 'FATURA_CARTAO') return false;
            if (c.cartao?.id !== cartaoId) return false;
            if (filtro === 'PENDENTE') return c.status === 'PENDENTE';
            if (filtro === 'PAGO') return c.status === 'PAGO';
            return c.status !== 'CANCELADO';
        })
        .sort((a, b) => {
            if (filtro === 'PENDENTE') {
                return (a.dataVencimento || '').localeCompare(b.dataVencimento || '');
            }
            return (b.dataVencimento || '').localeCompare(a.dataVencimento || '');
        });
}

const CATEGORIA_LABELS: Record<string, string> = {
    COMBUSTIVEL: 'Combustível',
    ALIMENTACAO: 'Alimentação',
    FERRAMENTAS: 'Ferramentas',
    INSUMOS: 'Insumos',
    MANUTENCAO: 'Manutenção',
    ALUGUEL: 'Aluguel',
    ENERGIA: 'Energia',
    AGUA: 'Água',
    INTERNET: 'Internet',
    MARKETING: 'Marketing',
    SOFTWARE: 'Software',
    SALARIOS: 'Salários',
    IMPOSTOS: 'Impostos',
    TRANSPORTE: 'Transporte',
    OUTROS: 'Outros',
};

export function formatarCategoriaDespesa(categoria?: string | null): string {
    if (!categoria) return 'Geral';
    const key = categoria.toUpperCase();
    if (CATEGORIA_LABELS[key]) return CATEGORIA_LABELS[key];
    return key
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
}
