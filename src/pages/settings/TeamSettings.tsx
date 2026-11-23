import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Edit2,
    Plus,
    Search,
    Shield,
    Users,
} from 'lucide-react';
import { userService } from '../../services/userService';
import { EmployeeEditModal } from '../../components/settings/EmployeeEditModal';
import type { User as UserType } from '../../types';
import {
    countTeamStats,
    filterTeamUsers,
    getFeatureLabel,
    getUserInitials,
    type TeamRoleFilter,
} from '../../utils/teamUtils';

export const TeamSettings: React.FC = () => {
    const { data: users, isLoading, isError, refetch } = useQuery({
        queryKey: ['team-users'],
        queryFn: userService.getUsers,
        staleTime: 30_000,
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<TeamRoleFilter>('ALL');
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const stats = useMemo(() => countTeamStats(users), [users]);
    const filteredUsers = useMemo(
        () => filterTeamUsers(users, searchTerm, roleFilter),
        [users, searchTerm, roleFilter]
    );

    const handleEdit = (user: UserType) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    const roleTabs: Array<{ id: TeamRoleFilter; label: string }> = [
        { id: 'ALL', label: 'Todos' },
        { id: 'ADMIN_EMPRESA', label: 'Admins' },
        { id: 'FUNCIONARIO', label: 'Prestadores' },
    ];

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
                <span className="text-zinc-200 font-medium">Gestão de Equipe</span>
            </div>

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Gestão de Equipe
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gerencie prestadores, administradores, remuneração e permissões de acesso.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 self-start sm:self-auto whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Usuário</span>
                </button>
            </header>

            {/* KPIs */}
            <section className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block truncate">
                        Total da Equipe
                    </span>
                    <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                        {stats.total}
                    </p>
                </div>
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block truncate">
                        Administradores
                    </span>
                    <p className="text-2xl font-bold text-cyber-gold mt-1 tabular-nums">
                        {stats.admins}
                    </p>
                </div>
                <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-4 min-w-0 overflow-hidden">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block truncate">
                        Prestadores
                    </span>
                    <p className="text-2xl font-bold text-white mt-1 tabular-nums">
                        {stats.prestadores}
                    </p>
                </div>
            </section>

            {/* Search & Role Filter */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl bg-zinc-900/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors"
                    />
                </div>

                <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900/80 border border-white/10 gap-1 self-start sm:self-auto">
                    {roleTabs.map((tab) => {
                        const active = roleFilter === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setRoleFilter(tab.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                    active
                                        ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                        : 'text-zinc-400 hover:text-white border border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* Error State */}
            {isError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-sm text-red-200">
                        Não foi possível carregar os membros da equipe.
                    </p>
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-44 rounded-2xl bg-zinc-900/75 border border-white/10"
                        />
                    ))}
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-14 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">
                        Nenhum membro encontrado com os filtros atuais
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Ajuste a busca ou cadastre um novo usuário para a equipe.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers.map((user) => {
                        const isAdmin = user.role === 'ADMIN_EMPRESA';
                        const displayName = user.name || user.email.split('@')[0];
                        const initials = getUserInitials(user.name, user.email);
                        const featureCodes = (user.features || []).map((f) =>
                            typeof f === 'string' ? f : f.codigo
                        );

                        return (
                            <article
                                key={user.id}
                                onClick={() => handleEdit(user)}
                                className="group rounded-2xl bg-zinc-900/75 border border-white/10 hover:border-cyber-gold/40 p-5 transition-all cursor-pointer min-w-0 overflow-hidden flex flex-col justify-between gap-4"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                                                    isAdmin
                                                        ? 'bg-cyber-gold/15 border-cyber-gold/35 text-cyber-gold'
                                                        : 'bg-white/5 border-white/10 text-zinc-200'
                                                }`}
                                            >
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="text-sm font-semibold text-white truncate">
                                                    {displayName}
                                                </h2>
                                                <p className="text-xs text-zinc-400 truncate mt-0.5">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="p-1.5 rounded-lg text-zinc-500 group-hover:text-cyber-gold group-hover:bg-cyber-gold/10 transition-colors shrink-0">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5 mt-4">
                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                                isAdmin
                                                    ? 'bg-cyber-gold/15 text-cyber-gold border-cyber-gold/30'
                                                    : 'bg-white/5 text-zinc-300 border-white/10'
                                            }`}
                                        >
                                            {isAdmin && <Shield className="w-3 h-3" />}
                                            {isAdmin ? 'Administrador' : 'Prestador'}
                                        </span>

                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            Ativo
                                        </span>

                                        {user.participaComissao !== false && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-zinc-300 border border-white/10">
                                                Comissionado
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-white/10">
                                    {isAdmin ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-cyber-gold/10 text-cyber-gold/90 border border-cyber-gold/20">
                                            Acesso total ao sistema
                                        </span>
                                    ) : featureCodes.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {featureCodes.slice(0, 3).map((code) => (
                                                <span
                                                    key={code}
                                                    className="text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-300"
                                                >
                                                    {getFeatureLabel(code)}
                                                </span>
                                            ))}
                                            {featureCodes.length > 3 && (
                                                <span className="text-[11px] px-2 py-0.5 rounded-md text-zinc-400">
                                                    +{featureCodes.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-[11px] text-zinc-500">
                                            Sem permissões específicas atribuídas
                                        </span>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <EmployeeEditModal
                    key={editingUser?.id ?? 'new'}
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};
