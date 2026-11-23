import type { Prestador } from '../types';

export function normalizeTerceirizadoText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function filterTerceirizados(
    prestadores: Prestador[] | undefined,
    searchTerm: string
): Prestador[] {
    if (!prestadores) return [];
    const query = normalizeTerceirizadoText(searchTerm);
    if (!query) return prestadores;

    return prestadores.filter((p) => {
        const nome = normalizeTerceirizadoText(p.nome || '');
        const telefone = normalizeTerceirizadoText(p.telefone || '');
        const pix = normalizeTerceirizadoText(p.chavePix || '');
        return nome.includes(query) || telefone.includes(query) || pix.includes(query);
    });
}
