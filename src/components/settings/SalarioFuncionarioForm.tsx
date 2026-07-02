import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, DollarSign, Percent, Briefcase, AlertCircle, Check } from 'lucide-react';
import { salarioFuncionarioService } from '../../services/salarioFuncionarioService';
import type { TipoRemuneracao, SalarioFuncionarioRequest } from '../../types';

interface SalarioFuncionarioFormProps {
    usuarioId: number;
    empresaId: number;
    onSaved?: () => void;
}

const TIPO_REMUNERACAO_OPTIONS: { value: TipoRemuneracao; label: string; icon: React.ReactNode; description: string }[] = [
    {
        value: 'COMISSAO',
        label: 'Repasse',
        icon: <Percent size={16} />,
        description: 'Recebe baseado nas faixas de faturamento'
    },
    {
        value: 'SALARIO_FIXO',
        label: 'Repasse Fixo',
        icon: <DollarSign size={16} />,
        description: 'Recebe valor fixo mensal'
    },
    {
        value: 'MISTA',
        label: 'Mista',
        icon: <Briefcase size={16} />,
        description: 'Valor base + percentual do faturamento'
    }
];

export const SalarioFuncionarioForm: React.FC<SalarioFuncionarioFormProps> = ({
    usuarioId,
    empresaId,
    onSaved
}) => {
    const queryClient = useQueryClient();

    const { data: salarioExistente, isLoading } = useQuery({
        queryKey: ['salario-funcionario', usuarioId],
        queryFn: () => salarioFuncionarioService.getSalarioByUsuario(usuarioId),
        enabled: !!usuarioId
    });

    const [tipoRemuneracao, setTipoRemuneracao] = useState<TipoRemuneracao>('COMISSAO');
    const [salarioBase, setSalarioBase] = useState<number>(0);
    const [percentualComissao, setPercentualComissao] = useState<number>(5);
    const [dataInicio, setDataInicio] = useState<string>(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (salarioExistente) {
            setTipoRemuneracao(salarioExistente.tipoRemuneracao);
            setSalarioBase(salarioExistente.salarioBase || 0);
            setPercentualComissao(salarioExistente.percentualComissao || 5);
            setDataInicio(salarioExistente.dataInicio);
        }
    }, [salarioExistente]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            const data: SalarioFuncionarioRequest = {
                usuarioId,
                tipoRemuneracao,
                dataInicio,
                ...(tipoRemuneracao !== 'COMISSAO' && { salarioBase }),
                ...(tipoRemuneracao === 'MISTA' && { percentualComissao })
            };

            if (salarioExistente?.id) {
                return salarioFuncionarioService.updateSalario(salarioExistente.id, data);
            }
            return salarioFuncionarioService.createSalario(empresaId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['salario-funcionario', usuarioId] });
            onSaved?.();
        }
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Tipo de Remuneração */}
            <div className="grid grid-cols-3 gap-2">
                {TIPO_REMUNERACAO_OPTIONS.map(option => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setTipoRemuneracao(option.value)}
                        className={`p-3 border text-left transition-all ${tipoRemuneracao === option.value
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-cyber-gold/30 hover:border-cyber-gold/60 bg-black/40'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`${tipoRemuneracao === option.value ? 'text-cyber-gold' : 'text-cyber-gold/50'}`}>
                                {option.icon}
                            </div>
                            <span className="font-bold text-cyber-gold text-xs uppercase">{option.label}</span>
                        </div>
                        <p className="text-[10px] text-cyber-gold/50 leading-tight">{option.description}</p>
                    </button>
                ))}
            </div>

            {/* Campos condicionais */}
            {tipoRemuneracao !== 'COMISSAO' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] text-cyber-gold/50 uppercase tracking-wider mb-1 block">
                            Valor Base do Repasse (R$)
                        </label>
                        <input
                            type="number"
                            step="100"
                            min="0"
                            className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors font-mono"
                            value={salarioBase}
                            onChange={e => setSalarioBase(Number(e.target.value))}
                            placeholder="3500.00"
                        />
                    </div>

                    {tipoRemuneracao === 'MISTA' && (
                        <div>
                            <label className="text-[10px] text-cyber-gold/50 uppercase tracking-wider mb-1 block">
                                Percentual Comissão (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors font-mono"
                                value={percentualComissao}
                                onChange={e => setPercentualComissao(Number(e.target.value))}
                                placeholder="5"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Data de início */}
            <div>
                <label className="text-[10px] text-cyber-gold/50 uppercase tracking-wider mb-1 block">
                    Data de Início
                </label>
                <input
                    type="date"
                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-sm">
                <div className="flex items-start gap-2 text-blue-400 text-xs">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <div>
                        {tipoRemuneracao === 'COMISSAO' && (
                            <p>Este prestador receberá repasse baseado nas faixas de faturamento configuradas para a empresa.</p>
                        )}
                        {tipoRemuneracao === 'SALARIO_FIXO' && (
                            <p>Este prestador receberá R$ {salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por mês, independente do faturamento.</p>
                        )}
                        {tipoRemuneracao === 'MISTA' && (
                            <p>Este prestador receberá R$ {salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} fixo + {percentualComissao}% do faturamento.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full bg-cyber-gold/10 border border-cyber-gold text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all font-bold uppercase text-xs tracking-wider py-2 disabled:opacity-50"
            >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Tipo de Remuneração'}
            </button>

            {saveMutation.isError && (
                <div className="text-red-400 text-xs font-mono bg-red-400/10 border border-red-400/30 p-2">
                    Erro ao salvar configuração. Tente novamente.
                </div>
            )}

            {saveMutation.isSuccess && (
                <div className="text-green-400 text-xs font-mono bg-green-400/10 border border-green-400/30 p-2 flex items-center gap-2">
                    <Check className="w-4 h-4" /> Configuração salva com sucesso!
                </div>
            )}
        </div>
    );
};
