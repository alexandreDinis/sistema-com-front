import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    Copy,
    Edit2,
    Loader2,
    Phone,
    Plus,
    QrCode,
    Save,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { prestadorService } from '../../services/prestadorService';
import type { Prestador, PrestadorRequest } from '../../types';
import { ActionModal } from '../../components/modals/ActionModal';
import { maskPhone } from '../../utils/empresaConfigUtils';
import { filterTerceirizados } from '../../utils/terceirizadosUtils';

export default function PrestadoresPage() {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editando, setEditando] = useState<Prestador | null>(null);
    const [mostrarInativos, setMostrarInativos] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmDeactivate, setConfirmDeactivate] = useState<Prestador | null>(null);
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    // Form state
    const [nome, setNome] = useState('');
    const [telefone, setTelefone] = useState('');
    const [chavePix, setChavePix] = useState('');

    const {
        data: prestadores = [],
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['prestadores', mostrarInativos],
        queryFn: () => prestadorService.listar(!mostrarInativos),
        staleTime: 30_000,
    });

    const filteredPrestadores = useMemo(
        () => filterTerceirizados(prestadores, searchTerm),
        [prestadores, searchTerm]
    );

    const fecharModal = () => {
        setShowModal(false);
        setEditando(null);
        setNome('');
        setTelefone('');
        setChavePix('');
    };

    const saveMutation = useMutation({
        mutationFn: async (data: PrestadorRequest) => {
            if (editando) {
                return prestadorService.atualizar(editando.id, data);
            }
            return prestadorService.criar(data);
        },
        onSuccess: () => {
            setFeedbackError(null);
            queryClient.invalidateQueries({ queryKey: ['prestadores'] });
            fecharModal();
        },
        onError: () => {
            setFeedbackError('Não foi possível salvar o prestador terceirizado. Tente novamente.');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: prestadorService.desativar,
        onSuccess: () => {
            setFeedbackError(null);
            setConfirmDeactivate(null);
            queryClient.invalidateQueries({ queryKey: ['prestadores'] });
        },
        onError: () => {
            setConfirmDeactivate(null);
            setFeedbackError('Não foi possível desativar o prestador terceirizado. Tente novamente.');
        },
    });

    const abrirModal = (prestador?: Prestador) => {
        setFeedbackError(null);
        if (prestador) {
            setEditando(prestador);
            setNome(prestador.nome);
            setTelefone(prestador.telefone ? maskPhone(prestador.telefone) : '');
            setChavePix(prestador.chavePix || '');
        } else {
            setEditando(null);
            setNome('');
            setTelefone('');
            setChavePix('');
        }
        setShowModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim() || saveMutation.isPending) return;

        const data: PrestadorRequest = {
            nome: nome.trim(),
            telefone: telefone.trim() || undefined,
            chavePix: chavePix.trim() || undefined,
        };

        saveMutation.mutate(data);
    };

    const handleCopyPix = async (id: number, pix: string) => {
        try {
            await navigator.clipboard.writeText(pix);
            setCopiedId(id);
            setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
        } catch {
            // Ignora erro caso clipboard não esteja disponível no contexto
        }
    };

    const inputClass =
        'w-full rounded-xl bg-zinc-950/90 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors';

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
                <span className="text-zinc-200 font-medium">Terceirizados</span>
            </div>

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Prestadores Terceirizados
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Parceiros externos (funileiros, pintores, vidraceiros) vinculados a serviços terceirizados na O.S.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => abrirModal()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 self-start sm:self-auto whitespace-nowrap"
                >
                    <Plus className="w-4 h-4" />
                    <span>Novo Terceirizado</span>
                </button>
            </header>

            {/* Feedback Error */}
            {feedbackError && !showModal && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-300">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{feedbackError}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedbackError(null)}
                        className="text-red-300/70 hover:text-red-200 font-semibold"
                    >
                        Fechar
                    </button>
                </div>
            )}

            {/* Search & Status Tabs */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, telefone ou chave PIX..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-xl bg-zinc-900/80 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-cyber-gold focus:outline-none transition-colors"
                    />
                </div>

                <div className="inline-flex items-center p-1 rounded-xl bg-zinc-900/80 border border-white/10 gap-1 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={() => setMostrarInativos(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            !mostrarInativos
                                ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                : 'text-zinc-400 hover:text-white border border-transparent'
                        }`}
                    >
                        Ativos
                    </button>
                    <button
                        type="button"
                        onClick={() => setMostrarInativos(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            mostrarInativos
                                ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/30'
                                : 'text-zinc-400 hover:text-white border border-transparent'
                        }`}
                    >
                        Todos (incl. inativos)
                    </button>
                </div>
            </section>

            {/* Error State */}
            {isError && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-sm text-red-200">
                        Não foi possível carregar a lista de prestadores terceirizados.
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

            {/* List */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-44 rounded-2xl bg-zinc-900/75 border border-white/10"
                        />
                    ))}
                </div>
            ) : filteredPrestadores.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-900/40 py-14 px-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 text-zinc-500 flex items-center justify-center mx-auto mb-3">
                        <Users className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-zinc-300">
                        Nenhum prestador terceirizado encontrado
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                        Cadastre parceiros externos para vinculá-los aos serviços terceirizados das O.S.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPrestadores.map((p) => (
                        <article
                            key={p.id}
                            className={`rounded-2xl bg-zinc-900/75 border p-5 flex flex-col justify-between gap-4 min-w-0 overflow-hidden transition-colors ${
                                p.ativo
                                    ? 'border-white/10 hover:border-cyber-gold/35'
                                    : 'border-white/5 opacity-65'
                            }`}
                        >
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-base font-bold text-white break-words min-w-0">
                                        {p.nome}
                                    </h2>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                            p.ativo
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                                : 'bg-red-500/15 text-red-400 border border-red-500/25'
                                        }`}
                                    >
                                        {p.ativo ? 'Ativo' : 'Inativo'}
                                    </span>
                                </div>

                                <div className="mt-4 space-y-2">
                                    {p.telefone && (
                                        <div className="flex items-center gap-2 text-xs text-zinc-300 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                                            <Phone className="w-3.5 h-3.5 text-cyber-gold shrink-0" />
                                            <span className="truncate">{p.telefone}</span>
                                        </div>
                                    )}

                                    {p.chavePix && (
                                        <div className="flex items-center justify-between gap-2 text-xs text-zinc-300 px-3 py-2 rounded-xl bg-black/30 border border-white/5">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <QrCode className="w-3.5 h-3.5 text-cyber-gold shrink-0" />
                                                <span className="truncate">{p.chavePix}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyPix(p.id, p.chavePix!)}
                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyber-gold/15 hover:bg-cyber-gold/25 text-cyber-gold text-[11px] font-semibold transition-colors shrink-0"
                                                title="Copiar chave PIX"
                                            >
                                                {copiedId === p.id ? (
                                                    <>
                                                        <Check className="w-3 h-3" />
                                                        <span>Copiado</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3 h-3" />
                                                        <span>Copiar</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {!p.telefone && !p.chavePix && (
                                        <p className="text-xs text-zinc-500 italic">
                                            Sem telefone ou chave PIX cadastrados.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {p.ativo && (
                                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => abrirModal(p)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5 text-cyber-gold" />
                                        <span>Editar</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfirmDeactivate(p)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-300 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Desativar</span>
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-bold text-white">
                                    {editando ? 'Editar Terceirizado' : 'Novo Terceirizado'}
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Informe os dados de contato e pagamento do parceiro externo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={fecharModal}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Nome / Oficina Parceira *
                                </label>
                                <input
                                    type="text"
                                    required
                                    maxLength={120}
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className={inputClass}
                                    placeholder="Ex: João Funileiro"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Telefone
                                </label>
                                <input
                                    type="text"
                                    maxLength={15}
                                    value={telefone}
                                    onChange={(e) => setTelefone(maskPhone(e.target.value))}
                                    className={inputClass}
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                                    Chave PIX
                                </label>
                                <input
                                    type="text"
                                    maxLength={120}
                                    value={chavePix}
                                    onChange={(e) => setChavePix(e.target.value)}
                                    className={inputClass}
                                    placeholder="CPF, CNPJ, e-mail ou telefone"
                                />
                            </div>

                            {feedbackError && (
                                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-300">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{feedbackError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={fecharModal}
                                    disabled={saveMutation.isPending}
                                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-sm font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!nome.trim() || saveMutation.isPending}
                                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black text-sm font-semibold transition-all shadow-lg shadow-cyber-gold/15 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {saveMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Salvando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            <span>{editando ? 'Salvar Alterações' : 'Cadastrar'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deactivate Confirmation Modal */}
            <ActionModal
                isOpen={confirmDeactivate !== null}
                onClose={() => !deleteMutation.isPending && setConfirmDeactivate(null)}
                onConfirm={() => {
                    if (confirmDeactivate && !deleteMutation.isPending) {
                        deleteMutation.mutate(confirmDeactivate.id);
                    }
                }}
                title="Desativar Terceirizado"
                message={`Deseja desativar "${confirmDeactivate?.nome || ''}"?\n\nEle deixará de aparecer para seleção em novas ordens de serviço, mantendo o histórico anterior preservado.`}
                type="danger"
                confirmText={deleteMutation.isPending ? 'Desativando...' : 'Desativar'}
                cancelText="Cancelar"
            />
        </div>
    );
}
