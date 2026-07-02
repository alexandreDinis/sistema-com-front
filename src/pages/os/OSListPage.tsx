// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { formatarData } from '../../utils/formatters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { osService } from '../../services/osService';
import { userService } from '../../services/userService';
import type { CreateOSRequest, OrdemServico, PageResponse } from '../../types';
import { ClipboardList, Plus, Calendar, User, ChevronRight, Search, Ban, CheckCircle, Clock, ChevronLeft } from 'lucide-react';

export const OrdemServicoListPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters & Pagination State
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [activeTab, setActiveTab] = useState<'iniciadas' | 'finalizadas' | 'canceladas' | 'atrasadas'>('iniciadas');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const [newOSData, setNewOSData] = useState<CreateOSRequest>({
        clienteId: 0,
        usuarioId: 0,
        data: new Date().toISOString().split('T')[0],
        dataVencimento: new Date().toISOString().split('T')[0]
    });

    // Prepare filters for API
    const filters = useMemo(() => {
        const f: any = {};

        // Status Mapping
        if (activeTab === 'iniciadas') f.status = 'INICIADAS'; // Backend handles this as ABERTA/EM_EXECUCAO
        else if (activeTab === 'finalizadas') f.status = 'FINALIZADA';
        else if (activeTab === 'canceladas') f.status = 'CANCELADA';
        else if (activeTab === 'atrasadas') f.atrasado = true; // Use specific flag/logic

        if (searchTerm) f.search = searchTerm;
        if (dateFilter) f.date = dateFilter;

        return f;
    }, [activeTab, searchTerm, dateFilter]);

    // Query with Pagination
    const { data: pageData, isLoading, isError } = useQuery({
        queryKey: ['ordens-servico', page, pageSize, filters],
        queryFn: () => osService.listOSGrid(page, pageSize, filters),
        keepPreviousData: true // Keep showing previous page while loading new one
    });

    const osList = pageData?.content || [];
    const totalPages = pageData?.totalPages || 0;

    const { data: clientes } = useQuery({
        queryKey: ['clientes'],
        queryFn: () => osService.listClientes()
    });

    const { data: equipe } = useQuery({
        queryKey: ['equipe'],
        queryFn: () => userService.getEquipe()
    });

    const mutation = useMutation({
        mutationFn: osService.createOS,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setIsCreateModalOpen(false);
            navigate(`/os/${data.id}`);
        }
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newOSData.clienteId === 0) {
            alert("Selecione um cliente");
            return;
        }
        if (!newOSData.usuarioId || newOSData.usuarioId === 0) {
            alert("Selecione um responsável técnico");
            return;
        }
        mutation.mutate(newOSData);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ABERTA': return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
            case 'EM_EXECUCAO': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
            case 'FINALIZADA': return 'text-green-400 border-green-400/30 bg-green-400/10';
            case 'CANCELADA': return 'text-red-400 border-red-400/30 bg-red-400/10';
            default: return 'text-gray-400';
        }
    };

    // Reset page when filters change
    React.useEffect(() => {
        setPage(0);
    }, [activeTab, searchTerm, dateFilter]);

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 md:mb-8 gap-4 md:gap-0">
                <h1 className="text-2xl md:text-3xl font-orbitron text-cyber-gold font-bold tracking-wider flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 md:w-8 md:h-8" />
                    ORDENS DE SERVIÇO
                </h1>

                {/* Desktop Button */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="hidden md:flex bg-cyber-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition-all items-center gap-2 font-oxanium"
                >
                    <Plus className="w-5 h-5" />
                    NOVA O.S.
                </button>
            </div>

            {/* Tabs for Status */}
            <div className="flex gap-4 mb-6 border-b border-cyber-gold/20 pb-1 overflow-x-auto scrollbar-hide">
                <button
                    onClick={() => setActiveTab('iniciadas')}
                    className={`flex items-center gap-2 px-4 py-2 font-oxanium transition-all whitespace-nowrap ${activeTab === 'iniciadas' ? 'text-cyber-gold border-b-2 border-cyber-gold' : 'text-gray-500 hover:text-white'}`}
                >
                    <Clock size={16} /> INICIADAS
                </button>
                <button
                    onClick={() => setActiveTab('finalizadas')}
                    className={`flex items-center gap-2 px-4 py-2 font-oxanium transition-all whitespace-nowrap ${activeTab === 'finalizadas' ? 'text-cyber-gold border-b-2 border-cyber-gold' : 'text-gray-500 hover:text-white'}`}
                >
                    <CheckCircle size={16} /> FINALIZADAS
                </button>
                <button
                    onClick={() => setActiveTab('canceladas')}
                    className={`flex items-center gap-2 px-4 py-2 font-oxanium transition-all whitespace-nowrap ${activeTab === 'canceladas' ? 'text-cyber-gold border-b-2 border-cyber-gold' : 'text-gray-500 hover:text-white'}`}
                >
                    <Ban size={16} /> CANCELADAS
                </button>
                <button
                    onClick={() => setActiveTab('atrasadas')}
                    className={`flex items-center gap-2 px-4 py-2 font-oxanium transition-all whitespace-nowrap ${activeTab === 'atrasadas' ? 'text-red-400 border-b-2 border-red-400' : 'text-gray-500 hover:text-red-400'}`}
                >
                    <Clock size={16} /> ATRASADAS
                </button>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-black/40 p-4 rounded border border-white/5">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou ID..."
                        className="w-full bg-black/60 border border-cyber-gold/20 text-white pl-10 p-2 rounded focus:border-cyber-gold outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-48 relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                    <input
                        type="date"
                        className="w-full bg-black/60 border border-cyber-gold/20 text-white pl-10 p-2 rounded focus:border-cyber-gold outline-none"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Modal de Criação Rápida */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black/90 border border-cyber-gold/50 p-8 rounded-lg max-w-md w-full relative">
                        <h2 className="text-2xl font-orbitron text-white mb-6 border-l-4 border-cyber-gold pl-3">INICIAR NOVA OS</h2>
                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="text-cyber-gold font-oxanium text-sm">Cliente</label>
                                <select
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-white p-3 focus:border-cyber-gold outline-none"
                                    value={newOSData.clienteId}
                                    onChange={e => setNewOSData({ ...newOSData, clienteId: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value={0}>Selecione um cliente...</option>
                                    {clientes?.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nomeFantasia}{c.razaoSocial ? ` (${c.razaoSocial})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-cyber-gold font-oxanium text-sm">Responsável Técnico</label>
                                <select
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-white p-3 focus:border-cyber-gold outline-none"
                                    value={newOSData.usuarioId}
                                    onChange={e => setNewOSData({ ...newOSData, usuarioId: parseInt(e.target.value) })}
                                    required
                                >
                                    <option value={0}>Selecione um técnico...</option>
                                    {equipe?.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || u.email}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-cyber-gold font-oxanium text-sm">Data</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-white p-3 focus:border-cyber-gold outline-none"
                                    value={newOSData.data}
                                    onChange={e => setNewOSData({ ...newOSData, data: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-cyber-gold font-oxanium text-sm">Prazo de Pagamento</label>
                                <input
                                    type="date"
                                    className="w-full bg-black/60 border border-cyber-gold/30 text-white p-3 focus:border-cyber-gold outline-none"
                                    value={newOSData.dataVencimento}
                                    onChange={e => setNewOSData({ ...newOSData, dataVencimento: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar a data atual.</p>
                            </div>


                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="text-gray-400 px-4 py-2 hover:text-white font-oxanium"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={mutation.isPending}
                                    className="bg-cyber-gold text-black font-bold px-6 py-2 rounded hover:bg-yellow-400 transition-colors font-oxanium"
                                >
                                    {mutation.isPending ? 'CRIANDO...' : 'CRIAR OS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="text-cyber-gold font-oxanium animate-pulse">Carregando Ordens de Serviço...</div>
            ) : isError ? (
                <div className="text-red-400 font-oxanium">Erro ao carregar Ordens de Serviço.</div>
            ) : (
                <div className="space-y-4">
                    {osList.map((os) => (
                        <div
                            key={os.id}
                            onClick={() => navigate(`/os/${os.id}`)}
                            className="bg-black/40 border border-white/10 p-4 rounded-lg hover:border-cyber-gold/50 cursor-pointer transition-all relative group"
                        >
                            {/* Mobile Layout: Optimized App-like Card */}
                            <div className="md:hidden flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            {os.cliente.nomeFantasia}
                                        </h3>
                                        <div className="text-xs text-gray-500 font-mono mt-1">ID: #{os.id} • {formatarData(os.data)}</div>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded border text-[10px] font-bold font-oxanium tracking-wide ${getStatusColor(os.status)}`}>
                                        {os.status}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end border-t border-white/5 pt-3 mt-1">
                                    <div className="text-sm text-gray-400 font-oxanium flex items-center gap-1">
                                        <span className="text-white font-bold">{os.veiculos.length}</span> Veículo(s)
                                    </div>
                                    <div className="text-xl font-bold text-cyber-gold font-orbitron">
                                        {(os.valorTotalComDesconto || os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Layout: Expanded Row */}
                            <div className="hidden md:flex items-center justify-between gap-4">
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col items-center justify-center p-3 bg-white/5 rounded min-w-[80px]">
                                        <span className="text-xs text-gray-500 font-mono">ID</span>
                                        <span className="text-2xl font-bold text-white font-orbitron">#{os.id}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <User className="w-4 h-4 text-cyber-gold" />
                                            {os.cliente.nomeFantasia}
                                            {os.cliente.razaoSocial && (
                                                <span className="text-sm font-normal text-gray-400 ml-2">({os.cliente.razaoSocial})</span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400 font-oxanium">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> {formatarData(os.data)}
                                            </span>
                                            <span>•</span>
                                            <span className="text-white">
                                                {os.veiculos.length} Veículo(s)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-2">
                                        <div className={`px-3 py-1 rounded border text-xs font-bold font-oxanium tracking-wide ${getStatusColor(os.status)}`}>
                                            {os.status}
                                        </div>
                                        {os.atrasado && (
                                            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded border border-red-500/50 animate-pulse">
                                                ATRASADO
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 font-oxanium">VALOR TOTAL</div>
                                        {os.valorDesconto && os.valorDesconto > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs text-gray-500 line-through font-mono">
                                                    {(os.valorTotalSemDesconto || os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                                <span className="text-xl font-bold text-cyber-gold font-orbitron">
                                                    {(os.valorTotalComDesconto || os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-xl font-bold text-cyber-gold font-orbitron">
                                                {os.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-gray-600 group-hover:text-cyber-gold transition-colors" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {osList.length === 0 && (
                        <div className="text-center py-10 text-gray-500 font-oxanium">
                            Nenhuma Ordem de Serviço encontrada para o filtro atual.
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0}
                                className={`p-2 rounded border border-cyber-gold/30 transition-colors ${page === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-cyber-gold hover:bg-cyber-gold/10'}`}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <span className="text-gray-400 font-oxanium text-sm">
                                PÁGINA <span className="text-white font-bold">{page + 1}</span> DE <span className="text-white font-bold">{totalPages}</span>
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={page >= totalPages - 1}
                                className={`p-2 rounded border border-cyber-gold/30 transition-colors ${page >= totalPages - 1 ? 'text-gray-600 cursor-not-allowed' : 'text-cyber-gold hover:bg-cyber-gold/10'}`}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* Mobile FAB (Floating Action Button) */}
            <button
                onClick={() => setIsCreateModalOpen(true)}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-cyber-gold text-black rounded-full shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center justify-center z-50 border-2 border-white/20 active:scale-95 transition-transform"
            >
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
};
