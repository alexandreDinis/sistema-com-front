export const CATEGORIA_DESPESA_LABELS: Record<string, string> = {
    MATERIAIS_APLICADOS: 'Materiais Aplicados',
    SERVICOS_TERCEIROS: 'Serviços de Terceiros',
    SALARIOS: 'Valores Base do Repasse',
    PROLABORE: 'Pró-Labore',
    COMISSOES: 'Repasses por Serviço',
    BENEFICIOS: 'Benefícios',
    ENCARGOS_SOCIAIS: 'Encargos Sociais',
    ADIANTAMENTOS: 'Adiantamentos ao Prestador',
    OCUPACAO: 'Ocupação (Aluguel/Cond)',
    UTILIDADES: 'Utilidades (Luz/Água/Tel)',
    MANUTENCAO_PREDIAL: 'Manutenção Predial',
    MATERIAL_USO_CONSUMO: 'Material de Uso e Consumo',
    SERVICOS_PROFISSIONAIS: 'Serviços Profissionais (Cont/Jur)',
    DIVERSOS: 'Despesas Diversas',
    MARKETING: 'Marketing e Publicidade',
    VIAGENS_REPRESENTACAO: 'Viagens e Representação',
    ALIMENTACAO: 'Alimentação',
    COMBUSTIVEL: 'Combustível',
    MANUTENCAO_VEICULO: 'Manutenção de Veículo',
    TARIFAS_BANCARIAS: 'Tarifas Bancárias',
    JUROS_PASSIVOS: 'Juros Passivos',
    IMPOSTOS_SOBRE_VENDA: 'Impostos sobre Venda',
    TAXAS_DIVERSAS: 'Taxas e Licenças',
    FERRAMENTAS: 'Ferramentas',
    INFRAESTRUTURA: 'Infraestrutura',
    OUTROS: 'Outros',
};

export const MESES_EXTENSO = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
] as const;

export interface DespesaCategoriaItem {
    categoria: string;
    label: string;
    valor: number;
    percentual: number;
}

export function formatCategoriaDespesa(categoria: string): string {
    if (CATEGORIA_DESPESA_LABELS[categoria]) {
        return CATEGORIA_DESPESA_LABELS[categoria];
    }
    return categoria
        .toLowerCase()
        .split('_')
        .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ''))
        .join(' ');
}

export function parsePeriodoParams(
    anoParam: string | null,
    mesParam: string | null,
    fallbackDate: Date = new Date()
): { ano: number; mes: number } {
    const parsedAno = anoParam ? Number.parseInt(anoParam, 10) : Number.NaN;
    const parsedMes = mesParam ? Number.parseInt(mesParam, 10) : Number.NaN;

    const ano = Number.isInteger(parsedAno) && parsedAno >= 2000 && parsedAno <= 2100
        ? parsedAno
        : fallbackDate.getFullYear();

    const mes = Number.isInteger(parsedMes) && parsedMes >= 1 && parsedMes <= 12
        ? parsedMes
        : fallbackDate.getMonth() + 1;

    return { ano, mes };
}

export function filtrarDespesasPositivas(
    despesasPorCategoria: Record<string, number> | undefined | null,
    despesasTotal: number
): DespesaCategoriaItem[] {
    if (!despesasPorCategoria) return [];

    return Object.entries(despesasPorCategoria)
        .filter(([, valor]) => typeof valor === 'number' && Number.isFinite(valor) && valor > 0)
        .sort(([catA, valA], [catB, valB]) => {
            if (valB !== valA) return valB - valA;
            return formatCategoriaDespesa(catA).localeCompare(formatCategoriaDespesa(catB), 'pt-BR');
        })
        .map(([categoria, valor]) => ({
            categoria,
            label: formatCategoriaDespesa(categoria),
            valor,
            percentual: despesasTotal > 0 ? Math.min((valor / despesasTotal) * 100, 100) : 0,
        }));
}

export function calcularMargemLiquida(faturamentoTotal: number, lucroLiquido: number): number {
    if (!Number.isFinite(faturamentoTotal) || faturamentoTotal <= 0) {
        return 0;
    }
    return (lucroLiquido / faturamentoTotal) * 100;
}

export interface ComposicaoReceita {
    impostosPct: number;
    despesasPct: number;
    comissoesPct: number;
    lucroPct: number;
}

export function calcularComposicaoReceita(params: {
    faturamentoTotal: number;
    imposto: number;
    despesasTotal: number;
    comissaoAlocada: number;
    lucroLiquido: number;
}): ComposicaoReceita {
    const { faturamentoTotal, imposto, despesasTotal, comissaoAlocada, lucroLiquido } = params;
    const base = faturamentoTotal > 0
        ? Math.max(faturamentoTotal, Math.max(0, imposto) + Math.max(0, despesasTotal) + Math.max(0, comissaoAlocada))
        : Math.max(0, imposto) + Math.max(0, despesasTotal) + Math.max(0, comissaoAlocada);

    if (base <= 0) {
        return { impostosPct: 0, despesasPct: 0, comissoesPct: 0, lucroPct: 0 };
    }

    return {
        impostosPct: (Math.max(0, imposto) / base) * 100,
        despesasPct: (Math.max(0, despesasTotal) / base) * 100,
        comissoesPct: (Math.max(0, comissaoAlocada) / base) * 100,
        lucroPct: lucroLiquido > 0 ? (lucroLiquido / base) * 100 : 0,
    };
}
