export interface ItemFluxoCaixa {
    data: string;
    descricao: string;
    categoria: string;
    valor: number;
}

export interface MovimentacaoFluxoCaixa extends ItemFluxoCaixa {
    tipo: 'ENTRADA' | 'SAIDA';
}

export type FluxoTipoFilter = 'ALL' | 'ENTRADA' | 'SAIDA';

export function normalizeFluxoText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function buildExtratoFluxoCaixa(
    entradas: ItemFluxoCaixa[] | undefined,
    saidas: ItemFluxoCaixa[] | undefined
): MovimentacaoFluxoCaixa[] {
    const listIn: MovimentacaoFluxoCaixa[] = (entradas || []).map((item) => ({
        ...item,
        tipo: 'ENTRADA',
    }));
    const listOut: MovimentacaoFluxoCaixa[] = (saidas || []).map((item) => ({
        ...item,
        tipo: 'SAIDA',
    }));

    return [...listIn, ...listOut].sort((a, b) => {
        const dateCmp = (b.data || '').localeCompare(a.data || '');
        if (dateCmp !== 0) return dateCmp;
        return (b.valor || 0) - (a.valor || 0);
    });
}

export function filterExtratoFluxoCaixa(
    movs: MovimentacaoFluxoCaixa[],
    typeFilter: FluxoTipoFilter,
    searchTerm: string
): MovimentacaoFluxoCaixa[] {
    const query = normalizeFluxoText(searchTerm);

    return movs.filter((m) => {
        if (typeFilter !== 'ALL' && m.tipo !== typeFilter) return false;
        if (!query) return true;

        const haystack = normalizeFluxoText(`${m.descricao || ''} ${m.categoria || ''}`);
        return haystack.includes(query);
    });
}

export function calcularProporcaoFluxo(entradas: number, saidas: number): {
    entradasPct: number;
    saidasPct: number;
} {
    const e = Number.isFinite(entradas) && entradas > 0 ? entradas : 0;
    const s = Number.isFinite(saidas) && saidas > 0 ? saidas : 0;
    const total = e + s;
    if (total <= 0) return { entradasPct: 0, saidasPct: 0 };
    return {
        entradasPct: (e / total) * 100,
        saidasPct: (s / total) * 100,
    };
}
