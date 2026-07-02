import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { empresaService } from '../../services/empresaService';
import type { ModoComissao } from '../../types';
import { Users, Building2, Check, Loader2 } from 'lucide-react';

export const ModoComissaoConfig: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: config, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig
    });

    const [selectedMode, setSelectedMode] = useState<ModoComissao>('INDIVIDUAL');

    // Sync local state with fetched config
    useEffect(() => {
        if (config?.modoComissao) {
            setSelectedMode(config.modoComissao);
        }
    }, [config]);

    const updateMutation = useMutation({
        mutationFn: (modo: ModoComissao) => empresaService.updateConfig({ modoComissao: modo }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
        }
    });

    const handleModeChange = (modo: ModoComissao) => {
        setSelectedMode(modo);
        updateMutation.mutate(modo);
    };

    if (isLoadingConfig) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-cyber-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-cyber-gold font-bold uppercase text-sm mb-2 flex items-center gap-2">
                    Modo de Comissão
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {updateMutation.isSuccess && <Check className="w-4 h-4 text-green-400" />}
                </h3>
                <p className="text-cyber-gold/50 text-xs mb-4">
                    Define como os repasses são exibidos para os prestadores.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option: INDIVIDUAL */}
                <button
                    onClick={() => handleModeChange('INDIVIDUAL')}
                    disabled={updateMutation.isPending}
                    className={`p-4 border text-left transition-all ${selectedMode === 'INDIVIDUAL'
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-cyber-gold/30 hover:border-cyber-gold/60 bg-black/40'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded ${selectedMode === 'INDIVIDUAL' ? 'bg-cyber-gold text-black' : 'bg-cyber-gold/10 text-cyber-gold'}`}>
                            <Users size={20} />
                        </div>
                        <span className="font-bold text-cyber-gold uppercase text-sm">Individual</span>
                    </div>
                    <p className="text-xs text-cyber-gold/60">
                        Cada prestador vê apenas seu próprio repasse e faturamento.
                    </p>
                </button>

                {/* Option: COLETIVA */}
                <button
                    onClick={() => handleModeChange('COLETIVA')}
                    disabled={updateMutation.isPending}
                    className={`p-4 border text-left transition-all ${selectedMode === 'COLETIVA'
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-cyber-gold/30 hover:border-cyber-gold/60 bg-black/40'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded ${selectedMode === 'COLETIVA' ? 'bg-cyber-gold text-black' : 'bg-cyber-gold/10 text-cyber-gold'}`}>
                            <Building2 size={20} />
                        </div>
                        <span className="font-bold text-cyber-gold uppercase text-sm">Coletiva</span>
                    </div>
                    <p className="text-xs text-cyber-gold/60">
                        Todos os prestadores veem o repasse total da empresa.
                    </p>
                </button>
            </div>

            {updateMutation.isError && (
                <div className="text-red-400 text-xs font-mono bg-red-400/10 border border-red-400/30 p-2">
                    Erro ao atualizar configuração. Tente novamente.
                </div>
            )}
        </div>
    );
};
