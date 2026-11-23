import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Ban,
    CheckCircle2,
    DollarSign,
    FileText,
    Info,
    Loader2,
    Plus,
    Receipt,
    RotateCcw,
    X,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import type { ContaPagar } from '../../types';
import { ActionModal } from '../../components/modals/ActionModal';
import {
    calcularStatsImpostoAnual,
    filterImpostosByYearAndStatus,
    hasDasCompetenciaDuplicada,
    validateDasForm,
    type ImpostoStatusFilter,
} from '../../utils/impostoPagoUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const formatDate = (dateStr: string) =>
    new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR');

export const ImpostoPagoPage: React.FC = () => {
    const queryClient = useQueryClient();
    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
    const currentYear = useMemo(() => new Date().getFullYear(), []);

    const [selectedAno, setSelectedAno] = useState<number>(currentYear);
    const [statusFilter, setStatusFilter] = useState<ImpostoStatusFilter>('ALL');
    const [showModal, setShowModal] = useState(false);
    const [confirmPay, setConfirmPay] = useState<ContaPagar | null>(null);
    const [confirmCancel, setConfirmCancel] = useState<ContaPagar | null>(null);
    const [estornarGuia, setEstornarGuia] = useState<ContaPagar | null>(null);
    const [motivoEstorno, setMotivoEstorno] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        valor: '',
        dataCompetencia: todayIso,
        dataVencimento: todayIso,
        descricao: '',
    });

    const { data: impostos, isLoading, isError, refetch } = useQuery({
        queryKey: ['imposto-pago'],
        queryFn: financeiroService.listarImpostosPagos,
        staleTime: 30_000,
    });

    const invalidateFinancials = () => {
        queryClient.invalidateQueries({ queryKey: ['imposto-pago'] });
        queryClient.invalidateQueries({ queryKey: ['contas-pagar'] });
        queryClient.invalidateQueries({ queryKey: ['resumo-financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['fluxo-caixa'] });
    };

    const createMutation = useMutation({
        mutationFn: financeiroService.criarImpostoPago,
        onSuccess: () => {
            setFormError(null);
            setActionError(null);
            invalidateFinancials();
            setShowModal(false);
            setFormData({
                valor: '',
                dataCompetencia: todayIso,
                dataVencimento: todayIso,
                descricao: '',
            });
        },
        onError: () => {
            setFormError('Não foi possível registrar o DAS. Verifique os dados e tente novamente.');
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
            invalidateFinancials();
        },
        onError: () => {
            setConfirmPay(null);
            setActionError('Não foi possível confirmar o pagamento desta guia. Tente novamente.');
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: number) => financeiroService.cancelarImpostoPago(id),
        onSuccess: () => {
            setActionError(null);
            setConfirmCancel(null);
            invalidateFinancials();
        },
        onError: () => {
            setConfirmCancel(null);
            setActionError('Não foi possível cancelar esta guia de DAS. Tente novamente.');
        },
    });

    const estornarMutation = useMutation({
        mutationFn: ({ id, motivo }: { id: number; motivo: string }) =>
            financeiroService.estornarContaPagar(id, {
                motivo,
                reabrirConta: false,
            }),
        onSuccess: () => {
            setActionError(null);
            setEstornarGuia(null);
            setMotivoEstorno('');
            invalidateFinancials();
        },
        onError: () => {
            setActionError('Não foi possível estornar esta guia paga. Tente novamente.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (createMutation.isPending) return;

        const err = validateDasForm(formData);
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

    const stats = useMemo(
        () => calcularStatsImpostoAnual(impostos, selectedAno),
        [impostos, selectedAno]
    );

    const filteredImpostos = useMemo(
        () => filterImpostosByYearAndStatus(impostos, selectedAno, statusFilter),
        [impostos, selectedAno, statusFilter]
    );

    const isDuplicada = useMemo(
        () => hasDasCompetenciaDuplicada(impostos, formData.dataCompetencia),
        [impostos, formData.dataCompetencia]
    );

    const availableYears = useMemo(
        () => [currentYear + 1, currentYear, currentYear - 1, currentYear - 2],
        [currentYear]
    );

    const competenciaMesLabel =
        formData.dataCompetencia.length >= 7
            ? `${formData.dataCompetencia.slice(5, 7)}/${formData.dataCompetencia.slice(0, 4)}`
            : formData.dataCompetencia;

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';

    return (
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
                <span className="text-zinc-200 font-medium">Pagamento de DAS</span>
            </div>

            {/* Header */}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Pagamento de DAS (Impostos)
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Controle anual de guias do Simples Nacional registradas como saída de caixa.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        to="/relatorio/receita-caixa"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors whitespace-nowrap"
                    >
                        <FileText className="w-4 h-4 text-cyber-gold" />
                        <span>Ver Base DAS (Receita Caixa)</span>
                    </Link>

                    <button
                        type="button"
                        onClick={() => {
                            setFormError(null);
                            setShowModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Registrar DAS</span>
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

            {/* 4 KPIs (incluindo Total Anual) */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="rounded-2xl bg-gradient-to-b from-cyber-gold/10 to-zinc-900/80 border border-cyber-gold/30 p-5 min-w-0 overflow-hidden">
                    <span className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                        Total Anual ({selectedAno})
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold text-white mt-2 tabular-nums truncate">
                        {formatCurrency(stats.totalAnual)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                        {stats.totalGuiasAno}{' '}
                        {stats.totalGuiasAno === 1 ? 'guia lançada no ano' : 'guias lançadas no ano'}
                    </p>
                </div>

                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Total Pago ({selectedAno})
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold text-emerald-400 mt-2 tabular-nums truncate">
                        {formatCurrency(stats.totalPago)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        {stats.qtdPago} {stats.qtdPago === 1 ? 'guia quitada' : 'guias quitadas'}
                    </p>
                </div>

                <div
                    className={`rounded-2xl p-5 min-w-0 overflow-hidden border ${
                        stats.totalPendente > 0
                            ? 'bg-amber-950/25 border-amber-500/35'
                            : 'bg-zinc-900/75 border-white/10'
                    }`}
                >
                    <span
                        className={`text-xs font-semibold uppercase tracking-wider ${
                            stats.totalPendente > 0 ? 'text-amber-300' : 'text-zinc-400'
                        }`}
                    >
                        Guias em Aberto
                    </span>
                    <p
                        className={`text-2xl sm:text-3xl font-bold mt-2 tabular-nums truncate ${
                            stats.totalPendente > 0 ? 'text-amber-400' : 'text-zinc-300'
                        }`}
                    >
                        {formatCurrency(stats.totalPendente)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        {stats.qtdPendente}{' '}
                        {stats.qtdPendente === 1 ? 'guia pendente' : 'guias pendentes'}
                    </p>
                </div>

                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 min-w-0 overflow-hidden">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        Média Mensal ({selectedAno})
                    </span>
                    <p className="text-2xl sm:text-3xl font-bold text-cyber-gold mt-2 tabular-nums truncate">
                        {formatCurrency(stats.mediaMensal)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Média por guia lançada no ano
                    </p>
                </div>
            </section>

            {/* Accounting Info */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 flex items-start gap-3 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                    <strong>Contabilidade:</strong> o pagamento do DAS não afeta o resultado do DRE (que utiliza a alíquota calculada) — ele impacta apenas como saída de caixa no Fluxo de Caixa.
                </p>
            </div>

            {/* History List */}
            <section className="rounded-2xl bg-zinc-900/75 border border-white/10 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-bold text-white flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-cyber-gold shrink-0" />
                            <span>Histórico de Guias DAS</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Acompanhe vencimentos e dê baixa diretamente por aqui.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedAno}
                            onChange={(e) => setSelectedAno(Number(e.target.value))}
                            className="rounded-xl bg-zinc-950/90 border border-white/10 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-cyber-gold"
                            aria-label="Selecionar ano"
                        >
                            {availableYears.map((y) => (
                                <option key={y} value={y} className="bg-zinc-950">
                                    {y}
                                </option>
                            ))}
                        </select>

                        <div className="inline-flex items-center p-1 rounded-xl bg-zinc-950/90 border border-white/10 gap-1 overflow-x-auto max-w-full">
                            {(
                                [
                                    { id: 'ALL', label: 'Ativos' },
                                    { id: 'PENDENTE', label: 'Pendentes' },
                                    { id: 'PAGO', label: 'Pagos' },
                                    { id: 'CANCELADO', label: 'Cancelados' },
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
                </div>

                {isError ? (
                    <div className="p-8 text-center space-y-3">
                        <p className="text-sm text-red-300">
                            Não foi possível carregar o histórico de guias DAS.
                        </p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
                        >
                            Tentar novamente
                        </button>
                    </div>
                ) : isLoading ? (
                    <div className="p-10 text-center text-zinc-400 text-sm flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
                        <span>Carregando guias...</span>
                    </div>
                ) : filteredImpostos.length > 0 ? (
                    <div className="divide-y divide-white/5">
                        {filteredImpostos.map((imp: ContaPagar) => (
                            <div
                                key={imp.id}
                                className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="min-w-0">
                                    <p
                                        className={`text-sm font-semibold truncate ${
                                            imp.status === 'CANCELADO'
                                                ? 'text-zinc-500 line-through'
                                                : 'text-white'
                                        }`}
                                    >
                                        {imp.descricao || 'Pagamento de DAS'}
                                    </p>
                                    <p className="text-xs text-zinc-400 mt-0.5">
                                        Competência: {formatDate(imp.dataCompetencia)} • Vencimento:{' '}
                                        {formatDate(imp.dataVencimento)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 flex-wrap">
                                    <div className="sm:text-right">
                                        <p
                                            className={`text-base font-bold tabular-nums ${
                                                imp.status === 'CANCELADO'
                                                    ? 'text-zinc-500 line-through'
                                                    : 'text-amber-400'
                                            }`}
                                        >
                                            {formatCurrency(imp.valor)}
                                        </p>
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                                imp.status === 'PAGO'
                                                    ? 'bg-emerald-500/15 text-emerald-400'
                                                    : imp.status === 'CANCELADO'
                                                        ? 'bg-red-500/15 text-red-400'
                                                        : 'bg-amber-500/15 text-amber-300'
                                            }`}
                                        >
                                            {imp.status === 'PAGO'
                                                ? 'Pago'
                                                : imp.status === 'CANCELADO'
                                                    ? 'Cancelada'
                                                    : 'Pendente'}
                                        </span>
                                    </div>

                                    {imp.status !== 'PAGO' && imp.status !== 'CANCELADO' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmPay(imp)}
                                                disabled={payMutation.isPending || cancelMutation.isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                            >
                                                <DollarSign className="w-3.5 h-3.5" />
                                                <span>Marcar Pago</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setConfirmCancel(imp)}
                                                disabled={payMutation.isPending || cancelMutation.isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                                title="Cancelar guia lançada por engano"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                                <span>Cancelar</span>
                                            </button>
                                        </>
                                    )}

                                    {imp.status === 'PAGO' && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setMotivoEstorno('');
                                                setEstornarGuia(imp);
                                            }}
                                            disabled={estornarMutation.isPending}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-zinc-300 hover:text-red-300 text-xs font-semibold transition-colors disabled:opacity-50"
                                            title="Estornar guia paga e cancelar lançamento"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>Estornar</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-10 text-center text-zinc-500 text-sm">
                        Nenhuma guia de DAS encontrada para {selectedAno} com este filtro.
                    </div>
                )}
            </section>

            {/* Register DAS Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    Registrar Pagamento de DAS
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Lance a guia do Simples Nacional para controle de caixa.
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
                                    Valor do DAS (R$) *
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
                                    placeholder="450.00"
                                />
                            </div>

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
                                    placeholder={`DAS — Competência ${competenciaMesLabel}`}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Mês de Competência *
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

                            {isDuplicada && (
                                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2.5 text-xs text-amber-200">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>
                                        Já existe uma guia de DAS registrada para a competência {competenciaMesLabel}. Confirme se deseja lançar uma guia complementar.
                                    </span>
                                </div>
                            )}

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
                                            <span>Registrar DAS</span>
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
                title="Confirmar Pagamento do DAS"
                message={`Confirmar pagamento de ${formatCurrency(confirmPay?.valor || 0)} referente a "${confirmPay?.descricao || 'Pagamento de DAS'}"?\n\nO pagamento será registrado com a data de hoje.`}
                type="success"
                confirmText={payMutation.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
                cancelText="Cancelar"
            />

            {/* Cancel Pending Guide Modal */}
            <ActionModal
                isOpen={confirmCancel !== null}
                onClose={() => !cancelMutation.isPending && setConfirmCancel(null)}
                onConfirm={() => {
                    if (confirmCancel && !cancelMutation.isPending) {
                        cancelMutation.mutate(confirmCancel.id);
                    }
                }}
                title="Cancelar Guia de DAS"
                message={`Deseja cancelar a guia "${confirmCancel?.descricao || 'Pagamento de DAS'}" no valor de ${formatCurrency(confirmCancel?.valor || 0)}?\n\nEla será removida dos totais e de Contas a Pagar, mantendo o registro apenas para auditoria.`}
                type="danger"
                confirmText={cancelMutation.isPending ? 'Cancelando...' : 'Cancelar Guia'}
                cancelText="Voltar"
            />

            {/* Estornar Paid Guide Modal */}
            {estornarGuia && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-zinc-950 border border-red-500/35 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                                <h2 className="text-base font-bold text-white">
                                    Estornar Guia Paga
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {estornarGuia.descricao || 'Pagamento de DAS'} •{' '}
                                    {formatCurrency(estornarGuia.valor)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => !estornarMutation.isPending && setEstornarGuia(null)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
                                aria-label="Fechar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                            O estorno reverte a saída do Fluxo de Caixa e marca a guia como cancelada para auditoria.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Motivo do Estorno *
                            </label>
                            <textarea
                                rows={3}
                                maxLength={250}
                                value={motivoEstorno}
                                onChange={(e) => setMotivoEstorno(e.target.value)}
                                className={`${inputClass} resize-none`}
                                placeholder="Ex: Guia lançada com valor incorreto"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setEstornarGuia(null)}
                                disabled={estornarMutation.isPending}
                                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold"
                            >
                                Voltar
                            </button>
                            <button
                                type="button"
                                disabled={!motivoEstorno.trim() || estornarMutation.isPending}
                                onClick={() =>
                                    estornarMutation.mutate({
                                        id: estornarGuia.id,
                                        motivo: motivoEstorno.trim(),
                                    })
                                }
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold disabled:opacity-50"
                            >
                                {estornarMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Estornando...</span>
                                    </>
                                ) : (
                                    <>
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Confirmar Estorno</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImpostoPagoPage;
