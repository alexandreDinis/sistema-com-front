import React, { useState } from 'react';
import {
    AlertCircle,
    AlertTriangle,
    DollarSign,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    Lock,
    Save,
    Shield,
    Unlock,
    User,
    UserCheck,
    X,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import type { User as UserType } from '../../types';
import { AVAILABLE_FEATURES } from '../../config/permissions';
import { SalarioFuncionarioForm } from './SalarioFuncionarioForm';
import { ActionModal } from '../modals/ActionModal';
import { generateSecureTempPassword, validateEmployeeForm } from '../../utils/teamUtils';

interface EmployeeEditModalProps {
    user?: UserType | null;
    onClose: () => void;
}

interface EmployeeFormState {
    name: string;
    email: string;
    password: string;
    role: string;
    participaComissao: boolean;
    features: string[];
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ user, onClose }) => {
    const queryClient = useQueryClient();
    const isEditing = Boolean(user);

    const [formData, setFormData] = useState<EmployeeFormState>(() => {
        if (!user) {
            return {
                name: '',
                email: '',
                password: '',
                role: 'FUNCIONARIO',
                participaComissao: true,
                features: [],
            };
        }
        const userFeatures =
            user.features?.map((f) => (typeof f === 'string' ? f : f.codigo)) || [];
        return {
            name: user.name || user.email.split('@')[0],
            email: user.email,
            password: '',
            role: user.role || 'FUNCIONARIO',
            participaComissao: user.participaComissao !== undefined ? user.participaComissao : true,
            features: userFeatures,
        };
    });

    const [showPassword, setShowPassword] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [confirmAdminPromote, setConfirmAdminPromote] = useState(false);

    const saveMutation = useMutation({
        mutationFn: async (data: EmployeeFormState) => {
            if (isEditing && user?.id) {
                await userService.updateUser(user.id, {
                    name: data.name.trim(),
                    participaComissao: data.participaComissao,
                    features: data.features,
                });

                if (data.role !== user.role) {
                    await userService.updateUserRole(user.id, data.role);
                }
                return { ...user, ...data };
            }

            return await userService.createUser({
                name: data.name.trim(),
                email: data.email.trim(),
                password: data.password,
                role: data.role,
                participaComissao: data.participaComissao,
                features: data.features,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-users'] });
            onClose();
        },
    });

    const toggleFeature = (featureKey: string) => {
        setFormData((prev) => {
            const exists = prev.features.includes(featureKey);
            return {
                ...prev,
                features: exists
                    ? prev.features.filter((f) => f !== featureKey)
                    : [...prev.features, featureKey],
            };
        });
    };

    const handleGeneratePassword = () => {
        const generated = generateSecureTempPassword(12);
        setFormData((prev) => ({ ...prev, password: generated }));
        setShowPassword(true);
        setValidationError(null);
    };

    const executeSave = () => {
        setConfirmAdminPromote(false);
        saveMutation.mutate(formData);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (saveMutation.isPending) return;

        const err = validateEmployeeForm({
            isEditing,
            name: formData.name,
            email: formData.email,
            password: formData.password,
        });
        if (err) {
            setValidationError(err);
            return;
        }
        setValidationError(null);

        const isPromotingToAdmin =
            isEditing && user?.role !== 'ADMIN_EMPRESA' && formData.role === 'ADMIN_EMPRESA';

        if (isPromotingToAdmin) {
            setConfirmAdminPromote(true);
            return;
        }

        executeSave();
    };

    const getApiErrorMessage = (error: unknown): string => {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError?.response?.status === 409) {
            return 'Já existe um usuário cadastrado com este e-mail.';
        }
        if (axiosError?.response?.status === 400 && axiosError?.response?.data?.message) {
            return axiosError.response.data.message;
        }
        return 'Não foi possível salvar os dados do usuário. Tente novamente.';
    };

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';
    const labelClass =
        'block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5';

    const isAdminSelected = formData.role === 'ADMIN_EMPRESA';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto">
            <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-md px-5 sm:px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyber-gold/15 text-cyber-gold flex items-center justify-center">
                            {isEditing ? (
                                <UserCheck className="w-4 h-4" />
                            ) : (
                                <User className="w-4 h-4" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                {isEditing ? 'Editar Prestador' : 'Novo Prestador'}
                            </h2>
                            <p className="text-xs text-zinc-400">
                                {isEditing
                                    ? 'Atualize perfil, permissões e remuneração'
                                    : 'Cadastre um novo membro na equipe'}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
                    {/* Identificação */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                            Identificação
                        </h3>

                        <div>
                            <label className={labelClass}>Nome Completo</label>
                            <input
                                type="text"
                                required
                                maxLength={120}
                                className={inputClass}
                                value={formData.name}
                                onChange={(e) => {
                                    setValidationError(null);
                                    setFormData({ ...formData, name: e.target.value });
                                }}
                                placeholder="Ex: João da Silva"
                            />
                        </div>

                        <div>
                            <label className={labelClass}>E-mail (Login)</label>
                            <input
                                type="email"
                                required
                                maxLength={120}
                                disabled={isEditing}
                                className={`${inputClass} ${
                                    isEditing ? 'opacity-60 cursor-not-allowed' : ''
                                }`}
                                value={formData.email}
                                onChange={(e) => {
                                    setValidationError(null);
                                    setFormData({ ...formData, email: e.target.value });
                                }}
                                placeholder="prestador@oficina.com.br"
                            />
                        </div>

                        {!isEditing && (
                            <div>
                                <label className={labelClass}>
                                    Senha Temporária (mín. 8 caracteres)
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            minLength={8}
                                            maxLength={64}
                                            autoComplete="new-password"
                                            className={`${inputClass} pr-10 font-mono`}
                                            value={formData.password}
                                            onChange={(e) => {
                                                setValidationError(null);
                                                setFormData({
                                                    ...formData,
                                                    password: e.target.value,
                                                });
                                            }}
                                            placeholder="Digite ou gere uma senha"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                                            aria-label={
                                                showPassword ? 'Ocultar senha' : 'Mostrar senha'
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGeneratePassword}
                                        className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors shrink-0"
                                        title="Gerar senha temporária forte"
                                    >
                                        <KeyRound className="w-3.5 h-3.5 text-cyber-gold" />
                                        <span>Gerar</span>
                                    </button>
                                </div>
                                <p className="text-[11px] text-zinc-500 mt-1.5">
                                    O usuário deverá definir uma nova senha no primeiro acesso.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="border-t border-white/10" />

                    {/* Cargo & Permissões */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                            Acesso &amp; Permissões
                        </h3>

                        <div>
                            <label className={labelClass}>Cargo (Perfil de Acesso)</label>
                            <div className="grid grid-cols-2 gap-2.5">
                                {(['FUNCIONARIO', 'ADMIN_EMPRESA'] as const).map((role) => {
                                    const active = formData.role === role;
                                    return (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, role })}
                                            className={`px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                                                active
                                                    ? 'bg-cyber-gold/15 border-cyber-gold text-cyber-gold'
                                                    : 'bg-zinc-900/60 border-white/10 text-zinc-400 hover:text-white hover:border-white/20'
                                            }`}
                                        >
                                            {role === 'ADMIN_EMPRESA' ? (
                                                <Shield className="w-3.5 h-3.5" />
                                            ) : (
                                                <User className="w-3.5 h-3.5" />
                                            )}
                                            <span>
                                                {role === 'ADMIN_EMPRESA'
                                                    ? 'Administrador'
                                                    : 'Prestador'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {isAdminSelected && (
                                <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3.5 py-2.5 text-xs text-amber-200">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <span>
                                        Administradores possuem acesso total ao financeiro, relatórios, equipe e configurações da empresa.
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {AVAILABLE_FEATURES.map((feat) => {
                                const isEnabled = formData.features.includes(feat.key);
                                const active = isEnabled || isAdminSelected;

                                return (
                                    <button
                                        key={feat.key}
                                        type="button"
                                        disabled={isAdminSelected}
                                        onClick={() => !isAdminSelected && toggleFeature(feat.key)}
                                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                                            isAdminSelected
                                                ? 'border-white/5 bg-zinc-900/40 opacity-60 cursor-not-allowed'
                                                : active
                                                    ? 'border-cyber-gold/40 bg-cyber-gold/10'
                                                    : 'border-white/10 bg-zinc-900/40 hover:border-white/20'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            {active ? (
                                                <Unlock className="w-3.5 h-3.5 text-cyber-gold shrink-0" />
                                            ) : (
                                                <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                            )}
                                            <span
                                                className={`text-xs font-medium truncate ${
                                                    active ? 'text-zinc-100' : 'text-zinc-400'
                                                }`}
                                            >
                                                {feat.label}
                                            </span>
                                        </div>

                                        <div
                                            className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${
                                                active ? 'bg-cyber-gold' : 'bg-zinc-700'
                                            }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-zinc-950 transition-all ${
                                                    active ? 'left-4.5' : 'left-0.5'
                                                }`}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tipo de Remuneração (apenas prestador existente) */}
                    {isEditing &&
                        user?.id &&
                        (user.empresaId || user.empresa?.id) &&
                        user.role !== 'ADMIN_EMPRESA' && (
                            <>
                                <div className="border-t border-white/10" />
                                <div className="space-y-3">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold flex items-center gap-1.5">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        Tipo de Remuneração
                                    </h3>
                                    <SalarioFuncionarioForm
                                        usuarioId={user.id}
                                        empresaId={user.empresaId || user.empresa?.id || 0}
                                    />
                                </div>
                            </>
                        )}

                    <div className="border-t border-white/10" />

                    {/* Participação em Comissões */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-cyber-gold">
                            Configuração de Repasse
                        </h3>
                        <label
                            htmlFor="participaComissao"
                            className="flex items-start gap-3 rounded-xl bg-zinc-900/70 border border-white/10 p-3.5 cursor-pointer select-none hover:border-cyber-gold/30 transition-colors"
                        >
                            <input
                                type="checkbox"
                                id="participaComissao"
                                checked={formData.participaComissao}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        participaComissao: e.target.checked,
                                    })
                                }
                                className="w-4 h-4 mt-0.5 accent-cyber-gold cursor-pointer"
                            />
                            <div>
                                <span className="text-sm font-medium text-white block">
                                    Participa do Sistema de Comissões
                                </span>
                                <span className="text-xs text-zinc-400">
                                    Se desmarcado, este usuário será ignorado no cálculo de comissões.
                                </span>
                            </div>
                        </label>
                    </div>

                    {/* Feedback Errors */}
                    {validationError && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {saveMutation.isError && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{getApiErrorMessage(saveMutation.error)}</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saveMutation.isPending}
                            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black text-sm font-semibold transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>Salvar Alterações</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <ActionModal
                isOpen={confirmAdminPromote}
                onClose={() => setConfirmAdminPromote(false)}
                onConfirm={executeSave}
                title="Promover para Administrador"
                message={`Você está promovendo "${formData.name}" para Administrador. Este perfil concede acesso total ao financeiro, relatórios, equipe e configurações da empresa. Deseja confirmar?`}
                type="warning"
                confirmText="Confirmar"
                cancelText="Cancelar"
            />
        </div>
    );
};
