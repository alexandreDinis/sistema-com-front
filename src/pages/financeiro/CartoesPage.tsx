import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    CreditCard,
    DollarSign,
    Home,
    Pencil,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { cartaoService } from '../../services/cartaoService';
import { financeiroService } from '../../services/financeiroService';
import { ActionModal } from '../../components/modals/ActionModal';
import type { CartaoCredito, LimiteDisponivelDTO } from '../../types';
import {
    calcularUsoLimite,
    consolidarLimitesCartoes,
    contarFaturasAbertasPorCartao,
    descreverRegraCiclo,
    filtrarCartoesPorBusca,
    validarFormularioCartao,
} from '../../utils/cartaoUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CartoesPage = () => {
    const queryClient = useQueryClient();

    const [busca, setBusca] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCartao, setEditingCartao] = useState<CartaoCredito | null>(null);
    const [cartaoParaDesativar, setCartaoParaDesativar] = useState<CartaoCredito | null>(null);

    // Form states
    const [nome, setNome] = useState('');
    const [diaVencimento, setDiaVencimento] = useState<number>(5);
    const [diaFechamento, setDiaFechamento] = useState<number>(25);
    const [limite, setLimite] = useState<string>('');
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const {
        data: cartoes = [],
        isLoading: loadingCartoes,
        isFetching: fetchingCartoes,
        refetch: refetchCartoes,
    } = useQuery({
        queryKey: ['cartoes'],
        queryFn: () => cartaoService.listar(),
    });

    const cartoesComLimiteIds = useMemo(
        () => cartoes.filter((c) => c.limite != null && c.limite > 0).map((c) => c.id),
        [cartoes]
    );

    const { data: limitesPorId = {} } = useQuery<Record<number, LimiteDisponivelDTO>>({
        queryKey: ['cartao-limite', cartoesComLimiteIds],
        enabled: cartoesComLimiteIds.length > 0,
        queryFn: async () => {
            const entries = await Promise.all(
                cartoesComLimiteIds.map(async (id) => {
                    try {
                        const dto = await cartaoService.getLimiteDisponivel(id);
                        return [id, dto] as const;
                    } catch {
                        return null;
                    }
                })
            );
            const map: Record<number, LimiteDisponivelDTO> = {};
            for (const entry of entries) {
                if (entry) {
                    map[entry[0]] = entry[1];
                }
            }
            return map;
        },
    });

    const { data: contasPendentes = [] } = useQuery({
        queryKey: ['faturas', 'pendentes-resumo'],
        queryFn: () => financeiroService.listarContasPagar('PENDENTE'),
    });

    const resumoLimites = useMemo(
        () => consolidarLimitesCartoes(cartoes, limitesPorId),
        [cartoes, limitesPorId]
    );

    const faturasInfo = useMemo(
        () => contarFaturasAbertasPorCartao(contasPendentes),
        [contasPendentes]
    );

    const cartoesFiltrados = useMemo(
        () => filtrarCartoesPorBusca(cartoes, busca),
        [cartoes, busca]
    );

    const regraPreview = useMemo(
        () => descreverRegraCiclo(diaFechamento, diaVencimento),
        [diaFechamento, diaVencimento]
    );

    const invalidateAll = () => {
        queryClient.invalidateQueries({ queryKey: ['cartoes'] });
        queryClient.invalidateQueries({ queryKey: ['cartao-limite'] });
        queryClient.invalidateQueries({ queryKey: ['faturas'] });
        queryClient.invalidateQueries({ queryKey: ['despesas'] });
    };

    const openCreateModal = () => {
        setEditingCartao(null);
        setNome('');
        setDiaFechamento(25);
        setDiaVencimento(5);
        setLimite('');
        setFormError(null);
        setModalOpen(true);
    };

    const openEditModal = (cartao: CartaoCredito) => {
        setEditingCartao(cartao);
        setNome(cartao.nome);
        setDiaFechamento(cartao.diaFechamento || 25);
        setDiaVencimento(cartao.diaVencimento || 5);
        setLimite(cartao.limite != null ? String(cartao.limite) : '');
        setFormError(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        if (submitting) return;
        setModalOpen(false);
        setEditingCartao(null);
        setFormError(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;

        const erro = validarFormularioCartao({
            nome,
            diaFechamento,
            diaVencimento,
            limite,
        });
        if (erro) {
            setFormError(erro);
            return;
        }

        try {
            setSubmitting(true);
            setFormError(null);
            const payload = {
                nome: nome.trim(),
                diaVencimento,
                diaFechamento,
                limite: limite.trim() !== '' ? Number(limite) : undefined,
            };

            if (editingCartao) {
                await cartaoService.editar(editingCartao.id, payload);
                setFeedback({ type: 'success', text: `Cartão "${payload.nome}" atualizado com sucesso.` });
            } else {
                await cartaoService.criar(payload);
                setFeedback({ type: 'success', text: `Cartão "${payload.nome}" cadastrado com sucesso.` });
            }

            setModalOpen(false);
            setEditingCartao(null);
            invalidateAll();
        } catch (err) {
            console.error('Erro ao salvar cartão:', err);
            setFormError('Não foi possível salvar o cartão. Verifique os dados e tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDeactivate = async () => {
        if (!cartaoParaDesativar) return;
        const alvo = cartaoParaDesativar;
        setCartaoParaDesativar(null);
        try {
            await cartaoService.desativar(alvo.id);
            setFeedback({ type: 'success', text: `Cartão "${alvo.nome}" desativado com sucesso.` });
            invalidateAll();
        } catch (err) {
            console.error('Erro ao desativar cartão:', err);
            setFeedback({ type: 'error', text: 'Não foi possível desativar o cartão. Tente novamente.' });
        }
    };

    if (loadingCartoes) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Carregando cartões corporativos...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8 space-y-6">
            {/* Header + Breadcrumb */}
            <header className="space-y-4">
                <nav className="flex items-center gap-2 text-xs text-gray-400">
                    <Link to="/" className="hover:text-cyber-gold transition-colors flex items-center gap-1">
                        <Home size={13} />
                        Início
                    </Link>
                    <ChevronRight size={13} className="opacity-40" />
                    <Link to="/financeiro" className="hover:text-cyber-gold transition-colors">
                        Financeiro
                    </Link>
                    <ChevronRight size={13} className="opacity-40" />
                    <span className="text-cyber-gold font-medium">Cartões Corporativos</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-9 bg-cyber-gold rounded-full shrink-0" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Cartões Corporativos
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Gerencie limites, ciclos de fechamento e acompanhe faturas em aberto.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={() => refetchCartoes()}
                            disabled={fetchingCartoes}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#0f1117] border border-white/10 text-gray-300 hover:text-white hover:border-white/25 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            title="Atualizar cartões"
                        >
                            <RefreshCw size={14} className={fetchingCartoes ? 'animate-spin' : ''} />
                            <span className="hidden sm:inline">Atualizar</span>
                        </button>

                        <Link
                            to="/financeiro/faturas"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0f1117] border border-cyber-gold/30 text-gray-100 hover:border-cyber-gold hover:text-cyber-gold text-xs font-bold transition-colors"
                        >
                            <Receipt size={15} />
                            Ver Faturas
                            {faturasInfo.totalAbertas > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-extrabold tabular-nums">
                                    {faturasInfo.totalAbertas}
                                </span>
                            )}
                        </Link>

                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer"
                        >
                            <Plus size={16} />
                            Novo Cartão
                        </button>
                    </div>
                </div>
            </header>

            {/* Feedback Banner */}
            {feedback && (
                <div
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm ${
                        feedback.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{feedback.text}</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFeedback(null)}
                        className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Fechar aviso"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* 4 KPIs Consolidados */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                        Cartões Ativos
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums mt-1 block">
                        {resumoLimites.totalCartoes}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                        {resumoLimites.cartoesComLimite} com limite controlado
                    </span>
                </div>

                <div className="bg-gradient-to-b from-cyber-gold/10 to-[#0f1117] border border-cyber-gold/30 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                        Limite Total
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-cyber-gold tabular-nums mt-1 block">
                        {formatCurrency(resumoLimites.limiteTotal)}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                        Soma dos cartões com limite
                    </span>
                </div>

                <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                        Comprometido
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-amber-400 tabular-nums mt-1 block">
                        {formatCurrency(resumoLimites.limiteUtilizado)}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                        {resumoLimites.percentualGlobal}% do limite em aberto
                    </span>
                </div>

                <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                        Limite Disponível
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums mt-1 block">
                        {formatCurrency(resumoLimites.limiteDisponivel)}
                    </span>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                        Livre para novas despesas
                    </span>
                </div>
            </section>

            {/* Barra de Busca */}
            {cartoes.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-sm">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar cartão por nome..."
                            className="w-full bg-[#0f1117] border border-white/10 focus:border-cyber-gold rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none transition-colors"
                        />
                        {busca && (
                            <button
                                type="button"
                                onClick={() => setBusca('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-0.5 cursor-pointer"
                                aria-label="Limpar busca"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <span className="text-xs text-gray-400">
                        Exibindo {cartoesFiltrados.length} de {cartoes.length} cartão(ões)
                    </span>
                </div>
            )}

            {/* Grid de Cartões */}
            {cartoes.length === 0 ? (
                <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyber-gold/10 border border-cyber-gold/30 flex items-center justify-center text-cyber-gold">
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Nenhum cartão cadastrado</h2>
                        <p className="text-sm text-gray-400 mt-1 max-w-md">
                            Cadastre seus cartões corporativos para controlar limites, fechamentos e consolidar faturas automaticamente.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer"
                    >
                        <Plus size={15} />
                        Cadastrar Primeiro Cartão
                    </button>
                </div>
            ) : cartoesFiltrados.length === 0 ? (
                <div className="bg-[#0f1117] border border-white/10 rounded-xl p-10 text-center text-sm text-gray-400">
                    Nenhum cartão encontrado para "{busca}".
                </div>
            ) : (
                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                    {cartoesFiltrados.map((cartao) => {
                        const infoLimite = limitesPorId[cartao.id];
                        const temLimite = cartao.limite != null && cartao.limite > 0;
                        const { percentual, nivel } = calcularUsoLimite(infoLimite);
                        const regra = descreverRegraCiclo(cartao.diaFechamento, cartao.diaVencimento);
                        const faturasAbertasCartao = faturasInfo.porCartao[cartao.id] ?? 0;

                        const barColor =
                            nivel === 'crit'
                                ? 'bg-red-500'
                                : nivel === 'warn'
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400';

                        const pctColor =
                            nivel === 'crit'
                                ? 'text-red-400'
                                : nivel === 'warn'
                                    ? 'text-amber-400'
                                    : 'text-emerald-400';

                        return (
                            <article
                                key={cartao.id}
                                className="bg-[#0f1117] border border-cyber-gold/20 hover:border-cyber-gold/45 rounded-2xl overflow-hidden flex flex-col transition-colors shadow-lg"
                            >
                                {/* Topo do Cartão */}
                                <div className="p-5 bg-gradient-to-br from-[#171b26] via-[#10131b] to-cyber-gold/10 border-b border-white/10 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center shrink-0">
                                                <CreditCard size={20} />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-extrabold text-base text-white truncate">
                                                    {cartao.nome}
                                                </h3>
                                                <span
                                                    className={`inline-flex items-center text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full mt-1 border ${
                                                        cartao.ativo
                                                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                            : 'bg-red-500/15 text-red-300 border-red-500/30'
                                                    }`}
                                                >
                                                    {cartao.ativo ? 'ATIVO' : 'INATIVO'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(cartao)}
                                                className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-cyber-gold hover:border-cyber-gold/40 hover:bg-cyber-gold/10 transition-colors cursor-pointer"
                                                title="Editar cartão"
                                                aria-label={`Editar ${cartao.nome}`}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            {cartao.ativo && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCartaoParaDesativar(cartao)}
                                                    className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                    title="Desativar cartão"
                                                    aria-label={`Desativar ${cartao.nome}`}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-[#090b10]/80 border border-white/10 rounded-lg px-3 py-2">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 block">
                                                Fechamento
                                            </span>
                                            <strong className="text-sm text-white font-bold">
                                                Dia {cartao.diaFechamento || 25}
                                            </strong>
                                        </div>
                                        <div className="bg-[#090b10]/80 border border-white/10 rounded-lg px-3 py-2">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 block">
                                                Vencimento
                                            </span>
                                            <strong className="text-sm text-white font-bold">
                                                Dia {cartao.diaVencimento}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Corpo do Cartão */}
                                <div className="p-5 flex flex-col gap-4 flex-1">
                                    {temLimite ? (
                                        <div className="space-y-3">
                                            <div className="flex items-baseline justify-between">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                                    Uso do Limite
                                                </span>
                                                <span className={`text-xs font-extrabold tabular-nums ${pctColor}`}>
                                                    {infoLimite ? `${percentual}% utilizado` : 'Calculando...'}
                                                </span>
                                            </div>

                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                                    style={{ width: `${infoLimite ? percentual : 0}%` }}
                                                />
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="bg-[#151923] rounded-lg p-2">
                                                    <span className="text-[10px] text-gray-500 block">Utilizado</span>
                                                    <strong className="text-xs font-bold text-amber-300 tabular-nums">
                                                        {formatCurrency(infoLimite?.limiteUtilizado ?? 0)}
                                                    </strong>
                                                </div>
                                                <div className="bg-[#151923] rounded-lg p-2">
                                                    <span className="text-[10px] text-gray-500 block">Disponível</span>
                                                    <strong className="text-xs font-bold text-emerald-300 tabular-nums">
                                                        {formatCurrency(
                                                            infoLimite?.limiteDisponivel ?? cartao.limite ?? 0
                                                        )}
                                                    </strong>
                                                </div>
                                                <div className="bg-[#151923] rounded-lg p-2">
                                                    <span className="text-[10px] text-gray-500 block">Total</span>
                                                    <strong className="text-xs font-bold text-white tabular-nums">
                                                        {formatCurrency(infoLimite?.limiteTotal ?? cartao.limite ?? 0)}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-[#151923] border border-dashed border-white/10 rounded-xl p-3.5 text-xs text-gray-400">
                                            Sem limite definido — despesas neste cartão não possuem trava de crédito.
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-white/10 mt-auto flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-gray-500">{regra.resumoCurto}</span>
                                        <Link
                                            to={`/financeiro/faturas?cartaoId=${cartao.id}`}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md bg-cyber-gold/10 text-cyber-gold border border-cyber-gold/25 hover:bg-cyber-gold/20 transition-colors whitespace-nowrap"
                                        >
                                            {faturasAbertasCartao > 0
                                                ? `${faturasAbertasCartao} fatura(s) aberta(s)`
                                                : 'Ver faturas'}
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </section>
            )}

            {/* Modal Criar / Editar Cartão */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#0f1117] border border-cyber-gold/30 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center">
                                    {editingCartao ? <Pencil size={16} /> : <Plus size={16} />}
                                </span>
                                {editingCartao ? 'Editar Cartão Corporativo' : 'Novo Cartão Corporativo'}
                            </h2>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                aria-label="Fechar modal"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {formError && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                                <AlertCircle size={15} className="shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="cartao-nome"
                                    className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                                >
                                    Nome do Cartão
                                </label>
                                <input
                                    id="cartao-nome"
                                    type="text"
                                    required
                                    value={nome}
                                    onChange={(e) => {
                                        setNome(e.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none"
                                    placeholder="Ex: Nubank PJ, Itaú Business, XP Corporate"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label
                                        htmlFor="cartao-fechamento"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                                    >
                                        Dia de Fechamento
                                    </label>
                                    <input
                                        id="cartao-fechamento"
                                        type="number"
                                        required
                                        min={1}
                                        max={31}
                                        value={diaFechamento}
                                        onChange={(e) => setDiaFechamento(Number(e.target.value))}
                                        className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="cartao-vencimento"
                                        className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                                    >
                                        Dia de Vencimento
                                    </label>
                                    <input
                                        id="cartao-vencimento"
                                        type="number"
                                        required
                                        min={1}
                                        max={31}
                                        value={diaVencimento}
                                        onChange={(e) => setDiaVencimento(Number(e.target.value))}
                                        className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums outline-none"
                                    />
                                </div>
                            </div>

                            {/* Simulador da Regra do Ciclo */}
                            <div className="bg-cyber-gold/10 border border-cyber-gold/25 rounded-xl p-3 text-xs text-gray-200 leading-relaxed">
                                <span className="font-bold text-cyber-gold block mb-0.5">Prévia do ciclo de fatura</span>
                                {regraPreview.resumoDetalhado}
                            </div>

                            <div>
                                <label
                                    htmlFor="cartao-limite"
                                    className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                                >
                                    <DollarSign size={13} className="text-cyber-gold" />
                                    Limite Total (R$) — Opcional
                                </label>
                                <input
                                    id="cartao-limite"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={limite}
                                    onChange={(e) => {
                                        setLimite(e.target.value);
                                        if (formError) setFormError(null);
                                    }}
                                    className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold rounded-lg px-3.5 py-2.5 text-sm text-white tabular-nums placeholder:text-gray-600 outline-none"
                                    placeholder="Ex: 15000.00"
                                />
                                {editingCartao?.limite != null && (
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        Se deixar em branco ao editar, o limite atual ({formatCurrency(editingCartao.limite)}) será mantido.
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-cyber-gold text-black hover:brightness-110 text-xs font-extrabold transition-all cursor-pointer disabled:opacity-50"
                                >
                                    {submitting
                                        ? 'Salvando...'
                                        : editingCartao
                                            ? 'Salvar Alterações'
                                            : 'Criar Cartão'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação para Desativar Cartão */}
            <ActionModal
                isOpen={cartaoParaDesativar !== null}
                onClose={() => setCartaoParaDesativar(null)}
                onConfirm={handleConfirmDeactivate}
                type="danger"
                title="Desativar Cartão"
                message={
                    cartaoParaDesativar
                        ? `Deseja desativar o cartão "${cartaoParaDesativar.nome}"?\n\nAs faturas e despesas já lançadas permanecem preservadas no histórico financeiro; o cartão apenas deixa de aparecer para novos lançamentos.`
                        : ''
                }
                confirmText="Desativar"
                cancelText="Cancelar"
            />
        </div>
    );
};

export default CartoesPage;
