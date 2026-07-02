import React, { useState, useEffect } from 'react';
import { X, Save, User, UserCheck, Unlock, Lock, DollarSign } from 'lucide-react';
import { userService } from '../../services/userService';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { User as UserType } from '../../types';
import { AVAILABLE_FEATURES } from '../../config/permissions';
import { SalarioFuncionarioForm } from './SalarioFuncionarioForm';

interface EmployeeEditModalProps {
    user?: UserType | null;
    onClose: () => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ user, onClose }) => {
    const queryClient = useQueryClient();
    const isEditing = !!user;

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'FUNCIONARIO',
        participaComissao: true,
        features: [] as string[] // To hold selected permissions
    });

    useEffect(() => {
        if (user) {
            // Normalize features to string array
            const userFeatures = user.features?.map(f => typeof f === 'string' ? f : f.codigo) || [];

            setFormData({
                name: user.name || user.email.split('@')[0], // Fallback to email part if name is missing
                email: user.email,
                password: '',
                role: user.role || 'FUNCIONARIO',
                participaComissao: user.participaComissao !== undefined ? user.participaComissao : true,
                features: userFeatures
            });
        }
    }, [user]);

    // Permissions are now imported from src/config/permissions.ts

    const saveMutation = useMutation({
        mutationFn: async (data: any) => {
            if (isEditing && user?.id) {
                console.log("Updating user", user.id, data);

                // Call the backend to update details (Name, Features)
                // Note: Role is often separate in some backends, but if PUT /users/{id} handles it, great.
                // We keep the role check just in case the main endpoint doesn't handle role switching permissions.

                // Update generic info + features
                await userService.updateUser(user.id, {
                    name: data.name,
                    participaComissao: data.participaComissao,
                    features: data.features
                });

                if (data.role !== user.role) {
                    await userService.updateUserRole(user.id, data.role);
                }
                return { ...user, ...data };
            } else {
                return await userService.createUser({
                    name: data.name,
                    email: data.email,
                    password: data.password,
                    role: data.role,
                    participaComissao: data.participaComissao,
                    features: data.features  // Include features so user isn't blocked
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['team-users'] });
            onClose();
        }
    });

    const toggleFeature = (featureKey: string) => {
        setFormData(prev => {
            const exists = prev.features.includes(featureKey);
            if (exists) {
                return { ...prev, features: prev.features.filter(f => f !== featureKey) };
            } else {
                return { ...prev, features: [...prev.features, featureKey] };
            }
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-black border border-cyber-gold/40 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(212,175,55,0.2)] relative my-4">
                {/* Decorative Borders */}
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyber-gold"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyber-gold"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyber-gold"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyber-gold"></div>

                {/* Header */}
                <div className="bg-cyber-gold/10 p-4 border-b border-cyber-gold/20 flex justify-between items-center">
                    <h2 className="text-xl font-black text-cyber-gold uppercase tracking-wider flex items-center gap-2">
                        {isEditing ? <UserCheck size={20} /> : <User size={20} />}
                        {isEditing ? 'Editar Prestador' : 'Novo Prestador'}
                    </h2>
                    <button onClick={onClose} className="text-cyber-gold/60 hover:text-cyber-gold transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest border-b border-cyber-gold/10 pb-1 mb-2">
                            Identificação
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="hud-label mb-1 block">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <div>
                                <label className="hud-label mb-1 block">Email (Login)</label>
                                <input
                                    type="email"
                                    required
                                    disabled={isEditing} // Email is usually immutable or harder to change
                                    className={`w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="prestador@loja.com"
                                />
                            </div>
                            {!isEditing && (
                                <div>
                                    <label className="hud-label mb-1 block">Senha Temporária</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold p-2 outline-none focus:border-cyber-gold transition-colors font-mono"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Senha inicial"
                                    />
                                    <p className="text-[10px] text-cyber-gold/60 mt-1">* O usuário será solicitado a trocar a senha no primeiro acesso.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Role & Permissions */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest border-b border-cyber-gold/10 pb-1 mb-2">
                            Acesso & Permissões
                        </h3>

                        {/* Role Select */}
                        <div className="mb-4">
                            <label className="hud-label mb-1 block">Cargo (Role)</label>
                            <div className="flex gap-2">
                                {['FUNCIONARIO', 'ADMIN_EMPRESA'].map(role => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, role })}
                                        className={`flex-1 p-2 border text-xs font-bold uppercase tracking-wider transition-all ${formData.role === role
                                            ? 'bg-cyber-gold text-black border-cyber-gold'
                                            : 'bg-transparent text-cyber-gold/50 border-cyber-gold/30 hover:border-cyber-gold hover:text-cyber-gold'
                                            }`}
                                    >
                                        {role === 'ADMIN_EMPRESA' ? 'Administrador' : 'Prestador'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Permissions Toggles */}
                        <div className="grid grid-cols-1 gap-2">
                            {AVAILABLE_FEATURES.map((feat) => {
                                const isEnabled = formData.features.includes(feat.key);
                                const isAdmin = formData.role === 'ADMIN_EMPRESA';
                                const forcedOn = isAdmin; // Admins usually retain all features by default

                                return (
                                    <div
                                        key={feat.key}
                                        onClick={() => !forcedOn && toggleFeature(feat.key)}
                                        className={`
                                            flex items-center justify-between p-2 border rounded-sm cursor-pointer transition-all
                                            ${forcedOn
                                                ? 'border-cyber-gold/10 opacity-50 cursor-not-allowed'
                                                : isEnabled
                                                    ? 'border-cyber-gold/60 bg-cyber-gold/10'
                                                    : 'border-cyber-gold/20 hover:border-cyber-gold/40'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isEnabled || forcedOn
                                                ? <Unlock size={14} className="text-cyber-gold" />
                                                : <Lock size={14} className="text-gray-500" />
                                            }
                                            <span className={`text-xs font-mono ${isEnabled || forcedOn ? 'text-cyber-gold' : 'text-gray-500'}`}>
                                                {feat.label}
                                            </span>
                                        </div>

                                        {/* Toggle Switch Visual */}
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${isEnabled || forcedOn ? 'bg-cyber-gold' : 'bg-gray-800'}`}>
                                            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-black transition-all ${isEnabled || forcedOn ? 'left-4.5' : 'left-0.5'}`}></div>
                                        </div>
                                    </div>
                                );
                            })}
                            {formData.role === 'ADMIN_EMPRESA' && (
                                <p className="text-[10px] text-cyber-gold/40 italic text-center mt-1">
                                    * Administradores possuem acesso total por padrão.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Salary/Remuneration Configuration - Only for existing employees */}
                    {isEditing && user?.id && (user.empresaId || user.empresa?.id) && user.role !== 'ADMIN_EMPRESA' && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest border-b border-cyber-gold/10 pb-1 mb-2 flex items-center gap-2">
                                <DollarSign size={14} />
                                Tipo de Remuneração
                            </h3>
                            <SalarioFuncionarioForm
                                usuarioId={user.id}
                                empresaId={user.empresaId || user.empresa?.id || 0}
                            />
                        </div>
                    )}

                    {/* Commission Opt-In/Out */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest border-b border-cyber-gold/10 pb-1 mb-2">
                            Configuração de Repasse
                        </h3>
                        <div className="flex items-center gap-3 bg-black/40 border border-cyber-gold/20 p-3 rounded-sm">
                            <input
                                type="checkbox"
                                id="participaComissao"
                                checked={formData.participaComissao}
                                onChange={(e) => setFormData({ ...formData, participaComissao: e.target.checked })}
                                className="w-4 h-4 accent-cyber-gold cursor-pointer"
                            />
                            <label htmlFor="participaComissao" className="text-cyber-gold font-mono text-sm cursor-pointer select-none">
                                Participa do Sistema de Comissões
                            </label>
                        </div>
                        <p className="text-[10px] text-cyber-gold/40">
                            * Se desmarcado, este usuário será ignorado no cálculo de comissões.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-cyber-gold/20 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-cyber-gold/60 hover:text-cyber-gold transition-colors font-mono text-sm uppercase"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saveMutation.isPending}
                            className="bg-cyber-gold hover:bg-yellow-400 text-black px-6 py-2 rounded-sm font-bold flex items-center gap-2 transition-all font-oxanium uppercase tracking-wider disabled:opacity-50"
                        >
                            {saveMutation.isPending ? 'Salvando...' : (
                                <>
                                    <Save size={16} /> Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};
