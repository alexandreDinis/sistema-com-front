import type { Despesa } from '../types';

export type TipoFiltroDespesa = 'TODOS' | 'CARTAO' | 'COMUM';
export type OrdemDespesa = 'CRIACAO_DESC' | 'DATA_DESC' | 'VALOR_DESC';

export interface FiltrosDespesa {
    tipo: TipoFiltroDespesa;
    busca: string;
    mesAno: string; // 'TODOS' ou 'YYYY-MM'
    cartaoId: string; // 'TODOS' ou String(id)
    categoria: string; // 'TODOS' ou CategoriaDespesa
    ordem: OrdemDespesa;
}

export interface ResumoDespesas {
    total: number;
    count: number;
    totalCartao: number;
    countCartao: number;
    totalComum: number;
    countComum: number;
}

export const CATEGORIA_LABELS: Record<string, string> = {
    MATERIAIS_APLICADOS: 'Materiais Aplicados',
    SERVICOS_TERCEIROS: 'Serviços de Terceiros',
    SALARIOS: 'Valor Base do Repasse',
    PROLABORE: 'Pró-labore',
    COMISSOES: 'Repasses por Serviço',
    BENEFICIOS: 'Benefícios',
    ENCARGOS_SOCIAIS: 'Encargos Sociais',
    ADIANTAMENTOS: 'Adiantamentos ao Prestador',
    OCUPACAO: 'Ocupação (Aluguel)',
    UTILIDADES: 'Utilidades (Luz/Água)',
    MANUTENCAO_PREDIAL: 'Manutenção Predial',
    MATERIAL_USO_CONSUMO: 'Material de Uso e Consumo',
    SERVICOS_PROFISSIONAIS: 'Serviços Profissionais',
    MARKETING: 'Marketing',
    VIAGENS_REPRESENTACAO: 'Viagens',
    COMBUSTIVEL: 'Combustível',
    ALIMENTACAO: 'Alimentação',
    MANUTENCAO_VEICULO: 'Manutenção Veículo',
    TARIFAS_BANCARIAS: 'Tarifas Bancárias',
    JUROS_PASSIVOS: 'Juros Passivos',
    IMPOSTOS_SOBRE_VENDA: 'Impostos sobre Venda',
    TAXAS_DIVERSAS: 'Taxas Diversas',
    DIVERSOS: 'Diversos',
    OUTROS: 'Outros',
};

const NOMES_MESES_CURTOS = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function formatarMesAno(mesAno: string): string {
    const match = mesAno.match(/^(\d{4})-(\d{2})$/);
    if (!match) return mesAno;
    const mesIdx = Number(match[2]) - 1;
    if (mesIdx < 0 || mesIdx > 11) return mesAno;
    return `${NOMES_MESES_CURTOS[mesIdx]}/${match[1]}`;
}

export function getCategoriaLabel(categoria?: string): string {
    if (!categoria) return 'Diversos';
    return CATEGORIA_LABELS[categoria] ?? categoria.replace(/_/g, ' ');
}

export function extrairMesesDisponiveis(despesas: Despesa[], mesAtual?: string): string[] {
    const set = new Set<string>();
    if (mesAtual && /^\d{4}-\d{2}$/.test(mesAtual)) {
        set.add(mesAtual);
    }
    for (const d of despesas) {
        if (d.dataDespesa && d.dataDespesa.length >= 7) {
            set.add(d.dataDespesa.slice(0, 7));
        }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
}

export function filtrarEOrdenarDespesas(
    despesas: Despesa[],
    filtros: FiltrosDespesa
): Despesa[] {
    const buscaNorm = filtros.busca.trim().toLowerCase();

    const filtradas = despesas.filter((d) => {
        const isCartao = Boolean(d.cartao?.id);
        if (filtros.tipo === 'CARTAO' && !isCartao) return false;
        if (filtros.tipo === 'COMUM' && isCartao) return false;

        if (filtros.mesAno !== 'TODOS') {
            if (!d.dataDespesa || !d.dataDespesa.startsWith(filtros.mesAno)) return false;
        }

        if (filtros.cartaoId !== 'TODOS') {
            if (!d.cartao || String(d.cartao.id) !== filtros.cartaoId) return false;
        }

        if (filtros.categoria !== 'TODOS' && d.categoria !== filtros.categoria) {
            return false;
        }

        if (buscaNorm) {
            const desc = (d.descricao || '').toLowerCase();
            const cartaoNome = (d.cartao?.nome || '').toLowerCase();
            const catLabel = getCategoriaLabel(d.categoria).toLowerCase();
            if (!desc.includes(buscaNorm) && !cartaoNome.includes(buscaNorm) && !catLabel.includes(buscaNorm)) {
                return false;
            }
        }

        return true;
    });

    return [...filtradas].sort((a, b) => {
        if (filtros.ordem === 'VALOR_DESC') {
            return (b.valor || 0) - (a.valor || 0);
        }
        if (filtros.ordem === 'DATA_DESC') {
            const cmp = (b.dataDespesa || '').localeCompare(a.dataDespesa || '');
            return cmp !== 0 ? cmp : (b.id || 0) - (a.id || 0);
        }
        // CRIACAO_DESC (padrão): mais recentemente criados no topo (evita parcelas futuras esconderem lançamentos de hoje)
        const criacaoA = a.dataCriacao || '';
        const criacaoB = b.dataCriacao || '';
        const cmpCriacao = criacaoB.localeCompare(criacaoA);
        return cmpCriacao !== 0 ? cmpCriacao : (b.id || 0) - (a.id || 0);
    });
}

export function calcularResumoDespesas(despesas: Despesa[]): ResumoDespesas {
    let total = 0;
    let totalCartao = 0;
    let countCartao = 0;
    let totalComum = 0;
    let countComum = 0;

    for (const d of despesas) {
        const valor = Number(d.valor) || 0;
        total += valor;
        if (d.cartao?.id) {
            totalCartao += valor;
            countCartao += 1;
        } else {
            totalComum += valor;
            countComum += 1;
        }
    }

    return {
        total,
        count: despesas.length,
        totalCartao,
        countCartao,
        totalComum,
        countComum,
    };
}
