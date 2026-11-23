import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowLeft,
    Building2,
    Calculator,
    CheckCircle2,
    Loader2,
    MapPin,
    Percent,
    Save,
    Table2,
} from 'lucide-react';
import { empresaService } from '../../services/empresaService';
import type { RegimeTributario, UF } from '../../types';
import {
    getAliquotaWarning,
    hasTributacaoChanges,
    parseAliquotaDecimal,
    simularImpactoTributario,
    type TributacaoFormValues,
} from '../../utils/tributacaoUtils';

const REGIMES: { value: RegimeTributario; label: string; descricao: string }[] = [
    {
        value: 'SIMPLES_NACIONAL',
        label: 'Simples Nacional',
        descricao: 'Micro e pequenas empresas — alíquota por faixa de receita',
    },
    {
        value: 'LUCRO_PRESUMIDO',
        label: 'Lucro Presumido',
        descricao: 'Empresas com receita até R$ 78 milhões/ano',
    },
    {
        value: 'LUCRO_REAL',
        label: 'Lucro Real',
        descricao: 'Apuração sobre o lucro real ou receita acima de R$ 78M/ano',
    },
    {
        value: 'MEI',
        label: 'MEI',
        descricao: 'Microempreendedor Individual — guia fixa mensal',
    },
];

const ESTADOS: { value: UF; label: string }[] = [
    { value: 'AC', label: 'Acre' },
    { value: 'AL', label: 'Alagoas' },
    { value: 'AP', label: 'Amapá' },
    { value: 'AM', label: 'Amazonas' },
    { value: 'BA', label: 'Bahia' },
    { value: 'CE', label: 'Ceará' },
    { value: 'DF', label: 'Distrito Federal' },
    { value: 'ES', label: 'Espírito Santo' },
    { value: 'GO', label: 'Goiás' },
    { value: 'MA', label: 'Maranhão' },
    { value: 'MT', label: 'Mato Grosso' },
    { value: 'MS', label: 'Mato Grosso do Sul' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'PA', label: 'Pará' },
    { value: 'PB', label: 'Paraíba' },
    { value: 'PR', label: 'Paraná' },
    { value: 'PE', label: 'Pernambuco' },
    { value: 'PI', label: 'Piauí' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'RN', label: 'Rio Grande do Norte' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'RO', label: 'Rondônia' },
    { value: 'RR', label: 'Roraima' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'SP', label: 'São Paulo' },
    { value: 'SE', label: 'Sergipe' },
    { value: 'TO', label: 'Tocantins' },
];

