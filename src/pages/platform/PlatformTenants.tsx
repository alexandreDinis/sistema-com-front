import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { platformService } from '../../services/platformService';
import type { TenantSummary, TenantUpdateRequest } from '../../services/platformService';
import { Ban, CheckCircle, Search, Plus, Building2, Calendar, Pencil, X, KeyRound, Loader2, DollarSign, Infinity, ShieldOff } from 'lucide-react';
import { TenantOnboarding } from '../../components/platform/TenantOnboarding';

export const PlatformTenants: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [editingTenant, setEditingTenant] = useState<TenantSummary | null>(null);
    const [resetPwdTenant, setResetPwdTenant] = useState<TenantSummary | null>(null);

    const { data: tenants, isLoading } = useQuery({
        queryKey: ['platform-tenants'],
        queryFn: platformService.listTenants
    });

    const toggleBlockMutation = useMutation({
        mutationFn: platformService.toggleTenantStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
        }
    });

    const darBaixaMutation = useMutation({
        mutationFn: platformService.darBaixaTenant,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
            alert('Pagamento registrado com sucesso! Assinatura renovada/desbloqueada.');
        }
    });

    const updateTenantMutation = useMutation({
        mutationFn: (data: { id: number, req: TenantUpdateRequest }) => platformService.updateTenant(data.id, data.req),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
            setEditingTenant(null);
        },
        onError: (err) => {
            alert('Falha ao atualizar inquilino. Verifique os dados.');
            console.error(err);
        }
    });

    const resetPwdMutation = useMutation({
        mutationFn: (data: { id: number, pass: string }) => platformService.resetTenantPassword(data.id, data.pass),
        onSuccess: () => {
            alert('Senha redefinida com sucesso!');
            setResetPwdTenant(null);
        },
        onError: (err: any) => {
            alert('Erro ao redefinir senha: ' + (err.response?.data?.message || err.message));
        }
    });

    const toggleVitalicioMutation = useMutation({
        mutationFn: (tenant: TenantSummary) => {
            if (tenant.vitalicia) {
                return platformService.revogarTenantVitalicio(tenant.id);
            } else {
                return platformService.tornarTenantVitalicio(tenant.id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
        }
    });

    const filteredTenants = tenants?.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj.includes(searchTerm)
    );

    const handleToggleBlock = (tenant: TenantSummary) => {
        if (confirm(`Tem certeza que deseja ${!tenant.ativo ? 'DESBLOQUEAR' : 'BLOQUEAR'} o acesso da empresa ${tenant.nome}?`)) {
            toggleBlockMutation.mutate(tenant.id);
        }
    };

    const handleDarBaixa = (tenant: TenantSummary) => {
        if (confirm(`Confirmar recebimento de pagamento e renovação para ${tenant.nome}?`)) {
            darBaixaMutation.mutate(tenant.id);
        }
    };

    const handleToggleVitalicio = (tenant: TenantSummary) => {
        const action = tenant.vitalicia ? 'REVOGAR o plano vitalício de' : 'tornar VITALÍCIO o tenant';
        if (confirm(`Tem certeza que deseja ${action} ${tenant.nome}?\n\n${tenant.vitalicia ? 'O tenant voltará ao ciclo normal de cobrança.' : 'O tenant nunca receberá faturas e não será bloqueado por inadimplência.'}`)) {
            toggleVitalicioMutation.mutate(tenant);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-tight">Gestão de Inquilinos (Tenants)</h1>
                    <p className="text-slate-400 text-sm">Gerencie as empresas e acessos da plataforma.</p>
                </div>
                <button
                    onClick={() => setShowOnboarding(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
                >
                    <Plus size={18} /> Novo Inquilino
                </button>
            </div>

            {/* Filters */}
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por Nome, CNPJ ou Email..."
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 pl-10 pr-4 py-2 rounded focus:outline-none focus:border-blue-500 transition-colors"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="text-slate-400 py-10 text-center animate-pulse">Carregando inquilinos...</div>
            ) : (
                <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-xl">
                    <table className="w-full text-left">
                        <thead className="bg-slate-900/50 border-b border-slate-700">
                            <tr>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa / Admin</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Plano</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Criado em</th>
                                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {filteredTenants?.map(tenant => (
                                <tr key={tenant.id} className={`group hover:bg-slate-700/30 transition-colors ${!tenant.ativo ? 'bg-red-900/10' : ''}`}>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${!tenant.ativo ? 'bg-red-900/20 text-red-400' : 'bg-blue-900/20 text-blue-400'}`}>
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <div className={`font-bold ${!tenant.ativo ? 'text-red-300' : 'text-slate-200'}`}>{tenant.nome}</div>
                                                <div className="text-xs text-slate-500 font-mono">{tenant.cnpj}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getPillStyle(tenant.plano)}`}>
                                            {tenant.plano}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            {!tenant.ativo ? (
                                                <div className="flex items-center gap-2 text-red-400 bg-red-950/30 border border-red-900/50 px-2 py-1 rounded w-fit">
                                                    <Ban size={14} />
                                                    <span className="text-xs font-bold">BLOQUEADO</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-green-400 bg-green-950/30 border border-green-900/50 px-2 py-1 rounded w-fit">
                                                    <CheckCircle size={14} />
                                                    <span className="text-xs font-bold">ATIVO</span>
                                                </div>
                                            )}
                                            {tenant.vitalicia && (
                                                <div className="flex items-center gap-1 text-purple-400 bg-purple-950/30 border border-purple-900/50 px-2 py-1 rounded w-fit">
                                                    <Infinity size={14} />
                                                    <span className="text-xs font-bold">VITALÍCIO</span>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 font-mono text-slate-300 text-sm">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar size={14} /> {tenant.dataCriacao ? new Date(tenant.dataCriacao).toLocaleDateString('pt-BR') : 'N/A'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setResetPwdTenant(tenant)}
                                                className="p-2 rounded text-yellow-400 hover:bg-yellow-900/30 hover:text-yellow-300 transition-colors"
                                                title="Redefinir Senha do Admin"
                                            >
                                                <KeyRound size={18} />
                                            </button>
                                            <button
                                                onClick={() => setEditingTenant(tenant)}
                                                className="p-2 rounded text-blue-400 hover:bg-blue-900/30 hover:text-blue-300 transition-colors"
                                                title="Editar Inquilino"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleBlock(tenant)}
                                                disabled={toggleBlockMutation.isPending}
                                                className={`p-2 rounded transition-colors ${!tenant.ativo
                                                    ? 'text-green-400 hover:bg-green-900/30 hover:text-green-300'
                                                    : 'text-red-400 hover:bg-red-900/30 hover:text-red-300'
                                                    }`}
                                                title={!tenant.ativo ? "Desbloquear Acesso" : "Kill Switch (Bloquear Acesso)"}
                                            >
                                                {!tenant.ativo ? <CheckCircle size={18} /> : <Ban size={18} />}
                                            </button>
                                            
                                            <button
                                                onClick={() => handleDarBaixa(tenant)}
                                                disabled={darBaixaMutation.isPending}
                                                className="p-2 rounded text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/40 hover:text-emerald-300 transition-colors ml-1 border border-emerald-800/50"
                                                title="Registrar Pagamento / Renovar Assinatura"
                                            >
                                                <DollarSign size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleToggleVitalicio(tenant)}
                                                disabled={toggleVitalicioMutation.isPending}
                                                className={`p-2 rounded transition-colors ml-1 border ${
                                                    tenant.vitalicia
                                                        ? 'text-red-400 bg-red-900/20 hover:bg-red-900/40 border-red-800/50'
                                                        : 'text-purple-400 bg-purple-900/20 hover:bg-purple-900/40 border-purple-800/50'
                                                }`}
                                                title={tenant.vitalicia ? 'Revogar Plano Vitalício' : 'Tornar Vitalício'}
                                            >
                                                {tenant.vitalicia ? <ShieldOff size={18} /> : <Infinity size={18} />}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredTenants?.length === 0 && (
                        <div className="p-8 text-center text-slate-500">
                            Nenhum inquilino encontrado.
                        </div>
                    )}
                </div>
            )}

            {showOnboarding && <TenantOnboarding onClose={() => setShowOnboarding(false)} />}

            {editingTenant && (
                <EditTenantModal
                    tenant={editingTenant}
                    onClose={() => setEditingTenant(null)}
                    onSave={(id, data) => updateTenantMutation.mutate({ id, req: data })}
                    isSaving={updateTenantMutation.isPending}
                />
            )}

            {resetPwdTenant && (
                <ResetPasswordModal
                    tenantName={resetPwdTenant.nome}
                    onClose={() => setResetPwdTenant(null)}
                    onConfirm={(pass) => resetPwdMutation.mutate({ id: resetPwdTenant.id, pass })}
                    isSaving={resetPwdMutation.isPending}
                />
            )}
        </div>
    );
};

// Reset Password Modal
const ResetPasswordModal: React.FC<{
    tenantName: string,
    onClose: () => void,
    onConfirm: (pass: string) => void,
    isSaving: boolean
}> = ({ tenantName, onClose, onConfirm, isSaving }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(password);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-sm p-6 relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20} /></button>
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <KeyRound size={20} className="text-yellow-500" /> Redefinir Senha
                </h2>
                <p className="text-slate-400 text-sm mb-4">Define uma nova senha para o admin de <strong className="text-slate-200">{tenantName}</strong>.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        required
                        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 outline-none focus:border-yellow-500 font-mono"
                        placeholder="Nova senha..."
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="px-3 py-2 text-slate-400 hover:text-white">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold flex items-center gap-2">
                            {isSaving && <Loader2 className="animate-spin" size={16} />} Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Simple Edit Modal Component
const EditTenantModal: React.FC<{
    tenant: TenantSummary,
    onClose: () => void,
    onSave: (id: number, data: TenantUpdateRequest) => void,
    isSaving: boolean
}> = ({ tenant, onClose, onSave, isSaving }) => {
    const [formData, setFormData] = useState<TenantUpdateRequest>({
        nome: tenant.nome,
        cnpj: tenant.cnpj,
        plano: tenant.plano,
        adminEmail: tenant.adminEmail || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(tenant.id, formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Pencil size={20} className="text-blue-500" />
                    Editar Inquilino
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Nome da Empresa</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={e => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase mb-1">CNPJ</label>
                        <input
                            type="text"
                            value={formData.cnpj}
                            onChange={e => setFormData({ ...formData, cnpj: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded focus:outline-none focus:border-blue-500 font-mono"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Plano Atual</label>
                        <select
                            value={formData.plano}
                            onChange={e => setFormData({ ...formData, plano: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded focus:outline-none focus:border-blue-500"
                        >
                            <option value="BRONZE">BRONZE (Básico)</option>
                            <option value="PRATA">PRATA (Profissional)</option>
                            <option value="OURO">OURO (Enterprise)</option>
                        </select>
                        <p className="text-[10px] text-yellow-500/80 mt-1">
                            ⚠️ Alterar o plano atualizará automaticamente as permissões e funcionalidades disponíveis.
                        </p>
                    </div>

                    <div>
                        <label className="block text-slate-400 text-xs font-bold uppercase mb-1">Email do Admin Principal</label>
                        <input
                            type="email"
                            value={formData.adminEmail}
                            onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                            className="w-full bg-slate-800 border border-slate-700 text-slate-200 p-2 rounded focus:outline-none focus:border-blue-500"
                            placeholder="Deixe em branco para manter o atual"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">
                            Opcional. Preencha apenas se desejar transferir a conta admin para outro email.
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const getPillStyle = (plan: string) => {
    switch (plan?.toUpperCase()) {
        case 'OURO': return 'bg-yellow-900/20 text-yellow-500 border-yellow-700/50';
        case 'PRATA': return 'bg-slate-700/50 text-slate-300 border-slate-600';
        case 'BRONZE': return 'bg-orange-900/20 text-orange-500 border-orange-800/50';
        default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
};
