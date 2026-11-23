import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowUpRight,
    Calendar,
    ChevronRight,
    CreditCard,
    FileText,
    Home,
    Info,
    Receipt,
} from 'lucide-react';
import { cartaoService } from '../../services/cartaoService';
import { financeiroService } from '../../services/financeiroService';
import {
    filtrarFaturasDoCartao,
    formatarCategoriaDespesa,
    formatarDataLocal,
    formatarMesReferenciaFatura,
    resumirFaturasPorCartao,
    type FiltroStatusFatura,
} from '../../utils/faturaUtils';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const FaturasPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCartaoParam = searchParams.get('cartaoId');
    const parsedInitialCartao = initialCartaoParam ? Number(initialCartaoParam) : null;

    const [selectedCartaoId, setSelectedCartaoId] = useState<number | null>(
        parsedInitialCartao && !Number.isNaN(parsedInitialCartao) ? parsedInitialCartao : null
    );
    const [filtroStatus, setFiltroStatus] = useState<FiltroStatusFatura>('PENDENTE');
    const [selectedFaturaId, setSelectedFaturaId] = useState<number | null>(null);

    const { data: cartoes = [], isLoading: loadingCartoes } = useQuery({
        queryKey: ['cartoes'],
        queryFn: () => cartaoService.listar(),
    });

    const { data: contasPagar = [], isLoading: loadingContas } = useQuery({
        queryKey: ['faturas', 'todas'],
        queryFn: () => financeiroService.listarContasPagar(),
    });

    const effectiveCartaoId = useMemo(() => {
        if (selectedCartaoId != null && cartoes.some((c) => c.id === selectedCartaoId)) {
            return selectedCartaoId;
        }
        return cartoes.length > 0 ? cartoes[0].id : null;
    }, [selectedCartaoId, cartoes]);

    const cartaoSelecionado = useMemo(
        () => cartoes.find((c) => c.id === effectiveCartaoId) ?? null,
        [cartoes, effectiveCartaoId]
    );

    const resumoPorCartao = useMemo(
        () => resumirFaturasPorCartao(contasPagar),
        [contasPagar]
    );

    const faturasDoCartao = useMemo(
        () => filtrarFaturasDoCartao(contasPagar, effectiveCartaoId, filtroStatus),
        [contasPagar, effectiveCartaoId, filtroStatus]
    );

    const effectiveFaturaId = useMemo(() => {
        if (selectedFaturaId != null && faturasDoCartao.some((f) => f.id === selectedFaturaId)) {
            return selectedFaturaId;
        }
        return faturasDoCartao.length > 0 ? faturasDoCartao[0].id : null;
    }, [selectedFaturaId, faturasDoCartao]);

    const {
        data: detalhesFatura,
        isLoading: loadingDetalhes,
        isError: errorDetalhes,
    } = useQuery({
        queryKey: ['fatura-detalhes', effectiveFaturaId],
        enabled: effectiveFaturaId != null,
        queryFn: () => financeiroService.obterDetalhesFatura(effectiveFaturaId!),
    });

    const handleSelectCartao = (cartaoId: number) => {
        setSelectedCartaoId(cartaoId);
        setSelectedFaturaId(null);
        setSearchParams({ cartaoId: String(cartaoId) }, { replace: true });
    };

    const handleChangeFiltro = (novoFiltro: FiltroStatusFatura) => {
        setFiltroStatus(novoFiltro);
        setSelectedFaturaId(null);
    };

    if (loadingCartoes || loadingContas) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Carregando faturas e cartões...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8 space-y-6">
            {/* Breadcrumb & Header */}
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
                    <span className="text-cyber-gold font-medium">Faturas de Cartão</span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-9 bg-cyber-gold rounded-full shrink-0" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Faturas de Cartão
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Selecione um cartão para consultar suas faturas e conferir o detalhamento das despesas.
                            </p>
                        </div>
                    </div>

                    <Link
                        to="/financeiro/contas-pagar"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold hover:bg-cyber-gold/20 text-xs font-bold transition-colors self-start sm:self-auto"
                    >
                        <Receipt size={15} />
                        Ir para Contas a Pagar
                        <ArrowUpRight size={14} />
                    </Link>
                </div>
            </header>

            {/* Aviso Demonstrativo */}
            <div className="flex items-start gap-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3 text-xs text-blue-200 leading-relaxed">
                <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <span>
                    <strong className="text-white">Área Demonstrativa:</strong> utilize esta tela para conferir faturas e lançamentos por cartão. Pagamentos e baixas são realizados exclusivamente em{' '}
                    <Link to="/financeiro/contas-pagar" className="underline font-bold text-cyber-gold hover:text-yellow-300">
                        Contas a Pagar
                    </Link>
                    .
                </span>
            </div>

            {cartoes.length === 0 ? (
                <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyber-gold/10 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center">
                        <CreditCard size={24} />
                    </div>
                    <h2 className="text-base font-bold text-white">Nenhum cartão corporativo cadastrado</h2>
                    <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                        Cadastre seus cartões em Cartões Corporativos para acompanhar as faturas consolidadas aqui.
                    </p>
                    <Link
                        to="/financeiro/cartoes"
                        className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all"
                    >
                        Gerenciar Cartões
                    </Link>
                </div>
            ) : (
                <>
                    {/* Etapa 1: Seleção de Cartão */}
                    <section className="space-y-2.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                            1. Selecione o Cartão Corporativo
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cartoes.map((cartao) => {
                                const resumo = resumoPorCartao[cartao.id] ?? {
                                    abertasCount: 0,
                                    totalAberto: 0,
                                    totalFaturas: 0,
                                };
                                const isSelected = cartao.id === effectiveCartaoId;

                                return (
                                    <button
                                        key={cartao.id}
                                        type="button"
                                        onClick={() => handleSelectCartao(cartao.id)}
                                        className={`text-left rounded-2xl p-4 border transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-gradient-to-br from-cyber-gold/14 via-[#0f1117] to-[#0f1117] border-cyber-gold shadow-lg shadow-cyber-gold/5'
                                                : 'bg-[#0f1117] border-white/10 hover:border-cyber-gold/40'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                                                        isSelected
                                                            ? 'bg-cyber-gold/20 border-cyber-gold/45 text-cyber-gold'
                                                            : 'bg-white/5 border-white/10 text-gray-400'
                                                    }`}
                                                >
                                                    <CreditCard size={16} />
                                                </span>
                                                <span className="font-extrabold text-sm text-white truncate">
                                                    {cartao.nome}
                                                </span>
                                            </div>
                                            <span
                                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                                    resumo.abertasCount > 0
                                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                                }`}
                                            >
                                                {resumo.abertasCount > 0
                                                    ? `${resumo.abertasCount} aberta(s)`
                                                    : 'Em dia'}
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-gray-400 mb-3">
                                            Fecha dia {cartao.diaFechamento || 25} · Vence dia {cartao.diaVencimento}
                                        </p>

                                        <div className="pt-2.5 border-t border-white/10 flex items-baseline justify-between">
                                            <span className="text-[11px] text-gray-500">Total em aberto</span>
                                            <strong className="text-base font-extrabold text-cyber-gold tabular-nums">
                                                {formatCurrency(resumo.totalAberto)}
                                            </strong>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Etapas 2 e 3: Lista de Faturas + Detalhamento */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        {/* Etapa 2: Lista de Faturas */}
                        <div className="lg:col-span-6 bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-sm sm:text-base font-extrabold text-white">
                                        2. Faturas — {cartaoSelecionado?.nome}
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        Clique em uma fatura para visualizar o extrato detalhado
                                    </p>
                                </div>

                                <div className="inline-flex bg-[#090b10] border border-white/10 rounded-lg p-1 gap-1 self-start sm:self-auto">
                                    {(
                                        [
                                            { id: 'PENDENTE', label: 'Em Aberto' },
                                            { id: 'PAGO', label: 'Pagas' },
                                            { id: 'TODAS', label: 'Todas' },
                                        ] as const
                                    ).map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => handleChangeFiltro(tab.id)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${
                                                filtroStatus === tab.id
                                                    ? 'bg-cyber-gold text-black'
                                                    : 'text-gray-400 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {faturasDoCartao.length === 0 ? (
                                <div className="p-10 text-center text-sm text-gray-500">
                                    Nenhuma fatura encontrada neste filtro para {cartaoSelecionado?.nome}.
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {faturasDoCartao.map((fatura) => {
                                        const isSelected = fatura.id === effectiveFaturaId;
                                        const isPaga = fatura.status === 'PAGO';
                                        const labelMes = fatura.mesReferencia
                                            ? formatarMesReferenciaFatura(fatura.mesReferencia)
                                            : fatura.descricao;

                                        return (
                                            <button
                                                key={fatura.id}
                                                type="button"
                                                onClick={() => setSelectedFaturaId(fatura.id)}
                                                className={`w-full text-left px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-cyber-gold/10 border-l-4 border-l-cyber-gold'
                                                        : 'hover:bg-white/[0.03] border-l-4 border-l-transparent'
                                                }`}
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-sm text-white">
                                                            Fatura {labelMes}
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                                                isPaga
                                                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                                            }`}
                                                        >
                                                            {isPaga ? 'PAGA' : fatura.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1 flex-wrap">
                                                        {fatura.dataCompetencia && (
                                                            <span>Fecha: {formatarDataLocal(fatura.dataCompetencia)}</span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={11} className="text-cyber-gold" />
                                                            Vence: {formatarDataLocal(fatura.dataVencimento)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="text-right shrink-0">
                                                    <strong className="text-sm sm:text-base font-extrabold text-cyber-gold tabular-nums block">
                                                        {formatCurrency(fatura.valor)}
                                                    </strong>
                                                    <span className="text-[11px] text-gray-500 inline-flex items-center gap-0.5">
                                                        Detalhes <ChevronRight size={12} />
                                                    </span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Etapa 3: Detalhamento da Fatura Selecionada */}
                        <div className="lg:col-span-6 bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden">
                            {!effectiveFaturaId ? (
                                <div className="p-12 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
                                    <FileText size={26} className="opacity-40" />
                                    <span>Clique em uma fatura na lista para visualizar o detalhamento das despesas.</span>
                                </div>
                            ) : loadingDetalhes ? (
                                <div className="p-12 flex flex-col items-center justify-center gap-3">
                                    <div className="w-8 h-8 border-2 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                                    <span className="text-xs text-gray-400">Carregando lançamentos da fatura...</span>
                                </div>
                            ) : errorDetalhes || !detalhesFatura ? (
                                <div className="p-8 text-center text-sm text-red-300">
                                    Não foi possível carregar os detalhes desta fatura.
                                </div>
                            ) : (
                                <>
                                    <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3">
                                        <div>
                                            <h2 className="text-sm sm:text-base font-extrabold text-white">
                                                3. Detalhamento — {formatarMesReferenciaFatura(detalhesFatura.mesReferencia)}
                                            </h2>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                Ciclo de compras: {formatarDataLocal(detalhesFatura.cicloInicio)} a{' '}
                                                {formatarDataLocal(detalhesFatura.cicloFim)}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                                                detalhesFatura.status === 'PAGO'
                                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                            }`}
                                        >
                                            {detalhesFatura.status === 'PAGO' ? 'PAGA' : detalhesFatura.status}
                                        </span>
                                    </div>

                                    <div className="p-4 sm:p-5 space-y-4">
                                        {/* Resumo da Fatura */}
                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div className="bg-[#151923] border border-white/10 rounded-xl p-3">
                                                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">
                                                    Despesas Ciclo
                                                </span>
                                                <strong className="text-xs sm:text-sm font-extrabold text-white tabular-nums mt-0.5 block">
                                                    {formatCurrency(detalhesFatura.totalDespesasCiclo)}
                                                </strong>
                                            </div>
                                            <div className="bg-[#151923] border border-white/10 rounded-xl p-3">
                                                <span className="text-[10px] uppercase tracking-wider text-gray-500 block">
                                                    Já Pago
                                                </span>
                                                <strong className="text-xs sm:text-sm font-extrabold text-emerald-400 tabular-nums mt-0.5 block">
                                                    {formatCurrency(detalhesFatura.totalJaPagoCiclo)}
                                                </strong>
                                            </div>
                                            <div className="bg-[#151923] border border-cyber-gold/30 rounded-xl p-3">
                                                <span className="text-[10px] uppercase tracking-wider text-gray-400 block">
                                                    Valor Fatura
                                                </span>
                                                <strong className="text-xs sm:text-sm font-extrabold text-cyber-gold tabular-nums mt-0.5 block">
                                                    {formatCurrency(detalhesFatura.valorFatura)}
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Lançamentos */}
                                        <div>
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-2">
                                                Lançamentos da Fatura ({detalhesFatura.despesas.length})
                                            </span>

                                            {detalhesFatura.despesas.length === 0 ? (
                                                <div className="bg-[#151923] border border-dashed border-white/10 rounded-xl p-6 text-center text-xs text-gray-500">
                                                    Nenhuma despesa encontrada neste ciclo de fechamento.
                                                </div>
                                            ) : (
                                                <div className="border border-white/10 rounded-xl divide-y divide-white/5 overflow-hidden">
                                                    {detalhesFatura.despesas.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="px-3.5 py-3 flex items-center justify-between gap-3 bg-[#12151f]/60 hover:bg-white/[0.02]"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="text-xs sm:text-sm font-semibold text-white truncate">
                                                                    {item.descricao || 'Despesa sem descrição'}
                                                                    {item.parcelado &&
                                                                        item.parcelaAtual &&
                                                                        item.numeroParcelas && (
                                                                            <span className="ml-1.5 text-[10px] font-bold text-cyber-gold bg-cyber-gold/10 px-1.5 py-0.5 rounded">
                                                                                {item.parcelaAtual}/{item.numeroParcelas}
                                                                            </span>
                                                                        )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                                                    <span>{formatarDataLocal(item.dataDespesa)}</span>
                                                                    <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[10px]">
                                                                        {formatarCategoriaDespesa(item.categoria)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <strong className="text-xs sm:text-sm font-bold text-white tabular-nums shrink-0">
                                                                {formatCurrency(item.valor)}
                                                            </strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Rodapé demonstrativo */}
                                        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-gray-500">
                                            <span>
                                                Vencimento: <strong className="text-gray-300">{formatarDataLocal(detalhesFatura.dataVencimento)}</strong>
                                                {detalhesFatura.dataPagamento && (
                                                    <> · Pago em <strong className="text-emerald-400">{formatarDataLocal(detalhesFatura.dataPagamento)}</strong></>
                                                )}
                                            </span>
                                            <Link
                                                to="/financeiro/contas-pagar"
                                                className="inline-flex items-center gap-1 font-bold text-cyber-gold hover:underline"
                                            >
                                                Gerenciar pagamento em Contas a Pagar
                                                <ArrowUpRight size={12} />
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default FaturasPage;
