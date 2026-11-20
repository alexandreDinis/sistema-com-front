import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import type { Cliente, ClienteRequest, StatusCliente, ClienteFiltros } from '../../types';
import {
    Users,
    Plus,
    Save,
    MapPin,
    Phone,
    Mail,
    Building2,
    User,
    Trash2,
    Search,
    Filter,
    X,
    SlidersHorizontal,
    Edit2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { formatCNPJ, formatCPF, formatTelefone, formatCEP } from '../../utils/formatters';
import { usePermission } from '../../hooks/usePermission';
import { Feature } from '../../types/features';
import { ActionModal } from '../../components/modals/ActionModal';
import type { ActionModalType } from '../../components/modals/ActionModal';

interface ApiErrorLike {
    response?: {
        status?: number;
        data?: {
            errors?: Record<string, string>;
            message?: string;
            mensagem?: string;
        };
    };
}

const INITIAL_FORM_STATE: ClienteRequest = {
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    contato: '',
    endereco: '',
    email: '',
    status: 'ATIVO',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    tipoPessoa: 'JURIDICA',
    cpf: '',
};

const getIniciais = (nome?: string): string => {
    if (!nome) return 'CL';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
};

const formatarStatusCliente = (status: StatusCliente): string => {
    switch (status) {
        case 'ATIVO':
            return 'Ativo';
        case 'INATIVO':
            return 'Inativo';
        case 'EM_PROSPECCAO':
            return 'Prospecção';
    }
};

export const ClientesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const { hasFeature } = usePermission();
    const canWrite = hasFeature(Feature.CLIENTE_WRITE);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [showMobileExtraFilters, setShowMobileExtraFilters] = useState(false);
    const [formData, setFormData] = useState<ClienteRequest>(INITIAL_FORM_STATE);

    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: ActionModalType;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        showCancel?: boolean;
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const [page, setPage] = useState(0);
    const pageSize = 12;

    const [filters, setFilters] = useState<ClienteFiltros>({
        termo: '',
        cidade: '',
        bairro: '',
        status: undefined,
    });

    const [debouncedFilters, setDebouncedFilters] = useState<ClienteFiltros>(filters);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedFilters(filters);
            setPage(0);
        }, 350);
        return () => clearTimeout(handler);
    }, [filters]);

    const { data: pageData, isLoading } = useQuery({
        queryKey: ['clientes-paginado', page, pageSize, debouncedFilters],
        queryFn: () => osService.listClientesPaginado(page, pageSize, debouncedFilters),
        placeholderData: keepPreviousData,
    });

    const clientes = pageData?.content || [];
    const totalPages = pageData?.totalPages || 0;
    const totalElements = pageData?.totalElements || 0;
    const startItem = totalElements === 0 ? 0 : page * pageSize + 1;
    const endItem = Math.min((page + 1) * pageSize, totalElements);

    const handleError = (err: unknown) => {
        const error = (err as ApiErrorLike) || {};
        let title = 'Erro';
        let message = 'Ocorreu um erro ao processar sua solicitação.';

        if (error.response?.status === 400) {
            title = 'Dados Inválidos';
            const apiErrors = error.response.data?.errors;
            if (apiErrors) {
                const errorList = Object.keys(apiErrors)
                    .map((key) => `• ${apiErrors[key]}`)
                    .join('\n');
                message = `Verifique os seguintes campos:\n\n${errorList}`;
            } else {
                message =
                    error.response.data?.message ||
                    error.response.data?.mensagem ||
                    'Verifique os dados informados.';
            }
        } else if (error.response?.status === 500) {
            title = 'Erro no Servidor';
            message = 'Ocorreu um erro interno. Tente novamente mais tarde.';
        }

        setActionModal({
            isOpen: true,
            title,
            message,
            type: 'danger',
            confirmText: 'FECHAR',
            showCancel: false,
            onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
        });
    };

    const resetForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData(INITIAL_FORM_STATE);
    };

    const createMutation = useMutation({
        mutationFn: osService.createCliente,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-paginado'] });
            resetForm();
            setActionModal({
                isOpen: true,
                title: 'Cliente Cadastrado',
                message: 'Cliente cadastrado com sucesso!',
                type: 'success',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: handleError,
    });

    const updateMutation = useMutation({
        mutationFn: osService.updateCliente,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-paginado'] });
            resetForm();
            setActionModal({
                isOpen: true,
                title: 'Cliente Atualizado',
                message: 'Cliente atualizado com sucesso!',
                type: 'success',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: handleError,
    });

    const deleteMutation = useMutation({
        mutationFn: osService.deleteCliente,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['clientes'] });
            queryClient.invalidateQueries({ queryKey: ['clientes-paginado'] });
            resetForm();
            setActionModal({
                isOpen: true,
                title: 'Cliente Excluído',
                message: 'Cliente excluído com sucesso!',
                type: 'success',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: handleError,
    });

    const openNewModal = () => {
        if (!canWrite) return;
        setEditingId(null);
        setFormData(INITIAL_FORM_STATE);
        setIsFormOpen(true);
    };

    const handleEdit = (cliente: Cliente) => {
        if (!canWrite) return;
        setEditingId(cliente.id);
        setFormData({
            razaoSocial: cliente.razaoSocial || '',
            nomeFantasia: cliente.nomeFantasia || '',
            cnpj: cliente.cnpj ? formatCNPJ(cliente.cnpj) : '',
            contato: cliente.contato ? formatTelefone(cliente.contato) : '',
            email: cliente.email || '',
            status: (cliente.status as StatusCliente) || 'ATIVO',
            logradouro: cliente.logradouro || '',
            numero: cliente.numero || '',
            complemento: cliente.complemento || '',
            bairro: cliente.bairro || '',
            cidade: cliente.cidade || '',
            estado: cliente.estado || '',
            cep: cliente.cep ? formatCEP(cliente.cep) : '',
            tipoPessoa: cliente.tipoPessoa || 'JURIDICA',
            cpf: cliente.cpf ? formatCPF(cliente.cpf) : '',
        });
        setIsFormOpen(true);
    };

    const handleRequestDelete = () => {
        if (!editingId) return;
        setActionModal({
            isOpen: true,
            title: 'Excluir Cliente?',
            message: 'Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.',
            type: 'danger',
            confirmText: 'SIM, EXCLUIR',
            cancelText: 'CANCELAR',
            showCancel: true,
            onConfirm: () => {
                setActionModal((prev) => ({ ...prev, isOpen: false }));
                deleteMutation.mutate(editingId);
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanData: ClienteRequest = {
            ...formData,
            contato: (formData.contato || '').replace(/\D/g, ''),
            cep: (formData.cep || '').replace(/\D/g, ''),
            endereco: formData.logradouro,
            tipoPessoa: formData.tipoPessoa || 'JURIDICA',
            cpf: formData.tipoPessoa === 'FISICA' ? (formData.cpf || '').replace(/\D/g, '') : undefined,
            cnpj: formData.tipoPessoa === 'JURIDICA' ? (formData.cnpj || '').replace(/\D/g, '') : undefined,
        };

        if (editingId) {
            updateMutation.mutate({ id: editingId, data: cleanData });
        } else {
            createMutation.mutate(cleanData);
        }
    };

    const getStatusBadgeClasses = (status: StatusCliente) => {
        switch (status) {
            case 'ATIVO':
                return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
            case 'INATIVO':
                return 'text-red-400 border-red-500/30 bg-red-500/10';
            case 'EM_PROSPECCAO':
                return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
        }
    };

    const hasActiveFilters = Boolean(filters.termo || filters.cidade || filters.bairro || filters.status);

    const clearFilters = () => {
        setFilters({ termo: '', cidade: '', bairro: '', status: undefined });
    };

    return (
        <div className="pb-24 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide">
                            Clientes
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Gerencie oficinas parceiras, concessionárias e clientes particulares.
                        </p>
                    </div>
                </div>

                {canWrite && (
                    <button
                        onClick={openNewModal}
                        className="hidden md:inline-flex items-center justify-center gap-2 bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-all font-oxanium text-sm shadow-lg shadow-cyber-gold/15"
                    >
                        <Plus className="w-4 h-4" />
                        Novo Cliente
                    </button>
                )}
            </div>

            {/* Abas de Status */}
            <div className="overflow-x-auto scrollbar-hide mb-4">
                <div className="inline-flex items-center gap-1 bg-black/50 border border-white/10 p-1 rounded-xl min-w-max">
                    {[
                        { label: 'Todos', value: undefined as StatusCliente | undefined },
                        { label: 'Ativos', value: 'ATIVO' as StatusCliente },
                        { label: 'Em prospecção', value: 'EM_PROSPECCAO' as StatusCliente },
                        { label: 'Inativos', value: 'INATIVO' as StatusCliente },
                    ].map((tab) => {
                        const isActive = filters.status === tab.value;
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                onClick={() => setFilters((prev) => ({ ...prev, status: tab.value }))}
                                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-oxanium font-semibold transition-all whitespace-nowrap ${
                                    isActive
                                        ? 'bg-white/10 text-cyber-gold border border-cyber-gold/35'
                                        : 'text-gray-400 hover:text-white border border-transparent'
                                }`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="bg-black/40 border border-white/10 p-3 rounded-xl mb-5 space-y-2.5">
                <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, razão social ou CNPJ/CPF..."
                            className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                            value={filters.termo || ''}
                            onChange={(e) => setFilters({ ...filters, termo: e.target.value })}
                        />
                    </div>

                    {/* Desktop Cidade / Bairro */}
                    <div className="hidden md:block w-44 relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Cidade"
                            className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                            value={filters.cidade || ''}
                            onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                        />
                    </div>

                    <div className="hidden md:block w-44 relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Bairro"
                            className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-3 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                            value={filters.bairro || ''}
                            onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                        />
                    </div>

                    {/* Botão toggle filtros extras no celular */}
                    <button
                        type="button"
                        onClick={() => setShowMobileExtraFilters((v) => !v)}
                        className={`md:hidden p-2.5 rounded-lg border transition-colors ${
                            showMobileExtraFilters || filters.cidade || filters.bairro
                                ? 'border-cyber-gold/50 bg-cyber-gold/10 text-cyber-gold'
                                : 'border-white/10 bg-black/60 text-gray-400'
                        }`}
                        aria-label="Filtros por cidade e bairro"
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                    </button>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-white/15 text-xs font-oxanium font-semibold text-gray-300 hover:text-white transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Limpar
                        </button>
                    )}
                </div>

                {/* Filtros extras expansíveis no celular */}
                {showMobileExtraFilters && (
                    <div className="md:hidden grid grid-cols-2 gap-2 pt-1">
                        <input
                            type="text"
                            placeholder="Cidade"
                            className="w-full bg-black/60 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:border-cyber-gold outline-none"
                            value={filters.cidade || ''}
                            onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
                        />
                        <input
                            type="text"
                            placeholder="Bairro"
                            className="w-full bg-black/60 border border-white/10 text-white text-xs px-3 py-2 rounded-lg focus:border-cyber-gold outline-none"
                            value={filters.bairro || ''}
                            onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
                        />
                    </div>
                )}
            </div>

            {/* Grade de Cards de Clientes */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-44 rounded-2xl bg-black/40 border border-white/10 animate-pulse"
                        />
                    ))}
                </div>
            ) : clientes.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-black/35 border border-white/10 text-gray-400 font-oxanium">
                    Nenhum cliente encontrado para o filtro atual.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {clientes.map((cliente) => {
                        const isPF = cliente.tipoPessoa === 'FISICA';
                        const nomePrincipal = cliente.nomeFantasia || cliente.razaoSocial || 'Cliente';
                        const subtitulo =
                            cliente.razaoSocial && cliente.razaoSocial !== nomePrincipal
                                ? cliente.razaoSocial
                                : isPF
                                  ? 'Cliente Particular'
                                  : undefined;
                        const documento = isPF
                            ? cliente.cpf
                                ? formatCPF(cliente.cpf)
                                : ''
                            : cliente.cnpj
                              ? formatCNPJ(cliente.cnpj)
                              : '';
                        const telefoneFormatado = cliente.contato ? formatTelefone(cliente.contato) : '';
                        const telefoneDigitos = (cliente.contato || '').replace(/\D/g, '');
                        const enderecoResumo = cliente.cidade
                            ? [cliente.bairro, `${cliente.cidade}${cliente.estado ? ` / ${cliente.estado}` : ''}`]
                                  .filter(Boolean)
                                  .join(' · ')
                            : cliente.logradouro
                              ? `${cliente.logradouro}${cliente.numero ? `, ${cliente.numero}` : ''}`
                              : cliente.endereco || '';

                        return (
                            <div
                                key={cliente.id}
                                className="min-w-0 w-full overflow-hidden bg-black/45 border border-white/10 hover:border-cyber-gold/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors"
                            >
                                <div className="space-y-3 min-w-0">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2 min-w-0">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div
                                                className={`w-10 h-10 rounded-xl border font-bold text-xs flex items-center justify-center shrink-0 ${
                                                    isPF
                                                        ? 'bg-blue-500/15 border-blue-500/35 text-blue-400'
                                                        : 'bg-cyber-gold/15 border-cyber-gold/35 text-cyber-gold'
                                                }`}
                                            >
                                                {getIniciais(nomePrincipal)}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                                    {nomePrincipal}
                                                </h3>
                                                {subtitulo && (
                                                    <p className="text-xs text-gray-400 truncate">{subtitulo}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-gray-400">
                                                {isPF ? 'PF' : 'PJ'}
                                            </span>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusBadgeClasses(cliente.status)}`}
                                            >
                                                {formatarStatusCliente(cliente.status)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Detalhes */}
                                    <div className="space-y-1.5 text-xs text-gray-300 min-w-0">
                                        {documento && (
                                            <div className="flex items-center gap-2 min-w-0">
                                                {isPF ? (
                                                    <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                ) : (
                                                    <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                )}
                                                <span className="font-mono text-gray-300 truncate">{documento}</span>
                                            </div>
                                        )}
                                        {telefoneFormatado && (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                <span className="truncate">{telefoneFormatado}</span>
                                            </div>
                                        )}
                                        {cliente.email && (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                <span className="truncate">{cliente.email}</span>
                                            </div>
                                        )}
                                        {enderecoResumo && (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                                <span className="text-gray-400 truncate">{enderecoResumo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rodapé com ações rápidas */}
                                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {telefoneDigitos && (
                                            <a
                                                href={`tel:${telefoneDigitos}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/25 transition-colors"
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                                Ligar
                                            </a>
                                        )}
                                        {cliente.email && (
                                            <a
                                                href={`mailto:${cliente.email}`}
                                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300 hover:text-white hover:border-white/25 transition-colors"
                                            >
                                                <Mail className="w-3.5 h-3.5" />
                                                E-mail
                                            </a>
                                        )}
                                    </div>

                                    {canWrite && (
                                        <button
                                            type="button"
                                            onClick={() => handleEdit(cliente)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-oxanium font-semibold text-gray-200 hover:text-cyber-gold hover:border-cyber-gold/40 transition-colors"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Editar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Paginação */}
            {!isLoading && totalElements > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-5 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-gray-400">
                    <span>
                        Mostrando <strong className="text-white">{startItem}–{endItem}</strong> de{' '}
                        <strong className="text-white">{totalElements}</strong> clientes
                    </span>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
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
                                type="button"
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

            {/* Mobile FAB (acima da barra inferior de navegação, com destaque luminoso) */}
            {canWrite && (
                <button
                    onClick={openNewModal}
                    aria-label="Novo Cliente"
                    className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 via-cyber-gold to-amber-500 text-black border border-yellow-200/80 shadow-[0_0_26px_rgba(212,175,55,0.75)] ring-4 ring-cyber-gold/25 flex items-center justify-center z-40 active:scale-95 transition-transform"
                >
                    <span className="absolute inset-0 rounded-full bg-cyber-gold/35 animate-ping pointer-events-none" />
                    <Plus className="w-7 h-7 relative z-10 stroke-[2.5]" />
                </button>
            )}

            {/* Modal / Bottom-Sheet: Criar / Editar Cliente */}
            {isFormOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) resetForm();
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />

                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base sm:text-lg font-orbitron font-bold text-white">
                                    {editingId ? 'Editar Cliente' : 'Novo Cliente'}
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Preencha identificação, contato e endereço do cliente.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {editingId && (
                                    <button
                                        type="button"
                                        onClick={handleRequestDelete}
                                        className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-oxanium font-semibold inline-flex items-center gap-1.5"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Excluir</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                                    aria-label="Fechar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
                            <div className="p-5 space-y-5">
                                {/* Tipo de Pessoa */}
                                <div className="grid grid-cols-2 gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, tipoPessoa: 'JURIDICA' })}
                                        className={`py-2 rounded-lg text-xs font-bold font-oxanium transition-all ${
                                            formData.tipoPessoa !== 'FISICA'
                                                ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                                : 'text-gray-400 hover:text-white border border-transparent'
                                        }`}
                                    >
                                        Pessoa Jurídica (PJ)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, tipoPessoa: 'FISICA' })}
                                        className={`py-2 rounded-lg text-xs font-bold font-oxanium transition-all ${
                                            formData.tipoPessoa === 'FISICA'
                                                ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                                : 'text-gray-400 hover:text-white border border-transparent'
                                        }`}
                                    >
                                        Pessoa Física (PF)
                                    </button>
                                </div>

                                {/* Identificação */}
                                <div className="space-y-3">
                                    <div className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-500 border-b border-white/10 pb-1">
                                        Identificação
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                {formData.tipoPessoa === 'FISICA' ? 'Nome Completo' : 'Razão Social'}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.razaoSocial}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, razaoSocial: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                {formData.tipoPessoa === 'FISICA'
                                                    ? 'Apelido (Opcional)'
                                                    : 'Nome Fantasia *'}
                                            </label>
                                            <input
                                                type="text"
                                                required={formData.tipoPessoa !== 'FISICA'}
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.nomeFantasia}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, nomeFantasia: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                {formData.tipoPessoa === 'FISICA' ? 'CPF' : 'CNPJ'}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none font-mono"
                                                value={
                                                    formData.tipoPessoa === 'FISICA'
                                                        ? formData.cpf || ''
                                                        : formData.cnpj
                                                }
                                                onChange={(e) => {
                                                    if (formData.tipoPessoa === 'FISICA') {
                                                        setFormData({ ...formData, cpf: formatCPF(e.target.value) });
                                                    } else {
                                                        setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) });
                                                    }
                                                }}
                                                placeholder={
                                                    formData.tipoPessoa === 'FISICA'
                                                        ? '000.000.000-00'
                                                        : '00.000.000/0000-00'
                                                }
                                                maxLength={18}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Status
                                            </label>
                                            <select
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.status}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        status: e.target.value as StatusCliente,
                                                    })
                                                }
                                            >
                                                <option value="ATIVO">Ativo</option>
                                                <option value="EM_PROSPECCAO">Em prospecção</option>
                                                <option value="INATIVO">Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Contato */}
                                <div className="space-y-3">
                                    <div className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-500 border-b border-white/10 pb-1">
                                        Contato
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Telefone / WhatsApp
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.contato}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, contato: formatTelefone(e.target.value) })
                                                }
                                                placeholder="(00) 00000-0000"
                                                maxLength={15}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                E-mail
                                            </label>
                                            <input
                                                type="email"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="contato@empresa.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Endereço */}
                                <div className="space-y-3">
                                    <div className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-500 border-b border-white/10 pb-1">
                                        Endereço
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                CEP
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none font-mono"
                                                value={formData.cep}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, cep: formatCEP(e.target.value) })
                                                }
                                                placeholder="00000-000"
                                                maxLength={9}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Logradouro
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.logradouro}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, logradouro: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Número
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.numero}
                                                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Bairro
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.bairro}
                                                onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Cidade
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.cidade}
                                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                UF
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none uppercase"
                                                value={formData.estado}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        estado: e.target.value.toUpperCase(),
                                                    })
                                                }
                                                placeholder="SP"
                                                maxLength={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                                Complemento
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                value={formData.complemento || ''}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, complemento: e.target.value })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="bg-cyber-gold text-black font-bold py-2 px-5 rounded-xl hover:bg-yellow-400 transition-colors flex items-center gap-2 font-oxanium text-xs sm:text-sm disabled:opacity-60"
                                >
                                    <Save className="w-4 h-4" />
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Salvando...'
                                        : 'Salvar Cliente'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ActionModal
                isOpen={actionModal.isOpen}
                title={actionModal.title}
                message={actionModal.message}
                type={actionModal.type}
                confirmText={actionModal.confirmText}
                cancelText={actionModal.cancelText}
                onConfirm={actionModal.onConfirm}
                onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                showCancel={actionModal.showCancel}
            />
        </div>
    );
};
