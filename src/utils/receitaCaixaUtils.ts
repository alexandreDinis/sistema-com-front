export interface ReceitaCaixaItem {
    dataRecebimento: string;
    valor: number;
    origem: string;
    cliente?: string;
    meioPagamento?: string;
}

const MEIO_PAGAMENTO_LABELS: Record<string, string> = {
    PIX: 'PIX',
    DINHEIRO: 'Dinheiro',
    CARTAO_CREDITO: 'Cartão de Crédito',
    CARTAO_DEBITO: 'Cartão de Débito',
    TRANSFERENCIA: 'Transferência',
    BOLETO: 'Boleto',
    CHEQUE: 'Cheque',
    OUTROS: 'Outros',
};

export function formatMeioPagamentoLabel(meio?: string): string {
    if (!meio) return 'Não informado';
    return MEIO_PAGAMENTO_LABELS[meio] || meio;
}

export function normalizeText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export interface ResumoMeioPagamento {
    meio: string;
    label: string;
    total: number;
    quantidade: number;
}

export function agruparRecebimentosPorMeio(
    recebimentos: ReceitaCaixaItem[] | undefined
): ResumoMeioPagamento[] {
    if (!recebimentos || recebimentos.length === 0) return [];

    const map = new Map<string, { total: number; quantidade: number }>();
    for (const item of recebimentos) {
        const key = item.meioPagamento || 'NAO_INFORMADO';
        const prev = map.get(key) || { total: 0, quantidade: 0 };
        map.set(key, {
            total: prev.total + (Number(item.valor) || 0),
            quantidade: prev.quantidade + 1,
        });
    }

    return Array.from(map.entries())
        .map(([meio, stats]) => ({
            meio,
            label: meio === 'NAO_INFORMADO' ? 'Não informado' : formatMeioPagamentoLabel(meio),
            total: stats.total,
            quantidade: stats.quantidade,
        }))
        .sort((a, b) => b.total - a.total);
}

export function filterRecebimentosCaixa(
    recebimentos: ReceitaCaixaItem[] | undefined,
    searchTerm: string,
    meioFilter: string
): ReceitaCaixaItem[] {
    if (!recebimentos) return [];
    const query = normalizeText(searchTerm);

    return recebimentos.filter((item) => {
        if (meioFilter !== 'ALL') {
            const itemMeio = item.meioPagamento || 'NAO_INFORMADO';
            if (itemMeio !== meioFilter) return false;
        }
        if (!query) return true;

        const haystack = normalizeText(
            `${item.cliente || ''} ${item.origem || ''} ${formatMeioPagamentoLabel(item.meioPagamento)}`
        );
        return haystack.includes(query);
    });
}

export function calcularTicketMedio(totalRecebido: number, quantidade: number): number {
    if (!Number.isFinite(totalRecebido) || !Number.isFinite(quantidade) || quantidade <= 0) {
        return 0;
    }
    return totalRecebido / quantidade;
}

export function calcularEstimativaDas(totalRecebido: number, aliquotaDecimal?: number): number {
    if (
        !Number.isFinite(totalRecebido) ||
        totalRecebido <= 0 ||
        aliquotaDecimal === undefined ||
        !Number.isFinite(aliquotaDecimal) ||
        aliquotaDecimal <= 0
    ) {
        return 0;
    }
    return totalRecebido * aliquotaDecimal;
}
