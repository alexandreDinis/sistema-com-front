import React, { useState } from 'react';
import { useComissao } from '../../hooks/useComissao';
import { usePermission } from '../../hooks/usePermission';
import { ComissaoCard } from './ComissaoCard';

export const ComissaoDashboard: React.FC = () => {
    const today = new Date();
    const [ano, setAno] = useState(today.getFullYear());
    const [mes, setMes] = useState(today.getMonth() + 1);

    const { user } = usePermission();
    // Default to true if undefined (legacy users), only strictly false disables it
    const participaComissao = user?.participaComissao !== false;

    const { comissao, isLoading, error, forceSync } = useComissao(ano, mes, {
        enabled: participaComissao
    });

    const handlePreviousMonth = () => {
        if (mes === 1) {
            setMes(12);
            setAno(ano - 1);
        } else {
            setMes(mes - 1);
        }
    };

    const handleNextMonth = () => {
        if (mes === 12) {
            setMes(1);
            setAno(ano + 1);
        } else {
            setMes(mes + 1);
        }
    };

    const handleRefresh = async () => {
        console.log('🔄 Forçando sincronização...');
        await forceSync();
    };

    return (
        <div className="space-y-12 view-transition">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-8 border-b border-cyber-gold/20 relative">
                <div className="absolute bottom-0 left-0 w-24 h-px bg-cyber-gold shadow-[0_0_10px_var(--color-cyber-gold)]"></div>

                <div className="relative">
                    <span className="hud-label">SISTEMA_UNIFICADO_V2</span>
                    <h1 className="text-5xl font-black text-cyber-gold tracking-tighter italic glitch italic-shadow uppercase">
                        Painel Unificado
                    </h1>
                </div>

                <div className="flex flex-wrap gap-4 items-center justify-center">
                    <div className="flex items-center bg-black/40 border border-cyber-gold/20 p-1 relative">
                        <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-cyber-gold/40"></div>
                        <button
                            onClick={handlePreviousMonth}
                            className="w-12 h-12 flex items-center justify-center hover:bg-cyber-gold hover:text-black transition-all font-black text-xl italic"
                        >
                            {'<'}
                        </button>
                        <div className="px-8 flex flex-col items-center">
                            <span className="text-[8px] font-mono text-cyber-gold/40 tracking-[0.3em]">SINCR_PERÍODO</span>
                            <span className="text-lg font-black italic tracking-widest text-cyber-gold" id="mes-ano-label">
                                {mes.toString().padStart(2, '0')}.{ano}
                            </span>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="w-12 h-12 flex items-center justify-center hover:bg-cyber-gold hover:text-black transition-all font-black text-xl italic"
                        >
                            {'>'}
                        </button>
                    </div>


                    <button
                        onClick={handleRefresh}
                        disabled={isLoading || !participaComissao}
                        className="hud-button text-xs flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <><span className="animate-spin text-lg">⚙</span> SINCRONIZANDO...</>
                        ) : (
                            <><span className="text-lg">↺</span> FORÇAR_SINCR</>
                        )}
                    </button>
                </div>
            </div>

            {!participaComissao || (error as any)?.response?.status === 400 ? (
                <div className="hud-card top-brackets bottom-brackets p-16 text-center group bg-black/40 border border-slate-800">
                    <div className="static-overlay opacity-5"></div>
                    <div className="mb-6 flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                            <span className="text-3xl grayscale opacity-50">🛡️</span>
                        </div>
                    </div>
                    <h2 className="text-xl font-bold text-slate-200 tracking-wider mb-2">
                        Módulo de Comissão Não Habilitado
                    </h2>
                    <p className="text-slate-500 font-mono text-xs max-w-lg mx-auto leading-relaxed uppercase tracking-wide">
                        Seu perfil administrativo está configurado apenas para gestão (Valor Base do Repasse) e não participa do cálculo automático de repasses sobre vendas.
                    </p>
                    <div className="w-12 h-px bg-cyber-gold/20 mx-auto my-6"></div>
                    <p className="text-[10px] text-slate-600 uppercase">
                        STATUS: OPERACIONAL • SEM_COMISSIONAMENTO
                    </p>
                </div>
            ) : error ? (
                <div className="border border-cyber-error bg-cyber-error/5 p-6 text-cyber-error text-xs font-mono relative overflow-hidden hud-card bottom-brackets">
                    <div className="static-overlay opacity-10"></div>
                    <p className="font-black uppercase mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyber-error rounded-full animate-ping"></span>
                        Exceção_Crítica_Detectada
                    </p>
                    <p className="opacity-80">STDOUT: {(error as any)?.message || 'Erro desconhecido'}</p>
                </div>
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="w-64 h-1 bg-cyber-gold/5 relative overflow-hidden border border-cyber-gold/10">
                        <div className="absolute top-0 left-0 h-full bg-cyber-gold w-1/4 animate-[loading_2s_infinite_linear] shadow-[0_0_15px_var(--color-cyber-gold)]"></div>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-mono text-cyber-gold animate-pulse tracking-[0.4em] uppercase">Descriptografando fluxos seguros...</p>
                        <p className="text-[8px] font-mono text-cyber-gold/30 mt-2 uppercase">Conectando ao OROBOROS_OS High_Tier_Relay</p>
                    </div>
                </div>
            ) : comissao ? (
                <ComissaoCard comissao={comissao} onQuitado={handleRefresh} />
            ) : (
                <div className="hud-card top-brackets bottom-brackets p-16 text-center group bg-black/40">
                    <div className="static-overlay opacity-5"></div>
                    <p className="text-cyber-gold/60 font-mono text-sm uppercase tracking-[0.3em] font-black italic mb-4">
                        Exceção_Dados_Nulos: Nenhuma sequência encontrada
                    </p>
                    <div className="w-12 h-px bg-cyber-gold/20 mx-auto mb-6"></div>
                    <p className="text-[10px] text-cyber-gold/40 font-mono uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                        Pacotes de dados esperados ausentes para o período especificado. Inicialize os módulos de faturamento/crédito para prosseguir.
                    </p>
                </div>
            )}
        </div>
    );
};
