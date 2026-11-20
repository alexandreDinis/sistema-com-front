import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    CreditCard,
    FileDown,
    Home,
    RotateCcw,
    Search,
    ShieldCheck,
    Wallet,
    X,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { ConfirmarPagamentoModal } from '../../components/modals/ConfirmarPagamentoModal';
import { EstornarPagamentoModal } from '../../components/modals/EstornarPagamentoModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { formatarDataLocal } from '../../utils/faturaUtils';
import type { ContaPagar, EstornoContaPagar, PageResponse } from '../../types';

const PAGE_SIZE_CONTAS = 15;
const PAGE_SIZE_FATURAS = 12;
const PAGE_SIZE_ESTORNOS = 15;

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const NOMES_MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const getTodayIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

type AbaContasPagar = 'contas' | 'faturas' | 'estornos';

interface PaginationBarProps {
    page: number;
    totalPages: number;
    totalElements: number;
    shownCount: number;
    onPageChange: (newPage: number) => void;
}

const PaginationBar = ({ page, totalPages, totalElements, shownCount, onPageChange }: PaginationBarProps) => {
    if (totalElements === 0) return null;
    const safeTotalPages = Math.max(1, totalPages);
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-400">
            <span>
                Mostrando <strong className="text-gray-200">{shownCount}</strong> de{' '}
                <strong className="text-gray-200">{totalElements}</strong> registro(s) · Página{' '}
                <strong className="text-gray-200">{page + 1}</strong> de {safeTotalPages}
            </span>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => onPageChange(page - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    <ChevronLeft size={14} />
                    Anterior
                </button>
                <button
                    type="button"
                    disabled={page + 1 >= safeTotalPages}
                    onClick={() => onPageChange(page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                    Próxima
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};

const ContasPagarPage = () => {
    const queryClient = useQueryClient();
    const now = new Date();
    const hojeIso = getTodayIso();

    const [aba, setAba] = useState<AbaContasPagar>('contas');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [mesSelecionado, setMesSelecionado] = useState(now.getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());
    const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
    const [filtroTipo, setFiltroTipo] = useState<string>('TODOS');
    const [busca, setBusca] = useState<string>('');
    const [buscaDebounced, setBuscaDebounced] = useState<string>('');

    // Páginas independentes por aba (paginação server-side)
    const [pageContas, setPageContas] = useState(0);
    const [pageFaturas, setPageFaturas] = useState(0);
    const [pageEstornos, setPageEstornos] = useState(0);

    const [contasPage, setContasPage] = useState<PageResponse<ContaPagar> | null>(null);
    const [faturasPage, setFaturasPage] = useState<PageResponse<ContaPagar> | null>(null);
    const [estornosPage, setEstornosPage] = useState<PageResponse<EstornoContaPagar> | null>(null);

    const [modalPagar, setModalPagar] = useState<ContaPagar | null>(null);
    const [modalEstornar, setModalEstornar] = useState<ContaPagar | null>(null);

    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        financeiroService.getApiBaseUrl()
    );

    // Debounce da busca para não disparar requisições a cada tecla
    useEffect(() => {
        const timer = setTimeout(() => {
            setBuscaDebounced(busca);
            setPageContas(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [busca]);

    const loadContasPaginado = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await financeiroService.listarContasPagarPaginado({
                mes: mesSelecionado,
                ano: anoSelecionado,
                status: filtroStatus !== 'TODOS' ? filtroStatus : undefined,
                tipo: filtroTipo !== 'TODOS' ? filtroTipo : undefined,
                busca: buscaDebounced.trim() || undefined,
                page: pageContas,
                size: PAGE_SIZE_CONTAS,
            });
            setContasPage(data);
        } catch (err) {
            console.error('Erro ao carregar contas a pagar:', err);
            setError('Erro ao carregar contas a pagar.');
        } finally {
            setLoading(false);
        }
    }, [mesSelecionado, anoSelecionado, filtroStatus, filtroTipo, buscaDebounced, pageContas]);

    const loadFaturasPaginado = useCallback(async () => {
        try {
            const data = await financeiroService.listarFaturasPaginado(pageFaturas, PAGE_SIZE_FATURAS);
            setFaturasPage(data);
        } catch (err) {
            console.error('Erro ao carregar faturas paginadas:', err);
        }
    }, [pageFaturas]);

    const loadEstornosPaginado = useCallback(async () => {
        try {
            const data = await financeiroService.listarEstornosPaginado(pageEstornos, PAGE_SIZE_ESTORNOS);
            setEstornosPage(data);
        } catch (err) {
            console.error('Erro ao carregar estornos paginados:', err);
        }
    }, [pageEstornos]);

    useEffect(() => {
        loadContasPaginado();
    }, [loadContasPaginado]);

    useEffect(() => {
        loadFaturasPaginado();
    }, [loadFaturasPaginado]);

    useEffect(() => {
        loadEstornosPaginado();
    }, [loadEstornosPaginado]);

    const mudarMes = (delta: number) => {
        let novoMes = mesSelecionado + delta;
        let novoAno = anoSelecionado;
        if (novoMes < 1) {
            novoMes = 12;
            novoAno -= 1;
        } else if (novoMes > 12) {
            novoMes = 1;
            novoAno += 1;
        }
        setMesSelecionado(novoMes);
        setAnoSelecionado(novoAno);
        setPageContas(0);
    };

    const contas = useMemo(() => contasPage?.content ?? [], [contasPage]);
    const faturasPendentes = useMemo(() => faturasPage?.content ?? [], [faturasPage]);
    const estornos = useMemo(() => estornosPage?.content ?? [], [estornosPage]);

    const totaisPagina = useMemo(() => {
        const pendentes = contas.filter((c) => c.status === 'PENDENTE');
        const pagas = contas.filter((c) => c.status === 'PAGO');
        const vencidas = pendentes.filter((c) => c.dataVencimento.slice(0, 10) < hojeIso);

        const totalPendente = pendentes.reduce((s, c) => s + c.valor, 0);
        const totalPago = pagas.reduce((s, c) => s + c.valor, 0);
        const totalVencido = vencidas.reduce((s, c) => s + c.valor, 0);

        return {
            totalMes: totalPendente + totalPago,
            qtdMes: contasPage?.totalElements ?? contas.length,
            totalPendente,
            qtdPendente: pendentes.length,
            totalVencido,
            qtdVencido: vencidas.length,
            totalPago,
            qtdPago: pagas.length,
        };
    }, [contas, contasPage, hojeIso]);

    const invalidarCachesFinanceiros = () => {
        queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        queryClient.invalidateQueries({ queryKey: ['despesas'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['faturas'] });
        queryClient.invalidateQueries({ queryKey: ['cartao-limite'] });
    };

    const recarregarTudo = () => {
        loadContasPaginado();
        loadFaturasPaginado();
        loadEstornosPaginado();
    };

    const handlePagamentoConcluido = () => {
        invalidarCachesFinanceiros();
        setModalPagar(null);
        recarregarTudo();
    };

    const handleEstornoConcluido = () => {
        invalidarCachesFinanceiros();
        setModalEstornar(null);
        recarregarTudo();
    };

    const handleExportPdf = () => {
        startPdfDownload(
            financeiroService.getContasPagarPdfPath(mesSelecionado, anoSelecionado),
            `contas-pagar-${anoSelecionado}-${mesSelecionado}.pdf`
        );
    };

    const temFiltro = busca.trim() !== '' || filtroStatus !== 'TODOS' || filtroTipo !== 'TODOS';

    const limparFiltros = () => {
        setBusca('');
        setBuscaDebounced('');
        setFiltroStatus('TODOS');
        setFiltroTipo('TODOS');
        setPageContas(0);
    };

    return (
        <>
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
                            <span className="text-cyber-gold font-medium">Contas a Pagar</span>
                        </nav>

                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-8 bg-cyber-gold rounded-full" />
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                    Contas a Pagar
                                </h1>
                                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                    Acompanhe vencimentos, faturas de cartão e histórico auditável de pagamentos e estornos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="inline-flex items-center bg-[#0f1117] border border-cyber-gold/25 rounded-xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => mudarMes(-1)}
                                className="p-2 rounded-lg text-gray-400 hover:text-cyber-gold hover:bg-white/5 transition-colors cursor-pointer"
                                title="Mês anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 text-sm font-bold text-cyber-gold min-w-[140px] text-center">
                                {NOMES_MESES[mesSelecionado - 1]} / {anoSelecionado}
                            </span>
                            <button
                                type="button"
                                onClick={() => mudarMes(1)}
                                className="p-2 rounded-lg text-gray-400 hover:text-cyber-gold hover:bg-white/5 transition-colors cursor-pointer"
                                title="Próximo mês"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleExportPdf}
                            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#0f1117] border border-cyber-gold/25 text-xs font-semibold text-gray-200 hover:border-cyber-gold hover:text-cyber-gold transition-colors cursor-pointer"
                        >
                            <FileDown size={15} />
                            Exportar PDF
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="mb-5 p-3.5 rounded-xl border border-cyber-error/50 bg-cyber-error/10 text-cyber-error text-xs">
                        {error}
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                    <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4">
                        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Total na Página</div>
                        <div className="text-xl sm:text-2xl font-extrabold text-cyber-gold tabular-nums">
                            {formatCurrency(totaisPagina.totalMes)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{totaisPagina.qtdMes} registro(s) no filtro</div>
                    </div>

                    <div className="bg-[#0f1117] border border-amber-500/20 rounded-xl p-4">
                        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">A Pagar (Pendente)</div>
                        <div className="text-xl sm:text-2xl font-extrabold text-amber-300 tabular-nums">
                            {formatCurrency(totaisPagina.totalPendente)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{totaisPagina.qtdPendente} nesta página</div>
                    </div>

                    <div className="bg-[#0f1117] border border-rose-500/20 rounded-xl p-4">
                        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Vencidas</div>
                        <div className="text-xl sm:text-2xl font-extrabold text-rose-400 tabular-nums">
                            {formatCurrency(totaisPagina.totalVencido)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{totaisPagina.qtdVencido} nesta página</div>
                    </div>

                    <div className="bg-[#0f1117] border border-emerald-500/20 rounded-xl p-4">
                        <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Pago</div>
                        <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 tabular-nums">
                            {formatCurrency(totaisPagina.totalPago)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{totaisPagina.qtdPago} nesta página</div>
                    </div>
                </div>

                {/* Abas Unificadas */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        type="button"
                        onClick={() => setAba('contas')}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            aba === 'contas'
                                ? 'bg-cyber-gold/15 border-cyber-gold text-cyber-gold'
                                : 'bg-[#0f1117] border-white/10 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <Wallet size={14} />
                        Contas a Pagar
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-gray-200">
                            {contasPage?.totalElements ?? 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAba('faturas')}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            aba === 'faturas'
                                ? 'bg-cyber-gold/15 border-cyber-gold text-cyber-gold'
                                : 'bg-[#0f1117] border-white/10 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <CreditCard size={14} />
                        Faturas de Cartão
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-gray-200">
                            {faturasPage?.totalElements ?? 0}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setAba('estornos')}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                            aba === 'estornos'
                                ? 'bg-cyber-gold/15 border-cyber-gold text-cyber-gold'
                                : 'bg-[#0f1117] border-white/10 text-gray-400 hover:text-gray-200'
                        }`}
                    >
                        <ShieldCheck size={14} />
                        Auditoria de Estornos
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-gray-200">
                            {estornosPage?.totalElements ?? 0}
                        </span>
                    </button>
                </div>

                {/* ABA 1: CONTAS A PAGAR (PAGINADA NO SERVIDOR) */}
                {aba === 'contas' && (
                    <section className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4 sm:p-5 shadow-lg">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto] gap-2.5 mb-4 items-center">
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={busca}
                                    onChange={(e) => setBusca(e.target.value)}
                                    placeholder="Buscar por descrição ou cartão..."
                                    className="w-full bg-[#161923] border border-white/10 text-gray-100 text-xs rounded-lg pl-8 pr-3 py-2.5 outline-none focus:border-cyber-gold"
                                />
                            </div>

                            <select
                                value={filtroStatus}
                                onChange={(e) => {
                                    setFiltroStatus(e.target.value);
                                    setPageContas(0);
                                }}
                                className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="TODOS">Todos os status</option>
                                <option value="PENDENTE">Pendentes</option>
                                <option value="VENCIDO">Vencidas</option>
                                <option value="PAGO">Pagas</option>
                            </select>

                            <select
                                value={filtroTipo}
                                onChange={(e) => {
                                    setFiltroTipo(e.target.value);
                                    setPageContas(0);
                                }}
                                className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-3 py-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                            >
                                <option value="TODOS">Todos os tipos</option>
                                <option value="FATURA_CARTAO">Fatura de Cartão</option>
                                <option value="OPERACIONAL">Operacional</option>
                                <option value="FOLHA_PAGAMENTO">Folha / Comissão</option>
                                <option value="SERVICO_TERCEIRO">Prestador de Serviço</option>
                                <option value="IMPOSTO">Imposto</option>
                                <option value="DISTRIBUICAO_LUCROS">Distribuição de Lucros</option>
                            </select>

                            {temFiltro && (
                                <button
                                    type="button"
                                    onClick={limparFiltros}
                                    className="inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg text-xs text-gray-400 hover:text-cyber-gold border border-white/10 hover:border-cyber-gold/40 cursor-pointer"
                                >
                                    <X size={13} />
                                    Limpar
                                </button>
                            )}
                        </div>

                        {loading ? (
                            <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
                                Carregando contas a pagar...
                            </div>
                        ) : contas.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm border border-white/5 rounded-lg bg-black/20">
                                Nenhuma conta encontrada para {NOMES_MESES[mesSelecionado - 1]}/{anoSelecionado} com os
                                filtros atuais.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-white/10 rounded-lg">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                                            <th className="py-3 px-3.5">Descrição / Tipo</th>
                                            <th className="py-3 px-3 whitespace-nowrap">Vencimento</th>
                                            <th className="py-3 px-3 whitespace-nowrap hidden md:table-cell">Pagamento</th>
                                            <th className="py-3 px-3">Status</th>
                                            <th className="py-3 px-3 text-right">Valor</th>
                                            <th className="py-3 px-3.5 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {contas.map((conta) => {
                                            const vencida =
                                                conta.status === 'PENDENTE' &&
                                                conta.dataVencimento.slice(0, 10) < hojeIso;
                                            return (
                                                <tr key={conta.id} className="hover:bg-white/[0.03] transition-colors">
                                                    <td className="py-3.5 px-3.5">
                                                        <div className="font-semibold text-gray-100">{conta.descricao}</div>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                            {conta.tipo === 'FATURA_CARTAO' ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                                    <CreditCard size={11} />
                                                                    Fatura Cartão
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                                                                    {conta.tipo.replace(/_/g, ' ')}
                                                                </span>
                                                            )}
                                                            {conta.mesReferencia && (
                                                                <span className="text-[11px] font-mono text-gray-400">
                                                                    Ref {conta.mesReferencia}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-3 text-xs font-mono text-gray-300 whitespace-nowrap">
                                                        {formatarDataLocal(conta.dataVencimento)}
                                                    </td>

                                                    <td className="py-3.5 px-3 text-xs font-mono text-gray-400 whitespace-nowrap hidden md:table-cell">
                                                        {conta.dataPagamento ? formatarDataLocal(conta.dataPagamento) : '—'}
                                                    </td>

                                                    <td className="py-3.5 px-3">
                                                        {conta.status === 'PAGO' ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                                <CheckCircle2 size={11} />
                                                                PAGO
                                                            </span>
                                                        ) : vencida ? (
                                                            <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/35">
                                                                VENCIDO
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                                                PENDENTE
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-3.5 px-3 text-right font-extrabold text-cyber-gold whitespace-nowrap tabular-nums">
                                                        {formatCurrency(conta.valor)}
                                                    </td>

                                                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                                                        {conta.status === 'PENDENTE' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalPagar(conta)}
                                                                className="px-3.5 py-1.5 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer"
                                                            >
                                                                Pagar
                                                            </button>
                                                        )}
                                                        {conta.status === 'PAGO' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setModalEstornar(conta)}
                                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/25 transition-colors cursor-pointer"
                                                                title="Estorno financeiro auditável"
                                                            >
                                                                <RotateCcw size={12} />
                                                                Estornar
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationBar
                            page={pageContas}
                            totalPages={contasPage?.totalPages ?? 1}
                            totalElements={contasPage?.totalElements ?? 0}
                            shownCount={contas.length}
                            onPageChange={setPageContas}
                        />
                    </section>
                )}

                {/* ABA 2: FATURAS DE CARTÃO PENDENTES (PAGINADA NO SERVIDOR) */}
                {aba === 'faturas' && (
                    <section className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4 sm:p-5 shadow-lg">
                        {faturasPendentes.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm">
                                Nenhuma fatura de cartão pendente no momento.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {faturasPendentes.map((fatura) => (
                                    <div
                                        key={fatura.id}
                                        className="bg-[#161923] border border-cyber-gold/20 hover:border-cyber-gold/45 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-bold text-white text-base">{fatura.descricao}</h3>
                                                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                                    PENDENTE
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-3 font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} className="text-cyber-gold" />
                                                    Vence: {formatarDataLocal(fatura.dataVencimento)}
                                                </span>
                                                {fatura.dataCompetencia && (
                                                    <span>Fecha: {formatarDataLocal(fatura.dataCompetencia)}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                            <div>
                                                <span className="text-[10px] uppercase text-gray-500 block">Valor Atual</span>
                                                <span className="text-xl font-extrabold text-cyber-gold tabular-nums">
                                                    {formatCurrency(fatura.valor)}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setModalPagar(fatura)}
                                                className="px-4 py-2 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer"
                                            >
                                                Registrar Pagamento
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <PaginationBar
                            page={pageFaturas}
                            totalPages={faturasPage?.totalPages ?? 1}
                            totalElements={faturasPage?.totalElements ?? 0}
                            shownCount={faturasPendentes.length}
                            onPageChange={setPageFaturas}
                        />
                    </section>
                )}

                {/* ABA 3: AUDITORIA DE ESTORNOS (PAGINADA NO SERVIDOR) */}
                {aba === 'estornos' && (
                    <section className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4 sm:p-5 shadow-lg">
                        <p className="text-xs text-gray-400 mb-4">
                            Trilha imutável de auditoria de pagamentos estornados. Os registros originais são preservados
                            no banco com status <strong className="text-gray-200">CANCELADO</strong>.
                        </p>

                        {estornos.length === 0 ? (
                            <div className="py-12 text-center text-gray-500 text-sm border border-white/5 rounded-lg bg-black/20">
                                Nenhum estorno financeiro registrado.
                            </div>
                        ) : (
                            <div className="overflow-x-auto border border-white/10 rounded-lg">
                                <table className="w-full text-left border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                                            <th className="py-3 px-3.5">ID</th>
                                            <th className="py-3 px-3">Rastreabilidade</th>
                                            <th className="py-3 px-3 whitespace-nowrap">Pgto Original</th>
                                            <th className="py-3 px-3">Justificativa</th>
                                            <th className="py-3 px-3">Responsável / Data</th>
                                            <th className="py-3 px-3.5 text-right">Valor Estornado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {estornos.map((est) => (
                                            <tr key={est.id} className="hover:bg-white/[0.03] transition-colors">
                                                <td className="py-3 px-3.5 font-mono text-xs text-gray-400">#{est.id}</td>
                                                <td className="py-3 px-3 text-xs">
                                                    <div className="font-semibold text-gray-200">
                                                        {est.contaPagarOriginal?.descricao || `Conta #${est.contaPagarOriginal?.id}`}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[11px]">
                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400">
                                                            #{est.contaPagarOriginal?.id} (Cancelada)
                                                        </span>
                                                        {est.contaPagarReaberta && (
                                                            <>
                                                                <span className="text-gray-500">→</span>
                                                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300">
                                                                    #{est.contaPagarReaberta.id} ({est.contaPagarReaberta.status})
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-xs font-mono text-gray-300 whitespace-nowrap">
                                                    {formatarDataLocal(est.dataPagamentoOriginal)}
                                                    {est.meioPagamentoOriginal && (
                                                        <span className="block text-[10px] text-gray-500">
                                                            {est.meioPagamentoOriginal}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-3 text-xs text-gray-200 max-w-xs">{est.motivo}</td>
                                                <td className="py-3 px-3 text-xs text-gray-300 whitespace-nowrap">
                                                    <div>{est.usuario?.email || '—'}</div>
                                                    <div className="text-[11px] text-gray-500 font-mono">
                                                        {formatDateTime(est.dataEstorno)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3.5 text-right font-extrabold text-amber-300 whitespace-nowrap tabular-nums">
                                                    {formatCurrency(est.valorEstornado)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <PaginationBar
                            page={pageEstornos}
                            totalPages={estornosPage?.totalPages ?? 1}
                            totalElements={estornosPage?.totalElements ?? 0}
                            shownCount={estornos.length}
                            onPageChange={setPageEstornos}
                        />
                    </section>
                )}

                {modalPagar && (
                    <ConfirmarPagamentoModal
                        conta={modalPagar}
                        meioPagamentoInicial={modalPagar.tipo === 'FATURA_CARTAO' ? 'TRANSFERENCIA' : 'PIX'}
                        onClose={() => setModalPagar(null)}
                        onSuccess={handlePagamentoConcluido}
                        onSolicitarEstorno={(contaPaga) => {
                            setModalPagar(null);
                            setModalEstornar(contaPaga);
                        }}
                    />
                )}

                {modalEstornar && (
                    <EstornarPagamentoModal
                        conta={modalEstornar}
                        onClose={() => setModalEstornar(null)}
                        onSuccess={handleEstornoConcluido}
                    />
                )}
            </div>

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </>
    );
};

export default ContasPagarPage;
