import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Calculator,
    Loader2,
    Plus,
    RefreshCw,
} from 'lucide-react';
import { regraComissaoService } from '../../services/regraComissaoService';
import { empresaService } from '../../services/empresaService';
import { RegraComissaoCard } from '../../components/settings/RegraComissaoCard';
import { RegraComissaoForm } from '../../components/settings/RegraComissaoForm';
import { ActionModal } from '../../components/modals/ActionModal';
import type { RegraComissao, RegraComissaoRequest } from '../../types';
import { simularComissaoPorFaixas } from '../../utils/comissaoRulesUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const ComissaoRulesPage: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: empresaConfig, isLoading: isConfigLoading } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const empresaId = empresaConfig?.id;

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRegra, setEditingRegra] = useState<RegraComissao | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'ativar' | 'desativar' | 'delete';
        regra: RegraComissao;
    } | null>(null);
    const [expandedRegraId, setExpandedRegraId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [simValor, setSimValor] = useState<number>(24000);

    const {
        data: regras,
        isLoading: isRegrasLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['regras-comissao', empresaId],
        queryFn: () => regraComissaoService.getRegras(empresaId!),
        enabled: Boolean(empresaId),
        staleTime: 30_000,
    });

    const isLoading = isConfigLoading || isRegrasLoading;

    const createMutation = useMutation({
        mutationFn: (data: RegraComissaoRequest) =>
            regraComissaoService.createRegra(empresaId!, data),
        onSuccess: (newItem) => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['regras-comissao', empresaId] });
            setIsFormOpen(false);
            setConfirmAction({ type: 'ativar', regra: newItem });
        },
        onError: () => {
            setActionError('Não foi possível criar a regra de comissão. Tente novamente.');
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: RegraComissaoRequest }) =>
            regraComissaoService.updateRegra(id, data),
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['regras-comissao', empresaId] });
            setIsFormOpen(false);
            setEditingRegra(null);
        },
        onError: () => {
            setActionError('Não foi possível atualizar a regra de comissão. Tente novamente.');
        },
    });

    const ativarMutation = useMutation({
        mutationFn: (id: number) => regraComissaoService.ativarRegra(id),
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['regras-comissao', empresaId] });
            setConfirmAction(null);
        },
        onError: () => {
            setConfirmAction(null);
            setActionError('Não foi possível ativar a regra selecionada.');
        },
    });

    const desativarMutation = useMutation({
        mutationFn: (id: number) => regraComissaoService.desativarRegra(id),
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['regras-comissao', empresaId] });
            setConfirmAction(null);
        },
        onError: () => {
            setConfirmAction(null);
            setActionError('Não foi possível desativar a regra ativa.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => regraComissaoService.deleteRegra(id),
        onSuccess: () => {
            setActionError(null);
            queryClient.invalidateQueries({ queryKey: ['regras-comissao', empresaId] });
            setConfirmAction(null);
        },
        onError: () => {
            setConfirmAction(null);
            setActionError('Não foi possível excluir a regra. Verifique se ela não está vinculada a repasses.');
        },
    });

    const handleSave = async (data: RegraComissaoRequest) => {
        setActionError(null);
        if (editingRegra) {
            await updateMutation.mutateAsync({ id: editingRegra.id, data });
        } else {
            await createMutation.mutateAsync(data);
        }
    };

    const handleEdit = (regra: RegraComissao) => {
        setActionError(null);
        setEditingRegra(regra);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingRegra(null);
    };

    const regraAtiva = useMemo(() => regras?.find((r) => r.ativa), [regras]);
    const regrasInativas = useMemo(() => regras?.filter((r) => !r.ativa) || [], [regras]);

    const simResult = useMemo(
        () => simularComissaoPorFaixas(regraAtiva?.faixas, simValor),
        [regraAtiva?.faixas, simValor]
    );

    const isProcessingConfirm =
        ativarMutation.isPending || desativarMutation.isPending || deleteMutation.isPending;

    const handleConfirmAction = () => {
        if (!confirmAction || isProcessingConfirm) return;
        if (confirmAction.type === 'ativar') {
            ativarMutation.mutate(confirmAction.regra.id);
        } else if (confirmAction.type === 'desativar') {
            desativarMutation.mutate(confirmAction.regra.id);
        } else if (confirmAction.type === 'delete') {
            deleteMutation.mutate(confirmAction.regra.id);
        }
    };

    const modalConfig = confirmAction
        ? confirmAction.type === 'ativar'
            ? {
                  title: 'Ativar Regra de Comissão',
                  type: 'warning' as const,
                  message: `Deseja ativar "${confirmAction.regra.nome}"?\n\nA regra ativa atual será substituída e esta passará a valer para os cálculos de comissão.`,
                  confirmText: 'Ativar',
              }
            : confirmAction.type === 'desativar'
                ? {
                      title: 'Desativar Regra Ativa',
                      type: 'warning' as const,
                      message: `Deseja desativar "${confirmAction.regra.nome}"?\n\nA empresa ficará sem regra de comissão ativa até que outra seja ativada.`,
                      confirmText: 'Desativar',
                  }
                : {
                      title: 'Excluir Regra de Comissão',
                      type: 'danger' as const,
                      message: `Deseja excluir permanentemente "${confirmAction.regra.nome}"?\n\nEsta ação não pode ser desfeita.`,
                      confirmText: 'Excluir',
                  }
        : null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-24">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Link
                    to="/settings"
                    className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyber-gold transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Configurações</span>
                </Link>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-200 font-medium">Regras de Comissão</span>
            </div>

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Regras de Comissão
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gerencie faixas de faturamento, vigência e simule o cálculo de repasse em tempo real.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={!empresaId}
                    onClick={() => {
                        setActionError(null);
                        setEditingRegra(null);
                        setIsFormOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 self-start sm:self-auto disabled:opacity-50 whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nova Regra</span>
                </button>
            </header>

            {/* Action Error Banner */}
            {actionError && !isFormOpen && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-300">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{actionError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setActionError(null)}
                        className="text-red-300/70 hover:text-red-200 font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Loading */}
            {isLoading && (
                <div className="flex items-center justify-center py-16 gap-3 text-zinc-400 text-sm">
                    <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
                    <span>Carregando regras de comissão...</span>
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-red-200 text-sm">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span>Não foi possível carregar as regras de comissão.</span>
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
            )}

            {/* Empty State */}
            {!isLoading && !isError && (!regras || regras.length === 0) && (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-14 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-3">
                        <Calculator className="w-5 h-5" />
                    </div>
                    <h2 className="text-base font-semibold text-white">
                        Nenhuma regra configurada
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 mb-5">
                        Crie sua primeira regra de comissão para definir as faixas de repasse da empresa.
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingRegra(null);
                            setIsFormOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Criar Primeira Regra</span>
                    </button>
                </div>
            )}

            {/* Active Rule + Live Simulator */}
            {regraAtiva && (
                <section className="space-y-3">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>Regra Ativa no Momento</span>
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-8 min-w-0">
                            <RegraComissaoCard
                                regra={regraAtiva}
                                onEdit={handleEdit}
                                onAtivar={() => {}}
                                onDesativar={() =>
                                    setConfirmAction({ type: 'desativar', regra: regraAtiva })
                                }
                                onDelete={() => {}}
                            />
                        </div>

                        {regraAtiva.faixas && regraAtiva.faixas.length > 0 && (
                            <aside className="lg:col-span-4 rounded-2xl bg-zinc-900/75 border border-cyber-gold/30 p-5 space-y-4 min-w-0">
                                <div>
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                        <Calculator className="w-4 h-4 text-cyber-gold shrink-0" />
                                        <span>Simulador da Regra Ativa</span>
                                    </h3>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Informe um faturamento mensal para conferir a faixa e a comissão estimada.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                        Faturamento Simulado (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="500"
                                        min="0"
                                        value={simValor}
                                        onChange={(e) => setSimValor(Number(e.target.value))}
                                        className="w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-base font-semibold text-white focus:border-cyber-gold focus:outline-none tabular-nums"
                                    />
                                </div>

                                <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/25 p-4">
                                    <span className="text-[11px] text-zinc-400 block">
                                        Comissão Estimada
                                    </span>
                                    {simResult.faixa ? (
                                        <>
                                            <p className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">
                                                {formatCurrency(simResult.comissao)}
                                            </p>
                                            <p className="text-xs text-zinc-300 mt-1">
                                                {simResult.faixa.descricao || 'Faixa aplicável'} —{' '}
                                                {simResult.faixa.porcentagem}% aplicados
                                            </p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-amber-300 mt-1">
                                            Nenhuma faixa cobre este valor de faturamento.
                                        </p>
                                    )}
                                </div>
                            </aside>
                        )}
                    </div>
                </section>
            )}

            {/* Inactive Rules */}
            {regrasInativas.length > 0 && (
                <section className="space-y-3 pt-2">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Outras Regras ({regrasInativas.length})
                    </h2>
                    <div className="space-y-3">
                        {regrasInativas.map((regra) => (
                            <RegraComissaoCard
                                key={regra.id}
                                regra={regra}
                                onEdit={handleEdit}
                                onAtivar={() => setConfirmAction({ type: 'ativar', regra })}
                                onDesativar={() => {}}
                                onDelete={() => setConfirmAction({ type: 'delete', regra })}
                                isExpanded={expandedRegraId === regra.id}
                                onToggleExpand={() =>
                                    setExpandedRegraId((prev) =>
                                        prev === regra.id ? null : regra.id
                                    )
                                }
                            />
                        ))}
                    </div>
                </section>
            )}

            {/* Form Modal */}
            {isFormOpen && (
                <RegraComissaoForm
                    key={editingRegra?.id ?? 'new'}
                    regra={editingRegra}
                    onSave={handleSave}
                    onClose={handleCloseForm}
                    isSaving={createMutation.isPending || updateMutation.isPending}
                    apiError={actionError}
                />
            )}

            {/* Standardized Confirmation Modal */}
            {modalConfig && (
                <ActionModal
                    isOpen={Boolean(confirmAction)}
                    onClose={() => !isProcessingConfirm && setConfirmAction(null)}
                    onConfirm={handleConfirmAction}
                    title={modalConfig.title}
                    message={modalConfig.message}
                    type={modalConfig.type}
                    confirmText={isProcessingConfirm ? 'Processando...' : modalConfig.confirmText}
                    cancelText="Cancelar"
                />
            )}
        </div>
    );
};
