import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight,
    ChevronRight,
    CreditCard,
    DollarSign,
    FileText,
    Receipt,
    Search,
    TrendingUp,
    Users,
    Wallet,
    type LucideIcon,
} from 'lucide-react';
import { usePermission } from '../hooks/usePermission';
import { Feature } from '../types/features';
import {
    filterRelatoriosCatalog,
    type RelatorioCatalogItem,
    type RelatorioCategoria,
    type RelatorioCategoriaFilter,
} from '../utils/relatoriosHubUtils';

interface ReportDefinition extends RelatorioCatalogItem {
    icon: LucideIcon;
    feature: Feature;
}

const REPORT_GROUPS: Array<{ key: RelatorioCategoria; label: string }> = [
    { key: 'GERENCIAL', label: 'Resultados & Desempenho (Gerencial)' },
    { key: 'FISCAL', label: 'Fiscal & Tributário' },
    { key: 'CAIXA', label: 'Caixa & Obrigações Financeiras' },
];

const CATEGORY_TABS: Array<{ id: RelatorioCategoriaFilter; label: string }> = [
    { id: 'ALL', label: 'Todos' },
    { id: 'GERENCIAL', label: 'Gerencial' },
    { id: 'FISCAL', label: 'Fiscal' },
    { id: 'CAIXA', label: 'Caixa & Financeiro' },
];

const ALL_REPORTS: ReportDefinition[] = [
    {
        id: 'financeiro',
        category: 'GERENCIAL',
        title: 'DRE Mensal',
        description: 'Faturamento bruto, despesas por categoria, impostos, comissões e lucro líquido do mês.',
        keywords: ['dre', 'financeiro', 'lucro', 'despesas', 'mensal'],
        icon: DollarSign,
        path: '/relatorio/financeiro',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
        hasPdf: true,
    },
    {
        id: 'anual',
        category: 'GERENCIAL',
        title: 'Visão Anual (YoY)',
        description: 'Evolução dos 12 meses e comparativo ano contra ano de faturamento e resultados.',
        keywords: ['anual', 'yoy', 'dre', 'crescimento', 'comparativo'],
        icon: TrendingUp,
        path: '/relatorio/anual',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
        hasPdf: true,
    },
    {
        id: 'ranking',
        category: 'GERENCIAL',
        title: 'Ranking de Clientes (Curva ABC)',
        description: 'Top clientes por faturamento e volume de ordens de serviço no mês ou ano.',
        keywords: ['ranking', 'clientes', 'abc', 'curva', 'top'],
        icon: Users,
        path: '/relatorio/ranking',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
    },
    {
        id: 'receita-caixa',
        category: 'FISCAL',
        title: 'Receita por Caixa',
        description: 'Recebimentos efetivados no período — base para apuração do Simples Nacional.',
        keywords: ['caixa', 'fiscal', 'simples', 'receita', 'faturamento'],
        icon: Receipt,
        path: '/relatorio/receita-caixa',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
    },
    {
        id: 'imposto-pago',
        category: 'FISCAL',
        title: 'Pagamento de DAS (Impostos)',
        description: 'Registro e acompanhamento de guias de impostos pagos (não afeta o DRE).',
        keywords: ['das', 'imposto', 'tributo', 'guia', 'fiscal'],
        icon: FileText,
        path: '/financeiro/imposto-pago',
        feature: Feature.ADMIN_CONFIG,
    },
    {
        id: 'fluxo-caixa',
        category: 'CAIXA',
        title: 'Fluxo de Caixa Mensal',
        description: 'Entradas, saídas e saldo do mês com saldo inicial acumulado.',
        keywords: ['fluxo', 'caixa', 'entradas', 'saidas', 'saldo'],
        icon: TrendingUp,
        path: '/financeiro/fluxo-caixa',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
        hasPdf: true,
    },
    {
        id: 'contas-pagar',
        category: 'CAIXA',
        title: 'Contas a Pagar',
        description: 'Acompanhamento de obrigações pagas, pendentes e vencidas no período.',
        keywords: ['contas', 'pagar', 'vencidas', 'despesas', 'obrigacoes'],
        icon: CreditCard,
        path: '/financeiro/contas-pagar',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
    },
    {
        id: 'faturas-cartao',
        category: 'CAIXA',
        title: 'Faturas de Cartão Corporativo',
        description: 'Faturas consolidadas de cartões corporativos por mês de fechamento.',
        keywords: ['fatura', 'cartao', 'credito', 'corporativo'],
        icon: CreditCard,
        path: '/financeiro/faturas',
        feature: Feature.RELATORIO_FINANCEIRO_VIEW,
    },
    {
        id: 'distribuicao-lucros',
        category: 'CAIXA',
        title: 'Distribuição de Lucros',
        description: 'Histórico e comprovantes de retiradas de lucro mensal e acumulado.',
        keywords: ['lucro', 'distribuicao', 'retirada', 'socios'],
        icon: Wallet,
        path: '/financeiro/distribuicao-lucros',
        feature: Feature.ADMIN_CONFIG,
    },
];

