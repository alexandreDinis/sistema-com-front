import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    BarChart3,
    ChevronRight,
    Download,
    Home,
    Minus,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { relatorioService } from '../services/relatorioService';
import type { MesFaturamentoDTO } from '../types';
import { PdfQueueModal } from '../components/modals/PdfQueueModal';
import { usePdfDownload } from '../hooks/usePdfDownload';
import {
    calcularParticipacaoMes,
    calcularResumoAnual,
    calcularTrimestres,
    filtrarMesesAnual,
    siglaMes,
    type FiltroMesAnual,
} from '../utils/relatorioAnualUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const RelatorioAnualPage: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
    const [filtroMes, setFiltroMes] = useState<FiltroMesAnual>('TODOS');

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        relatorioService.getApiBaseUrl()
    );

    const { data: relatorio, isLoading, isError } = useQuery({
        queryKey: ['relatorio-anual', selectedYear],
        queryFn: () => relatorioService.getRelatorioAnual(selectedYear),
    });

    const yearOptions = useMemo(
        () => Array.from({ length: 6 }, (_, i) => currentYear - i),
        [currentYear]
    );

    const meses = useMemo(
        () => relatorio?.mesesComFaturamento ?? [],
        [relatorio]
    );

    const resumo = useMemo(
        () => (relatorio ? calcularResumoAnual(relatorio) : null),
        [relatorio]
    );

    const trimestres = useMemo(
        () => calcularTrimestres(meses),
        [meses]
    );

    const mesesFiltrados = useMemo(
        () => filtrarMesesAnual(meses, filtroMes),
        [meses, filtroMes]
    );

    const chartData = useMemo(
        () =>
            meses.map((mes: MesFaturamentoDTO) => ({
                mes: siglaMes(mes.nomeMes),
                nomeCompleto: mes.nomeMes,
                atual: mes.faturamento || 0,
                anterior: mes.faturamentoAnoAnterior || 0,
            })),
        [meses]
    );

    const isDownloadingPdf = pdfState.status === 'downloading' || pdfState.status === 'queued';

    const handleDownloadPdf = () => {
        if (isDownloadingPdf) return;
        startPdfDownload(
            relatorioService.getRelatorioAnualPdfPath(selectedYear),
            `relatorio-anual-${selectedYear}.pdf`
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Carregando visão anual...</p>
            </div>
        );
    }

    if (isError || !relatorio || !resumo) {
        return (
            <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8 space-y-6">
                <nav className="flex items-center gap-2 text-xs text-gray-400">
                    <Link to="/" className="hover:text-cyber-gold transition-colors flex items-center gap-1">
                        <Home size={13} />
                        Início
                    </Link>
                    <ChevronRight size={13} className="opacity-40" />
                    <Link to="/relatorio" className="hover:text-cyber-gold transition-colors">
                        Relatórios
                    </Link>
                    <ChevronRight size={13} className="opacity-40" />
                    <span className="text-cyber-gold font-medium">Visão Anual (YoY)</span>
                </nav>

                <div className="bg-red-500/10 border border-red-500/35 p-6 rounded-2xl">
                    <h3 className="text-red-300 font-bold text-base mb-1">Erro ao carregar relatório anual</h3>
                    <p className="text-red-200/80 text-sm">
                        Não foi possível carregar os dados do exercício {selectedYear}. Verifique sua conexão e tente novamente.
                    </p>
                </div>
            </div>
        );
    }

    const crescimento = relatorio.crescimentoPercentualAnual || 0;
    const isGrowth = crescimento > 0;
    const isFlat = crescimento === 0;
    const totalAno = relatorio.faturamentoTotalAno || 0;
    const totalAnoAnterior = relatorio.faturamentoTotalAnoAnterior || 0;

    return (
        <>
            <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8 space-y-6">
                {/* Breadcrumb & Header */}
                <header className="space-y-4">
                    <nav className="flex items-center gap-2 text-xs text-gray-400">
                        <Link to="/" className="hover:text-cyber-gold transition-colors flex items-center gap-1">
                            <Home size={13} />
                            Início
                        </Link>
                        <ChevronRight size={13} className="opacity-40" />
                        <Link to="/relatorio" className="hover:text-cyber-gold transition-colors">
                            Relatórios
                        </Link>
                        <ChevronRight size={13} className="opacity-40" />
                        <span className="text-cyber-gold font-medium">Visão Anual (YoY)</span>
                    </nav>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-9 bg-cyber-gold rounded-full shrink-0" />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                    Visão Anual (YoY)
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                    Evolução mensal, comparativo trimestral e crescimento frente ao ano anterior.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 flex-wrap">
                            <select
                                aria-label="Selecionar ano"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                                className="bg-[#0f1117] border border-white/15 focus:border-cyber-gold text-white text-xs font-bold px-3.5 py-2.5 rounded-lg outline-none cursor-pointer"
                            >
                                {yearOptions.map((year) => (
                                    <option key={year} value={year} className="bg-[#0f1117]">
                                        Exercício {year}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="inline-flex items-center justify-center gap-2 bg-cyber-gold text-black px-4 py-2.5 rounded-lg text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer disabled:opacity-60"
                            >
                                <Download size={15} />
                                {isDownloadingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
                            </button>
                        </div>
                    </div>
                </header>

                {/* 4 KPIs Executivos */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-b from-cyber-gold/10 to-[#0f1117] border border-cyber-gold/30 rounded-xl p-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            Faturamento {selectedYear}
                        </span>
                        <span className="text-xl sm:text-2xl font-extrabold text-cyber-gold tabular-nums mt-1 block">
                            {formatCurrency(totalAno)}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1 block">
                            Média de {formatCurrency(resumo.mediaMensal)}/mês ({resumo.mesesAtivos}{' '}
                            {resumo.mesesAtivos === 1 ? 'mês' : 'meses'})
                        </span>
                    </div>

                    <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            Faturamento {selectedYear - 1}
                        </span>
                        <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums mt-1 block">
                            {formatCurrency(totalAnoAnterior)}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1 block">
                            Base anual de comparação
                        </span>
                    </div>

                    <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            Variação Anual (YoY)
                        </span>
                        <div className="flex items-center gap-1.5 mt-1">
                            {isGrowth ? (
                                <TrendingUp size={20} className="text-emerald-400 shrink-0" />
                            ) : isFlat ? (
                                <Minus size={20} className="text-gray-400 shrink-0" />
                            ) : (
                                <TrendingDown size={20} className="text-red-400 shrink-0" />
                            )}
                            <span
                                className={`text-xl sm:text-2xl font-extrabold tabular-nums ${
                                    isGrowth ? 'text-emerald-400' : isFlat ? 'text-gray-300' : 'text-red-400'
                                }`}
                            >
                                {isGrowth ? '+' : ''}
                                {crescimento.toFixed(1)}%
                            </span>
                        </div>
                        <span className="text-[11px] text-gray-500 mt-1 block tabular-nums">
                            {resumo.diferencaAnual > 0 ? '+' : ''}
                            {formatCurrency(resumo.diferencaAnual)} frente a {selectedYear - 1}
                        </span>
                    </div>

                    <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            Melhor Mês ({selectedYear})
                        </span>
                        <span className="text-xl sm:text-2xl font-extrabold text-white mt-1 block truncate">
                            {resumo.melhorMes ? resumo.melhorMes.nomeMes : 'Sem movimento'}
                        </span>
                        <span className="text-[11px] text-gray-500 mt-1 block tabular-nums">
                            {resumo.melhorMes
                                ? `${formatCurrency(resumo.melhorMes.faturamento)} (${resumo.participacaoMelhorMes.toFixed(1)}% do ano)`
                                : 'Nenhum faturamento lançado'}
                        </span>
                    </div>
                </section>

                {/* Resumo Trimestral Q1 - Q4 */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {trimestres.map((q) => {
                        const pos = q.diferenca > 0;
                        const neg = q.diferenca < 0;
                        return (
                            <div
                                key={q.numero}
                                className="bg-[#0f1117] border border-white/10 rounded-xl p-3.5 sm:p-4"
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        {q.label}
                                    </span>
                                    <span
                                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tabular-nums ${
                                            pos
                                                ? 'bg-emerald-500/15 text-emerald-300'
                                                : neg
                                                    ? 'bg-red-500/15 text-red-300'
                                                    : 'bg-white/5 text-gray-400'
                                        }`}
                                    >
                                        {pos ? '+' : ''}
                                        {q.variacaoPercentual.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="text-base sm:text-lg font-extrabold text-white tabular-nums">
                                    {formatCurrency(q.atual)}
                                </div>
                                <div className="text-[11px] text-gray-500 mt-0.5 tabular-nums">
                                    {selectedYear - 1}: {formatCurrency(q.anterior)}
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* Gráfico Comparativo Mensal */}
                <section className="bg-[#0f1117] border border-white/10 rounded-2xl p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div>
                            <h2 className="text-base font-extrabold text-white">
                                Comparativo Mensal de Faturamento
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {selectedYear} vs {selectedYear - 1} mês a mês
                            </p>
                        </div>

                        <div className="inline-flex bg-[#090b10] border border-white/10 rounded-lg p-1 gap-1 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setChartType('bar')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                                    chartType === 'bar'
                                        ? 'bg-cyber-gold text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <BarChart3 size={14} />
                                Barras
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartType('line')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                                    chartType === 'line'
                                        ? 'bg-cyber-gold text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                <Activity size={14} />
                                Linhas
                            </button>
                        </div>
                    </div>

                    <div className="h-72 sm:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'bar' ? (
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f1117',
                                            border: '1px solid rgba(212, 175, 55, 0.45)',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ color: '#D4AF37', fontWeight: 700, marginBottom: '4px' }}
                                        formatter={(value: number | string | undefined) =>
                                            typeof value === 'number' ? formatCurrency(value) : String(value ?? '—')
                                        }
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                    <Bar
                                        dataKey="anterior"
                                        name={`${selectedYear - 1}`}
                                        fill="rgba(148, 163, 184, 0.4)"
                                        radius={[4, 4, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="atual"
                                        name={`${selectedYear}`}
                                        fill="#D4AF37"
                                        radius={[4, 4, 0, 0]}
                                    />
                                </BarChart>
                            ) : (
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                    <XAxis
                                        dataKey="mes"
                                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0f1117',
                                            border: '1px solid rgba(212, 175, 55, 0.45)',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                        }}
                                        labelStyle={{ color: '#D4AF37', fontWeight: 700, marginBottom: '4px' }}
                                        formatter={(value: number | string | undefined) =>
                                            typeof value === 'number' ? formatCurrency(value) : String(value ?? '—')
                                        }
                                    />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="atual"
                                        name={`${selectedYear}`}
                                        stroke="#D4AF37"
                                        strokeWidth={3}
                                        dot={{ fill: '#D4AF37', r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="anterior"
                                        name={`${selectedYear - 1}`}
                                        stroke="#94A3B8"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={{ fill: '#94A3B8', r: 3 }}
                                    />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Detalhamento Mensal */}
                <section className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-extrabold text-white">Detalhamento Mensal</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Participação no total anual e variação frente a {selectedYear - 1}
                            </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            {(
                                [
                                    { id: 'TODOS', label: `Todos (${meses.length})` },
                                    { id: 'CRESCIMENTO', label: 'Em crescimento' },
                                    { id: 'QUEDA', label: 'Em queda' },
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setFiltroMes(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                        filtroMes === tab.id
                                            ? 'bg-cyber-gold/15 border-cyber-gold/40 text-cyber-gold'
                                            : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/[0.03] border-b border-white/10">
                                <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                                    <th className="py-3 px-5 text-left font-bold">Mês</th>
                                    <th className="py-3 px-4 text-right font-bold">{selectedYear}</th>
                                    <th className="py-3 px-4 text-right font-bold">{selectedYear - 1}</th>
                                    <th className="py-3 px-4 text-right font-bold">Participação</th>
                                    <th className="py-3 px-4 text-right font-bold">Variação (R$)</th>
                                    <th className="py-3 px-5 text-right font-bold">Variação (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {mesesFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                                            Nenhum mês corresponde ao filtro selecionado.
                                        </td>
                                    </tr>
                                ) : (
                                    mesesFiltrados.map((mes: MesFaturamentoDTO) => {
                                        const variacao = mes.variacao || 0;
                                        const variacaoPerc = mes.variacaoPercentual || 0;
                                        const isPos = variacao > 0;
                                        const isNeg = variacao < 0;
                                        const share = calcularParticipacaoMes(mes.faturamento || 0, totalAno);

                                        return (
                                            <tr key={mes.mes} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3.5 px-5 font-bold text-white">{mes.nomeMes}</td>
                                                <td className="py-3.5 px-4 text-right font-bold text-cyber-gold tabular-nums">
                                                    {formatCurrency(mes.faturamento || 0)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right text-gray-400 tabular-nums">
                                                    {formatCurrency(mes.faturamentoAnoAnterior || 0)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-cyber-gold rounded-full"
                                                                style={{ width: `${share}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400 tabular-nums w-11 text-right">
                                                            {share.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td
                                                    className={`py-3.5 px-4 text-right font-semibold tabular-nums ${
                                                        isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-400'
                                                    }`}
                                                >
                                                    {isPos ? '+' : ''}
                                                    {formatCurrency(variacao)}
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                                                            isPos
                                                                ? 'bg-emerald-500/15 text-emerald-300'
                                                                : isNeg
                                                                    ? 'bg-red-500/15 text-red-300'
                                                                    : 'bg-white/5 text-gray-400'
                                                        }`}
                                                    >
                                                        {isPos ? (
                                                            <TrendingUp size={12} />
                                                        ) : isNeg ? (
                                                            <TrendingDown size={12} />
                                                        ) : (
                                                            <Minus size={12} />
                                                        )}
                                                        {isPos ? '+' : ''}
                                                        {variacaoPerc.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            <tfoot className="bg-cyber-gold/[0.06] border-t-2 border-cyber-gold/40 font-extrabold">
                                <tr>
                                    <td className="py-4 px-5 text-white">TOTAL ANUAL</td>
                                    <td className="py-4 px-4 text-right text-cyber-gold tabular-nums text-base">
                                        {formatCurrency(totalAno)}
                                    </td>
                                    <td className="py-4 px-4 text-right text-gray-300 tabular-nums">
                                        {formatCurrency(totalAnoAnterior)}
                                    </td>
                                    <td className="py-4 px-4 text-right text-gray-300 tabular-nums text-xs">100%</td>
                                    <td
                                        className={`py-4 px-4 text-right tabular-nums ${
                                            isGrowth ? 'text-emerald-400' : isFlat ? 'text-gray-300' : 'text-red-400'
                                        }`}
                                    >
                                        {resumo.diferencaAnual > 0 ? '+' : ''}
                                        {formatCurrency(resumo.diferencaAnual)}
                                    </td>
                                    <td className="py-4 px-5 text-right">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold tabular-nums ${
                                                isGrowth
                                                    ? 'bg-emerald-500/15 text-emerald-300'
                                                    : isFlat
                                                        ? 'bg-white/5 text-gray-300'
                                                        : 'bg-red-500/15 text-red-300'
                                            }`}
                                        >
                                            {isGrowth ? '+' : ''}
                                            {crescimento.toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden p-4 space-y-3">
                        {mesesFiltrados.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-6">
                                Nenhum mês corresponde ao filtro selecionado.
                            </p>
                        ) : (
                            mesesFiltrados.map((mes: MesFaturamentoDTO) => {
                                const variacao = mes.variacao || 0;
                                const variacaoPerc = mes.variacaoPercentual || 0;
                                const isPos = variacao > 0;
                                const isNeg = variacao < 0;

                                return (
                                    <div
                                        key={mes.mes}
                                        className="bg-[#151923] border border-white/10 rounded-xl p-3.5 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-sm text-white">{mes.nomeMes}</span>
                                            <span
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                                                    isPos
                                                        ? 'bg-emerald-500/15 text-emerald-300'
                                                        : isNeg
                                                            ? 'bg-red-500/15 text-red-300'
                                                            : 'bg-white/5 text-gray-400'
                                                }`}
                                            >
                                                {isPos ? '+' : ''}
                                                {variacaoPerc.toFixed(1)}%
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-[10px] text-gray-500 block">{selectedYear}</span>
                                                <strong className="text-cyber-gold tabular-nums">
                                                    {formatCurrency(mes.faturamento || 0)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-gray-500 block">
                                                    {selectedYear - 1}
                                                </span>
                                                <strong className="text-gray-300 tabular-nums">
                                                    {formatCurrency(mes.faturamentoAnoAnterior || 0)}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            </div>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </>
    );
};
