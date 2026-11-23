import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileDown,
    Info,
    Loader2,
    Receipt,
    RefreshCw,
    Search,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { empresaService } from '../../services/empresaService';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { MESES_EXTENSO } from '../../utils/dreUtils';
import {
    agruparRecebimentosPorMeio,
    calcularEstimativaDas,
    calcularTicketMedio,
    filterRecebimentosCaixa,
    formatMeioPagamentoLabel,
    type ReceitaCaixaItem,
} from '../../utils/receitaCaixaUtils';

interface ReceitaCaixaReportDTO {
    ano: number;
    mes: number;
    recebimentos: ReceitaCaixaItem[];
    totalRecebido: number;
    quantidadeRecebimentos: number;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR');

export const ReceitaCaixaPage: React.FC = () => {
    const today = new Date();
    const [ano, setAno] = useState(today.getFullYear());
    const [mes, setMes] = useState(today.getMonth() + 1);
    const [searchTerm, setSearchTerm] = useState('');
    const [meioFilter, setMeioFilter] = useState<string>('ALL');
    const [copiedBase, setCopiedBase] = useState(false);

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        financeiroService.getApiBaseUrl()
    );
    const isDownloadingPdf = pdfState.status === 'downloading' || pdfState.status === 'queued';

    const { data, isLoading, error, refetch } = useQuery<ReceitaCaixaReportDTO>({
        queryKey: ['receita-caixa', ano, mes],
        queryFn: () => financeiroService.getReceitasCaixa(mes, ano),
        staleTime: 30_000,
    });