const SIMPLES_ANEXO_III = [
    { faixa: 'Até R$ 180.000', rate: 6.0 },
    { faixa: 'R$ 180.000 a R$ 360.000', rate: 11.2 },
    { faixa: 'R$ 360.000 a R$ 720.000', rate: 13.5 },
    { faixa: 'R$ 720.000 a R$ 1.800.000', rate: 16.0 },
    { faixa: 'R$ 1.800.000 a R$ 3.600.000', rate: 21.0 },
    { faixa: 'R$ 3.600.000 a R$ 4.800.000', rate: 33.0 },
];

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export default function TributacaoPage() {
    const queryClient = useQueryClient();

    const { data: config, isLoading, isError, refetch } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const initialForm = useMemo<TributacaoFormValues>(() => {
        return {
            aliquotaPercent:
                config?.aliquotaImposto !== undefined
                    ? (config.aliquotaImposto * 100).toFixed(2)
                    : '6.00',
            regime: config?.regimeTributario || 'SIMPLES_NACIONAL',
            uf: config?.uf || '',
        };
    }, [config]);

    const [draft, setDraft] = useState<TributacaoFormValues | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [simFaturamento, setSimFaturamento] = useState<number>(30000);

    const form = draft ?? initialForm;
    const isDirty = useMemo(() => hasTributacaoChanges(form, initialForm), [form, initialForm]);
    const aliquotaWarning = useMemo(
        () => getAliquotaWarning(form.aliquotaPercent),
        [form.aliquotaPercent]
    );
    const simResult = useMemo(
        () => simularImpactoTributario(simFaturamento, form.aliquotaPercent),
        [simFaturamento, form.aliquotaPercent]
    );

    const saveMutation = useMutation({
        mutationFn: () => {
            const aliquotaDecimal = parseAliquotaDecimal(form.aliquotaPercent);
            if (aliquotaDecimal === null) {
                throw new Error('Alíquota inválida');
            }
            return empresaService.updateConfig({
                aliquotaImposto: aliquotaDecimal,
                regimeTributario: form.regime,
                uf: form.uf || undefined,
            });
        },
        onSuccess: () => {
            setDraft(null);
            setValidationError(null);
            queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
            queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        },
    });

    const updateForm = (patch: Partial<TributacaoFormValues>) => {
        setValidationError(null);
        if (saveMutation.isSuccess || saveMutation.isError) {
            saveMutation.reset();
        }
        setDraft((prev) => ({ ...(prev ?? initialForm), ...patch }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (saveMutation.isPending) return;

        const decimal = parseAliquotaDecimal(form.aliquotaPercent);
        if (decimal === null) {
            setValidationError('Alíquota inválida. Informe um valor entre 0% e 100%.');
            return;
        }
        saveMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex items-center justify-center gap-3 text-zinc-400 text-sm">
                <Loader2 className="w-5 h-5 text-cyber-gold animate-spin" />
                <span>Carregando configurações tributárias...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-red-200 text-sm">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <span>Não foi possível carregar as configurações tributárias.</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';

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
                <span className="text-zinc-200 font-medium">Tributação</span>
            </div>

            {/* Header */}
            <header className="pb-5 border-b border-white/10">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    Configuração Tributária
                </h1>
                <p className="text-sm text-zinc-400 mt-1">
                    Defina o regime, a alíquota aplicada ao cálculo do DRE e a UF da empresa.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Main Form */}
                <form
                    onSubmit={handleSave}
                    className="lg:col-span-7 rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 space-y-6 min-w-0"
                >
                    <div className="pb-4 border-b border-white/10">
                        <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-cyber-gold shrink-0" />
                            <span>Parâmetros Fiscais</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Empresa: {config?.razaoSocial || config?.nome || 'Empresa cadastrada'}
                        </p>
                    </div>

                    {/* Regime Tributário Cards */}
                    <div>
                        <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                            Regime Tributário
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {REGIMES.map((item) => {
                                const selected = form.regime === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => updateForm({ regime: item.value })}
                                        className={`text-left rounded-xl p-3.5 border transition-all ${
                                            selected
                                                ? 'border-cyber-gold bg-cyber-gold/10'
                                                : 'border-white/10 bg-zinc-950/60 hover:border-cyber-gold/40'
                                        }`}
                                    >
                                        <span
                                            className={`block text-sm font-semibold ${
                                                selected ? 'text-cyber-gold' : 'text-white'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                        <span className="block text-xs text-zinc-400 mt-1 leading-snug">
                                            {item.descricao}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Alíquota & UF */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                <Percent className="w-3.5 h-3.5 text-cyber-gold" />
                                <span>Alíquota de Imposto (%)</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={form.aliquotaPercent}
                                    onChange={(e) =>
                                        updateForm({ aliquotaPercent: e.target.value })
                                    }
                                    className={`${inputClass} pr-9 tabular-nums`}
                                    placeholder="6.00"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-semibold">
                                    %
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-1.5">
                                Usada automaticamente no cálculo de imposto do DRE.
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                <MapPin className="w-3.5 h-3.5 text-cyber-gold" />
                                <span>Estado (UF)</span>
                            </label>
                            <select
                                value={form.uf}
                                onChange={(e) => updateForm({ uf: e.target.value as UF | '' })}
                                className={inputClass}
                            >
                                <option value="" className="bg-zinc-950">
                                    Selecione o estado
                                </option>
                                {ESTADOS.map((estado) => (
                                    <option
                                        key={estado.value}
                                        value={estado.value}
                                        className="bg-zinc-950"
                                    >
                                        {estado.label} ({estado.value})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Atypical Rate Warning */}
                    {aliquotaWarning && (
                        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-200">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{aliquotaWarning}</span>
                        </div>
                    )}

                    {/* Validation / API Feedback */}
                    {validationError && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {saveMutation.isError && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Não foi possível salvar as configurações tributárias. Tente novamente.</span>
                        </div>
                    )}

                    {saveMutation.isSuccess && !isDirty && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>Configurações tributárias salvas com sucesso.</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div
                        className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 ${
                            isDirty
                                ? 'rounded-xl bg-cyber-gold/10 border border-cyber-gold/30 p-3.5'
                                : ''
                        }`}
                    >
                        {isDirty ? (
                            <span className="text-xs font-medium text-amber-200 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-cyber-gold shrink-0" />
                                Você possui alterações não salvas.
                            </span>
                        ) : (
                            <span className="text-xs text-zinc-500">
                                Consulte seu contador para validar a alíquota efetiva.
                            </span>
                        )}

                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Salvar Configurações</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Right Column: DRE Impact Simulator + Reference Table */}
                <aside className="lg:col-span-5 space-y-6 min-w-0">
                    {/* Simulator */}
                    <div className="rounded-2xl bg-zinc-900/75 border border-cyber-gold/30 p-5 sm:p-6 space-y-4">
                        <div>
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-cyber-gold shrink-0" />
                                <span>Simulador de Impacto no DRE</span>
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">
                                Veja quanto a alíquota configurada representa sobre o faturamento mensal.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                Faturamento Mensal de Exemplo (R$)
                            </label>
                            <input
                                type="number"
                                step="1000"
                                min="0"
                                value={simFaturamento}
                                onChange={(e) => setSimFaturamento(Number(e.target.value))}
                                className={`${inputClass} tabular-nums font-semibold`}
                            />
                        </div>

                        <div className="rounded-xl bg-cyber-gold/10 border border-cyber-gold/25 p-4 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-400">Alíquota aplicada</span>
                                <span className="font-bold text-cyber-gold tabular-nums">
                                    {simResult.aliquotaPct.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                    %
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-zinc-400">Imposto estimado no DRE</span>
                                <span className="font-bold text-rose-400 tabular-nums">
                                    - {formatCurrency(simResult.imposto)}
                                </span>
                            </div>
                            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                <span className="text-zinc-300 font-medium">Receita após imposto</span>
                                <span className="font-bold text-emerald-400 tabular-nums">
                                    {formatCurrency(simResult.receitaLiquida)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reference Table */}
                    <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Table2 className="w-4 h-4 text-cyber-gold shrink-0" />
                            <span>Referência — Simples Nacional (Anexo III)</span>
                        </h3>
                        <p className="text-xs text-zinc-400 mt-1 mb-4">
                            Clique em uma faixa para preencher a alíquota como referência.
                        </p>

                        <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-zinc-400">
                                        <th className="text-left px-3 py-2 font-semibold">
                                            Receita Bruta (12 meses)
                                        </th>
                                        <th className="text-right px-3 py-2 font-semibold">
                                            Alíquota
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {SIMPLES_ANEXO_III.map((row) => (
                                        <tr
                                            key={row.faixa}
                                            onClick={() =>
                                                updateForm({ aliquotaPercent: row.rate.toFixed(2) })
                                            }
                                            className="border-b border-white/5 last:border-0 hover:bg-cyber-gold/10 cursor-pointer transition-colors"
                                        >
                                            <td className="px-3 py-2.5 text-zinc-300">{row.faixa}</td>
                                            <td className="px-3 py-2.5 text-right font-semibold text-cyber-gold tabular-nums whitespace-nowrap">
                                                {row.rate.toLocaleString('pt-BR', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                                %
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-3">
                            Valores de referência nominal. Confirme a alíquota efetiva com seu contador.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
