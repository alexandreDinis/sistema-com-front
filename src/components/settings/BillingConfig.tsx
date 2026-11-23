import React, { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Building2,
    Check,
    CreditCard,
    FileText,
    Loader2,
    QrCode,
    Save,
} from 'lucide-react';
import { empresaService } from '../../services/empresaService';
import {
    formatTipoContaLabel,
    getCompanyInitials,
    hasBillingChanges,
    maskCNPJ,
    maskPhone,
    validateBillingForm,
    type BillingFormValues,
} from '../../utils/empresaConfigUtils';

const PIX_TIPOS = [
    { value: '', label: 'Selecione...' },
    { value: 'CPF', label: 'CPF' },
    { value: 'CNPJ', label: 'CNPJ' },
    { value: 'EMAIL', label: 'E-mail' },
    { value: 'TELEFONE', label: 'Telefone' },
    { value: 'ALEATORIA', label: 'Chave Aleatória' },
];

const TIPO_CONTA_OPTIONS = [
    { value: '', label: 'Selecione...' },
    { value: 'CORRENTE', label: 'Corrente' },
    { value: 'POUPANCA', label: 'Poupança' },
];

const EMPTY_FORM: BillingFormValues = {
    razaoSocial: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    pixTipo: '',
    pixChave: '',
    banco: '',
    agencia: '',
    conta: '',
    tipoConta: '',
};

