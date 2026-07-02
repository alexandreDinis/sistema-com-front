import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Plus, Search, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userService } from '../../services/userService';
import { EmployeeEditModal } from '../../components/settings/EmployeeEditModal';
import type { User as UserType } from '../../types';

// Placeholder for now, moving to real hook later if needed
const useTeam = () => {
    return useQuery({
        queryKey: ['team-users'],
        queryFn: userService.getUsers
    });
};

export const TeamSettings: React.FC = () => {
    const navigate = useNavigate();
    const { data: users, isLoading } = useTeam();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const filteredUsers = users?.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleEdit = (user: UserType) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center border-b border-cyber-gold/20 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-cyber-gold tracking-tighter uppercase glitch">Gestão de Equipe</h1>
                    <p className="text-cyber-gold/60 font-mono text-sm mt-2">Adicione membros e defina permissões.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => navigate('/settings')} className="text-cyber-gold/60 hover:text-cyber-gold px-4 py-2 font-oxanium text-sm uppercase transition-colors">
                        Voltar
                    </button>
                    <button
                        onClick={handleCreate}
                        className="bg-cyber-gold text-black px-4 py-2 rounded-sm font-bold flex items-center gap-2 hover:bg-yellow-400 transition-all font-oxanium uppercase tracking-wider"
                    >
                        <Plus size={16} /> Novo Usuário
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-black/40 border border-cyber-gold/20 p-4 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-gold/50" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar prestador..."
                        className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold pl-10 pr-4 py-2 rounded-sm focus:outline-none focus:border-cyber-gold transition-colors font-mono text-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 text-center text-cyber-gold/40 py-10 animate-pulse font-mono">CARREGANDO DADOS DA EQUIPE...</div>
                ) : (
                    filteredUsers?.map(user => (
                        <div
                            key={user.id}
                            onClick={() => handleEdit(user)}
                            className="bg-black/80 border border-cyber-gold/30 p-6 relative group hover:border-cyber-gold/60 transition-colors cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                <span className="p-1 text-cyber-gold"><Edit2 size={14} /></span>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${user.role === 'ADMIN_EMPRESA' ? 'border-cyber-gold bg-cyber-gold/20' : 'border-cyber-gold/30 bg-black'}`}>
                                    <User className={user.role === 'ADMIN_EMPRESA' ? 'text-cyber-gold' : 'text-cyber-gold/50'} size={24} />
                                </div>
                                <div>
                                    <div className="font-bold text-cyber-gold text-lg leading-none">
                                        {user.name || user.email.split('@')[0]}
                                    </div>
                                    <div className="text-xs text-cyber-gold/60 font-mono mt-1">{user.email}</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-xs border-b border-cyber-gold/10 pb-2">
                                    <span className="text-cyber-gold/40 uppercase tracking-widest">Cargo</span>
                                    <span className={`font-bold ${user.role === 'ADMIN_EMPRESA' ? 'text-cyber-gold' : 'text-gray-400'}`}>
                                        {user.role === 'ADMIN_EMPRESA' ? 'ADMINISTRADOR' : 'PRESTADOR'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-b border-cyber-gold/10 pb-2">
                                    <span className="text-cyber-gold/40 uppercase tracking-widest">Acesso</span>
                                    <span className="text-green-400 font-mono flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                        ATIVO
                                    </span>
                                </div>

                                {user.features && (
                                    <div className="pt-2">
                                        <span className="text-[10px] text-cyber-gold/40 uppercase tracking-widest block mb-2">Permissões</span>
                                        <div className="flex flex-wrap gap-1">
                                            {user.features.slice(0, 3).map((f, i) => {
                                                const featureCode = typeof f === 'string' ? f : f.codigo;
                                                return (
                                                    <span key={i} className="text-[9px] px-1.5 py-0.5 border border-cyber-gold/20 rounded text-cyber-gold/70">
                                                        {featureCode}
                                                    </span>
                                                );
                                            })}
                                            {user.features.length > 3 && <span className="text-[9px] px-1.5 py-0.5 text-cyber-gold/40">+{user.features.length - 3}</span>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <EmployeeEditModal
                    user={editingUser}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};
