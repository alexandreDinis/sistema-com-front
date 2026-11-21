import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft,
    Loader2,
    AlertCircle,
    DollarSign,
    Check,
    RefreshCw,
    Wallet,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { comissaoService } from '../../services/comissaoService';
import type { ComissaoFuncionario } from '../../services/comissaoService';
import { ActionModal } from '../../components/modals/ActionModal';
import type { ActionModalType } from '../../components/modals/ActionModal';
import { AdiantamentoModal } from '../../components/modals/AdiantamentoModal';

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

const formatarMoeda = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

const getIniciais = (nome?: string): string => {
    if (!nome) return 'PR';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
};

export const GestaoComissoesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const agora = new Date();
    const [ano, setAno] = useState(agora.getFullYear());
    const [mes, setMes] = useState(agora.getMonth() + 1);

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: ActionModalType;
        title: string;
        message: string;
        confirmText?: string;
        showCancel?: boolean;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: '',
        showCancel: false,
    });

    const [adiantamentoModal, setAdiantamentoModal] = useState<{
        isOpen: boolean;
        funcionarioId: number | null;
        funcionarioNome: string;
    }>({
        isOpen: false,
        funcionarioId: null,
        funcionarioNome: '',
    });

    const { data: comissoes = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['comissoes-empresa', ano, mes],
        queryFn: () => comissaoService.listarComissoesEmpresa(ano, mes),
    });

    const quitarMutation = useMutation({
        mutationFn: (id: number) => comissaoService.quitarComissao(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comissoes-empresa', ano, mes] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
        },
        onError: () => {
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro ao Quitar',
                message: 'Não foi possível quitar este repasse. Tente novamente.',
                confirmText: 'FECHAR',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const recalcularMutation = useMutation({
        mutationFn: () => comissaoService.listarComissoesEmpresa(ano, mes, true),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comissoes-empresa'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Sucesso',
                message: 'Comissão recalculada com sucesso.',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: () => {
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro',
                message: 'Erro ao recalcular comissões.',
                confirmText: 'FECHAR',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const resumo = useMemo(() => {
        return comissoes.reduce(
            (acc, c) => {
                acc.saldoTotal += c.saldoAPagar || 0;
                acc.brutoTotal += c.valorBruto || 0;
                acc.adiantadoTotal += c.adiantamentos || 0;
                acc.pagoTotal += c.valorQuitado || 0;
                if (c.quitado) acc.qtdPagos += 1;
                else acc.qtdPendentes += 1;
                return acc;
            },
            { saldoTotal: 0, brutoTotal: 0, adiantadoTotal: 0, pagoTotal: 0, qtdPendentes: 0, qtdPagos: 0 }
        );
    }, [comissoes]);

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

    const handleSolicitarQuitacao = (c: ComissaoFuncionario) => {
        setActionModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Quitação',
            message: `Deseja quitar o repasse de ${c.funcionarioNome} no valor de ${formatarMoeda(c.saldoAPagar)}?`,
            confirmText: 'SIM, QUITAR',
            showCancel: true,
            onConfirm: () => {
                setActionModal((prev) => ({ ...prev, isOpen: false }));
                quitarMutation.mutate(c.id);
            },
        });
    };

    return (
        <div className="space-y-5 pb-20">
            <Link
                to="/settings/comissao"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-cyber-gold transition-colors font-oxanium text-xs font-semibold"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Configurações de Comissão
            </Link>

            {/* Header + Período + Recalcular */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide truncate">
                            Gestão de Pagamentos
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Visualize repasses, lance adiantamentos e faça o fechamento de todos os prestadores.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-between flex-1 sm:flex-initial bg-black/50 border border-white/10 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            aria-label="Mês anterior"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="px-3 sm:px-4 text-sm font-oxanium font-bold text-white text-center min-w-[136px]">
                            {periodoLabel}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={() => recalcularMutation.mutate()}
                        disabled={recalcularMutation.isPending}
                        title="Força o recálculo de todos os repasses (exceto pagos)"
                        className="h-11 px-3.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 hover:bg-amber-500/25 disabled:opacity-50 transition-colors inline-flex items-center gap-2 text-xs font-oxanium font-bold shrink-0"
                    >
                        {recalcularMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        <span>Recalcular</span>
                    </button>
                </div>
            </div>

            {/* Aviso de Recálculo */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 flex items-start gap-2.5 text-xs text-amber-200/90">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                    É necessário clicar em <strong>Recalcular</strong> ao acessar esta página para garantir que os
                    valores em aberto estejam atualizados com o faturamento mais recente.
                </p>
            </div>

            {/* 4 KPIs Resumo */}
            {!isLoading && !isError && comissoes.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#171c2b] to-[#10131d] border border-cyber-gold/35 p-4">
                        <div className="text-[10px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold">
                            Saldo a Pagar
                        </div>
                        <div className="text-lg sm:text-2xl font-orbitron font-bold text-cyber-gold tabular-nums mt-1.5">
                            {formatarMoeda(resumo.saldoTotal)}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">
                            {resumo.qtdPendentes} pendente{resumo.qtdPendentes === 1 ? '' : 's'}
                        </div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 p-4">
                        <div className="text-[10px] font-oxanium font-bold uppercase tracking-wider text-gray-400">
                            Comissão Bruta
                        </div>
                        <div className="text-lg sm:text-2xl font-mono font-bold text-white tabular-nums mt-1.5">
                            {formatarMoeda(resumo.brutoTotal)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">Total calculado no mês</div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 p-4">
                        <div className="text-[10px] font-oxanium font-bold uppercase tracking-wider text-gray-400">
                            Adiantamentos
                        </div>
                        <div className="text-lg sm:text-2xl font-mono font-bold text-amber-400 tabular-nums mt-1.5">
                            {formatarMoeda(resumo.adiantadoTotal)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">Vales já descontados</div>
                    </div>

                    <div className="min-w-0 overflow-hidden rounded-2xl bg-black/45 border border-white/10 p-4">
                        <div className="text-[10px] font-oxanium font-bold uppercase tracking-wider text-gray-400">
                            Já Pago
                        </div>
                        <div className="text-lg sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-1.5">
                            {formatarMoeda(resumo.pagoTotal)}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                            {resumo.qtdPagos} quitado{resumo.qtdPagos === 1 ? '' : 's'}
                        </div>
                    </div>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="h-24 rounded-2xl bg-black/40 border border-white/10 animate-pulse"
                            />
                        ))}
                    </div>
                    <div className="h-48 rounded-2xl bg-black/40 border border-white/10 animate-pulse" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-8 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2.5" />
                    <p className="text-sm text-red-300 mb-4">Erro ao carregar repasses de {periodoLabel}.</p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/35 text-red-300 hover:bg-red-500 hover:text-white transition-all inline-flex items-center gap-2 text-xs font-oxanium font-bold"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Tentar Novamente
                    </button>
                </div>
            )}

            {/* Empty */}
            {!isLoading && !isError && comissoes.length === 0 && (
                <div className="rounded-2xl bg-black/40 border border-white/10 p-10 text-center">
                    <DollarSign className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Nenhum repasse em {periodoLabel}</h3>
                    <p className="text-xs sm:text-sm text-gray-400">
                        Nenhum prestador possui repasse calculado para este período.
                    </p>
                </div>
            )}

            {/* Lista: Tabela Desktop + Cards Mobile */}
            {!isLoading && !isError && comissoes.length > 0 && (
                <>
                    {/* Desktop Table */}
                    <div className="hidden lg:block rounded-2xl bg-black/45 border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.03] border-b border-white/10 text-left text-[11px] font-oxanium uppercase tracking-wider text-gray-400">
                                        <th className="py-3.5 px-4">Prestador</th>
                                        <th className="py-3.5 px-4 text-right">Faturamento</th>
                                        <th className="py-3.5 px-3 text-right">Taxa</th>
                                        <th className="py-3.5 px-4 text-right">Bruto</th>
                                        <th className="py-3.5 px-4 text-right">Adiant.</th>
                                        <th className="py-3.5 px-4 text-right">Já Pago</th>
                                        <th className="py-3.5 px-4 text-right">Saldo</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {comissoes.map((c: ComissaoFuncionario) => (
                                        <tr key={c.id} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold text-xs font-bold flex items-center justify-center shrink-0">
                                                        {getIniciais(c.funcionarioNome)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-white truncate">
                                                            {c.funcionarioNome}
                                                        </div>
                                                        <div className="text-xs text-gray-500 truncate">
                                                            {c.funcionarioEmail}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-gray-200 tabular-nums whitespace-nowrap">
                                                {formatarMoeda(c.faturamento)}
                                            </td>
                                            <td className="py-3.5 px-3 text-right font-mono text-gray-400 tabular-nums">
                                                {c.porcentagem}%
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-gray-200 tabular-nums whitespace-nowrap">
                                                {formatarMoeda(c.valorBruto)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-amber-400 tabular-nums whitespace-nowrap">
                                                {c.adiantamentos > 0 ? `- ${formatarMoeda(c.adiantamentos)}` : formatarMoeda(0)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono text-emerald-400 tabular-nums whitespace-nowrap">
                                                {formatarMoeda(c.valorQuitado || 0)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-cyber-gold tabular-nums whitespace-nowrap">
                                                {formatarMoeda(c.saldoAPagar)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {c.quitado ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-oxanium font-bold uppercase bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
                                                        <CheckCircle2 className="w-3 h-3" /> Pago
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-oxanium font-bold uppercase bg-amber-500/15 border border-amber-500/35 text-amber-400">
                                                        <Clock className="w-3 h-3" /> Pendente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {!c.quitado ? (
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setAdiantamentoModal({
                                                                    isOpen: true,
                                                                    funcionarioId: c.funcionarioId,
                                                                    funcionarioNome: c.funcionarioNome,
                                                                })
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg bg-cyber-gold/15 border border-cyber-gold/35 text-cyber-gold hover:bg-cyber-gold hover:text-black text-xs font-oxanium font-bold inline-flex items-center gap-1 transition-colors"
                                                            title="Lançar Adiantamento para este prestador"
                                                        >
                                                            <Wallet className="w-3.5 h-3.5" /> Adiantar
                                                        </button>
                                                        {c.saldoAPagar > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSolicitarQuitacao(c)}
                                                                disabled={quitarMutation.isPending}
                                                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500 hover:text-black disabled:opacity-50 text-xs font-oxanium font-bold inline-flex items-center gap-1 transition-colors"
                                                                title="Marcar como pago manualmente"
                                                            >
                                                                <Check className="w-3.5 h-3.5" /> Quitar
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    c.dataQuitacao && (
                                                        <span className="text-xs text-gray-500 font-mono">
                                                            {new Date(c.dataQuitacao).toLocaleDateString('pt-BR')}
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile / Tablet Cards (zero horizontal scroll) */}
                    <div className="lg:hidden space-y-3">
                        {comissoes.map((c: ComissaoFuncionario) => (
                            <div
                                key={c.id}
                                className="min-w-0 w-full overflow-hidden rounded-2xl bg-black/45 border border-white/10 p-4 space-y-3"
                            >
                                <div className="flex items-start justify-between gap-2 min-w-0">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-9 h-9 rounded-xl bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold text-xs font-bold flex items-center justify-center shrink-0">
                                            {getIniciais(c.funcionarioNome)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-bold text-white truncate">
                                                {c.funcionarioNome}
                                            </div>
                                            <div className="text-[11px] text-gray-400 truncate">
                                                Taxa {c.porcentagem}% · Fat. {formatarMoeda(c.faturamento)}
                                            </div>
                                        </div>
                                    </div>

                                    {c.quitado ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-oxanium font-bold uppercase bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 shrink-0">
                                            Pago
                                        </span>
                                    ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-oxanium font-bold uppercase bg-amber-500/15 border border-amber-500/35 text-amber-400 shrink-0">
                                            Pendente
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                                        <div className="text-[10px] text-gray-500 uppercase">Bruto</div>
                                        <div className="text-xs sm:text-sm font-mono font-bold text-white tabular-nums mt-0.5">
                                            {formatarMoeda(c.valorBruto)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                                        <div className="text-[10px] text-gray-500 uppercase">Adiantamentos</div>
                                        <div className="text-xs sm:text-sm font-mono font-bold text-amber-400 tabular-nums mt-0.5">
                                            {c.adiantamentos > 0
                                                ? `- ${formatarMoeda(c.adiantamentos)}`
                                                : formatarMoeda(0)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-white/[0.03] border border-white/10 p-2.5">
                                        <div className="text-[10px] text-gray-500 uppercase">Já Pago</div>
                                        <div className="text-xs sm:text-sm font-mono font-bold text-emerald-400 tabular-nums mt-0.5">
                                            {formatarMoeda(c.valorQuitado || 0)}
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-cyber-gold/10 border border-cyber-gold/30 p-2.5">
                                        <div className="text-[10px] text-cyber-gold uppercase font-semibold">
                                            Saldo a Pagar
                                        </div>
                                        <div className="text-xs sm:text-sm font-mono font-bold text-cyber-gold tabular-nums mt-0.5">
                                            {formatarMoeda(c.saldoAPagar)}
                                        </div>
                                    </div>
                                </div>

                                {!c.quitado ? (
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setAdiantamentoModal({
                                                    isOpen: true,
                                                    funcionarioId: c.funcionarioId,
                                                    funcionarioNome: c.funcionarioNome,
                                                })
                                            }
                                            className="py-2.5 px-3 rounded-xl bg-cyber-gold/15 border border-cyber-gold/35 text-cyber-gold hover:bg-cyber-gold hover:text-black text-xs font-oxanium font-bold flex items-center justify-center gap-1.5 transition-colors"
                                        >
                                            <Wallet className="w-3.5 h-3.5" /> Adiantar
                                        </button>
                                        {c.saldoAPagar > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => handleSolicitarQuitacao(c)}
                                                disabled={quitarMutation.isPending}
                                                className="py-2.5 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500 hover:text-black disabled:opacity-50 text-xs font-oxanium font-bold flex items-center justify-center gap-1.5 transition-colors"
                                            >
                                                <Check className="w-3.5 h-3.5" /> Quitar
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    c.dataQuitacao && (
                                        <div className="text-xs text-gray-400 pt-2 border-t border-white/10 flex justify-between">
                                            <span>Quitado em</span>
                                            <span className="font-mono text-gray-300">
                                                {new Date(c.dataQuitacao).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <AdiantamentoModal
                isOpen={adiantamentoModal.isOpen}
                onClose={() => setAdiantamentoModal((prev) => ({ ...prev, isOpen: false }))}
                onSuccess={() => {
                    refetch();
                    setActionModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Sucesso',
                        message: 'Adiantamento registrado e repasse atualizado.',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
                    });
                }}
                funcionarioId={adiantamentoModal.funcionarioId || 0}
                funcionarioNome={adiantamentoModal.funcionarioNome}
            />

            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                type={actionModal.type}
                title={actionModal.title}
                message={actionModal.message}
                onConfirm={actionModal.onConfirm}
                showCancel={actionModal.showCancel}
                confirmText={actionModal.confirmText || 'OK'}
            />
        </div>
    );
};
