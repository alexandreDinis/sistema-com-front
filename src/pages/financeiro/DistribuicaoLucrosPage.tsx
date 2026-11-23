import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    CheckCircle2,
    DollarSign,
    FileDown,
    Info,
    Loader2,
    Plus,
    Wallet,
    X,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import type { ContaPagar } from '../../types';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { ActionModal } from '../../components/modals/ActionModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { MESES_EXTENSO } from '../../utils/dreUtils';
import {
    calcularContasPendentesNoMes,
    calcularRetiradasNoAno,
    calcularRetiradasNoMes,
    calcularSaldoRetiradaMensal,
    filterDistribuicoesByStatus,
    validateRetiradaForm,
    type DistribuicaoStatusFilter,
    type RetiradaCalcBase,
} from '../../utils/distribuicaoLucrosUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR');

export const DistribuicaoLucrosPage: React.FC = () => {
    const queryClient = useQueryClient();
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    const [selectedMes, setSelectedMes] = useState<number>(today.getMonth() + 1);
    const [selectedAno, setSelectedAno] = useState<number>(today.getFullYear());
    const [calcBase, setCalcBase] = useState<RetiradaCalcBase>('CAIXA');
    const [statusFilter, setStatusFilter] = useState<DistribuicaoStatusFilter>('ALL');

    const [showModal, setShowModal] = useState(false);
    const [confirmPay, setConfirmPay] = useState<ContaPagar | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        valor: '',
        dataCompetencia: todayIso,
        dataVencimento: todayIso,
        descricao: '',
    });

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        financeiroService.getApiBaseUrl()
    );
    const isDownloadingPdf = pdfState.status === 'downloading' || pdfState.status === 'queued';

    const { data: distribuicoes, isLoading } = useQuery({
        queryKey: ['distribuicoes-lucro'],
        queryFn: financeiroService.listarDistribuicoesLucro,
        staleTime: 30_000,
    });

    const { data: resumo } = useQuery({
        queryKey: ['resumo-financeiro'],
        queryFn: financeiroService.getResumo,
        staleTime: 30_000,
    });

    const { data: fluxoMes, isLoading: isFluxoLoading } = useQuery({
        queryKey: ['fluxo-caixa', selectedMes, selectedAno],
        queryFn: () => financeiroService.getFluxoCaixa(selectedMes, selectedAno),
        staleTime: 30_000,
    });

    const { data: contasPagar, isLoading: isContasLoading } = useQuery({
        queryKey: ['contas-pagar'],
        queryFn: () => financeiroService.listarContasPagar(),
        staleTime: 30_000,
    });

    const invalidateAllFinancials = () => {
        queryClient.invalidateQueries({ queryKey: ['distribuicoes-lucro'] });
        queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
        queryClient.invalidateQueries({ queryKey: ['resumo-financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
    };

    const createMutation = useMutation({
        mutationFn: financeiroService.criarDistribuicaoLucros,
        onSuccess: () => {
            setFormError(null);
            setActionError(null);
            invalidateAllFinancials();
            setShowModal(false);
            setFormData({
                valor: '',
                dataCompetencia: todayIso,
                dataVencimento: todayIso,
                descricao: '',
            });
        },
        onError: () => {
            setFormError('Não foi possível registrar a retirada. Verifique os dados e tente novamente.');
        },
    });

    const payMutation = useMutation({
        mutationFn: (id: number) =>
            financeiroService.pagarConta(id, {
                dataPagamento: new Date().toISOString().split('T')[0],
                meioPagamento: 'PIX',
            }),
        onSuccess: () => {
            setActionError(null);
            setConfirmPay(null);
            invalidateAllFinancials();
        },
        onError: () => {
            setConfirmPay(null);
            setActionError('Não foi possível confirmar o pagamento desta distribuição. Tente novamente.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (createMutation.isPending) return;

        const err = validateRetiradaForm(formData);
        if (err) {
            setFormError(err);
            return;
        }

        setFormError(null);
        createMutation.mutate({
            valor: Number.parseFloat(formData.valor.replace(',', '.')),
            dataCompetencia: formData.dataCompetencia,
            dataVencimento: formData.dataVencimento,
            descricao: formData.descricao.trim() || undefined,
        });
    };

    const handleExportPdf = () => {
        if (isDownloadingPdf) return;
        const mesStr = String(selectedMes).padStart(2, '0');
        startPdfDownload(
            financeiroService.getDistribuicaoLucrosPdfPath(selectedMes, selectedAno),
            `distribuicao-lucros-${selectedAno}-${mesStr}.pdf`
        );
    };

    const caixaDisponivel = resumo?.saldoAtual ?? 0;
    const dividasPendentesGeral = resumo?.totalAPagar ?? 0;
    const saldoRealLivreGeral = caixaDisponivel - dividasPendentesGeral;

    const pendentesNoMes = useMemo(
        () => calcularContasPendentesNoMes(contasPagar, selectedMes, selectedAno),
        [contasPagar, selectedMes, selectedAno]
    );

    const calculoMensal = useMemo(
        () =>
            calcularSaldoRetiradaMensal({
                base: calcBase,
                entradasMes: fluxoMes?.entradas ?? 0,
                caixaTotal: caixaDisponivel,
                pendentesMes: pendentesNoMes,
            }),
        [calcBase, fluxoMes?.entradas, caixaDisponivel, pendentesNoMes]
    );

    const retiradasNoMes = useMemo(
        () => calcularRetiradasNoMes(distribuicoes, selectedMes, selectedAno),
        [distribuicoes, selectedMes, selectedAno]
    );

    const retiradasNoAno = useMemo(
        () => calcularRetiradasNoAno(distribuicoes, selectedAno),
        [distribuicoes, selectedAno]
    );

    const filteredDistribuicoes = useMemo(
        () => filterDistribuicoesByStatus(distribuicoes, statusFilter),
        [distribuicoes, statusFilter]
    );

    const totalListado = useMemo(
        () => filteredDistribuicoes.reduce((acc, item) => acc + (Number(item.valor) || 0), 0),
        [filteredDistribuicoes]
    );

    const valorDigitado = Number.parseFloat(formData.valor.replace(',', '.')) || 0;
    const excedeSaldoLivre = valorDigitado > 0 && valorDigitado > saldoRealLivreGeral;

    const currentYear = today.getFullYear();
    const availableYears = useMemo(
        () => [currentYear + 1, currentYear, currentYear - 1, currentYear - 2],
        [currentYear]
    );

    const periodoLabel = `${MESES_EXTENSO[selectedMes - 1]}/${selectedAno}`;
    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';

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
                    <span className="text-zinc-200 font-medium">Distribuição de Lucros</span>
                </div>

                {/* Header */}
                <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Distribuição de Lucros
                        </h1>
                        <p className="text-sm text-zinc-400 mt-1">
                            Acompanhe o saldo do mês para retirada, o caixa acumulado e o histórico de distribuições.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Period Selector + Export PDF */}
                        <div className="inline-flex items-center gap-1.5 bg-zinc-900/80 border border-white/10 rounded-xl p-1">
                            <Calendar className="w-3.5 h-3.5 text-cyber-gold ml-2 shrink-0" />
                            <select
                                value={selectedMes}
                                onChange={(e) => setSelectedMes(Number(e.target.value))}
                                className="bg-transparent text-white text-xs font-semibold px-2 py-1.5 outline-none cursor-pointer"
                                aria-label="Selecionar mês"
                            >
                                {MESES_EXTENSO.map((nome, idx) => (
                                    <option key={nome} value={idx + 1} className="bg-zinc-950">
                                        {nome}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={selectedAno}
                                onChange={(e) => setSelectedAno(Number(e.target.value))}
                                className="bg-transparent text-white text-xs font-semibold px-2 py-1.5 outline-none cursor-pointer"
                                aria-label="Selecionar ano"
                            >
                                {availableYears.map((y) => (
                                    <option key={y} value={y} className="bg-zinc-950">
                                        {y}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                disabled={isDownloadingPdf}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                                {isDownloadingPdf ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <FileDown className="w-3.5 h-3.5 text-cyber-gold" />
                                )}
                                <span>PDF</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setFormError(null);
                                setShowModal(true);
                            }}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nova Retirada</span>
                        </button>
                    </div>
                </header>

                {/* Action Error */}
                {actionError && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-300">
                        <div className="flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{actionError}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setActionError(null)}
                            className="font-semibold hover:text-red-200"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {/* Monthly Withdrawal View (Todo o Caixa OR Entradas do Mês vs Contas Pendentes do Mês) */}
                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Saldo para Retirada no Mês (Descontando Apenas Contas que Faltam Pagar no Mês)
                    </h2>

                    <div className="rounded-2xl bg-gradient-to-br from-cyber-gold/10 via-zinc-900/90 to-zinc-900/95 border border-cyber-gold/35 p-5 sm:p-6 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-white">
                                    Resultado para Retirada — {periodoLabel}
                                </h3>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {calcBase === 'CAIXA'
                                        ? 'Considera todo o caixa disponível hoje menos o que ainda falta pagar neste mês (contas já pagas já saíram do caixa).'
                                        : 'Compara apenas o que entrou neste mês menos o que ainda falta pagar neste mês.'}
                                </p>
                            </div>

                            <div
                                className="inline-flex items-center p-1 rounded-xl bg-zinc-950/90 border border-white/10 gap-1 self-start sm:self-auto"
                                role="group"
                                aria-label="Base de cálculo do saldo mensal"
                            >
                                <button
                                    type="button"
                                    onClick={() => setCalcBase('CAIXA')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                        calcBase === 'CAIXA'
                                            ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                            : 'text-zinc-400 hover:text-white border border-transparent'
                                    }`}
                                >
                                    Todo o Caixa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalcBase('MES')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                                        calcBase === 'MES'
                                            ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                            : 'text-zinc-400 hover:text-white border border-transparent'
                                    }`}
                                >
                                    Entradas do Mês
                                </button>
                            </div>
                        </div>

                        {isFluxoLoading || isContasLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-24 rounded-xl bg-black/40 border border-white/5" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-black/45 border border-white/10 p-4 min-w-0 overflow-hidden">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                        {calcBase === 'CAIXA'
                                            ? 'Caixa Disponível Hoje'
                                            : 'Entradas no Mês'}
                                    </span>
                                    <p className="text-2xl font-bold text-sky-400 mt-1.5 tabular-nums truncate">
                                        {formatCurrency(calculoMensal.baseValor)}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        {calcBase === 'CAIXA'
                                            ? 'Saldo disponível em caixa (já descontado o que foi pago)'
                                            : 'Recebimentos efetivados neste mês'}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-black/45 border border-white/10 p-4 min-w-0 overflow-hidden">
                                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                                        Falta Pagar no Mês
                                    </span>
                                    <p className="text-2xl font-bold text-rose-400 mt-1.5 tabular-nums truncate">
                                        {formatCurrency(calculoMensal.pendentesMes)}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 mt-1">
                                        Contas pendentes com vencimento em {periodoLabel}
                                    </p>
                                </div>

                                <div
                                    className={`rounded-xl p-4 min-w-0 overflow-hidden border ${
                                        calculoMensal.saldoCalculado < 0
                                            ? 'bg-red-950/35 border-red-500/35'
                                            : 'bg-emerald-950/30 border-emerald-500/35'
                                    }`}
                                >
                                    <span
                                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                                            calculoMensal.saldoCalculado < 0
                                                ? 'text-red-300'
                                                : 'text-emerald-300'
                                        }`}
                                    >
                                        Disponível para Retirada
                                    </span>
                                    <p
                                        className={`text-2xl font-bold mt-1.5 tabular-nums truncate ${
                                            calculoMensal.saldoCalculado < 0
                                                ? 'text-red-400'
                                                : 'text-emerald-400'
                                        }`}
                                    >
                                        {formatCurrency(calculoMensal.saldoCalculado)}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 mt-1">
                                        {calcBase === 'CAIXA'
                                            ? 'Caixa disponível menos o que falta pagar no mês'
                                            : 'Entradas do mês menos o que falta pagar no mês'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                                <span>
                                    Retiradas em{' '}
                                    <strong className="text-white">{periodoLabel}</strong>:{' '}
                                    <strong className="text-cyber-gold tabular-nums">
                                        {formatCurrency(retiradasNoMes)}
                                    </strong>
                                </span>
                                <span>
                                    Total retirado em{' '}
                                    <strong className="text-white">{selectedAno}</strong>:{' '}
                                    <strong className="text-emerald-400 tabular-nums">
                                        {formatCurrency(retiradasNoAno)}
                                    </strong>
                                </span>
                            </div>
                            <span>
                                Base ativa:{' '}
                                {calcBase === 'CAIXA'
                                    ? 'Todo o Caixa vs. Falta Pagar no Mês'
                                    : 'Entradas do Mês vs. Falta Pagar no Mês'}
                            </span>
                        </div>
                    </div>
                </section>

                {/* General Accumulated View */}
                {resumo && (
                    <section className="space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Visão Geral Acumulada (Inclui Dívidas Futuras)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Caixa Disponível
                                </span>
                                <p className="text-2xl font-bold text-cyber-gold mt-2 tabular-nums truncate">
                                    {formatCurrency(caixaDisponivel)}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Acumulado desde o início das operações
                                </p>
                            </div>

                            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                    Dívidas Pendentes (Geral)
                                </span>
                                <p className="text-2xl font-bold text-rose-400 mt-2 tabular-nums truncate">
                                    {formatCurrency(dividasPendentesGeral)}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Total de contas a pagar em aberto
                                </p>
                            </div>

                            <div
                                className={`rounded-2xl p-5 min-w-0 overflow-hidden border ${
                                    saldoRealLivreGeral < 0
                                        ? 'bg-red-950/30 border-red-500/35'
                                        : 'bg-zinc-900/75 border-emerald-500/30'
                                }`}
                            >
                                <span
                                    className={`text-xs font-semibold uppercase tracking-wider ${
                                        saldoRealLivreGeral < 0
                                            ? 'text-red-300'
                                            : 'text-emerald-300'
                                    }`}
                                >
                                    Saldo Real Livre (Geral)
                                </span>
                                <p
                                    className={`text-2xl font-bold mt-2 tabular-nums truncate ${
                                        saldoRealLivreGeral < 0
                                            ? 'text-red-400'
                                            : 'text-emerald-400'
                                    }`}
                                >
                                    {formatCurrency(saldoRealLivreGeral)}
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Disponível após todas as contas pendentes
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Info Note */}
                <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 px-4 py-3 flex items-start gap-3 text-xs text-sky-200">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p>
                        <strong>Importante:</strong> a distribuição de lucros não afeta o resultado operacional do DRE — trata-se apenas de retirada de caixa pelos sócios.
                    </p>
                </div>

                {/* History Card */}
                <section className="rounded-2xl bg-zinc-900/75 border border-white/10 overflow-hidden">
                    <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-cyber-gold shrink-0" />
                                <span>Histórico de Retiradas</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-0.5">
                                Total listado: {formatCurrency(totalListado)}
                            </p>
                        </div>

                        <div className="inline-flex items-center p-1 rounded-xl bg-zinc-950/90 border border-white/10 gap-1 self-start sm:self-auto">
                            {(
                                [
                                    { id: 'ALL', label: 'Todas' },
                                    { id: 'PENDENTE', label: 'Pendentes' },
                                    { id: 'PAGO', label: 'Pagas' },
                                ] as const
                            ).map((tab) => {
                                const active = statusFilter === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setStatusFilter(tab.id)}
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

                    {isLoading ? (
                        <div className="p-10 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
                            <span>Carregando histórico...</span>
                        </div>
                    ) : filteredDistribuicoes.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {filteredDistribuicoes.map((dist: ContaPagar) => (
                                <div
                                    key={dist.id}
                                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {dist.descricao || 'Distribuição de Lucros'}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            Competência: {formatDate(dist.dataCompetencia)} • Vencimento:{' '}
                                            {formatDate(dist.dataVencimento)}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                        <div className="sm:text-right">
                                            <p className="text-base font-bold text-white tabular-nums">
                                                {formatCurrency(dist.valor)}
                                            </p>
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                    dist.status === 'PAGO'
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : 'bg-amber-500/15 text-amber-300'
                                                }`}
                                            >
                                                {dist.status === 'PAGO' ? 'Pago' : 'Pendente'}
                                            </span>
                                        </div>

                                        {dist.status !== 'PAGO' && (
                                            <button
                                                type="button"
                                                onClick={() => setConfirmPay(dist)}
                                                disabled={payMutation.isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                            >
                                                <DollarSign className="w-3.5 h-3.5" />
                                                <span>Marcar Pago</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-10 text-center text-zinc-500 text-sm">
                            Nenhuma distribuição de lucros encontrada para este filtro.
                        </div>
                    )}
                </section>
            </div>

            {/* New Withdrawal Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Registrar Nova Retirada
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Lance uma distribuição de lucros para controle de caixa.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Valor (R$) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    required
                                    value={formData.valor}
                                    onChange={(e) => {
                                        setFormError(null);
                                        setFormData({ ...formData, valor: e.target.value });
                                    }}
                                    className={inputClass}
                                    placeholder="5000.00"
                                />
                            </div>

                            {excedeSaldoLivre && (
                                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-200">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>
                                        Este valor ultrapassa o Saldo Real Livre Geral ({formatCurrency(saldoRealLivreGeral)}). Confirme se há caixa suficiente para cobrir contas pendentes.
                                    </span>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Descrição (opcional)
                                </label>
                                <input
                                    type="text"
                                    maxLength={150}
                                    value={formData.descricao}
                                    onChange={(e) =>
                                        setFormData({ ...formData, descricao: e.target.value })
                                    }
                                    className={inputClass}
                                    placeholder={`Retirada Sócio — ${periodoLabel}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Data Competência *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dataCompetencia}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                dataCompetencia: e.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Data Vencimento *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.dataVencimento}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                dataVencimento: e.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-300">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black text-sm font-semibold transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60"
                                >
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Registrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Registrar Retirada</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Confirmation Modal */}
            <ActionModal
                isOpen={confirmPay !== null}
                onClose={() => !payMutation.isPending && setConfirmPay(null)}
                onConfirm={() => {
                    if (confirmPay && !payMutation.isPending) {
                        payMutation.mutate(confirmPay.id);
                    }
                }}
                title="Confirmar Pagamento"
                message={`Confirmar pagamento de ${formatCurrency(confirmPay?.valor || 0)} referente a "${confirmPay?.descricao || 'Distribuição de Lucros'}"?\n\nO pagamento será registrado via PIX com a data de hoje.`}
                type="success"
                confirmText={payMutation.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
                cancelText="Cancelar"
            />

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </>
    );
};

export default DistribuicaoLucrosPage;
