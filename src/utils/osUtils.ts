import type { Cliente, OSStatus, TipoPeca } from '../types';

const normalizarTexto = (valor: string): string =>
    valor
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Soma dias a uma data ISO (YYYY-MM-DD) sem sofrer deslocamento de fuso horário.
 */
export function calcularDataPorPrazo(dataBaseIso: string, dias: number): string {
    const match = dataBaseIso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const base = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
        : new Date();
    base.setDate(base.getDate() + dias);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, '0');
    const dd = String(base.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Filtra clientes por nome fantasia, razão social ou CNPJ (com ou sem máscara).
 */
export function filtrarClientesPorBusca(clientes: Cliente[], termo: string): Cliente[] {
    const q = termo.trim().toLowerCase();
    if (!q) return clientes;
    const qDigits = q.replace(/\D/g, '');

    return clientes.filter((c) => {
        const nome = (c.nomeFantasia || '').toLowerCase();
        const razao = (c.razaoSocial || '').toLowerCase();
        const cnpj = (c.cnpj || '').toLowerCase();
        const cnpjDigits = cnpj.replace(/\D/g, '');

        if (nome.includes(q) || razao.includes(q) || cnpj.includes(q)) {
            return true;
        }
        return qDigits.length > 0 && cnpjDigits.includes(qDigits);
    });
}

export function formatarStatusOS(status: OSStatus): string {
    switch (status) {
        case 'ABERTA':
            return 'Aberta';
        case 'EM_EXECUCAO':
            return 'Em execução';
        case 'FINALIZADA':
            return 'Finalizada';
        case 'CANCELADA':
            return 'Cancelada';
    }
}

/**
 * Filtra itens do catálogo ignorando acentos, maiúsculas e hífens (ex: "capo" encontra "Capô", "para lama" encontra "Para-lama").
 */
export function filtrarCatalogo(itens: TipoPeca[], termo: string): TipoPeca[] {
    const q = normalizarTexto(termo);
    if (!q) return itens;
    const qCompact = q.replace(/\s+/g, '');

    return itens.filter((item) => {
        const nomeNorm = normalizarTexto(item.nome || '');
        const nomeCompact = nomeNorm.replace(/\s+/g, '');
        return nomeNorm.includes(q) || nomeCompact.includes(qCompact);
    });
}

/**
 * Soma ou subtrai um passo (delta) ao valor cobrado sem permitir valores negativos.
 */
export function ajustarValorCobrado(valorAtualStr: string, delta: number): string {
    const atual = parseFloat(valorAtualStr.replace(',', '.'));
    const base = isNaN(atual) ? 0 : atual;
    const novo = Math.max(0, Math.round((base + delta) * 100) / 100);
    return novo.toFixed(2);
}
