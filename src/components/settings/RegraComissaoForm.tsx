import React, { useMemo, useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    Calculator,
    Loader2,
    Plus,
    Save,
    Trash2,
    X,
} from 'lucide-react';
import type {
    FaixaComissaoConfig,
    RegraComissao,
    RegraComissaoRequest,
    TipoRegraComissao,
} from '../../types';
import {
    simularComissaoPorFaixas,
    validateRegraComissao,
} from '../../utils/comissaoRulesUtils';

interface RegraComissaoFormProps {
    regra?: RegraComissao | null;
    onSave: (data: RegraComissaoRequest) => Promise<void>;
    onClose: () => void;
    isSaving?: boolean;
    apiError?: string | null;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const DEFAULT_FAIXA: Omit<FaixaComissaoConfig, 'id'> = {
    minFaturamento: 0,
    maxFaturamento: null,
    porcentagem: 10,
    descricao: '',
};

export const RegraComissaoForm: React.FC<RegraComissaoFormProps> = ({
    regra,
    onSave,
    onClose,
    isSaving = false,
    apiError = null,
}) => {
    const isEditing = Boolean(regra);

    const [formData, setFormData] = useState<RegraComissaoRequest>(() => {
        if (!regra) {
            return {
                nome: '',
                tipoRegra: 'FAIXA_FATURAMENTO',
                descricao: '',
                dataInicio: new Date().toISOString().split('T')[0],
                faixas: [{ ...DEFAULT_FAIXA }],
            };
        }
        return {
            nome: regra.nome,
            tipoRegra: regra.tipoRegra,
            descricao: regra.descricao || '',
            dataInicio: regra.dataInicio,
            dataFim: regra.dataFim,
            faixas: regra.faixas.map((f) => ({
                minFaturamento: f.minFaturamento,
                maxFaturamento: f.maxFaturamento,
                porcentagem: f.porcentagem,
                descricao: f.descricao || '',
            })),
        };
    });

    const [errors, setErrors] = useState<string[]>([]);
    const [valorTeste, setValorTeste] = useState<number>(25000);

    const liveValidation = useMemo(() => validateRegraComissao(formData), [formData]);
    const preview = useMemo(
        () => simularComissaoPorFaixas(formData.faixas, valorTeste),
        [formData.faixas, valorTeste]
    );

    const addFaixa = () => {
        const ultima = formData.faixas[formData.faixas.length - 1];
        const novaFaixa: Omit<FaixaComissaoConfig, 'id'> = {
            minFaturamento: ultima?.maxFaturamento
                ? Number((ultima.maxFaturamento + 0.01).toFixed(2))
                : 0,
            maxFaturamento: null,
            porcentagem: ultima?.porcentagem || 10,
            descricao: `Faixa ${formData.faixas.length + 1}`,
        };
        setFormData((prev) => ({ ...prev, faixas: [...prev.faixas, novaFaixa] }));
    };

    const removeFaixa = (index: number) => {
        if (formData.faixas.length === 1) return;
        setFormData((prev) => ({
            ...prev,
            faixas: prev.faixas.filter((_, i) => i !== index),
        }));
    };

    const updateFaixa = (index: number, updates: Partial<Omit<FaixaComissaoConfig, 'id'>>) => {
        setErrors([]);
        setFormData((prev) => ({
            ...prev,
            faixas: prev.faixas.map((f, i) => (i === index ? { ...f, ...updates } : f)),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;

        const { errors: validationErrors } = validateRegraComissao(formData);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);
        await onSave({
            ...formData,
            nome: formData.nome.trim(),
            descricao: formData.descricao?.trim() || '',
        });
    };

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';
    const labelClass =
        'block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
            <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyber-gold/15 text-cyber-gold flex items-center justify-center">
                            <Calculator className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                {isEditing ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}
                            </h2>
                            <p className="text-xs text-zinc-400">
                                Configure vigência, faixas de faturamento e valide o cálculo.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
                    {/* Validation Errors */}
                    {errors.length > 0 && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5">
                            <div className="flex items-start gap-2.5 text-red-300">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <ul className="text-xs space-y-1">
                                    {errors.map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* API Error */}
                    {apiError && (
                        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 flex items-center gap-2.5 text-xs text-red-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{apiError}</span>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                            Informações Básicas
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nome da Regra *</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={120}
                                    className={inputClass}
                                    value={formData.nome}
                                    onChange={(e) =>
                                        setFormData((prev) => ({ ...prev, nome: e.target.value }))
                                    }
                                    placeholder="Ex: Tabela Progressiva 2026"
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Tipo de Regra</label>
                                <select
                                    className={inputClass}
                                    value={formData.tipoRegra}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            tipoRegra: e.target.value as TipoRegraComissao,
                                        }))
                                    }
                                >
                                    <option value="FAIXA_FATURAMENTO" className="bg-zinc-950">
                                        Faixas de Faturamento
                                    </option>
                                    <option value="FIXA_FUNCIONARIO" className="bg-zinc-950">
                                        Fixa por Prestador
                                    </option>
                                    <option value="FIXA_EMPRESA" className="bg-zinc-950">
                                        Fixa da Empresa
                                    </option>
                                    <option value="HIBRIDA" className="bg-zinc-950">
                                        Híbrida
                                    </option>
                                </select>
                            </div>

                            <div>
                                <label className={labelClass}>Data de Início *</label>
                                <input
                                    type="date"
                                    required
                                    className={inputClass}
                                    value={formData.dataInicio}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            dataInicio: e.target.value,
                                        }))
                                    }
                                />
                            </div>

                            <div>
                                <label className={labelClass}>Data de Fim (opcional)</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={formData.dataFim || ''}
                                    onChange={(e) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            dataFim: e.target.value || undefined,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Descrição (opcional)</label>
                            <textarea
                                className={`${inputClass} resize-none`}
                                rows={2}
                                maxLength={300}
                                value={formData.descricao}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                                }
                                placeholder="Descreva os critérios desta regra..."
                            />
                        </div>
                    </div>

                    {/* Faixas */}
                    {formData.tipoRegra === 'FAIXA_FATURAMENTO' && (
                        <>
                            <div className="border-t border-white/10" />
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                                        Faixas de Comissão
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addFaixa}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyber-gold/15 hover:bg-cyber-gold/25 border border-cyber-gold/30 text-xs font-semibold text-cyber-gold transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Adicionar Faixa</span>
                                    </button>
                                </div>

                                {liveValidation.warnings.length > 0 && (
                                    <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 flex items-start gap-2.5 text-xs text-amber-200">
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            {liveValidation.warnings.map((w, i) => (
                                                <p key={i}>{w}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {formData.faixas.map((faixa, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl bg-zinc-900/70 border border-white/10 p-3.5 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-cyber-gold">
                                                    Faixa {idx + 1}
                                                </span>
                                                {formData.faixas.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFaixa(idx)}
                                                        className="p-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                                        aria-label={`Remover faixa ${idx + 1}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                                                        Mínimo (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className={inputClass}
                                                        value={faixa.minFaturamento}
                                                        onChange={(e) =>
                                                            updateFaixa(idx, {
                                                                minFaturamento: Number(e.target.value),
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                                                        Máximo (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className={inputClass}
                                                        value={faixa.maxFaturamento ?? ''}
                                                        onChange={(e) =>
                                                            updateFaixa(idx, {
                                                                maxFaturamento: e.target.value
                                                                    ? Number(e.target.value)
                                                                    : null,
                                                            })
                                                        }
                                                        placeholder="Sem limite"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                                                        Percentual (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        min="0"
                                                        max="100"
                                                        className={inputClass}
                                                        value={faixa.porcentagem}
                                                        onChange={(e) =>
                                                            updateFaixa(idx, {
                                                                porcentagem: Number(e.target.value),
                                                            })
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                                                        Descrição
                                                    </label>
                                                    <input
                                                        type="text"
                                                        maxLength={60}
                                                        className={inputClass}
                                                        value={faixa.descricao || ''}
                                                        onChange={(e) =>
                                                            updateFaixa(idx, {
                                                                descricao: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Opcional"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Calculator */}
                            <div className="rounded-xl bg-cyber-gold/5 border border-cyber-gold/25 p-4 space-y-3">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold flex items-center gap-1.5">
                                    <Calculator className="w-3.5 h-3.5" />
                                    <span>Simular Regra</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <label className="text-[11px] text-zinc-400 block mb-1">
                                            Faturamento de Teste (R$)
                                        </label>
                                        <input
                                            type="number"
                                            step="500"
                                            min="0"
                                            className={inputClass}
                                            value={valorTeste}
                                            onChange={(e) => setValorTeste(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="rounded-xl bg-black/35 border border-white/10 p-3 text-center">
                                        {preview.faixa ? (
                                            <>
                                                <p className="text-xs text-zinc-400">
                                                    {preview.faixa.descricao ||
                                                        `${preview.faixa.porcentagem}%`}{' '}
                                                    ({preview.faixa.porcentagem}%)
                                                </p>
                                                <p className="text-xl font-bold text-emerald-400 mt-0.5 tabular-nums">
                                                    {formatCurrency(preview.comissao)}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-red-400 font-medium">
                                                Nenhuma faixa aplicável para este valor
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black text-sm font-semibold transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Salvar Regra</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
