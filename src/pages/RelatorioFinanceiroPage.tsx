import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileDown,
    Loader2,
} from 'lucide-react';
import { RelatorioConsolidado } from '../components/reports/RelatorioConsolidado';
import { ClientRankingWidget } from '../components/relatorios/ClientRankingWidget';
import { PdfQueueModal } from '../components/modals/PdfQueueModal';
import { usePdfDownload } from '../hooks/usePdfDownload';
import { osService } from '../services/osService';
import { MESES_EXTENSO, parsePeriodoParams } from '../utils/dreUtils';

export const RelatorioFinanceiroPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialPeriodo = parsePeriodoParams(
        searchParams.get('ano'),
        searchParams.get('mes')
    );

    const [mes, setMes] = useState(initialPeriodo.mes);
    const [ano, setAno] = useState(initialPeriodo.ano);
    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        osService.getApiBaseUrl()
    );

    const isDownloadingPdf = pdfState.status === 'downloading' || pdfState.status === 'queued';

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

    const handleExportPdf = () => {
        if (isDownloadingPdf) return;
        const mesStr = mes.toString().padStart(2, '0');
        startPdfDownload(
            osService.getRelatorioPdfPath(ano, mes),
            `relatorio-DRE-${ano}-${mesStr}.pdf`
        );
    };

    const periodoLabel = `${MESES_EXTENSO[mes - 1]} ${ano}`;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
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
                <span className="text-zinc-200 font-medium">DRE Mensal</span>
            </div>

            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Demonstração de Resultados (DRE)
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Visão consolidada de faturamento, despesas, impostos, comissões e resultado líquido mensal.
                    </p>
                </div>

                {/* Controls: Period selector + Export PDF */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                    <div className="flex items-center bg-zinc-900/80 border border-white/10 rounded-xl p-1 flex-1 sm:flex-initial justify-between">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                            aria-label="Mês anterior"
                            title="Mês anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-2 px-3 min-w-[148px] justify-center">
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
                            title="Próximo mês"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleExportPdf}
                        disabled={isDownloadingPdf}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed flex-1 sm:flex-initial whitespace-nowrap"
                        title="Exportar DRE em PDF"
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

            {/* Main DRE Content */}
            <RelatorioConsolidado ano={ano} mes={mes} />

            {/* Client Ranking */}
            <section className="pt-2">
                <div className="h-[480px]">
                    <ClientRankingWidget selectedAno={ano} selectedMes={mes} />
                </div>
            </section>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </div>
    );
};
