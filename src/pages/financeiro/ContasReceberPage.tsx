import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    History,
    Home,
    Info,
    RotateCcw,
    Search,
    X,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { formatarDataLocal } from '../../utils/faturaUtils';
import { getContasReceberTabBadge, type ContasReceberContadores } from '../../utils/contasReceberUtils';
import type { ContaReceber, MeioPagamento, PageResponse, Recebimento } from '../../types';

const PAGE_SIZE_RECEBER = 15;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getTodayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const MEIOS_PAGAMENTO: { value: MeioPagamento; label: string }[] = [
    { value: 'PIX', label: 'PIX' },
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'TRANSFERENCIA', label: 'Transferência (TED/DOC)' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'CHEQUE', label: 'Cheque' },
];

const STATUS_BADGES: Record<string, string> = {
    PENDENTE: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    PARCIAL: 'bg-orange-500/15 text-orange-300 border-orange-500/35',
    PAGO: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    CANCELADO: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    BAIXADO: 'bg-white/10 text-gray-400 border-white/15',
};

const STATUS_LABELS: Record<string, string> = {
    PENDENTE: 'PENDENTE',
    PARCIAL: 'PARCIAL',
    PAGO: 'RECEBIDO',
    CANCELADO: 'CANCELADO',
    BAIXADO: 'BAIXADO',
};

