import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertTriangle,
    Box,
    Briefcase,
    Building2,
    Car,
    CheckCircle2,
    FileText,
    Fuel,
    Landmark,
    Megaphone,
    Percent,
    Receipt,
    RefreshCw,
    Scale,
    Server,
    TrendingDown,
    TrendingUp,
    Users,
    Utensils,
    Wallet,
    Wrench,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import { relatorioService } from '../../services/relatorioService';
import { empresaService } from '../../services/empresaService';
import {
    calcularComposicaoReceita,
    calcularMargemLiquida,
    filtrarDespesasPositivas,
} from '../../utils/dreUtils';

interface RelatorioConsolidadoProps {
    ano: number;
    mes: number;
}

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

const formatPercent = (val: number) =>
    `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    MATERIAIS_APLICADOS: Wrench,
    SERVICOS_TERCEIROS: Users,
    SALARIOS: Wallet,
    PROLABORE: Briefcase,
    COMISSOES: Users,
    BENEFICIOS: Users,
    ENCARGOS_SOCIAIS: Landmark,
    ADIANTAMENTOS: Wallet,
    OCUPACAO: Building2,
    UTILIDADES: Zap,
    MANUTENCAO_PREDIAL: Wrench,
    MATERIAL_USO_CONSUMO: Box,
    SERVICOS_PROFISSIONAIS: Briefcase,
    DIVERSOS: Box,
    MARKETING: Megaphone,
    VIAGENS_REPRESENTACAO: Car,
    ALIMENTACAO: Utensils,
    COMBUSTIVEL: Fuel,
    MANUTENCAO_VEICULO: Car,
    TARIFAS_BANCARIAS: Landmark,
    JUROS_PASSIVOS: TrendingDown,
    IMPOSTOS_SOBRE_VENDA: Receipt,
    TAXAS_DIVERSAS: Receipt,
    FERRAMENTAS: Wrench,
    INFRAESTRUTURA: Server,
    OUTROS: FileText,
};

export const RelatorioConsolidado: React.FC<RelatorioConsolidadoProps> = ({ ano, mes }) => {
    const {
        data: report,
        isLoading: isReportLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['relatorio', ano, mes],
        queryFn: () => relatorioService.getRelatorio(ano, mes),
        staleTime: 30_000,
    });

    const { data: config, isLoading: isConfigLoading } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: () => empresaService.getConfig(),
        staleTime: 60_000,
    });

    const isLoading = isReportLoading || isConfigLoading;

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-28 rounded-2xl bg-zinc-900/70 border border-white/10"
                        />
                    ))}
                </div>
                <div className="h-20 rounded-2xl bg-zinc-900/70 border border-white/10" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 h-80 rounded-2xl bg-zinc-900/70 border border-white/10" />
                    <div className="lg:col-span-5 h-80 rounded-2xl bg-zinc-900/70 border border-white/10" />
                </div>
            </div>
        );
    }

    if (error || !report) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-white">
                            Não foi possível carregar o relatório financeiro
                        </h3>
                        <p className="text-sm text-zinc-300 mt-1">
                            Verifique sua conexão e tente novamente. Se o problema persistir, contate o suporte.
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors shrink-0"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Tentar novamente</span>
                </button>
            </div>
        );
    }

    const isPrejuizo = report.lucroLiquido < 0;
    const margemLiquida = calcularMargemLiquida(report.faturamentoTotal, report.lucroLiquido);
    const despesasPositivas = filtrarDespesasPositivas(
        report.despesasPorCategoria,
        report.despesasTotal
    );
    const composicao = calcularComposicaoReceita({
        faturamentoTotal: report.faturamentoTotal,
        imposto: report.imposto,
        despesasTotal: report.despesasTotal,
        comissaoAlocada: report.comissaoAlocada,
        lucroLiquido: report.lucroLiquido,
    });
    const aliquotaLabel =
        config?.aliquotaImposto !== undefined
            ? ` (${(config.aliquotaImposto * 100).toFixed(1)}%)`
            : '';

    return (
        <div className="space-y-6">
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Receita Bruta */}
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Faturamento Bruto
                        </span>
                        <div className="p-2 rounded-lg bg-cyber-gold/10 text-cyber-gold shrink-0">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-3 tabular-nums truncate">
                        {formatCurrency(report.faturamentoTotal)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5">
                        Receita total consolidada no período
                    </p>
                </div>

                {/* Total de Saídas */}
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Total de Saídas
                        </span>
                        <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
                            <TrendingDown className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-3 tabular-nums truncate">
                        {formatCurrency(report.totalGeral)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5 truncate">
                        Impostos, despesas e comissões alocadas
                    </p>
                </div>

                {/* Lucro / Prejuízo Líquido */}
                <div
                    className={`rounded-2xl p-5 min-w-0 overflow-hidden border ${
                        isPrejuizo
                            ? 'bg-red-950/35 border-red-500/40'
                            : 'bg-emerald-950/25 border-emerald-500/30'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2">
                        <span
                            className={`text-xs font-medium uppercase tracking-wider ${
                                isPrejuizo ? 'text-red-300' : 'text-emerald-300'
                            }`}
                        >
                            {isPrejuizo ? 'Prejuízo Líquido' : 'Lucro Líquido'}
                        </span>
                        <div
                            className={`p-2 rounded-lg shrink-0 ${
                                isPrejuizo
                                    ? 'bg-red-500/15 text-red-400'
                                    : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                        >
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <p
                        className={`text-2xl sm:text-3xl font-bold mt-3 tabular-nums truncate ${
                            isPrejuizo ? 'text-red-400' : 'text-emerald-400'
                        }`}
                    >
                        {formatCurrency(report.lucroLiquido)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                        {isPrejuizo ? (
                            <>
                                <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span className="text-xs text-red-300 font-medium">
                                    Resultado negativo no mês
                                </span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-xs text-emerald-300/90 font-medium">
                                    Resultado positivo no mês
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Margem Líquida */}
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                            Margem Líquida
                        </span>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-cyber-gold shrink-0">
                            <Percent className="w-4 h-4" />
                        </div>
                    </div>
                    <p
                        className={`text-2xl sm:text-3xl font-bold mt-3 tabular-nums truncate ${
                            isPrejuizo
                                ? 'text-red-400'
                                : margemLiquida >= 20
                                    ? 'text-cyber-gold'
                                    : 'text-white'
                        }`}
                    >
                        {formatPercent(margemLiquida)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5">
                        Lucro líquido sobre o faturamento bruto
                    </p>
                </div>
            </div>

            {/* Revenue Composition Bar */}
            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-cyber-gold" />
                        <h2 className="text-sm font-semibold text-white">
                            Composição do Faturamento
                        </h2>
                    </div>
                    <span className="text-xs text-zinc-400">
                        Distribuição proporcional de impostos, despesas, comissões e lucro
                    </span>
                </div>

                <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden flex">
                    {composicao.impostosPct > 0 && (
                        <div
                            className="bg-amber-500/90 h-full transition-all duration-500"
                            style={{ width: `${composicao.impostosPct}%` }}
                            title={`Impostos: ${formatCurrency(report.imposto)}`}
                        />
                    )}
                    {composicao.despesasPct > 0 && (
                        <div
                            className="bg-rose-500/85 h-full transition-all duration-500"
                            style={{ width: `${composicao.despesasPct}%` }}
                            title={`Despesas: ${formatCurrency(report.despesasTotal)}`}
                        />
                    )}
                    {composicao.comissoesPct > 0 && (
                        <div
                            className="bg-sky-500/85 h-full transition-all duration-500"
                            style={{ width: `${composicao.comissoesPct}%` }}
                            title={`Comissões: ${formatCurrency(report.comissaoAlocada)}`}
                        />
                    )}
                    {composicao.lucroPct > 0 && (
                        <div
                            className="bg-emerald-500/85 h-full transition-all duration-500"
                            style={{ width: `${composicao.lucroPct}%` }}
                            title={`Lucro Líquido: ${formatCurrency(report.lucroLiquido)}`}
                        />
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-xs text-zinc-300">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500/90" />
                        Impostos ({formatPercent(composicao.impostosPct)})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500/85" />
                        Despesas ({formatPercent(composicao.despesasPct)})
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500/85" />
                        Comissões ({formatPercent(composicao.comissoesPct)})
                    </span>
                    {!isPrejuizo && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/85" />
                            Lucro Líquido ({formatPercent(composicao.lucroPct)})
                        </span>
                    )}
                </div>
            </div>

            {/* Main 2-Column Section: Expenses Breakdown + Vertical DRE & Repasses */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Expenses Breakdown (Only > 0, sorted desc) */}
                <div className="lg:col-span-7 rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                        <div>
                            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                                <TrendingDown className="w-4 h-4 text-cyber-gold shrink-0" />
                                <span>Detalhamento de Despesas</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Exibindo apenas categorias com lançamentos no período
                            </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-cyber-gold/10 text-cyber-gold border border-cyber-gold/20">
                            {despesasPositivas.length}{' '}
                            {despesasPositivas.length === 1 ? 'categoria ativa' : 'categorias ativas'}
                        </span>
                    </div>

                    {despesasPositivas.length === 0 ? (
                        <div className="py-12 px-4 text-center rounded-xl border border-dashed border-white/10 bg-black/20">
                            <div className="w-11 h-11 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-zinc-500">
                                <Receipt className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-medium text-zinc-300">
                                Nenhuma despesa registrada neste período
                            </p>
                            <p className="text-xs text-zinc-500 mt-1">
                                Categorias zeradas ficam ocultas automaticamente para facilitar a leitura.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {despesasPositivas.map((item) => {
                                const Icon = CATEGORY_ICONS[item.categoria] || FileText;
                                return (
                                    <div
                                        key={item.categoria}
                                        className="p-3.5 sm:p-4 rounded-xl bg-black/35 border border-white/5 hover:border-cyber-gold/25 transition-colors"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="p-2 rounded-lg bg-white/5 text-cyber-gold shrink-0">
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-medium text-zinc-100 truncate">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-sm sm:text-base font-semibold text-white tabular-nums">
                                                    {formatCurrency(item.valor)}
                                                </p>
                                                <p className="text-[11px] text-zinc-400 tabular-nums">
                                                    {formatPercent(item.percentual)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-cyber-gold/80 to-amber-400"
                                                style={{ width: `${Math.max(item.percentual, 2)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="pt-3 mt-2 border-t border-white/10 flex items-center justify-between text-sm">
                                <span className="font-medium text-zinc-400">Total de Despesas</span>
                                <span className="font-bold text-white tabular-nums">
                                    {formatCurrency(report.despesasTotal)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Vertical DRE + Repasses Summary */}
                <div className="lg:col-span-5 space-y-6 min-w-0">
                    {/* DRE Cascata */}
                    <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6">
                        <div className="pb-4 mb-4 border-b border-white/10">
                            <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-cyber-gold shrink-0" />
                                <span>Demonstrativo (DRE)</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Apuração direta do resultado operacional do mês
                            </p>
                        </div>

                        <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-2 py-1.5">
                                <span className="font-medium text-zinc-200">Faturamento Bruto</span>
                                <span className="font-semibold text-white tabular-nums">
                                    {formatCurrency(report.faturamentoTotal)}
                                </span>
                            </div>

                            <div className="border-t border-white/5 pt-2.5 space-y-2.5">
                                <div className="flex items-center justify-between gap-2 text-zinc-300">
                                    <span className="text-zinc-400">
                                        (-) Impostos{aliquotaLabel}
                                    </span>
                                    <span className="text-rose-400 tabular-nums">
                                        - {formatCurrency(report.imposto)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 text-zinc-300">
                                    <span className="text-zinc-400">(-) Despesas Operacionais</span>
                                    <span className="text-rose-400 tabular-nums">
                                        - {formatCurrency(report.despesasTotal)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-2 text-zinc-300">
                                    <span className="text-zinc-400">(-) Comissões Alocadas</span>
                                    <span className="text-rose-400 tabular-nums">
                                        - {formatCurrency(report.comissaoAlocada)}
                                    </span>
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-3 flex items-center justify-between gap-2">
                                <span className="text-zinc-400 font-medium">(=) Total de Saídas</span>
                                <span className="font-semibold text-zinc-200 tabular-nums">
                                    {formatCurrency(report.totalGeral)}
                                </span>
                            </div>

                            <div
                                className={`mt-4 p-4 rounded-xl border ${
                                    isPrejuizo
                                        ? 'bg-red-950/40 border-red-500/35'
                                        : 'bg-emerald-950/30 border-emerald-500/30'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span
                                        className={`text-xs font-semibold uppercase tracking-wider ${
                                            isPrejuizo ? 'text-red-300' : 'text-emerald-300'
                                        }`}
                                    >
                                        {isPrejuizo ? 'Prejuízo Líquido' : 'Lucro Líquido'}
                                    </span>
                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                            isPrejuizo
                                                ? 'bg-red-500/20 text-red-300'
                                                : 'bg-emerald-500/20 text-emerald-300'
                                        }`}
                                    >
                                        {formatPercent(margemLiquida)}
                                    </span>
                                </div>
                                <p
                                    className={`text-2xl sm:text-3xl font-bold mt-2 tabular-nums ${
                                        isPrejuizo ? 'text-red-400' : 'text-emerald-400'
                                    }`}
                                >
                                    {formatCurrency(report.lucroLiquido)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Detalhes de Repasses */}
                    <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6">
                        <div className="pb-3 mb-3 border-b border-white/10 flex items-center gap-2">
                            <Users className="w-4 h-4 text-cyber-gold shrink-0" />
                            <h3 className="text-sm font-semibold text-white">
                                Detalhes de Repasses (Comissões)
                            </h3>
                        </div>

                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-400">Comissões Alocadas</span>
                                <span className="text-zinc-200 font-medium tabular-nums">
                                    {formatCurrency(report.comissaoAlocada)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-400">(-) Adiantamentos Realizados</span>
                                <span className="text-rose-400 tabular-nums">
                                    - {formatCurrency(report.adiantamentosTotal)}
                                </span>
                            </div>
                            <div className="pt-2.5 mt-1 border-t border-white/10 flex items-center justify-between gap-2">
                                <span className="font-medium text-white">Saldo a Pagar</span>
                                <span className="font-bold text-cyber-gold tabular-nums">
                                    {formatCurrency(report.saldoRemanescenteComissao)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
