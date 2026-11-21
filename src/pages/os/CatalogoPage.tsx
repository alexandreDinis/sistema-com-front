import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import { filtrarCatalogo } from '../../utils/osUtils';
import type { TipoPecaRequest } from '../../types';
import { Wrench, Plus, Save, Tag, Trash2, Search, X } from 'lucide-react';
import { ActionModal } from '../../components/modals/ActionModal';
import type { ActionModalType } from '../../components/modals/ActionModal';

export const CatalogoPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [nomeInput, setNomeInput] = useState('');
    const [valorInput, setValorInput] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

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

    const { data: itens = [], isLoading } = useQuery({
        queryKey: ['catalogo'],
        queryFn: osService.listTiposPeca,
    });

    // Filtra (sem acento/hífen) e ordena alfabeticamente (A -> Z)
    const itensFiltrados = useMemo(() => {
        const filtrados = filtrarCatalogo(itens, searchTerm);
        return [...filtrados].sort((a, b) =>
            (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
        );
    }, [itens, searchTerm]);

    const createMutation = useMutation({
        mutationFn: (payload: TipoPecaRequest) => osService.createTipoPeca(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['catalogo'] });
            closeModal();
        },
        onError: () => {
            setFormError('Não foi possível adicionar o item ao catálogo. Tente novamente.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: osService.deleteTipoPeca,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['catalogo'] });
        },
        onError: () => {
            setActionModal({
                isOpen: true,
                title: 'Erro ao Excluir',
                message: 'Não foi possível excluir este item do catálogo. Ele pode estar em uso em alguma OS.',
                type: 'danger',
                confirmText: 'FECHAR',
                showCancel: false,
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const openModal = () => {
        setNomeInput('');
        setValorInput('');
        setFormError(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nomeLimpo = nomeInput.trim();
        const valorNum = parseFloat(valorInput.replace(',', '.'));

        if (!nomeLimpo) {
            setFormError('Informe o nome da peça ou serviço.');
            return;
        }
        if (isNaN(valorNum) || valorNum < 0) {
            setFormError('Informe um valor padrão válido.');
            return;
        }

        setFormError(null);
        createMutation.mutate({
            nome: nomeLimpo.toUpperCase(),
            valorPadrao: valorNum,
        });
    };

    const handleRequestDelete = (id: number, nome: string) => {
        setActionModal({
            isOpen: true,
            title: 'Excluir Item do Catálogo?',
            message: `Tem certeza que deseja excluir "${nome.toUpperCase()}"? Esta ação não pode ser desfeita.`,
            type: 'danger',
            confirmText: 'SIM, EXCLUIR',
            cancelText: 'CANCELAR',
            showCancel: true,
            onConfirm: () => {
                setActionModal((prev) => ({ ...prev, isOpen: false }));
                deleteMutation.mutate(id);
            },
        });
    };

    return (
        <div className="pb-28 md:pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide">
                            Catálogo de Serviços
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Gerencie peças, serviços e valores padrão usados nas Ordens de Serviço.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={openModal}
                    className="hidden md:inline-flex items-center justify-center gap-2 bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-all font-oxanium text-sm shadow-lg shadow-cyber-gold/15"
                >
                    <Plus className="w-4 h-4" />
                    Novo Item
                </button>
            </div>

            {/* Barra de Busca + Contador */}
            <div className="bg-black/40 border border-white/10 p-3 rounded-xl mb-5 flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar peça ou serviço (ex: capô, porta, teto)..."
                        className="w-full bg-black/60 border border-white/10 text-white text-sm pl-9 pr-9 py-2.5 rounded-lg focus:border-cyber-gold outline-none transition-colors"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                            aria-label="Limpar busca"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <span className="text-xs font-oxanium text-gray-400 whitespace-nowrap hidden sm:inline">
                    <strong className="text-white">{itensFiltrados.length}</strong>{' '}
                    {itensFiltrados.length === 1 ? 'item' : 'itens'}
                </span>
            </div>

            {/* Grade de Itens */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="h-32 rounded-2xl bg-black/40 border border-white/10 animate-pulse"
                        />
                    ))}
                </div>
            ) : itensFiltrados.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-black/35 border border-white/10 text-gray-400 font-oxanium">
                    {searchTerm
                        ? `Nenhum item encontrado para "${searchTerm}".`
                        : 'Nenhum item cadastrado no catálogo.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {itensFiltrados.map((item) => (
                        <div
                            key={item.id}
                            className="min-w-0 w-full overflow-hidden bg-black/45 border border-white/10 hover:border-cyber-gold/40 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-colors"
                        >
                            <div className="min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-gray-500">
                                        <Tag className="w-3.5 h-3.5 text-cyber-gold/70" />
                                        #{item.id}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRequestDelete(item.id, item.nome)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                                        title="Excluir item"
                                        aria-label={`Excluir ${item.nome}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-sm sm:text-base font-bold text-white uppercase leading-snug break-words">
                                    {item.nome}
                                </h3>
                            </div>

                            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-oxanium uppercase tracking-wider text-gray-500">
                                    Valor padrão
                                </span>
                                <span className="text-base sm:text-lg font-mono font-bold text-cyber-gold tabular-nums">
                                    {Number(item.valorPadrao || 0).toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                    })}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Mobile FAB luminoso acima da barra inferior */}
            <button
                type="button"
                onClick={openModal}
                aria-label="Novo Item no Catálogo"
                className="md:hidden fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-300 via-cyber-gold to-amber-500 text-black border border-yellow-200/80 shadow-[0_0_26px_rgba(212,175,55,0.75)] ring-4 ring-cyber-gold/25 flex items-center justify-center z-40 active:scale-95 transition-transform"
            >
                <span className="absolute inset-0 rounded-full bg-cyber-gold/35 animate-ping pointer-events-none" />
                <Plus className="w-7 h-7 relative z-10 stroke-[2.5]" />
            </button>

            {/* Modal / Bottom-Sheet: Novo Item */}
            {isModalOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeModal();
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />

                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-base font-orbitron font-bold text-white">
                                    Novo Item no Catálogo
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Cadastre uma peça ou serviço com seu valor de referência.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                                aria-label="Fechar"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-5 space-y-4">
                                {formError && (
                                    <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/35 text-red-200 text-xs">
                                        {formError}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                        Nome da Peça / Serviço *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: PORTA DIANTEIRA DIREITA"
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm uppercase focus:border-cyber-gold outline-none"
                                        value={nomeInput}
                                        onChange={(e) => setNomeInput(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                        Valor Padrão (R$) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        placeholder="0.00"
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-base font-mono font-bold focus:border-cyber-gold outline-none"
                                        value={valorInput}
                                        onChange={(e) => setValorInput(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="bg-cyber-gold text-black font-bold py-2 px-5 rounded-xl hover:bg-yellow-400 transition-colors flex items-center gap-2 font-oxanium text-xs sm:text-sm disabled:opacity-60"
                                >
                                    <Save className="w-4 h-4" />
                                    {createMutation.isPending ? 'Salvando...' : 'Salvar Item'}
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
