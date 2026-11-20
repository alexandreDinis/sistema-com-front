import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    ClipboardList,
    Plus,
    Calendar,
    User,
    ChevronRight,
    ChevronLeft,
    Search,
    Ban,
    CheckCircle2,
    Clock,
    AlertTriangle,
    X,
    ArrowRight,
    Car,
} from 'lucide-react';
import { formatarData } from '../../utils/formatters';
import { calcularDataPorPrazo, filtrarClientesPorBusca, formatarStatusOS } from '../../utils/osUtils';
import { osService } from '../../services/osService';
import { userService } from '../../services/userService';
import type { Cliente, CreateOSRequest, OSStatus } from '../../types';

type TabKey = 'iniciadas' | 'finalizadas' | 'atrasadas' | 'canceladas';

const PRAZO_ATALHOS = [
    { label: 'Hoje', dias: 0 },
    { label: '+7 dias', dias: 7 },
    { label: '+15 dias', dias: 15 },
    { label: '+30 dias', dias: 30 },
];

const getHojeIso = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

export const OrdemServicoListPage: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Filters & Pagination
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const [activeTab, setActiveTab] = useState<TabKey>('iniciadas');
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // Create Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [isClientListOpen, setIsClientListOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [selectedTermDays, setSelectedTermDays] = useState<number | null>(0);
    const [formError, setFormError] = useState<string | null>(null);
    const [newOSData, setNewOSData] = useState<CreateOSRequest>(() => {
        const hoje = getHojeIso();
        return {
            clienteId: 0,
            usuarioId: 0,
            data: hoje,
            dataVencimento: hoje,
        };
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const filters = useMemo(() => {
        const f: { status?: string; search?: string; date?: string; atrasado?: boolean } = {};
        if (activeTab === 'iniciadas') f.status = 'INICIADAS';
        else if (activeTab === 'finalizadas') f.status = 'FINALIZADA';
        else if (activeTab === 'canceladas') f.status = 'CANCELADA';
        else if (activeTab === 'atrasadas') f.atrasado = true;

        if (debouncedSearch) f.search = debouncedSearch;
        if (dateFilter) f.date = dateFilter;
        return f;
    }, [activeTab, debouncedSearch, dateFilter]);

    const { data: pageData, isLoading, isError } = useQuery({
        queryKey: ['ordens-servico', page, pageSize, filters],
        queryFn: () => osService.listOSGrid(page, pageSize, filters),
        placeholderData: keepPreviousData,
    });

    // Contador leve apenas para Em andamento e Atrasadas (pure SQL COUNT)
    const { data: contadores } = useQuery({
        queryKey: ['ordens-servico-contadores'],
        queryFn: () => osService.getOSContadores(),
        staleTime: 30_000,
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ['clientes'],
        queryFn: () => osService.listClientes(),
    });

    const { data: equipe = [] } = useQuery({
        queryKey: ['equipe'],
        queryFn: () => userService.getEquipe(),
    });

    const equipePorId = useMemo(() => {
        const map = new Map<number, string>();
        for (const u of equipe) {
            map.set(u.id, u.name || u.email);
        }
        return map;
    }, [equipe]);

    const clientesFiltrados = useMemo(
        () => filtrarClientesPorBusca(clientes, clientSearch),
        [clientes, clientSearch]
    );

    const osList = pageData?.content || [];
    const totalPages = pageData?.totalPages || 0;
    const totalElements = pageData?.totalElements || 0;
    const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, totalElements);

    const createMutation = useMutation({
        mutationFn: osService.createOS,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            queryClient.invalidateQueries({ queryKey: ['ordens-servico-contadores'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setIsCreateModalOpen(false);
            navigate(`/os/${data.id}`);
        },
        onError: () => {
            setFormError('Não foi possível criar a Ordem de Serviço. Tente novamente.');
        },
    });

    const openCreateModal = () => {
        const hoje = getHojeIso();
        setSelectedClient(null);
        setClientSearch('');
        setIsClientListOpen(false);
        setSelectedTermDays(0);
        setFormError(null);
        setNewOSData({
            clienteId: 0,
            usuarioId: equipe.length === 1 ? equipe[0].id : 0,
            data: hoje,
            dataVencimento: hoje,
        });
        setIsCreateModalOpen(true);
    };

    const handleSelectClient = (cliente: Cliente) => {
        setSelectedClient(cliente);
        setNewOSData((prev) => ({ ...prev, clienteId: cliente.id }));
        setIsClientListOpen(false);
        setFormError(null);
    };

    const handleClearClient = () => {
        setSelectedClient(null);
        setClientSearch('');
        setNewOSData((prev) => ({ ...prev, clienteId: 0 }));
        setIsClientListOpen(true);
    };

    const handleOsDateChange = (novaData: string) => {
        setNewOSData((prev) => ({
            ...prev,
            data: novaData,
            dataVencimento:
                selectedTermDays !== null ? calcularDataPorPrazo(novaData, selectedTermDays) : prev.dataVencimento,
        }));
    };

    const handleApplyTerm = (dias: number) => {
        setSelectedTermDays(dias);
        setNewOSData((prev) => ({
            ...prev,
            dataVencimento: calcularDataPorPrazo(prev.data || getHojeIso(), dias),
        }));
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newOSData.clienteId) {
            setFormError('Selecione um cliente para criar a Ordem de Serviço.');
            return;
        }
        if (!newOSData.usuarioId) {
            setFormError('Selecione um responsável técnico.');
            return;
        }
        setFormError(null);
        createMutation.mutate(newOSData);
    };

    const handleTabChange = (tab: TabKey) => {
        setActiveTab(tab);
        setPage(0);
    };

    const handleDateChange = (val: string) => {
        setDateFilter(val);
        setPage(0);
    };

    const hasActiveFilters = Boolean(searchInput.trim() || dateFilter);

    const clearFilters = () => {
        setSearchInput('');
        setDebouncedSearch('');
        setDateFilter('');
        setPage(0);
    };

    const getStatusBadgeClasses = (status: OSStatus) => {
        switch (status) {
            case 'ABERTA':
                return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
            case 'EM_EXECUCAO':
                return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
            case 'FINALIZADA':
                return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
            case 'CANCELADA':
                return 'text-red-400 border-red-500/30 bg-red-500/10';
        }
    };

    return (
        <div className="pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-orbitron text-white font-bold tracking-wide">
                            Ordens de Serviço
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Acompanhe serviços em andamento, placas atendidas e prazos.
                        </p>
                    </div>
                </div>

                <button
                    onClick={openCreateModal}
                    className="hidden md:inline-flex items-center justify-center gap-2 bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-all font-oxanium shadow-lg shadow-cyber-gold/15"
                >
                    <Plus className="w-4 h-4" />
                    NOVA O.S.
                </button>
            </div>

            {/* Segmented Tabs */}
            <div className="overflow-x-auto scrollbar-hide mb-4">
                <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1 rounded-xl min-w-max">
                    <button
                        onClick={() => handleTabChange('iniciadas')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-oxanium font-semibold transition-all whitespace-nowrap ${
                            activeTab === 'iniciadas'
                                ? 'bg-white/10 text-cyber-gold border border-cyber-gold/35'
                                : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        Em andamento
                        {typeof contadores?.emAndamento === 'number' && (
                            <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-white/10 tabular-nums">
                                {contadores.emAndamento}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('finalizadas')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-oxanium font-semibold transition-all whitespace-nowrap ${
                            activeTab === 'finalizadas'
                                ? 'bg-white/10 text-cyber-gold border border-cyber-gold/35'
                                : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Finalizadas
                    </button>

                    <button
                        onClick={() => handleTabChange('atrasadas')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-oxanium font-semibold transition-all whitespace-nowrap ${
                            activeTab === 'atrasadas'
                                ? 'bg-red-500/15 text-red-400 border border-red-500/40'
                                : 'text-gray-400 hover:text-red-400 border border-transparent'
                        }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Atrasadas
                        {typeof contadores?.atrasadas === 'number' && (
                            <span
                                className={`px-1.5 py-0.5 text-[11px] rounded-full tabular-nums ${
                                    contadores.atrasadas > 0
                                        ? 'bg-red-500/20 text-red-300'
                                        : 'bg-white/10 text-gray-400'
                                }`}
                            >
                                {contadores.atrasadas}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => handleTabChange('canceladas')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-oxanium font-semibold transition-all whitespace-nowrap ${
                            activeTab === 'canceladas'
                                ? 'bg-white/10 text-cyber-gold border border-cyber-gold/35'
                                : 'text-gray-400 hover:text-white border border-transparent'
                        }`}
                    >
                        <Ban className="w-4 h-4" />
                        Canceladas
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 bg-black/40 p-3 rounded-xl border border-white/10">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou nº da O.S..."
                        className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48 relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    <input
                        type="date"
                        className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                        value={dateFilter}
                        onChange={(e) => handleDateChange(e.target.value)}
                    />
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-white/15 text-xs font-oxanium font-semibold text-gray-300 hover:text-white hover:border-white/30 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                        Limpar
                    </button>
                )}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-24 rounded-xl bg-black/40 border border-white/10 animate-pulse"
                        />
                    ))}
                </div>
            ) : isError ? (
                <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-oxanium">
                    Erro ao carregar Ordens de Serviço. Tente novamente em instantes.
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {osList.map((os) => {
                            const tecnicoNome =
                                os.usuarioNome ||
                                (os.usuarioId ? equipePorId.get(os.usuarioId) : undefined) ||
                                os.usuarioEmail;
                            const veiculos = os.veiculos || [];
                            const placasVisiveis = veiculos.slice(0, 3);
                            const placasExtras = veiculos.length - placasVisiveis.length;
                            const valorFinal = os.valorTotalComDesconto ?? os.valorTotal ?? 0;
                            const temDesconto = Boolean(os.valorDesconto && os.valorDesconto > 0);

                            return (
                                <div
                                    key={os.id}
                                    onClick={() => navigate(`/os/${os.id}`)}
                                    className="bg-black/45 border border-white/10 p-4 rounded-xl hover:border-cyber-gold/45 hover:bg-black/60 cursor-pointer transition-all group"
                                >
                                    {/* Mobile Layout */}
                                    <div className="md:hidden flex flex-col gap-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <h3 className="text-base font-bold text-white truncate">
                                                    {os.cliente?.nomeFantasia || os.cliente?.razaoSocial || 'Cliente'}
                                                </h3>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">
                                                    O.S. #{os.id} · {formatarData(os.data)}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-oxanium uppercase tracking-wide ${getStatusBadgeClasses(os.status)}`}
                                                >
                                                    {formatarStatusOS(os.status)}
                                                </span>
                                                {os.atrasado && (
                                                    <span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-400 text-[10px] font-bold font-oxanium uppercase">
                                                        Atrasada
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                                            {tecnicoNome && (
                                                <span className="inline-flex items-center gap-1">
                                                    <User className="w-3.5 h-3.5 text-gray-500" />
                                                    {tecnicoNome}
                                                </span>
                                            )}
                                            {os.dataVencimento && (
                                                <span
                                                    className={`inline-flex items-center gap-1 ${
                                                        os.atrasado ? 'text-red-400 font-semibold' : ''
                                                    }`}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Venc. {formatarData(os.dataVencimento)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {placasVisiveis.map((v) => (
                                                <span
                                                    key={v.id}
                                                    className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-gray-200 font-mono text-[11px] font-semibold tracking-wide"
                                                >
                                                    {v.placa}
                                                </span>
                                            ))}
                                            {placasExtras > 0 && (
                                                <span className="text-[11px] text-gray-400">
                                                    +{placasExtras} veículo(s)
                                                </span>
                                            )}
                                            {veiculos.length === 0 && (
                                                <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                                                    <Car className="w-3.5 h-3.5" /> Sem veículos
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-end justify-between border-t border-white/10 pt-2.5">
                                            <span className="text-xs text-gray-400 font-oxanium">
                                                {veiculos.length} veículo{veiculos.length === 1 ? '' : 's'}
                                            </span>
                                            <div className="text-right">
                                                {temDesconto && (
                                                    <div className="text-[11px] text-gray-500 line-through font-mono">
                                                        {(os.valorTotalSemDesconto || os.valorTotal).toLocaleString(
                                                            'pt-BR',
                                                            { style: 'currency', currency: 'BRL' }
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-lg font-bold text-cyber-gold font-orbitron tabular-nums">
                                                    {valorFinal.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Desktop Layout */}
                                    <div className="hidden md:grid md:grid-cols-[72px_1fr_auto] items-center gap-5">
                                        <div className="flex flex-col items-center justify-center py-2.5 px-2 bg-white/5 border border-white/10 rounded-xl">
                                            <span className="text-[10px] text-gray-500 font-mono uppercase">O.S.</span>
                                            <span className="text-lg font-bold text-white font-orbitron tabular-nums">
                                                #{os.id}
                                            </span>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h3 className="text-base font-bold text-white truncate">
                                                    {os.cliente?.nomeFantasia || os.cliente?.razaoSocial || 'Cliente'}
                                                </h3>
                                                {os.cliente?.razaoSocial &&
                                                    os.cliente.razaoSocial !== os.cliente.nomeFantasia && (
                                                        <span className="text-xs text-gray-500 truncate">
                                                            {os.cliente.razaoSocial}
                                                        </span>
                                                    )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                                    {formatarData(os.data)}
                                                </span>
                                                {tecnicoNome && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <User className="w-3.5 h-3.5 text-gray-500" />
                                                        {tecnicoNome}
                                                    </span>
                                                )}
                                                {os.dataVencimento && (
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 ${
                                                            os.atrasado ? 'text-red-400 font-semibold' : ''
                                                        }`}
                                                    >
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {os.atrasado ? 'Venceu ' : 'Venc. '}
                                                        {formatarData(os.dataVencimento)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                {placasVisiveis.map((v) => (
                                                    <span
                                                        key={v.id}
                                                        className="px-2 py-0.5 rounded bg-white/10 border border-white/10 text-gray-200 font-mono text-[11px] font-semibold tracking-wide"
                                                    >
                                                        {v.placa}
                                                    </span>
                                                ))}
                                                {placasExtras > 0 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{placasExtras} veículo(s)
                                                    </span>
                                                )}
                                                {veiculos.length > 0 && placasExtras === 0 && (
                                                    <span className="text-xs text-gray-500 ml-1">
                                                        {veiculos.length} veículo{veiculos.length === 1 ? '' : 's'}
                                                    </span>
                                                )}
                                                {veiculos.length === 0 && (
                                                    <span className="text-xs text-gray-500 inline-flex items-center gap-1">
                                                        <Car className="w-3.5 h-3.5" /> Nenhum veículo adicionado
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-5">
                                            <div className="flex flex-col items-end gap-1">
                                                <span
                                                    className={`px-2.5 py-1 rounded-full border text-[11px] font-bold font-oxanium uppercase tracking-wide ${getStatusBadgeClasses(os.status)}`}
                                                >
                                                    {formatarStatusOS(os.status)}
                                                </span>
                                                {os.atrasado && (
                                                    <span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-400 text-[10px] font-bold font-oxanium uppercase">
                                                        Atrasada
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-right min-w-[116px]">
                                                <div className="text-[10px] text-gray-500 font-oxanium uppercase tracking-wide">
                                                    Valor total
                                                </div>
                                                {temDesconto && (
                                                    <div className="text-xs text-gray-500 line-through font-mono">
                                                        {(os.valorTotalSemDesconto || os.valorTotal).toLocaleString(
                                                            'pt-BR',
                                                            { style: 'currency', currency: 'BRL' }
                                                        )}
                                                    </div>
                                                )}
                                                <div className="text-lg font-bold text-cyber-gold font-orbitron tabular-nums">
                                                    {valorFinal.toLocaleString('pt-BR', {
                                                        style: 'currency',
                                                        currency: 'BRL',
                                                    })}
                                                </div>
                                            </div>

                                            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-cyber-gold transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {osList.length === 0 && (
                            <div className="text-center py-12 px-4 rounded-xl bg-black/30 border border-white/10 text-gray-400 font-oxanium">
                                Nenhuma Ordem de Serviço encontrada para o filtro atual.
                            </div>
                        )}
                    </div>

                    {/* Pagination Footer */}
                    {totalElements > 0 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-gray-400">
                            <span>
                                Mostrando <strong className="text-white">{startItem}–{endItem}</strong> de{' '}
                                <strong className="text-white">{totalElements}</strong> ordens
                            </span>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                                        disabled={page === 0}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white hover:border-cyber-gold/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                        Anterior
                                    </button>
                                    <span className="px-2 text-xs font-mono text-white">
                                        {page + 1} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                                        disabled={page >= totalPages - 1}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-semibold text-white hover:border-cyber-gold/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Próxima
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Mobile FAB (acima da barra inferior de navegação, com destaque luminoso) */}
            <button
                onClick={openCreateModal}
                aria-label="Nova Ordem de Serviço"
                className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 via-cyber-gold to-amber-500 text-black border border-yellow-200/80 shadow-[0_0_26px_rgba(212,175,55,0.75)] ring-4 ring-cyber-gold/25 flex items-center justify-center z-40 active:scale-95 transition-transform"
            >
                <span className="absolute inset-0 rounded-full bg-cyber-gold/35 animate-ping pointer-events-none" />
                <Plus className="w-7 h-7 relative z-10 stroke-[2.5]" />
            </button>

            {/* Modal / Bottom-Sheet: Nova Ordem de Serviço */}
            {isCreateModalOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsCreateModalOpen(false);
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
                        {/* Handle visual no mobile */}
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />

                        <div className="px-5 pt-4 pb-3.5 border-b border-white/10 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-orbitron font-bold text-white">
                                    Nova Ordem de Serviço
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Defina cliente, técnico e prazo para iniciar o atendimento.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                                aria-label="Fechar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-y-auto">
                            <div className="p-5 space-y-4">
                                {formError && (
                                    <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/35 text-red-200 text-xs">
                                        {formError}
                                    </div>
                                )}

                                {/* Busca instantânea de cliente */}
                                <div>
                                    <label className="block text-xs font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                        Cliente *
                                    </label>
                                    {!selectedClient ? (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nome fantasia, razão social ou CNPJ..."
                                                className="w-full bg-black/50 border border-white/15 text-white text-sm pl-9 pr-3 py-2.5 rounded-xl focus:border-cyber-gold outline-none"
                                                value={clientSearch}
                                                onFocus={() => setIsClientListOpen(true)}
                                                onChange={(e) => {
                                                    setClientSearch(e.target.value);
                                                    setIsClientListOpen(true);
                                                }}
                                                autoComplete="off"
                                            />
                                            {isClientListOpen && (
                                                <div className="mt-1.5 max-h-44 overflow-y-auto rounded-xl bg-[#0b0e16] border border-cyber-gold/35 divide-y divide-white/5">
                                                    {clientesFiltrados.length > 0 ? (
                                                        clientesFiltrados.slice(0, 30).map((c) => (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => handleSelectClient(c)}
                                                                className="w-full text-left px-3.5 py-2.5 hover:bg-cyber-gold/10 transition-colors flex items-center justify-between gap-2"
                                                            >
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-white truncate">
                                                                        {c.nomeFantasia || c.razaoSocial}
                                                                    </div>
                                                                    {c.razaoSocial &&
                                                                        c.razaoSocial !== c.nomeFantasia && (
                                                                            <div className="text-[11px] text-gray-400 truncate">
                                                                                {c.razaoSocial}
                                                                            </div>
                                                                        )}
                                                                </div>
                                                                {c.cnpj && (
                                                                    <span className="text-[11px] text-gray-500 font-mono shrink-0">
                                                                        {c.cnpj}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-3.5 py-3 text-xs text-gray-400">
                                                            Nenhum cliente encontrado.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                                            <div className="min-w-0">
                                                <div className="text-sm font-semibold text-white truncate">
                                                    {selectedClient.nomeFantasia || selectedClient.razaoSocial}
                                                </div>
                                                <div className="text-[11px] text-gray-400 truncate">
                                                    {[selectedClient.razaoSocial, selectedClient.cnpj]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleClearClient}
                                                className="px-2.5 py-1 rounded-lg border border-white/15 text-xs text-gray-300 hover:text-white shrink-0"
                                            >
                                                Trocar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Responsável Técnico */}
                                <div>
                                    <label className="block text-xs font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                        Responsável Técnico *
                                    </label>
                                    <select
                                        className="w-full bg-black/50 border border-white/15 text-white text-sm px-3 py-2.5 rounded-xl focus:border-cyber-gold outline-none"
                                        value={newOSData.usuarioId || 0}
                                        onChange={(e) => {
                                            setNewOSData((prev) => ({
                                                ...prev,
                                                usuarioId: parseInt(e.target.value, 10),
                                            }));
                                            setFormError(null);
                                        }}
                                        required
                                    >
                                        <option value={0}>Selecione um técnico...</option>
                                        {equipe.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name || u.email}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Datas */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                            Data da O.S. *
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-black/50 border border-white/15 text-white text-sm px-3 py-2.5 rounded-xl focus:border-cyber-gold outline-none"
                                            value={newOSData.data}
                                            onChange={(e) => handleOsDateChange(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                            Prazo de Pagamento
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full bg-black/50 border border-white/15 text-white text-sm px-3 py-2.5 rounded-xl focus:border-cyber-gold outline-none"
                                            value={newOSData.dataVencimento || ''}
                                            onChange={(e) => {
                                                setSelectedTermDays(null);
                                                setNewOSData((prev) => ({
                                                    ...prev,
                                                    dataVencimento: e.target.value,
                                                }));
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* Atalhos de prazo */}
                                <div>
                                    <span className="text-[11px] text-gray-400">
                                        Atalhos de prazo a partir da data da O.S.:
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-1.5">
                                        {PRAZO_ATALHOS.map((item) => (
                                            <button
                                                key={item.dias}
                                                type="button"
                                                onClick={() => handleApplyTerm(item.dias)}
                                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                                    selectedTermDays === item.dias
                                                        ? 'bg-cyber-gold/15 border-cyber-gold/50 text-cyber-gold'
                                                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-4 border-t border-white/10 bg-black/25 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2.5 rounded-xl border border-white/15 text-xs sm:text-sm font-oxanium font-semibold text-gray-300 hover:text-white transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="inline-flex items-center gap-2 bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 disabled:opacity-60 transition-all text-xs sm:text-sm font-oxanium"
                                >
                                    {createMutation.isPending ? 'CRIANDO...' : 'CRIAR O.S.'}
                                    {!createMutation.isPending && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
