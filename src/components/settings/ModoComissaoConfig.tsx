import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    Building2,
    Calculator,
    Check,
    Loader2,
    Users,
} from 'lucide-react';
import { empresaService } from '../../services/empresaService';
import type { ModoComissao } from '../../types';
import { ActionModal } from '../modals/ActionModal';

export const ModoComissaoConfig: React.FC = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: config, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const [pendingMode, setPendingMode] = useState<ModoComissao | null>(null);
    const [overrideMode, setOverrideMode] = useState<ModoComissao | null>(null);

    const selectedMode: ModoComissao = overrideMode ?? config?.modoComissao ?? 'INDIVIDUAL';

    const updateMutation = useMutation({
        mutationFn: (modo: ModoComissao) => empresaService.updateConfig({ modoComissao: modo }),
        onSuccess: (_, modo) => {
            setOverrideMode(modo);
            queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
        },
    });

    const handleRequestChange = (modo: ModoComissao) => {
        if (modo === selectedMode || updateMutation.isPending) return;
        setPendingMode(modo);
    };

    const handleConfirmChange = () => {
        if (!pendingMode) return;
        const target = pendingMode;
        setPendingMode(null);
        updateMutation.mutate(target);
    };

    if (isLoadingConfig) {
        return (
            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-cyber-gold animate-spin" />
            </div>
        );
    }

    const confirmMessage =
        pendingMode === 'COLETIVA'
            ? 'Ao alterar para COLETIVA, todos os prestadores passarão a visualizar o repasse total consolidado da empresa. Deseja confirmar?'
            : 'Ao alterar para INDIVIDUAL, cada prestador passará a visualizar apenas seu próprio repasse e faturamento. Deseja confirmar?';

    return (
        <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyber-gold shrink-0" />
                        <span>Modo de Exibição de Comissão</span>
                        {updateMutation.isPending && (
                            <Loader2 className="w-4 h-4 text-cyber-gold animate-spin" />
                        )}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Define o que os prestadores visualizam na tela Minha Comissão.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/settings/comissao')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
                >
                    <Calculator className="w-3.5 h-3.5 text-cyber-gold" />
                    <span>Gerenciar Regras de Faixa</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* INDIVIDUAL */}
                <button
                    type="button"
                    onClick={() => handleRequestChange('INDIVIDUAL')}
                    disabled={updateMutation.isPending}
                    className={`text-left rounded-2xl p-5 border transition-all disabled:opacity-60 ${
                        selectedMode === 'INDIVIDUAL'
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-white/10 hover:border-cyber-gold/40 bg-zinc-950/60'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                selectedMode === 'INDIVIDUAL'
                                    ? 'bg-cyber-gold text-black'
                                    : 'bg-cyber-gold/10 text-cyber-gold'
                            }`}
                        >
                            <Users className="w-5 h-5" />
                        </div>
                        {selectedMode === 'INDIVIDUAL' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyber-gold/20 text-cyber-gold">
                                <Check className="w-3 h-3" />
                                Ativo
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">Comissão Individual</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        Cada prestador visualiza apenas seu próprio repasse e faturamento individual.
                    </p>
                </button>

                {/* COLETIVA */}
                <button
                    type="button"
                    onClick={() => handleRequestChange('COLETIVA')}
                    disabled={updateMutation.isPending}
                    className={`text-left rounded-2xl p-5 border transition-all disabled:opacity-60 ${
                        selectedMode === 'COLETIVA'
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-white/10 hover:border-cyber-gold/40 bg-zinc-950/60'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3 mb-3">
                        <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                selectedMode === 'COLETIVA'
                                    ? 'bg-cyber-gold text-black'
                                    : 'bg-cyber-gold/10 text-cyber-gold'
                            }`}
                        >
                            <Building2 className="w-5 h-5" />
                        </div>
                        {selectedMode === 'COLETIVA' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-cyber-gold/20 text-cyber-gold">
                                <Check className="w-3 h-3" />
                                Ativo
                            </span>
                        )}
                    </div>
                    <h3 className="text-sm font-semibold text-white">Comissão Coletiva</h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                        Todos os prestadores visualizam o repasse total consolidado da empresa.
                    </p>
                </button>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-200/90">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                    Proteção contra alteração acidental: a troca de modo exige confirmação antes de ser aplicada para a equipe.
                </span>
            </div>

            {updateMutation.isError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
                    Não foi possível atualizar o modo de comissão. Tente novamente.
                </div>
            )}

            {updateMutation.isSuccess && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Modo de comissão atualizado com sucesso.</span>
                </div>
            )}

            <ActionModal
                isOpen={pendingMode !== null}
                onClose={() => setPendingMode(null)}
                onConfirm={handleConfirmChange}
                title="Alterar Modo de Comissão"
                message={confirmMessage}
                type="warning"
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );
};
