export type RelatorioCategoria = 'GERENCIAL' | 'FISCAL' | 'CAIXA';
export type RelatorioCategoriaFilter = 'ALL' | RelatorioCategoria;

export interface RelatorioCatalogItem {
    id: string;
    category: RelatorioCategoria;
    title: string;
    description: string;
    keywords: string[];
    path: string;
    hasPdf?: boolean;
}

export function normalizeReportSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function filterRelatoriosCatalog<T extends RelatorioCatalogItem>(
    items: T[],
    searchTerm: string,
    categoryFilter: RelatorioCategoriaFilter
): T[] {
    const query = normalizeReportSearch(searchTerm);

    return items.filter((item) => {
        if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
            return false;
        }
        if (!query) return true;

        const haystack = normalizeReportSearch(
            `${item.title} ${item.description} ${item.keywords.join(' ')}`
        );
        return haystack.includes(query);
    });
}
