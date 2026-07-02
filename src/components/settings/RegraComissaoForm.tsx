import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Calculator, AlertCircle } from 'lucide-react';
import type { RegraComissao, RegraComissaoRequest, FaixaComissaoConfig, TipoRegraComissao } from '../../types';

interface RegraComissaoFormProps {
    regra?: RegraComissao | null;
    onSave: (data: RegraComissaoRequest) => Promise<void>;
    onClose: () => void;
    isSaving?: boolean;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const DEFAULT_FAIXA: Omit<FaixaComissaoConfig, 'id'> = {
    minFaturamento: 0,
    maxFaturamento: null,
    porcentagem: 10,
    descricao: ''
};

export const RegraComissaoForm: React.FC<RegraComissaoFormProps> = ({
    regra,
    onSave,
    onClose,
    isSaving = false
}) => {
    const isEditing = !!regra;

    const [formData, setFormData] = useState<RegraComissaoRequest>({
        nome: '',
        tipoRegra: 'FAIXA_FATURAMENTO',
        descricao: '',
        dataInicio: new Date().toISOString().split('T')[0],
        faixas: [{ ...DEFAULT_FAIXA }]
    });

    const [errors, setErrors] = useState<string[]>([]);
    const [valorTeste, setValorTeste] = useState<number>(25000);

    useEffect(() => {
        if (regra) {
            setFormData({
                nome: regra.nome,
                tipoRegra: regra.tipoRegra,
                descricao: regra.descricao || '',
                dataInicio: regra.dataInicio,
                dataFim: regra.dataFim,
                faixas: regra.faixas.map(f => ({
                    minFaturamento: f.minFaturamento,
                    maxFaturamento: f.maxFaturamento,
                    porcentagem: f.porcentagem,
                    descricao: f.descricao || ''
                }))
            });
        }
    }, [regra]);

    // Validar faixas
    const validateFaixas = (faixas: Omit<FaixaComissaoConfig, 'id'>[]): string[] => {
        const erros: string[] = [];

        // Ordenar por minFaturamento para validação
        const sorted = [...faixas].sort((a, b) => a.minFaturamento - b.minFaturamento);

        // 1. Validar sobreposição
        for (let i = 0; i < sorted.length - 1; i++) {
            const atual = sorted[i];
            const proxima = sorted[i + 1];

            if (atual.maxFaturamento !== null && proxima.minFaturamento <= atual.maxFaturamento) {
                erros.push(`Faixa ${i + 1} se sobrepõe à faixa ${i + 2}`);
            }
        }

        // 2. Validar percentuais
        faixas.forEach((faixa, idx) => {
            if (faixa.porcentagem < 0 || faixa.porcentagem > 100) {
                erros.push(`Percentual da faixa ${idx + 1} deve estar entre 0% e 100%`);
            }
        });

        // 3. Validar valores mínimos
        faixas.forEach((faixa, idx) => {
            if (faixa.minFaturamento < 0) {
                erros.push(`Valor mínimo da faixa ${idx + 1} não pode ser negativo`);
            }
            if (faixa.maxFaturamento !== null && faixa.maxFaturamento <= faixa.minFaturamento) {
                erros.push(`Valor máximo da faixa ${idx + 1} deve ser maior que o mínimo`);
            }
        });

        return erros;
    };

    // Preview de cálculo
    const calcularComissaoPreview = (valor: number) => {
        const faixa = formData.faixas.find(f =>
            valor >= f.minFaturamento &&
            (f.maxFaturamento === null || valor <= f.maxFaturamento)
        );

        if (!faixa) return { faixa: null, comissao: 0 };

        return {
            faixa,
            comissao: valor * (faixa.porcentagem / 100)
        };
    };

    const addFaixa = () => {
        const ultima = formData.faixas[formData.faixas.length - 1];
        const novaFaixa: Omit<FaixaComissaoConfig, 'id'> = {
            minFaturamento: ultima?.maxFaturamento ? ultima.maxFaturamento + 0.01 : 0,
            maxFaturamento: null,
            porcentagem: ultima?.porcentagem || 10,
            descricao: `Faixa ${formData.faixas.length + 1}`
        };
        setFormData(prev => ({ ...prev, faixas: [...prev.faixas, novaFaixa] }));
    };

    const removeFaixa = (index: number) => {
        if (formData.faixas.length === 1) return;
        setFormData(prev => ({
            ...prev,
            faixas: prev.faixas.filter((_, i) => i !== index)
        }));
    };

    const updateFaixa = (index: number, updates: Partial<Omit<FaixaComissaoConfig, 'id'>>) => {
        setFormData(prev => ({
            ...prev,
            faixas: prev.faixas.map((f, i) => i === index ? { ...f, ...updates } : f)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar
        const validationErrors = validateFaixas(formData.faixas);
        if (!formData.nome.trim()) {
            validationErrors.unshift('Nome da regra é obrigatório');
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setErrors([]);
        await onSave(formData);
    };

    const preview = calcularComissaoPreview(valorTeste);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-black border border-cyber-gold/40 w-full max-w-2xl shadow-[0_0_50px_rgba(212,175,55,0.2)] relative my-8">
                {/* Decorative Borders */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-gold"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-gold"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyber-gold"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-gold"></div>

                {/* Header */}
                <div className="bg-cyber-gold/10 p-4 border-b border-cyber-gold/20 flex justify-between items-center">
                    <h2 className="text-xl font-black text-cyber-gold uppercase tracking-wider flex items-center gap-2">
                        <Calculator size={20} />
                        {isEditing ? 'Editar Regra de Comissão' : 'Nova Regra de Comissão'}
                    </h2>
                    <button onClick={onClose} className="text-cyber-gold/60 hover:text-cyber-gold transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-sm">
                            <div className="flex items-start gap-2 text-red-400">
                                <AlertCircle size={16} className="mt-0.5" />
                                <ul className="text-xs space-y-1">
                                    {errors.map((err, i) => <li key={i}>• {err}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest border-b border-cyber-gold/10 pb-1">
                            Informações Básicas
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="hud-label mb-1 block">Nome da Regra *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                                    value={formData.nome}
                                    onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                                    placeholder="Ex: Faixas 2026"
                                />
                            </div>

                            <div>
                                <label className="hud-label mb-1 block">Tipo de Regra</label>
                                <select
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                                    value={formData.tipoRegra}
                                    onChange={e => setFormData(prev => ({ ...prev, tipoRegra: e.target.value as TipoRegraComissao }))}
                                >
                                    <option value="FAIXA_FATURAMENTO">Faixas de Faturamento</option>
                                    <option value="FIXA_FUNCIONARIO">Fixa por Prestador</option>
                                    <option value="FIXA_EMPRESA">Fixa da Empresa</option>
                                    <option value="HIBRIDA">Híbrida</option>
                                </select>
                            </div>

                            <div>
                                <label className="hud-label mb-1 block">Data de Início</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                                    value={formData.dataInicio}
                                    onChange={e => setFormData(prev => ({ ...prev, dataInicio: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="hud-label mb-1 block">Data de Fim (opcional)</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                                    value={formData.dataFim || ''}
                                    onChange={e => setFormData(prev => ({ ...prev, dataFim: e.target.value || undefined }))}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="hud-label mb-1 block">Descrição (opcional)</label>
                            <textarea
                                className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors resize-none"
                                rows={2}
                                value={formData.descricao}
                                onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                                placeholder="Descreva esta regra de comissão..."
                            />
                        </div>
                    </div>

                    {/* Faixas */}
                    {formData.tipoRegra === 'FAIXA_FATURAMENTO' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-cyber-gold/10 pb-1">
                                <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest">
                                    Faixas de Comissão
                                </h3>
                                <button
                                    type="button"
                                    onClick={addFaixa}
                                    className="text-xs text-cyber-gold hover:bg-cyber-gold/10 px-2 py-1 border border-cyber-gold/30 rounded-sm flex items-center gap-1 transition-colors"
                                >
                                    <Plus size={12} /> Adicionar
                                </button>
                            </div>

                            <div className="space-y-3">
                                {formData.faixas.map((faixa, idx) => (
                                    <div key={idx} className="bg-black/40 border border-cyber-gold/20 p-3 rounded-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-cyber-gold/70">Faixa {idx + 1}</span>
                                            {formData.faixas.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeFaixa(idx)}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                            <div>
                                                <label className="text-[10px] text-cyber-gold/40 uppercase">Mínimo (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-1.5 text-sm outline-none focus:border-cyber-gold"
                                                    value={faixa.minFaturamento}
                                                    onChange={e => updateFaixa(idx, { minFaturamento: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-cyber-gold/40 uppercase">Máximo (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-1.5 text-sm outline-none focus:border-cyber-gold"
                                                    value={faixa.maxFaturamento ?? ''}
                                                    onChange={e => updateFaixa(idx, { maxFaturamento: e.target.value ? Number(e.target.value) : null })}
                                                    placeholder="∞"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-cyber-gold/40 uppercase">Percentual (%)</label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="100"
                                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-1.5 text-sm outline-none focus:border-cyber-gold"
                                                    value={faixa.porcentagem}
                                                    onChange={e => updateFaixa(idx, { porcentagem: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-cyber-gold/40 uppercase">Descrição</label>
                                                <input
                                                    type="text"
                                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-1.5 text-sm outline-none focus:border-cyber-gold"
                                                    value={faixa.descricao || ''}
                                                    onChange={e => updateFaixa(idx, { descricao: e.target.value })}
                                                    placeholder="Opcional"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview Calculator */}
                    <div className="bg-cyber-gold/5 border border-cyber-gold/20 p-4 rounded-sm">
                        <h4 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Calculator size={14} /> Teste a Regra
                        </h4>
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-[10px] text-cyber-gold/40 uppercase">Faturamento de Teste</label>
                                <input
                                    type="number"
                                    step="100"
                                    min="0"
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold"
                                    value={valorTeste}
                                    onChange={e => setValorTeste(Number(e.target.value))}
                                />
                            </div>
                            <div className="flex-1 text-center">
                                {preview.faixa ? (
                                    <div>
                                        <div className="text-xs text-cyber-gold/50">Faixa: {preview.faixa.descricao || `${preview.faixa.porcentagem}%`}</div>
                                        <div className="text-lg font-bold text-green-400">{formatCurrency(preview.comissao)}</div>
                                    </div>
                                ) : (
                                    <div className="text-xs text-red-400">Nenhuma faixa aplicável</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-cyber-gold/20">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-cyber-gold/60 hover:text-cyber-gold transition-colors font-mono text-sm uppercase"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-cyber-gold hover:bg-yellow-400 text-black px-6 py-2 rounded-sm font-bold flex items-center gap-2 transition-all font-oxanium uppercase tracking-wider disabled:opacity-50"
                        >
                            {isSaving ? 'Salvando...' : (
                                <>
                                    <Save size={16} /> Salvar
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
