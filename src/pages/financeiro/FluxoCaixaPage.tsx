import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Loader2,
    RefreshCw,
    Search,
    TrendingDown,
    TrendingUp,
    Wallet,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { MESES_EXTENSO } from '../../utils/dreUtils';
import {
    buildExtratoFluxoCaixa,
    calcularProporcaoFluxo,
    filterExtratoFluxoCaixa,
    type FluxoTipoFilter,
} from '../../utils/fluxoCaixaUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateStr: string) =>
    dateStr ? new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR') : '—';

const FluxoCaixaPage = () => {
    const today = new Date();
    const [mes, setMes] = useState(today.getMonth() + 1);
    const [ano, setAno] = useState(today.getFullYear());
    const [typeFilter, setTypeFilter] = useState<FluxoTipoFilter>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        financeiroService.getApiBaseUrl()
    );
    const isDownloadingPdf = pdfState.status === 'downloading' || pdfState.status === 'queued';

    const { data: dados, isLoading, isError, refetch } = useQuery({
        queryKey: ['fluxo-caixa-detalhado', mes, ano],
        queryFn: () => financeiroService.getFluxoCaixaDetalhado(mes, ano),
        staleTime: 30_000,
    });

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

    const handleExport = () => {
        if (isDownloadingPdf) return;
        const mesStr = String(mes).padStart(2, '0');
        startPdfDownload(
            financeiroService.getFluxoCaixaPdfPath(mes, ano),
            `fluxo-caixa-${ano}-${mesStr}.pdf`
        );
    };

    const extrato = useMemo(
        () => buildExtratoFluxoCaixa(dados?.entradas, dados?.saidas),
        [dados?.entradas, dados?.saidas]
    );

    const filteredExtrato = useMemo(
        () => filterExtratoFluxoCaixa(extrato, typeFilter, searchTerm),
        [extrato, typeFilter, searchTerm]
    );

    const proporcao = useMemo(
        () => calcularProporcaoFluxo(dados?.totalEntradas ?? 0, dados?.totalSaidas ?? 0),
        [dados?.totalEntradas, dados?.totalSaidas]
    );

    const periodoLabel = `${MESES_EXTENSO[mes - 1]} ${ano}`;

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-24">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Link
                        to="/relatorio"
                        className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyber-gold transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Relatórios</span>
                    </Link>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-200 font-medium">Fluxo de Caixa</span>
                </div>

                {/* Header */}
                <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Fluxo de Caixa Mensal
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Saldo anterior, entradas, saídas, resultado do período e extrato completo de movimentações.
                        </p>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                        <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-xl p-1 flex-1 sm:flex-initial justify-between">
                            <button
                                type="button"
                                onClick={handlePreviousMonth}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-2 px-3 min-w-[144px] justify-center">
                                <Calendar className="w-3.5 h-3.5 text-cyber-gold shrink-0" />
                                <span className="text-sm font-semibold text-white whitespace-nowrap">
                                    {periodoLabel}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Próximo mês"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={isDownloadingPdf || isLoading}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 flex-1 sm:flex-initial whitespace-nowrap"
                        >
                            {isDownloadingPdf ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Gerando PDF...</span>
                                </>
                            ) : (
                                <>
                                    <FileDown className="w-4 h-4" />
                                    <span>Exportar PDF</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-24 rounded-2xl bg-zinc-900/75 border border-white/10" />
                            ))}
                        </div>
                        <div className="h-64 rounded-2xl bg-zinc-900/75 border border-white/10" />
                    </div>
                ) : isError ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-red-200 text-sm">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span>Não foi possível carregar o fluxo de caixa deste período.</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Tentar novamente</span>
                        </button>
                    </div>
                ) : dados ? (
                    <>
                        {/* 5 KPIs */}
                        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                    Saldo Anterior
                                </span>
                                <p className="text-xl font-bold text-zinc-100 mt-2 tabular-nums truncate">
                                    {formatCurrency(dados.saldoInicial)}
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-1">Acumulado anterior</p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                                        (+) Entradas
                                    </span>
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                </div>
                                <p className="text-xl font-bold text-emerald-400 mt-2 tabular-nums truncate">
                                    {formatCurrency(dados.totalEntradas)}
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-1">
                                    {dados.entradas?.length || 0} recebimentos
                                </p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-400">
                                        (-) Saídas
                                    </span>
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                </div>
                                <p className="text-xl font-bold text-rose-400 mt-2 tabular-nums truncate">
                                    {formatCurrency(dados.totalSaidas)}
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-1">
                                    {dados.saidas?.length || 0} pagamentos
                                </p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-400">
                                    (=) Resultado Mês
                                </span>
                                <p
                                    className={`text-xl font-bold mt-2 tabular-nums truncate ${
                                        dados.resultadoPeriodo < 0 ? 'text-red-400' : 'text-sky-400'
                                    }`}
                                >
                                    {formatCurrency(dados.resultadoPeriodo)}
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-1">Entradas menos saídas</p>
                            </div>

                            <div
                                className={`col-span-2 lg:col-span-1 rounded-2xl p-4 min-w-0 overflow-hidden border ${
                                    dados.saldoFinal < 0
                                        ? 'bg-red-950/30 border-red-500/35'
                                        : 'bg-gradient-to-b from-cyber-gold/15 to-zinc-900/80 border-cyber-gold/35'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <span
                                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                                            dados.saldoFinal < 0 ? 'text-red-300' : 'text-cyber-gold'
                                        }`}
                                    >
                                        (=) Saldo Final
                                    </span>
                                    <Wallet
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                            dados.saldoFinal < 0 ? 'text-red-400' : 'text-cyber-gold'
                                        }`}
                                    />
                                </div>
                                <p
                                    className={`text-xl font-bold mt-2 tabular-nums truncate ${
                                        dados.saldoFinal < 0 ? 'text-red-400' : 'text-cyber-gold'
                                    }`}
                                >
                                    {formatCurrency(dados.saldoFinal)}
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-1">Saldo ao fim do mês</p>
                            </div>
                        </section>

                        {/* Visual Ratio Bar */}
                        <section className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="font-semibold text-white">
                                    Proporção Entradas vs. Saídas no Mês
                                </span>
                                <span className="text-zinc-400 tabular-nums">
                                    Entradas {proporcao.entradasPct.toFixed(1)}% • Saídas{' '}
                                    {proporcao.saidasPct.toFixed(1)}%
                                </span>
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden flex mt-3">
                                {proporcao.entradasPct > 0 && (
                                    <div
                                        className="h-full bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${proporcao.entradasPct}%` }}
                                    />
                                )}
                                {proporcao.saidasPct > 0 && (
                                    <div
                                        className="h-full bg-rose-500 transition-all duration-500"
                                        style={{ width: `${proporcao.saidasPct}%` }}
                                    />
                                )}
                            </div>
                        </section>

                        {/* Extract List */}
                        <section className="rounded-2xl bg-zinc-900/75 border border-white/10 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="text-base font-bold text-white">
                                        Extrato de Movimentações ({filteredExtrato.length})
                                    </h2>

                                    <div className="inline-flex items-center p-1 rounded-xl bg-zinc-950/90 border border-white/10 gap-1">
                                        {(
                                            [
                                                { id: 'ALL', label: 'Todas' },
                                                { id: 'ENTRADA', label: 'Entradas' },
                                                { id: 'SAIDA', label: 'Saídas' },
                                            ] as const
                                        ).map((tab) => {
                                            const active = typeFilter === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setTypeFilter(tab.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                                </div>

                                <div className="relative w-full lg:w-72">
                                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar descrição ou categoria..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full rounded-xl bg-zinc-950/90 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none"
                                    />
                                </div>
                            </div>

                            {filteredExtrato.length === 0 ? (
                                <div className="py-12 px-4 text-center text-sm text-zinc-500">
                                    Nenhuma movimentação encontrada para este período/filtro.
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {filteredExtrato.map((mov, idx) => {
                                        const isEntrada = mov.tipo === 'ENTRADA';
                                        return (
                                            <div
                                                key={`${mov.tipo}-${mov.data}-${mov.descricao}-${idx}`}
                                                className="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span
                                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                isEntrada
                                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                                    : 'bg-rose-500/15 text-rose-400'
                                                            }`}
                                                        >
                                                            {isEntrada ? 'Entrada' : 'Saída'}
                                                        </span>
                                                        <span className="text-sm font-semibold text-white truncate">
                                                            {mov.descricao}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-zinc-400 mt-1">
                                                        {formatDate(mov.data)} • {mov.categoria || 'Geral'}
                                                    </p>
                                                </div>

                                                <span
                                                    className={`text-sm sm:text-base font-bold tabular-nums whitespace-nowrap shrink-0 ${
                                                        isEntrada ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}
                                                >
                                                    {isEntrada ? '+ ' : '- '}
                                                    {formatCurrency(mov.valor)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </>
                ) : null}
            </div>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </>
    );
};

export default FluxoCaixaPage;