const ContasReceberPage = () => {
    const queryClient = useQueryClient();
    const hojeIso = getTodayIso();

    const [contasPage, setContasPage] = useState<PageResponse<ContaReceber> | null>(null);
    const [contadores, setContadores] = useState<ContasReceberContadores | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtroStatus, setFiltroStatus] = useState<string>('PENDENTE');
    const [busca, setBusca] = useState<string>('');
    const [buscaDebounced, setBuscaDebounced] = useState<string>('');
    const [page, setPage] = useState(0);

    // Modal de Recebimento
    const [modalReceber, setModalReceber] = useState<ContaReceber | null>(null);
    const [valorRecebimento, setValorRecebimento] = useState<string>('');
    const [dataRecebimento, setDataRecebimento] = useState<string>(hojeIso);
    const [meioPagamento, setMeioPagamento] = useState<MeioPagamento>('PIX');
    const [observacaoRecebimento, setObservacaoRecebimento] = useState<string>('');
    const [erroModal, setErroModal] = useState<string | null>(null);
    const [processando, setProcessando] = useState(false);
    const inFlightRef = useRef(false);

    // Modal de Histórico
    const [modalHistorico, setModalHistorico] = useState<ContaReceber | null>(null);
    const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    // Modal de Baixa
    const [modalBaixa, setModalBaixa] = useState<ContaReceber | null>(null);
    const [motivoBaixa, setMotivoBaixa] = useState<string>('');

    // Modal de Renegociação
    const [modalRenegociar, setModalRenegociar] = useState<ContaReceber | null>(null);
    const [novaDataVencimento, setNovaDataVencimento] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setBuscaDebounced(busca);
            setPage(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [busca]);

    const loadContas = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await financeiroService.listarContasReceberPaginado({
                status: filtroStatus !== 'TODOS' ? filtroStatus : undefined,
                busca: buscaDebounced.trim() || undefined,
                page,
                size: PAGE_SIZE_RECEBER,
            });
            setContasPage(data);
        } catch (err) {
            console.error('Erro ao carregar contas a receber:', err);
            setError('Erro ao carregar contas a receber.');
        } finally {
            setLoading(false);
        }
    }, [filtroStatus, buscaDebounced, page]);

    const loadContadores = useCallback(async () => {
        try {
            const data = await financeiroService.obterContadoresContasReceber();
            setContadores(data);
        } catch (err) {
            console.error('Erro ao carregar contadores de contas a receber:', err);
        }
    }, []);

    useEffect(() => {
        loadContas();
    }, [loadContas]);

    useEffect(() => {
        loadContadores();
    }, [loadContadores]);

    const contasFiltradas = useMemo(() => contasPage?.content ?? [], [contasPage]);

    const invalidarCaches = () => {
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        queryClient.invalidateQueries({ queryKey: ['comissao'] });
    };

    const isVencido = (conta: ContaReceber) =>
        (conta.status === 'PENDENTE' || conta.status === 'PARCIAL') &&
        Boolean(conta.dataVencimento) &&
        conta.dataVencimento.slice(0, 10) < hojeIso;

    const getProgressPercent = (conta: ContaReceber) => {
        if (!conta.valor || conta.valor === 0) return 0;
        return Math.min(100, Math.round(((conta.valorPagoAcumulado ?? 0) / conta.valor) * 100));
    };

    const resumo = useMemo(() => {
        let totalBruto = 0;
        let totalRecebido = 0;
        let saldoAberto = 0;
        let totalVencido = 0;
        let qtdVencido = 0;

        for (const c of contasFiltradas) {
            totalBruto += c.valor || 0;
            totalRecebido += c.valorPagoAcumulado || 0;
            const saldo = c.saldoRestante ?? (c.status === 'PAGO' || c.status === 'BAIXADO' ? 0 : c.valor);
            if (c.status === 'PENDENTE' || c.status === 'PARCIAL') {
                saldoAberto += saldo;
                if (c.dataVencimento && c.dataVencimento.slice(0, 10) < hojeIso) {
                    totalVencido += saldo;
                    qtdVencido += 1;
                }
            }
        }
        return { totalBruto, totalRecebido, saldoAberto, totalVencido, qtdVencido };
    }, [contasFiltradas, hojeIso]);

    // Abrir modal de recebimento
    const openModalReceber = (conta: ContaReceber) => {
        setModalReceber(conta);
        setValorRecebimento(String(conta.saldoRestante ?? conta.valor));
        setDataRecebimento(getTodayIso());
        setMeioPagamento('PIX');
        setObservacaoRecebimento('');
        setErroModal(null);
    };

    const handleReceber = async () => {
        if (!modalReceber || inFlightRef.current) return;
        const valor = parseFloat(valorRecebimento);
        if (Number.isNaN(valor) || valor <= 0) {
            setErroModal('Informe um valor válido maior que zero.');
            return;
        }
        const saldo = modalReceber.saldoRestante ?? modalReceber.valor;
        if (valor < saldo && !observacaoRecebimento.trim()) {
            setErroModal('Observação é obrigatória para recebimento parcial.');
            return;
        }

        inFlightRef.current = true;
        setProcessando(true);
        setErroModal(null);
        try {
            await financeiroService.registrarRecebimentoParcial(modalReceber.id, {
                valor,
                meioPagamento,
                dataRecebimento,
                observacao: observacaoRecebimento.trim() || undefined,
            });
            setModalReceber(null);
            invalidarCaches();
            loadContas();
            loadContadores();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErroModal(axiosErr.response?.data?.message || 'Erro ao registrar recebimento.');
        } finally {
            inFlightRef.current = false;
            setProcessando(false);
        }
    };

    const openHistorico = async (conta: ContaReceber) => {
        setModalHistorico(conta);
        setLoadingHistorico(true);
        try {
            const data = await financeiroService.listarRecebimentos(conta.id);
            setRecebimentos(data);
        } catch (err) {
            console.error('Erro ao carregar histórico:', err);
        } finally {
            setLoadingHistorico(false);
        }
    };

    const handleEstorno = async (recebimentoId: number) => {
        if (!confirm('Tem certeza que deseja estornar este recebimento?')) return;
        try {
            await financeiroService.estornarRecebimento(recebimentoId);
            if (modalHistorico) {
                const data = await financeiroService.listarRecebimentos(modalHistorico.id);
                setRecebimentos(data);
            }
            invalidarCaches();
            loadContas();
            loadContadores();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            alert(axiosErr.response?.data?.message || 'Erro ao estornar recebimento.');
        }
    };

    const handleBaixar = async () => {
        if (!modalBaixa || !motivoBaixa.trim() || inFlightRef.current) return;
        inFlightRef.current = true;
        setProcessando(true);
        setErroModal(null);
        try {
            await financeiroService.baixarSaldo(modalBaixa.id, { motivo: motivoBaixa.trim() });
            setModalBaixa(null);
            setMotivoBaixa('');
            invalidarCaches();
            loadContas();
            loadContadores();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErroModal(axiosErr.response?.data?.message || 'Erro ao baixar saldo.');
        } finally {
            inFlightRef.current = false;
            setProcessando(false);
        }
    };

    const handleRenegociar = async () => {
        if (!modalRenegociar || !novaDataVencimento || inFlightRef.current) return;
        inFlightRef.current = true;
        setProcessando(true);
        setErroModal(null);
        try {
            await financeiroService.atualizarVencimento(modalRenegociar.id, novaDataVencimento);
            setModalRenegociar(null);
            setNovaDataVencimento('');
            loadContas();
            loadContadores();
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErroModal(axiosErr.response?.data?.message || 'Erro ao atualizar vencimento.');
        } finally {
            inFlightRef.current = false;
            setProcessando(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Carregando contas a receber...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
                <div>
                    <nav className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                        <Link to="/" className="hover:text-cyber-gold transition-colors flex items-center gap-1">
                            <Home size={13} />
                            Início
                        </Link>
                        <ChevronRight size={13} className="opacity-40" />
                        <Link to="/financeiro" className="hover:text-cyber-gold transition-colors">
                            Financeiro
                        </Link>
                        <ChevronRight size={13} className="opacity-40" />
                        <span className="text-cyber-gold font-medium">Contas a Receber</span>
                    </nav>

                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-emerald-400 rounded-full" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Contas a Receber
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Gerencie entradas, recebimentos parciais, renegociações de prazo e histórico de baixas.
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Aviso de Regra de Comissão */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3.5 mb-6 flex items-start gap-2.5 text-xs text-cyan-200">
                <Info size={16} className="shrink-0 mt-0.5 text-cyan-400" />
                <span>
                    <strong>Importante:</strong> Comissões são calculadas sobre valores{' '}
                    <strong className="text-cyber-gold">RECEBIDOS</strong>, não apenas faturados. Valores marcados como{' '}
                    <strong>BAIXADO</strong> não entram no cálculo de comissão.
                </span>
            </div>

            {error && (
                <div className="mb-5 p-3.5 rounded-xl border border-cyber-error/50 bg-cyber-error/10 text-cyber-error text-xs">
                    {error}
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Total Listado</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-cyber-gold tabular-nums">
                        {formatCurrency(resumo.totalBruto)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{contasFiltradas.length} conta(s)</div>
                </div>

                <div className="bg-[#0f1117] border border-amber-500/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Saldo em Aberto</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-amber-300 tabular-nums">
                        {formatCurrency(resumo.saldoAberto)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Pendente + Parcial</div>
                </div>

                <div className="bg-[#0f1117] border border-rose-500/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Vencido</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-rose-400 tabular-nums">
                        {formatCurrency(resumo.totalVencido)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{resumo.qtdVencido} conta(s) em atraso</div>
                </div>

                <div className="bg-[#0f1117] border border-emerald-500/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Já Recebido</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums">
                        {formatCurrency(resumo.totalRecebido)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Entradas confirmadas</div>
                </div>
            </div>

            {/* Card Principal */}
            <section className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4 sm:p-5 shadow-lg">
                {/* Abas de Status + Busca */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="inline-flex flex-wrap bg-black/70 border border-white/10 rounded-lg p-1 gap-1">
                        {[
                            { key: 'PENDENTE', label: 'Pendentes' },
                            { key: 'PARCIAL', label: 'Parciais' },
                            { key: 'PAGO', label: 'Recebidas' },
                            { key: 'BAIXADO', label: 'Baixadas' },
                            { key: 'TODOS', label: 'Todas' },
                        ].map((tab) => {
                            const isActive = filtroStatus === tab.key;
                            const badge = getContasReceberTabBadge(tab.key, contadores);
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => {
                                        setFiltroStatus(tab.key);
                                        setPage(0);
                                    }}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                        isActive
                                            ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                            : 'text-gray-400 hover:text-gray-200 border border-transparent'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    {badge && (
                                        <span
                                            title={badge.tooltip}
                                            className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold tabular-nums border ${
                                                badge.hasOverdue
                                                    ? 'bg-red-500/20 text-red-300 border-red-500/55 badge-overdue-pulse'
                                                    : isActive
                                                      ? 'bg-cyber-gold/20 text-cyber-gold border-cyber-gold/45'
                                                      : 'bg-white/10 text-gray-300 border-white/15'
                                            }`}
                                        >
                                            {badge.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar descrição ou cliente..."
                                className="w-full bg-[#161923] border border-white/10 text-gray-100 text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:border-cyber-gold"
                            />
                        </div>
                        {busca && (
                            <button
                                type="button"
                                onClick={() => setBusca('')}
                                className="p-2 rounded-lg text-gray-400 hover:text-cyber-gold border border-white/10 cursor-pointer"
                                title="Limpar busca"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabela */}
                {contasFiltradas.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 text-sm border border-white/5 rounded-lg bg-black/20">
                        Nenhuma conta a receber encontrada neste filtro.
                    </div>
                ) : (
                    <div className="overflow-x-auto border border-white/10 rounded-lg">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                                    <th className="py-3 px-3.5">Descrição</th>
                                    <th className="py-3 px-3">Cliente</th>
                                    <th className="py-3 px-3 whitespace-nowrap">Vencimento</th>
                                    <th className="py-3 px-3 text-right">Valor</th>
                                    <th className="py-3 px-3 text-center hidden md:table-cell">Progresso</th>
                                    <th className="py-3 px-3 text-center">Status</th>
                                    <th className="py-3 px-3.5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {contasFiltradas.map((conta) => {
                                    const vencida = isVencido(conta);
                                    const pct = getProgressPercent(conta);
                                    return (
                                        <tr
                                            key={conta.id}
                                            className={`hover:bg-white/[0.03] transition-colors ${
                                                vencida ? 'bg-rose-500/[0.04]' : ''
                                            }`}
                                        >
                                            <td className="py-3.5 px-3.5">
                                                {conta.ordemServico?.id ? (
                                                    <Link
                                                        to={`/os/${conta.ordemServico.id}`}
                                                        className="font-semibold text-gray-100 hover:text-cyber-gold transition-colors inline-flex items-center gap-1.5 group"
                                                        title={`Abrir Ordem de Serviço #${conta.ordemServico.id}`}
                                                    >
                                                        <span className="group-hover:underline">{conta.descricao}</span>
                                                        <ExternalLink size={13} className="text-cyber-gold/70 group-hover:text-cyber-gold shrink-0" />
                                                    </Link>
                                                ) : (
                                                    <div className="font-semibold text-gray-100">{conta.descricao}</div>
                                                )}
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-white/5 text-gray-400">
                                                        {conta.tipo.replace(/_/g, ' ')}
                                                    </span>
                                                    {conta.ordemServico?.id && (
                                                        <Link
                                                            to={`/os/${conta.ordemServico.id}`}
                                                            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-cyber-gold/10 text-cyber-gold border border-cyber-gold/30 hover:bg-cyber-gold/20 transition-colors"
                                                        >
                                                            OS #{conta.ordemServico.id}
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-3">
                                                {conta.cliente ? (
                                                    <div>
                                                        <div className="font-semibold text-gray-200 text-xs">
                                                            {conta.cliente.nomeFantasia || conta.cliente.razaoSocial}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 font-mono">
                                                            {conta.cliente.cnpj || conta.cliente.cpf}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-500 italic">Avulso</span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 text-xs font-mono whitespace-nowrap">
                                                <span className={vencida ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                                                    {formatarDataLocal(conta.dataVencimento)}
                                                </span>
                                                {vencida && (
                                                    <span className="block text-[10px] text-rose-400 mt-0.5">
                                                        Vencida
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                                <div className="font-extrabold text-emerald-400 tabular-nums">
                                                    {formatCurrency(conta.valor)}
                                                </div>
                                                {conta.valorPagoAcumulado > 0 && conta.status !== 'PAGO' && (
                                                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                                                        Pago: {formatCurrency(conta.valorPagoAcumulado)} · Saldo:{' '}
                                                        {formatCurrency(conta.saldoRestante)}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3.5 px-3 hidden md:table-cell">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                conta.status === 'BAIXADO'
                                                                    ? 'bg-gray-500'
                                                                    : pct === 100
                                                                        ? 'bg-emerald-400'
                                                                        : 'bg-amber-400'
                                                            }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-gray-400 min-w-[34px]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="py-3.5 px-3 text-center">
                                                <span
                                                    className={`inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded border ${
                                                        STATUS_BADGES[conta.status] || ''
                                                    }`}
                                                >
                                                    {STATUS_LABELS[conta.status] || conta.status}
                                                </span>
                                            </td>

                                            <td className="py-3.5 px-3.5">
                                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                    {(conta.status === 'PENDENTE' || conta.status === 'PARCIAL') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openModalReceber(conta)}
                                                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-black text-xs font-extrabold hover:bg-emerald-400 transition-colors cursor-pointer"
                                                        >
                                                            Receber
                                                        </button>
                                                    )}
                                                    {conta.valorPagoAcumulado > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openHistorico(conta)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 text-xs font-semibold hover:bg-cyan-500/25 transition-colors cursor-pointer"
                                                            title="Histórico de recebimentos"
                                                        >
                                                            <History size={12} />
                                                            Histórico
                                                        </button>
                                                    )}
                                                    {(conta.status === 'PENDENTE' || conta.status === 'PARCIAL') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setModalBaixa(conta);
                                                                setMotivoBaixa('');
                                                                setErroModal(null);
                                                            }}
                                                            className="px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-300 border border-white/15 text-xs font-semibold hover:bg-white/10 transition-colors cursor-pointer"
                                                        >
                                                            Baixar
                                                        </button>
                                                    )}
                                                    {conta.status === 'PARCIAL' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setModalRenegociar(conta);
                                                                setNovaDataVencimento(conta.dataVencimento.slice(0, 10));
                                                                setErroModal(null);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/35 text-xs font-semibold hover:bg-purple-500/25 transition-colors cursor-pointer"
                                                        >
                                                            <Clock size={12} />
                                                            Prazo
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginação Server-Side */}
                {(contasPage?.totalElements ?? 0) > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-400">
                        <span>
                            Mostrando <strong className="text-gray-200">{contasFiltradas.length}</strong> de{' '}
                            <strong className="text-gray-200">{contasPage?.totalElements ?? 0}</strong> conta(s) ·
                            Página <strong className="text-gray-200">{page + 1}</strong> de{' '}
                            {Math.max(1, contasPage?.totalPages ?? 1)}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page <= 0}
                                onClick={() => setPage((p) => Math.max(0, p - 1))}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <ChevronLeft size={14} />
                                Anterior
                            </button>
                            <button
                                type="button"
                                disabled={page + 1 >= Math.max(1, contasPage?.totalPages ?? 1)}
                                onClick={() => setPage((p) => p + 1)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Próxima
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* ======== MODAL: RECEBIMENTO ======== */}
            {modalReceber && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => !processando && setModalReceber(null)}
                >
                    <div
                        className="w-full max-w-lg bg-[#0f1117] border border-emerald-500/40 rounded-xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between pb-4 mb-5 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-extrabold text-emerald-400 uppercase tracking-wide">
                                    Registrar Recebimento
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{modalReceber.descricao}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalReceber(null)}
                                disabled={processando}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-[#161923] border border-white/10 rounded-lg p-4 mb-4 flex items-center justify-between">
                            <div className="text-xs space-y-1 text-gray-400">
                                <div>
                                    Total: <strong className="text-gray-200">{formatCurrency(modalReceber.valor)}</strong>
                                </div>
                                {modalReceber.valorPagoAcumulado > 0 && (
                                    <div>
                                        Já recebido:{' '}
                                        <strong className="text-emerald-400">
                                            {formatCurrency(modalReceber.valorPagoAcumulado)}
                                        </strong>
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] uppercase text-gray-400 block">Saldo Restante</span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(modalReceber.saldoRestante ?? modalReceber.valor)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                        Valor a Receber (R$)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={modalReceber.saldoRestante ?? modalReceber.valor}
                                        value={valorRecebimento}
                                        onChange={(e) => {
                                            setValorRecebimento(e.target.value);
                                            setErroModal(null);
                                        }}
                                        className="w-full bg-[#161923] border border-white/15 text-emerald-300 font-bold text-sm rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                        Data Efetiva do Recebimento
                                    </label>
                                    <input
                                        type="date"
                                        value={dataRecebimento}
                                        onChange={(e) => setDataRecebimento(e.target.value)}
                                        className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Meio de Pagamento
                                </label>
                                <select
                                    value={meioPagamento}
                                    onChange={(e) => setMeioPagamento(e.target.value as MeioPagamento)}
                                    className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-emerald-400 cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {MEIOS_PAGAMENTO.map((mp) => (
                                        <option key={mp.value} value={mp.value}>
                                            {mp.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Observação{' '}
                                    {parseFloat(valorRecebimento) < (modalReceber.saldoRestante ?? modalReceber.valor) && (
                                        <span className="text-amber-400">(obrigatória para recebimento parcial)</span>
                                    )}
                                </label>
                                <textarea
                                    value={observacaoRecebimento}
                                    onChange={(e) => {
                                        setObservacaoRecebimento(e.target.value);
                                        setErroModal(null);
                                    }}
                                    rows={2}
                                    placeholder="Ex.: Pagamento parcial referente à primeira etapa"
                                    className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg p-3 outline-none focus:border-emerald-400 resize-none"
                                />
                            </div>

                            {erroModal && (
                                <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs flex items-start gap-2">
                                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                                    <span>{erroModal}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 mt-5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setModalReceber(null)}
                                disabled={processando}
                                className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleReceber}
                                disabled={processando}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-40 cursor-pointer"
                            >
                                <CheckCircle2 size={14} />
                                {processando ? 'Processando...' : 'Confirmar Recebimento'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== MODAL: HISTÓRICO DE RECEBIMENTOS ======== */}
            {modalHistorico && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => setModalHistorico(null)}
                >
                    <div
                        className="w-full max-w-lg bg-[#0f1117] border border-cyan-500/40 rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-extrabold text-cyan-300 uppercase tracking-wide">
                                    Histórico de Recebimentos
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{modalHistorico.descricao}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalHistorico(null)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {loadingHistorico ? (
                            <p className="text-gray-400 text-sm py-8 text-center animate-pulse">Carregando...</p>
                        ) : recebimentos.length === 0 ? (
                            <p className="text-gray-500 text-sm py-8 text-center">Nenhum recebimento registrado.</p>
                        ) : (
                            <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                                {recebimentos.map((r) => (
                                    <div
                                        key={r.id}
                                        className="flex items-center justify-between gap-3 bg-[#161923] border border-white/10 rounded-lg px-4 py-3"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                <span className="text-emerald-400 font-bold font-mono">
                                                    {formatCurrency(r.valorPago)}
                                                </span>
                                                <span className="text-gray-400 font-mono text-xs flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {formatarDataLocal(r.dataPagamento)}
                                                </span>
                                                {r.meioPagamento && (
                                                    <span className="px-2 py-0.5 rounded bg-white/5 text-gray-300 text-[11px] font-mono">
                                                        {r.meioPagamento}
                                                    </span>
                                                )}
                                            </div>
                                            {r.observacao && (
                                                <p className="text-gray-400 text-xs mt-1">{r.observacao}</p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleEstorno(r.id)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/35 text-xs font-bold hover:bg-rose-500/25 cursor-pointer shrink-0"
                                        >
                                            <RotateCcw size={12} />
                                            Estornar
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-4 mt-5 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setModalHistorico(null)}
                                className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== MODAL: BAIXAR SALDO ======== */}
            {modalBaixa && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => !processando && setModalBaixa(null)}
                >
                    <div
                        className="w-full max-w-lg bg-[#0f1117] border border-amber-500/40 rounded-xl p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-extrabold text-amber-300 uppercase tracking-wide">
                                    Baixar Saldo
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{modalBaixa.descricao}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalBaixa(null)}
                                disabled={processando}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="bg-[#161923] border border-white/10 rounded-lg p-3.5 mb-4 flex justify-between items-center">
                            <span className="text-xs text-gray-400">Saldo a baixar</span>
                            <strong className="text-xl font-black text-gray-200 font-mono">
                                {formatCurrency(modalBaixa.saldoRestante)}
                            </strong>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg p-3 mb-4 text-xs text-amber-200">
                            O valor baixado <strong>não</strong> entra no cálculo de comissão. Esta ação é irreversível.
                        </div>

                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Motivo da Baixa (obrigatório)
                        </label>
                        <textarea
                            value={motivoBaixa}
                            onChange={(e) => setMotivoBaixa(e.target.value)}
                            rows={3}
                            placeholder="Ex.: Desconto comercial / Acordo / Inadimplência"
                            className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg p-3 outline-none focus:border-amber-400 resize-none mb-4"
                        />

                        {erroModal && (
                            <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs mb-4">
                                {erroModal}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setModalBaixa(null)}
                                disabled={processando}
                                className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleBaixar}
                                disabled={processando || !motivoBaixa.trim()}
                                className="px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase bg-amber-400 text-black hover:bg-amber-300 disabled:opacity-40 cursor-pointer"
                            >
                                {processando ? 'Processando...' : 'Confirmar Baixa'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ======== MODAL: RENEGOCIAR PRAZO ======== */}
            {modalRenegociar && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    onClick={() => !processando && setModalRenegociar(null)}
                >
                    <div
                        className="w-full max-w-md bg-[#0f1117] border border-purple-500/40 rounded-xl p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between pb-4 mb-4 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-extrabold text-purple-300 uppercase tracking-wide">
                                    Renegociar Prazo
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{modalRenegociar.descricao}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalRenegociar(null)}
                                disabled={processando}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-gray-400 mb-4 font-mono">
                            Vencimento atual: <strong className="text-gray-200">{formatarDataLocal(modalRenegociar.dataVencimento)}</strong>
                        </p>

                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Nova Data de Vencimento
                        </label>
                        <input
                            type="date"
                            value={novaDataVencimento}
                            onChange={(e) => setNovaDataVencimento(e.target.value)}
                            className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 mb-4"
                            style={{ colorScheme: 'dark' }}
                        />

                        {erroModal && (
                            <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs mb-4">
                                {erroModal}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setModalRenegociar(null)}
                                disabled={processando}
                                className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleRenegociar}
                                disabled={processando || !novaDataVencimento}
                                className="px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase bg-purple-400 text-black hover:bg-purple-300 disabled:opacity-40 cursor-pointer"
                            >
                                {processando ? 'Salvando...' : 'Atualizar Prazo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContasReceberPage;
