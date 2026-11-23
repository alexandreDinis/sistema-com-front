import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, DollarSign, Percent, Briefcase, AlertCircle, Check } from 'lucide-react';
import { salarioFuncionarioService } from '../../services/salarioFuncionarioService';
import type { TipoRemuneracao, SalarioFuncionarioRequest } from '../../types';

interface SalarioFuncionarioFormProps {
    usuarioId: number;
    empresaId: number;
    onSaved?: () => void;
}

interface SalarioDraft {
    tipoRemuneracao: TipoRemuneracao;
    salarioBase: number;
    percentualComissao: number;
    dataInicio: string;
}

const TIPO_REMUNERACAO_OPTIONS: {
    value: TipoRemuneracao;
    label: string;
    icon: React.ReactNode;
    description: string;
}[] = [
    {
        value: 'COMISSAO',
        label: 'Repasse',
        icon: <Percent className="w-4 h-4" />,
        description: 'Baseado nas faixas de faturamento',
    },
    {
        value: 'SALARIO_FIXO',
        label: 'Repasse Fixo',
        icon: <DollarSign className="w-4 h-4" />,
        description: 'Valor fixo mensal',
    },
    {
        value: 'MISTA',
        label: 'Mista',
        icon: <Briefcase className="w-4 h-4" />,
        description: 'Valor base + % do faturamento',
    },
];

export const SalarioFuncionarioForm: React.FC<SalarioFuncionarioFormProps> = ({
    usuarioId,
    empresaId,
    onSaved,
}) => {
    const queryClient = useQueryClient();

    const { data: salarioExistente, isLoading } = useQuery({
        queryKey: ['salario-funcionario', usuarioId],
        queryFn: () => salarioFuncionarioService.getSalarioByUsuario(usuarioId),
        enabled: !!usuarioId,
        staleTime: 30_000,
    });

    const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

    const initialState = useMemo<SalarioDraft>(() => {
        if (salarioExistente) {
            return {
                tipoRemuneracao: salarioExistente.tipoRemuneracao,
                salarioBase: salarioExistente.salarioBase || 0,
                percentualComissao: salarioExistente.percentualComissao || 5,
                dataInicio: salarioExistente.dataInicio,
            };
        }
        return {
            tipoRemuneracao: 'COMISSAO',
            salarioBase: 0,
            percentualComissao: 5,
            dataInicio: todayIso,
        };
    }, [salarioExistente, todayIso]);

    const [draft, setDraft] = useState<SalarioDraft | null>(null);
    const current = draft ?? initialState;

    const updateDraft = (patch: Partial<SalarioDraft>) => {
        setDraft((prev) => ({ ...(prev ?? initialState), ...patch }));
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const data: SalarioFuncionarioRequest = {
                usuarioId,
                tipoRemuneracao: current.tipoRemuneracao,
                dataInicio: current.dataInicio,
                ...(current.tipoRemuneracao !== 'COMISSAO' && {
                    salarioBase: current.salarioBase,
                }),
                ...(current.tipoRemuneracao === 'MISTA' && {
                    percentualComissao: current.percentualComissao,
                }),
            };

            if (salarioExistente?.id) {
                return salarioFuncionarioService.updateSalario(salarioExistente.id, data);
            }
            return salarioFuncionarioService.createSalario(empresaId, data);
        },
        onSuccess: () => {
            setDraft(null);
            queryClient.invalidateQueries({ queryKey: ['salario-funcionario', usuarioId] });
            onSaved?.();
        },
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
            </div>
        );
    }

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3 py-2 text-sm text-white focus:border-cyber-gold focus:outline-none transition-colors';

    return (
        <div className="space-y-4 rounded-xl bg-zinc-900/50 border border-white/10 p-4">
            {/* Tipo de Remuneração */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TIPO_REMUNERACAO_OPTIONS.map((option) => {
                    const active = current.tipoRemuneracao === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => updateDraft({ tipoRemuneracao: option.value })}
                            className={`p-3 rounded-xl border text-left transition-all ${
                                active
                                    ? 'border-cyber-gold bg-cyber-gold/10'
                                    : 'border-white/10 hover:border-white/25 bg-zinc-950/60'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className={active ? 'text-cyber-gold' : 'text-zinc-400'}>
                                    {option.icon}
                                </span>
                                <span
                                    className={`font-semibold text-xs ${
                                        active ? 'text-cyber-gold' : 'text-zinc-200'
                                    }`}
                                >
                                    {option.label}
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 leading-snug">
                                {option.description}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Campos condicionais */}
            {current.tipoRemuneracao !== 'COMISSAO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">
                            Valor Base do Repasse (R$)
                        </label>
                        <input
                            type="number"
                            step="100"
                            min="0"
                            className={inputClass}
                            value={current.salarioBase}
                            onChange={(e) =>
                                updateDraft({ salarioBase: Number(e.target.value) })
                            }
                            placeholder="3500.00"
                        />
                    </div>

                    {current.tipoRemuneracao === 'MISTA' && (
                        <div>
                            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">
                                Percentual Comissão (%)
                            </label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className={inputClass}
                                value={current.percentualComissao}
                                onChange={(e) =>
                                    updateDraft({ percentualComissao: Number(e.target.value) })
                                }
                                placeholder="5"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Data de início */}
            <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 block">
                    Data de Início
                </label>
                <input
                    type="date"
                    className={inputClass}
                    value={current.dataInicio}
                    onChange={(e) => updateDraft({ dataInicio: e.target.value })}
                />
            </div>

            {/* Info Box */}
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/25 p-3">
                <div className="flex items-start gap-2 text-sky-300 text-xs">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                        {current.tipoRemuneracao === 'COMISSAO' && (
                            <p>
                                Este prestador receberá repasse baseado nas faixas de faturamento configuradas para a empresa.
                            </p>
                        )}
                        {current.tipoRemuneracao === 'SALARIO_FIXO' && (
                            <p>
                                Este prestador receberá R${' '}
                                {current.salarioBase.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                })}{' '}
                                por mês, independente do faturamento.
                            </p>
                        )}
                        {current.tipoRemuneracao === 'MISTA' && (
                            <p>
                                Este prestador receberá R${' '}
                                {current.salarioBase.toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                })}{' '}
                                fixo + {current.percentualComissao}% do faturamento.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="w-full py-2.5 rounded-xl bg-cyber-gold/15 hover:bg-cyber-gold text-cyber-gold hover:text-black border border-cyber-gold/40 transition-all font-semibold text-xs disabled:opacity-50"
            >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar Tipo de Remuneração'}
            </button>

            {saveMutation.isError && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
                    Não foi possível salvar a configuração de remuneração. Tente novamente.
                </div>
            )}

            {saveMutation.isSuccess && (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Configuração de remuneração salva com sucesso.</span>
                </div>
            )}
        </div>
    );
};
