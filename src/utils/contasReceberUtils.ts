export interface ContasReceberContadores {
    pendentes: number;
    pendentesVencidas: number;
    parciais: number;
    parciaisVencidas: number;
}

export interface TabBadgeInfo {
    count: number;
    overdueCount: number;
    hasOverdue: boolean;
    tooltip: string;
}

export function getContasReceberTabBadge(
    tabKey: string,
    contadores: ContasReceberContadores | null
): TabBadgeInfo | null {
    if (!contadores) return null;

    if (tabKey === 'PENDENTE') {
        const count = Math.max(0, contadores.pendentes ?? 0);
        const overdueCount = Math.max(0, contadores.pendentesVencidas ?? 0);
        const hasOverdue = overdueCount > 0;
        return {
            count,
            overdueCount,
            hasOverdue,
            tooltip: hasOverdue
                ? `${overdueCount} conta(s) pendente(s) vencida(s)`
                : `${count} conta(s) pendente(s) em dia`,
        };
    }

    if (tabKey === 'PARCIAL') {
        const count = Math.max(0, contadores.parciais ?? 0);
        const overdueCount = Math.max(0, contadores.parciaisVencidas ?? 0);
        const hasOverdue = overdueCount > 0;
        return {
            count,
            overdueCount,
            hasOverdue,
            tooltip: hasOverdue
                ? `${overdueCount} conta(s) parcial(is) vencida(s)`
                : `${count} conta(s) parcial(is) em dia`,
        };
    }

    return null;
}