export const RelatoriosHubPage: React.FC = () => {
    const { hasFeature } = usePermission();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<RelatorioCategoriaFilter>('ALL');

    const permittedReports = useMemo(
        () => ALL_REPORTS.filter((report) => hasFeature(report.feature)),
        [hasFeature]
    );

    const filteredReports = useMemo(
        () => filterRelatoriosCatalog(permittedReports, searchTerm, categoryFilter),
        [permittedReports, searchTerm, categoryFilter]
    );

    const canViewDre = hasFeature(Feature.RELATORIO_FINANCEIRO_VIEW);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-24">
            {/* Header */}
            <header className="pb-5 border-b border-white/10">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Central de Relatórios
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Análises gerenciais, apuração fiscal e controle de caixa organizados por área.
                </p>
            </header>

            {/* Featured DRE Hero */}
            {canViewDre && (
                <section className="rounded-2xl bg-gradient-to-br from-cyber-gold/15 via-zinc-900/90 to-zinc-900/95 border border-cyber-gold/35 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-cyber-gold text-black flex items-center justify-center shrink-0 shadow-lg shadow-cyber-gold/20">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-cyber-gold">
                                Relatório Principal
                            </span>
                            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                                DRE Mensal Consolidado
                            </h2>
                            <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                                Visão completa de faturamento bruto, despesas por categoria, impostos, comissões e resultado líquido com exportação em PDF.
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/relatorio/financeiro"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 shrink-0 whitespace-nowrap"
                    >
                        <span>Abrir DRE Mensal</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </section>
            )}

            {/* Search & Category Filter */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar relatório (ex: DRE, caixa, DAS, ranking, cartão)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl bg-zinc-900/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors"
                    />
                </div>

                <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900/80 border border-white/10 gap-1 overflow-x-auto max-w-full self-start sm:self-auto">
                    {CATEGORY_TABS.map((tab) => {
                        const active = categoryFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setCategoryFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                    active
                                        ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                        : 'text-zinc-400 hover:text-white border border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Grouped Catalog */}
            {filteredReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-14 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-3">
                        <FileText className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">
                        Nenhum relatório encontrado para esta busca
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Tente outro termo ou selecione a aba Todos.
                    </p>
                </div>
            ) : (
                <div className="space-y-8">
                    {REPORT_GROUPS.map((group) => {
                        const items = filteredReports.filter((r) => r.category === group.key);
                        if (items.length === 0) return null;

                        return (
                            <section key={group.key} className="space-y-3">
                                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                                    {group.label}
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {items.map((report) => {
                                        const Icon = report.icon;
                                        return (
                                            <Link
                                                key={report.id}
                                                to={report.path}
                                                className="group rounded-2xl bg-zinc-900/75 border border-white/10 hover:border-cyber-gold/40 p-5 flex flex-col justify-between gap-4 transition-all min-w-0 overflow-hidden"
                                            >
                                                <div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/20 text-cyber-gold flex items-center justify-center shrink-0">
                                                            <Icon className="w-5 h-5" />
                                                        </div>
                                                        {report.hasPdf && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 border border-white/10 text-zinc-300">
                                                                PDF
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-base font-semibold text-white mt-4 group-hover:text-cyber-gold transition-colors">
                                                        {report.title}
                                                    </h3>
                                                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                                        {report.description}
                                                    </p>
                                                </div>

                                                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-cyber-gold">
                                                    <span>Abrir relatório</span>
                                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
