import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
    AlertTriangle,
    Wallet,
    TrendingUp,
    TrendingDown,
    BarChart3,
    LayoutDashboard,
    ChevronLeft,
    ChevronRight,
    FileDown,
    DollarSign,
    Activity,
    ArrowRight,
    RefreshCw,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';

const MESES_PT = [
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
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDateBr = (isoDate?: string) => {
    if (!isoDate) return '—';
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString('pt-BR');
};

const isVencida = (isoDate?: string) => {
    if (!isoDate) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(`${isoDate}T12:00:00`);
    venc.setHours(0, 0, 0, 0);
    return venc < hoje;
};

const FinanceiroDashboard: React.FC = () => {
    const hoje = new Date();
    const [mes, setMes] = useState(hoje.getMonth() + 1);
    const [ano, setAno] = useState(hoje.getFullYear());

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        financeiroService.getApiBaseUrl()
    );

    const {
        data: resumo,
        isLoading: isLoadingResumo,
        isError: isErrorResumo,
        refetch: refetchResumo,
    } = useQuery({
        queryKey: ['financeiro', 'resumo'],
        queryFn: financeiroService.getResumo,
        staleTime: 30_000,
    });

    const {
        data: fluxoCaixa,
        isLoading: isLoadingFluxo,
        isError: isErrorFluxo,
        refetch: refetchFluxo,
    } = useQuery({
        queryKey: ['financeiro', 'fluxo-caixa', ano, mes],
        queryFn: () => financeiroService.getFluxoCaixa(mes, ano),
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });

    // Busca paginada (size=5) para evitar carregar centenas de registros só para o Top 5
    const {
        data: pagarPage,
        isLoading: isLoadingPagar,
        refetch: refetchPagar,
    } = useQuery({
        queryKey: ['financeiro', 'dashboard-pagar-top5'],
        queryFn: () => financeiroService.listarContasPagarPaginado({ status: 'PENDENTE', page: 0, size: 5 }),
        staleTime: 30_000,
    });

    const {
        data: receberPage,
        isLoading: isLoadingReceber,
        refetch: refetchReceber,
    } = useQuery({
        queryKey: ['financeiro', 'dashboard-receber-top5'],
        queryFn: () => financeiroService.listarContasReceberPaginado({ status: 'PENDENTE', page: 0, size: 5 }),
        staleTime: 30_000,
    });

    const contasPagar = pagarPage?.content || [];
    const contasReceber = receberPage?.content || [];
    const totalPagarCount = pagarPage?.totalElements || 0;
    const totalReceberCount = receberPage?.totalElements || 0;

    const periodoLabel = `${MESES_PT[mes - 1]} ${ano}`;

    const handlePreviousMonth = () => {
        if (mes === 1) {
            setMes(12);
            setAno((prev) => prev - 1);
        } else {
            setMes((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (mes === 12) {
            setMes(1);
            setAno((prev) => prev + 1);
        } else {
            setMes((prev) => prev + 1);
        }
    };

    const handleRetryAll = () => {
        refetchResumo();
        refetchFluxo();
        refetchPagar();
        refetchReceber();
    };

    if (isErrorResumo && isErrorFluxo) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/35 text-red-400 flex items-center justify-center">
                    <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-white">Erro ao carregar dados financeiros</h2>
                    <p className="text-xs text-gray-400 mt-1">
                        Verifique sua conexão e tente novamente em alguns instantes.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleRetryAll}
                    className="px-4 py-2 rounded-xl bg-cyber-gold text-black font-oxanium font-bold text-xs inline-flex items-center gap-2 hover:bg-yellow-400 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" /> Tentar Novamente
                </button>
            </div>
        );
    }

    const entradas = fluxoCaixa?.entradas || 0;
    const saidas = fluxoCaixa?.saidas || 0;
    const movimentacaoTotal = entradas + saidas;
    const pctEntradas = movimentacaoTotal > 0 ? Math.round((entradas / movimentacaoTotal) * 100) : 50;
    const pctSaidas = movimentacaoTotal > 0 ? 100 - pctEntradas : 50;
    const saldoProjetado = resumo?.saldoProjetado || 0;
    const saldoAnteriorEstimado = (resumo?.saldoAtual || 0) - (fluxoCaixa?.saldo || 0);

    return (
        <div className="space-y-6 pb-20 md:pb-8">
            {/* Cabeçalho */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide truncate">
                            Central Financeira
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Caixa disponível, projeção, fluxo mensal e próximos vencimentos.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center justify-between flex-1 sm:flex-initial bg-black/50 border border-white/10 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            aria-label="Mês anterior"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 text-xs sm:text-sm font-oxanium font-bold text-white text-center min-w-[132px]">
                            {periodoLabel}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <Link
                        to="/financeiro/distribuicao-lucros"
                        className="px-3.5 py-2.5 rounded-xl bg-cyber-gold/15 border border-cyber-gold/40 text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all font-oxanium text-xs font-bold inline-flex items-center gap-1.5 shrink-0"
                    >
                        <DollarSign className="w-4 h-4" />
                        <span className="hidden sm:inline">Distribuição de Lucros</span>
                        <span className="sm:hidden">Lucros</span>
                    </Link>
                </div>
            </header>

            {/* 4 KPIs Executivos */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Caixa Real */}
                <div className="min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#171d2e] to-[#10131d] border border-cyber-gold/40 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold truncate">
                            Caixa Real
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-orbitron font-bold text-cyber-gold tabular-nums">
                            {isLoadingResumo ? '—' : formatCurrency(resumo?.saldoAtual || 0)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">Total disponível em conta</div>
                    </div>
                </div>

                {/* A Receber */}
                <Link
                    to="/financeiro/contas-receber"
                    className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 hover:border-emerald-500/40 p-4 flex flex-col justify-between gap-3 transition-colors"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-400 truncate">
                            A Receber
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                            {isLoadingResumo ? '—' : formatCurrency(resumo?.totalAReceber || 0)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">
                                {resumo?.recebimentosVencendoProximos7Dias || 0} vencem em 7 dias
                            </span>
                        </div>
                    </div>
                </Link>

                {/* A Pagar */}
                <Link
                    to="/financeiro/contas-pagar"
                    className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 hover:border-red-500/40 p-4 flex flex-col justify-between gap-3 transition-colors"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-400 truncate">
                            A Pagar
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0">
                            <TrendingDown className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-lg sm:text-2xl font-mono font-bold text-red-400 tabular-nums">
                            {isLoadingResumo ? '—' : formatCurrency(resumo?.totalAPagar || 0)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                            <span className="truncate">
                                {resumo?.contasVencendoProximos7Dias || 0} vencem em 7 dias
                            </span>
                        </div>
                    </div>
                </Link>

                {/* Saldo Projetado */}
                <div className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-400 truncate">
                            Saldo Projetado
                        </span>
                        <span className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                            <BarChart3 className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div
                            className={`text-lg sm:text-2xl font-mono font-bold tabular-nums ${
                                saldoProjetado >= 0 ? 'text-blue-400' : 'text-red-400'
                            }`}
                        >
                            {isLoadingResumo ? '—' : formatCurrency(saldoProjetado)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">Receber − Pagar</div>
                    </div>
                </div>
            </section>

            {/* Fluxo de Caixa do Mês */}
            <section className="rounded-2xl bg-black/45 border border-white/10 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyber-gold shrink-0" />
                        Fluxo de Caixa
                        <span className="text-cyber-gold font-oxanium text-xs sm:text-sm">· {periodoLabel}</span>
                    </h2>

                    <button
                        type="button"
                        onClick={() =>
                            startPdfDownload(
                                financeiroService.getFluxoCaixaPdfPath(mes, ano),
                                `fluxo-caixa-${ano}-${String(mes).padStart(2, '0')}.pdf`
                            )
                        }
                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-xs font-oxanium font-semibold text-gray-200 hover:border-cyber-gold/50 hover:text-cyber-gold transition-colors inline-flex items-center gap-1.5"
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        Exportar PDF
                    </button>
                </div>

                {isLoadingFluxo && !fluxoCaixa ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : fluxoCaixa ? (
                    <>
                        {/* Barra proporcional Entradas vs Saídas */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Entradas ({pctEntradas}%)</span>
                                <span>Saídas ({pctSaidas}%)</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                                    style={{ width: `${pctEntradas}%` }}
                                />
                                <div
                                    className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500"
                                    style={{ width: `${pctSaidas}%` }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 min-w-0">
                                <div className="text-[10px] font-oxanium uppercase tracking-wider text-gray-500">
                                    Saldo Anterior
                                </div>
                                <div className="text-sm sm:text-base font-mono font-bold text-gray-300 tabular-nums mt-1">
                                    {formatCurrency(saldoAnteriorEstimado)}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">Acumulado passado</div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] border border-emerald-500/20 p-3.5 min-w-0">
                                <div className="text-[10px] font-oxanium uppercase tracking-wider text-emerald-400/80">
                                    (+) Entradas
                                </div>
                                <div className="text-sm sm:text-base font-mono font-bold text-emerald-400 tabular-nums mt-1">
                                    {formatCurrency(fluxoCaixa.entradas)}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">Recebimentos do mês</div>
                            </div>

                            <div className="rounded-xl bg-white/[0.03] border border-red-500/20 p-3.5 min-w-0">
                                <div className="text-[10px] font-oxanium uppercase tracking-wider text-red-400/80">
                                    (-) Saídas
                                </div>
                                <div className="text-sm sm:text-base font-mono font-bold text-red-400 tabular-nums mt-1">
                                    {formatCurrency(fluxoCaixa.saidas)}
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5">Pagamentos do mês</div>
                            </div>

                            <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3.5 min-w-0">
                                <div className="text-[10px] font-oxanium uppercase tracking-wider text-blue-300 font-bold">
                                    (=) Resultado Mês
                                </div>
                                <div
                                    className={`text-sm sm:text-base font-mono font-bold tabular-nums mt-1 ${
                                        fluxoCaixa.saldo >= 0 ? 'text-blue-400' : 'text-red-400'
                                    }`}
                                >
                                    {fluxoCaixa.saldo >= 0 ? '+ ' : ''}
                                    {formatCurrency(fluxoCaixa.saldo)}
                                </div>
                                <div className="text-[10px] text-gray-400 mt-0.5">Geração de caixa</div>
                            </div>
                        </div>
                    </>
                ) : null}
            </section>

            {/* Listas Top 5 (paginadas no servidor) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Próximas a Pagar */}
                <section className="rounded-2xl bg-black/45 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <Wallet className="w-4 h-4 text-red-400 shrink-0" />
                            <h3 className="text-sm font-bold text-white truncate">Próximas a Pagar</h3>
                            {totalPagarCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-red-500/15 text-red-300">
                                    {totalPagarCount}
                                </span>
                            )}
                        </div>
                        <Link
                            to="/financeiro/contas-pagar"
                            className="text-xs font-oxanium font-semibold text-cyber-gold hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                            Ver todas <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {isLoadingPagar ? (
                        <div className="space-y-2.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : contasPagar.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500 font-oxanium">
                            Nenhuma conta pendente a pagar.
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {contasPagar.map((conta) => {
                                const vencida = isVencida(conta.dataVencimento);
                                return (
                                    <div
                                        key={conta.id}
                                        className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3 min-w-0"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-white truncate">{conta.descricao}</p>
                                            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                                                <span className={vencida ? 'text-red-400 font-semibold' : ''}>
                                                    {vencida ? 'Venceu ' : 'Vence '}
                                                    {formatDateBr(conta.dataVencimento)}
                                                </span>
                                            </p>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-red-400 tabular-nums shrink-0">
                                            {formatCurrency(conta.valor)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Próximas a Receber */}
                <section className="rounded-2xl bg-black/45 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                        <div className="flex items-center gap-2 min-w-0">
                            <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                            <h3 className="text-sm font-bold text-white truncate">Próximas a Receber</h3>
                            {totalReceberCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300">
                                    {totalReceberCount}
                                </span>
                            )}
                        </div>
                        <Link
                            to="/financeiro/contas-receber"
                            className="text-xs font-oxanium font-semibold text-cyber-gold hover:underline inline-flex items-center gap-1 shrink-0"
                        >
                            Ver todas <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    {isLoadingReceber ? (
                        <div className="space-y-2.5">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse" />
                            ))}
                        </div>
                    ) : contasReceber.length === 0 ? (
                        <div className="py-8 text-center text-xs text-gray-500 font-oxanium">
                            Nenhuma conta pendente a receber.
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {contasReceber.map((conta) => {
                                const vencida = isVencida(conta.dataVencimento);
                                return (
                                    <div
                                        key={conta.id}
                                        className="py-3 first:pt-1 last:pb-0 flex items-center justify-between gap-3 min-w-0"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-white truncate">
                                                {conta.cliente?.nomeFantasia || conta.descricao}
                                            </p>
                                            <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                                <span className={vencida ? 'text-amber-400 font-semibold' : ''}>
                                                    {vencida ? 'Venceu ' : 'Vence '}
                                                    {formatDateBr(conta.dataVencimento)}
                                                </span>
                                                {conta.ordemServico?.id && (
                                                    <Link
                                                        to={`/os/${conta.ordemServico.id}`}
                                                        className="text-cyber-gold hover:underline font-mono font-semibold"
                                                    >
                                                        OS #{conta.ordemServico.id}
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-sm font-mono font-bold text-emerald-400 tabular-nums shrink-0">
                                            {formatCurrency(conta.saldoRestante ?? conta.valor)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </div>
    );
};

export default FinanceiroDashboard;