    const { data: empresaConfig } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const handlePreviousMonth = () => {
        setMeioFilter('ALL');
        if (mes === 1) {
            setMes(12);
            setAno((prev) => prev - 1);
        } else {
            setMes((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        setMeioFilter('ALL');
        if (mes === 12) {
            setMes(1);
            setAno((prev) => prev + 1);
        } else {
            setMes((prev) => prev + 1);
        }
    };

    const handleExportPdf = () => {
        if (isDownloadingPdf) return;
        const mesStr = String(mes).padStart(2, '0');
        startPdfDownload(
            financeiroService.getReceitaCaixaPdfPath(mes, ano),
            `receita-caixa-${ano}-${mesStr}.pdf`
        );
    };

    const handleCopyBase = async () => {
        if (!data) return;
        try {
            await navigator.clipboard.writeText(data.totalRecebido.toFixed(2).replace('.', ','));
            setCopiedBase(true);
            setTimeout(() => setCopiedBase(false), 2000);
        } catch {
            // Ignora se clipboard não estiver disponível
        }
    };

    const resumoMeios = useMemo(
        () => agruparRecebimentosPorMeio(data?.recebimentos),
        [data?.recebimentos]
    );

    const filteredRecebimentos = useMemo(
        () => filterRecebimentosCaixa(data?.recebimentos, searchTerm, meioFilter),
        [data?.recebimentos, searchTerm, meioFilter]
    );

    const ticketMedio = useMemo(
        () => calcularTicketMedio(data?.totalRecebido ?? 0, data?.quantidadeRecebimentos ?? 0),
        [data?.totalRecebido, data?.quantidadeRecebimentos]
    );

    const aliquotaDecimal = empresaConfig?.aliquotaImposto ?? 0.06;
    const estimativaDas = useMemo(
        () => calcularEstimativaDas(data?.totalRecebido ?? 0, aliquotaDecimal),
        [data?.totalRecebido, aliquotaDecimal]
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
                    <span className="text-zinc-200 font-medium">Receita por Caixa</span>
                </div>

                {/* Header */}
                <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Receita por Caixa (Base DAS)
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Recebimentos efetivados no mês para conferência de caixa e apuração do Simples Nacional.
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
                            onClick={handleExportPdf}
                            disabled={isDownloadingPdf}
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
                                    <span>Exportar PDF (DAS)</span>
                                </>
                            )}
                        </button>
                    </div>
                </header>

                {isLoading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-28 rounded-2xl bg-zinc-900/75 border border-white/10" />
                            ))}
                        </div>
                        <div className="h-64 rounded-2xl bg-zinc-900/75 border border-white/10" />
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-red-200 text-sm">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                            <span>Não foi possível carregar os recebimentos deste período.</span>
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
                ) : data ? (
                    <>
                        {/* 3 KPIs */}
                        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-2xl bg-gradient-to-b from-emerald-950/30 to-zinc-900/80 border border-emerald-500/35 p-5 min-w-0 overflow-hidden">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                                        Total Recebido (Base DAS)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyBase}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold transition-colors shrink-0"
                                    >
                                        {copiedBase ? (
                                            <>
                                                <Check className="w-3 h-3" />
                                                <span>Copiado</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                <span>Copiar</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2 tabular-nums truncate">
                                    {formatCurrency(data.totalRecebido)}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    Regime de caixa — {periodoLabel}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Recebimentos &amp; Ticket Médio
                                </span>
                                <p className="text-2xl sm:text-3xl font-bold text-white mt-2 tabular-nums">
                                    {data.quantidadeRecebimentos}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1 truncate">
                                    Ticket médio: {formatCurrency(ticketMedio)}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Estimativa DAS ({(aliquotaDecimal * 100).toFixed(2)}%)
                                </span>
                                <p className="text-2xl sm:text-3xl font-bold text-cyber-gold mt-2 tabular-nums truncate">
                                    {formatCurrency(estimativaDas)}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Referência pela alíquota configurada em Tributação
                                </p>
                            </div>
                        </section>

                        {/* Breakdown by Payment Method */}
                        {resumoMeios.length > 0 && (
                            <section className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 sm:p-5 space-y-3">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block">
                                    Resumo por Meio de Pagamento (clique para filtrar)
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMeioFilter('ALL')}
                                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                            meioFilter === 'ALL'
                                                ? 'border-cyber-gold bg-cyber-gold/15 text-cyber-gold'
                                                : 'border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/25'
                                        }`}
                                    >
                                        <span>Todos</span>
                                        <span className="tabular-nums">{formatCurrency(data.totalRecebido)}</span>
                                    </button>

                                    {resumoMeios.map((item) => {
                                        const active = meioFilter === item.meio;
                                        return (
                                            <button
                                                key={item.meio}
                                                type="button"
                                                onClick={() => setMeioFilter(item.meio)}
                                                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                                                    active
                                                        ? 'border-cyber-gold bg-cyber-gold/15 text-cyber-gold'
                                                        : 'border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/25'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                                <span className="tabular-nums">{formatCurrency(item.total)}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Info Banner */}
                        <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 px-4 py-3 flex items-start gap-3 text-xs text-sky-200">
                            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                            <p>
                                <strong>Base para o DAS:</strong> este relatório lista exclusivamente valores efetivamente recebidos no mês (regime de caixa). Confirme a alíquota efetiva com seu contador.
                            </p>
                        </div>

                        {/* List / Table */}
                        <section className="rounded-2xl bg-zinc-900/75 border border-white/10 overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-cyber-gold shrink-0" />
                                    <span>Recebimentos do Período ({filteredRecebimentos.length})</span>
                                </h2>

                                <div className="relative w-full sm:w-72">
                                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por cliente ou origem..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full rounded-xl bg-zinc-950/90 border border-white/10 pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none"
                                    />
                                </div>
                            </div>

                            {filteredRecebimentos.length === 0 ? (
                                <div className="py-12 px-4 text-center text-sm text-zinc-500">
                                    Nenhum recebimento encontrado para este período/filtro.
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-white/10 bg-black/30 text-[11px] uppercase tracking-wider text-zinc-400">
                                                    <th className="text-left px-5 py-3 font-semibold">Data</th>
                                                    <th className="text-left px-5 py-3 font-semibold">Origem</th>
                                                    <th className="text-left px-5 py-3 font-semibold">Cliente</th>
                                                    <th className="text-left px-5 py-3 font-semibold">Meio</th>
                                                    <th className="text-right px-5 py-3 font-semibold">Valor</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredRecebimentos.map((r, idx) => (
                                                    <tr
                                                        key={`${r.dataRecebimento}-${r.origem}-${idx}`}
                                                        className="hover:bg-white/[0.02] transition-colors"
                                                    >
                                                        <td className="px-5 py-3.5 text-cyber-gold font-medium tabular-nums whitespace-nowrap">
                                                            {formatDate(r.dataRecebimento)}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-zinc-200">{r.origem}</td>
                                                        <td className="px-5 py-3.5 text-zinc-300">{r.cliente || '—'}</td>
                                                        <td className="px-5 py-3.5 text-zinc-400">
                                                            {formatMeioPagamentoLabel(r.meioPagamento)}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                                                            {formatCurrency(r.valor)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden divide-y divide-white/5">
                                        {filteredRecebimentos.map((r, idx) => (
                                            <div
                                                key={`${r.dataRecebimento}-${r.origem}-${idx}`}
                                                className="p-4 flex items-start justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-white truncate">
                                                        {r.cliente || r.origem}
                                                    </p>
                                                    <p className="text-xs text-zinc-400 mt-0.5">
                                                        {r.origem} • {formatDate(r.dataRecebimento)}
                                                    </p>
                                                    <p className="text-[11px] text-zinc-500 mt-0.5">
                                                        {formatMeioPagamentoLabel(r.meioPagamento)}
                                                    </p>
                                                </div>
                                                <span className="text-sm font-bold text-emerald-400 tabular-nums shrink-0">
                                                    {formatCurrency(r.valor)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>
                    </>
                ) : null}
            </div>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </>
    );
};

export default ReceitaCaixaPage;