export const BillingConfig: React.FC = () => {
    const queryClient = useQueryClient();

    const { data: config, isLoading } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const initialForm = useMemo<BillingFormValues>(() => {
        if (!config) return EMPTY_FORM;
        return {
            razaoSocial: config.razaoSocial || '',
            cnpj: config.cnpj ? maskCNPJ(config.cnpj) : '',
            telefone: config.telefone ? maskPhone(config.telefone) : '',
            email: config.email || '',
            endereco: config.endereco || '',
            pixTipo: config.pixTipo || '',
            pixChave: config.pixChave || '',
            banco: config.banco || '',
            agencia: config.agencia || '',
            conta: config.conta || '',
            tipoConta: config.tipoConta || '',
        };
    }, [config]);

    const [draft, setDraft] = useState<BillingFormValues | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const form = draft ?? initialForm;
    const isDirty = useMemo(() => hasBillingChanges(form, initialForm), [form, initialForm]);

    const updateMutation = useMutation({
        mutationFn: () =>
            empresaService.updateConfig({
                razaoSocial: form.razaoSocial.trim(),
                cnpj: form.cnpj.trim(),
                telefone: form.telefone.trim(),
                email: form.email.trim(),
                endereco: form.endereco.trim(),
                pixTipo: form.pixTipo || undefined,
                pixChave: form.pixChave.trim() || undefined,
                banco: form.banco.trim() || undefined,
                agencia: form.agencia.trim() || undefined,
                conta: form.conta.trim() || undefined,
                tipoConta: form.tipoConta || undefined,
            }),
        onSuccess: () => {
            setDraft(null);
            setValidationError(null);
            queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
        },
    });

    const updateField = (field: keyof BillingFormValues, value: string) => {
        setValidationError(null);
        if (updateMutation.isSuccess || updateMutation.isError) {
            updateMutation.reset();
        }
        setDraft((prev) => ({ ...(prev ?? initialForm), [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (updateMutation.isPending) return;

        const errorMsg = validateBillingForm(form);
        if (errorMsg) {
            setValidationError(errorMsg);
            return;
        }
        updateMutation.mutate();
    };

    if (isLoading) {
        return (
            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-cyber-gold animate-spin" />
            </div>
        );
    }

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';
    const labelClass =
        'block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5';

    const tipoContaLabel = formatTipoContaLabel(form.tipoConta);
    const initials = getCompanyInitials(form.razaoSocial, config?.nome);
    const hasPix = Boolean(form.pixChave.trim());
    const hasBank = Boolean(form.banco.trim() || form.agencia.trim() || form.conta.trim());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Card */}
            <form
                onSubmit={handleSubmit}
                className="lg:col-span-7 rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 space-y-6 min-w-0"
            >
                <div className="pb-4 border-b border-white/10">
                    <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-cyber-gold shrink-0" />
                        <span>Dados Cadastrais &amp; Cobrança</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Informações exibidas no cabeçalho e no quadro de pagamento do PDF da O.S.
                    </p>
                </div>

                {/* Dados da Empresa */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        Dados da Empresa
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Razão Social</label>
                            <input
                                type="text"
                                value={form.razaoSocial}
                                onChange={(e) => updateField('razaoSocial', e.target.value)}
                                className={inputClass}
                                placeholder="Empresa LTDA"
                                maxLength={150}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>CNPJ</label>
                            <input
                                type="text"
                                value={form.cnpj}
                                onChange={(e) => updateField('cnpj', maskCNPJ(e.target.value))}
                                className={inputClass}
                                placeholder="00.000.000/0000-00"
                                maxLength={18}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Telefone</label>
                            <input
                                type="text"
                                value={form.telefone}
                                onChange={(e) => updateField('telefone', maskPhone(e.target.value))}
                                className={inputClass}
                                placeholder="(11) 99999-9999"
                                maxLength={15}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>E-mail</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => updateField('email', e.target.value)}
                                className={inputClass}
                                placeholder="contato@empresa.com"
                                maxLength={120}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className={labelClass}>Endereço</label>
                            <input
                                type="text"
                                value={form.endereco}
                                onChange={(e) => updateField('endereco', e.target.value)}
                                className={inputClass}
                                placeholder="Rua Exemplo, 123 - Bairro, Cidade/UF"
                                maxLength={250}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10" />

                {/* PIX */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5" />
                        Chave PIX
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Tipo da Chave</label>
                            <select
                                value={form.pixTipo}
                                onChange={(e) => updateField('pixTipo', e.target.value)}
                                className={inputClass}
                            >
                                {PIX_TIPOS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-zinc-950">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Chave PIX</label>
                            <input
                                type="text"
                                value={form.pixChave}
                                onChange={(e) => updateField('pixChave', e.target.value)}
                                className={inputClass}
                                placeholder="Informe sua chave PIX"
                                maxLength={120}
                            />
                        </div>
                    </div>
                </div>

                <div className="border-t border-white/10" />

                {/* Dados Bancários */}
                <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5" />
                        Dados Bancários
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Banco</label>
                            <input
                                type="text"
                                value={form.banco}
                                onChange={(e) => updateField('banco', e.target.value)}
                                className={inputClass}
                                placeholder="Ex: Itaú, Banco do Brasil"
                                maxLength={80}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Tipo de Conta</label>
                            <select
                                value={form.tipoConta}
                                onChange={(e) => updateField('tipoConta', e.target.value)}
                                className={inputClass}
                            >
                                {TIPO_CONTA_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value} className="bg-zinc-950">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Agência</label>
                            <input
                                type="text"
                                value={form.agencia}
                                onChange={(e) => updateField('agencia', e.target.value)}
                                className={inputClass}
                                placeholder="1234-5"
                                maxLength={20}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Conta</label>
                            <input
                                type="text"
                                value={form.conta}
                                onChange={(e) => updateField('conta', e.target.value)}
                                className={inputClass}
                                placeholder="12345-6"
                                maxLength={30}
                            />
                        </div>
                    </div>
                </div>

                {/* Validation / Feedback */}
                {validationError && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{validationError}</span>
                    </div>
                )}

                {updateMutation.isError && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Não foi possível salvar os dados. Verifique sua conexão e tente novamente.</span>
                    </div>
                )}

                {updateMutation.isSuccess && !isDirty && (
                    <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300">
                        <Check className="w-4 h-4 shrink-0" />
                        <span>Dados da empresa atualizados com sucesso.</span>
                    </div>
                )}

                {/* Action Footer / Unsaved Changes Bar */}
                <div
                    className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 ${
                        isDirty
                            ? 'rounded-xl bg-cyber-gold/10 border border-cyber-gold/30 p-3.5 mt-2'
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
                            Todas as alterações estão sincronizadas.
                        </span>
                    )}

                    <button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>{isDirty ? 'Salvar Alterações' : 'Salvar Dados'}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Live PDF Preview */}
            <aside className="lg:col-span-5 rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 min-w-0">
                <div className="pb-4 mb-4 border-b border-white/10">
                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyber-gold shrink-0" />
                        <span>Prévia no PDF da O.S.</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Visualização em tempo real de como seus dados aparecerão para o cliente.
                    </p>
                </div>

                <div className="rounded-xl bg-white text-zinc-900 p-4 shadow-inner space-y-3">
                    <div className="flex items-start gap-3 pb-3 border-b border-zinc-200">
                        {config?.logoUrl ? (
                            <img
                                src={config.logoUrl}
                                alt="Logo da empresa"
                                className="w-10 h-10 rounded-lg object-contain bg-zinc-100 p-1 shrink-0 border border-zinc-200"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 text-cyber-gold font-bold text-xs flex items-center justify-center shrink-0">
                                {initials}
                            </div>
                        )}
                        <div className="min-w-0 text-xs">
                            <p className="font-bold text-zinc-950 break-words">
                                {form.razaoSocial || config?.nome || 'Razão Social da Empresa'}
                            </p>
                            {form.cnpj && (
                                <p className="text-zinc-600 text-[11px] mt-0.5">CNPJ: {form.cnpj}</p>
                            )}
                            {form.endereco && (
                                <p className="text-zinc-500 text-[11px] break-words">{form.endereco}</p>
                            )}
                            {(form.telefone || form.email) && (
                                <p className="text-zinc-500 text-[11px] break-words">
                                    {[form.telefone, form.email].filter(Boolean).join(' • ')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="rounded-lg bg-zinc-50 border border-zinc-200 border-l-4 border-l-amber-500 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            Dados para Pagamento
                        </p>

                        {!hasPix && !hasBank ? (
                            <p className="text-xs text-zinc-400 italic">
                                Preencha Chave PIX ou Dados Bancários para exibir o quadro de pagamento no PDF.
                            </p>
                        ) : (
                            <div className="space-y-1 text-xs">
                                {hasPix && (
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-zinc-500 shrink-0">
                                            PIX{form.pixTipo ? ` (${form.pixTipo})` : ''}
                                        </span>
                                        <span className="font-semibold text-zinc-900 text-right break-all">
                                            {form.pixChave}
                                        </span>
                                    </div>
                                )}
                                {form.banco && (
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-zinc-500 shrink-0">Banco</span>
                                        <span className="font-semibold text-zinc-900 text-right">
                                            {form.banco}
                                            {tipoContaLabel ? ` (${tipoContaLabel})` : ''}
                                        </span>
                                    </div>
                                )}
                                {(form.agencia || form.conta) && (
                                    <div className="flex items-start justify-between gap-2">
                                        <span className="text-zinc-500 shrink-0">Agência / Conta</span>
                                        <span className="font-semibold text-zinc-900 text-right">
                                            {[
                                                form.agencia ? `Ag. ${form.agencia}` : '',
                                                form.conta ? `Cc. ${form.conta}` : '',
                                            ]
                                                .filter(Boolean)
                                                .join(' • ')}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
};
