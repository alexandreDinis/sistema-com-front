import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Award,
    ChevronLeft,
    ChevronRight,
    Home,
    Search,
    Trophy,
    Users,
    X,
} from 'lucide-react';
import { relatorioService } from '../../services/relatorioService';
import {
    calcularParticipacaoCliente,
    calcularResumoRanking,
    calcularTicketMedio,
    filtrarEOrdenarRanking,
    type OrdemRankingClientes,
} from '../../utils/rankingClientesUtils';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

export const RankingClientesPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const today = new Date();

    const initialAno = searchParams.get('ano') ? parseInt(searchParams.get('ano')!, 10) : today.getFullYear();
    const initialMes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!, 10) : today.getMonth() + 1;

    const [periodMode, setPeriodMode] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');
    const [mes, setMes] = useState(Number.isNaN(initialMes) ? today.getMonth() + 1 : initialMes);
    const [ano, setAno] = useState(Number.isNaN(initialAno) ? today.getFullYear() : initialAno);
    const [busca, setBusca] = useState('');
    const [ordem, setOrdem] = useState<OrdemRankingClientes>('VALOR');

    const { data: rankingData = [], isLoading, isError } = useQuery({
        queryKey: ['ranking-clientes', periodMode, ano, periodMode === 'MONTHLY' ? mes : null],
        queryFn: () =>
            relatorioService.getRankingClientes(ano, periodMode === 'MONTHLY' ? mes : undefined),
    });

    const handlePrevious = () => {
        if (periodMode === 'ANNUAL') {
            setAno((prev) => prev - 1);
            return;
        }
        if (mes === 1) {
            setMes(12);
            setAno((prev) => prev - 1);
        } else {
            setMes((prev) => prev - 1);
        }
    };

    const handleNext = () => {
        if (periodMode === 'ANNUAL') {
            setAno((prev) => prev + 1);
            return;
        }
        if (mes === 12) {
            setMes(1);
            setAno((prev) => prev + 1);
        } else {
            setMes((prev) => prev + 1);
        }
    };

    const resumo = useMemo(() => calcularResumoRanking(rankingData), [rankingData]);

    const top3 = useMemo(
        () => [...rankingData].sort((a, b) => (b.valorTotal || 0) - (a.valorTotal || 0)).slice(0, 3),
        [rankingData]
    );

    const listaFiltrada = useMemo(
        () => filtrarEOrdenarRanking(rankingData, busca, ordem),
        [rankingData, busca, ordem]
    );

    const periodoLabel =
        periodMode === 'MONTHLY' ? `${MESES_CURTOS[mes - 1] ?? mes} / ${ano}` : `Ano ${ano}`;

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
                    <Link to="/relatorio" className="hover:text-cyber-gold transition-colors">
                        Relatórios
                    </Link>
                    <ChevronRight size={13} className="opacity-40" />
                    <span className="text-cyber-gold font-medium">Ranking de Clientes</span>
                </nav>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-1.5 h-9 bg-cyber-gold rounded-full shrink-0" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                                Ranking de Clientes
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                                Acompanhe os principais clientes por faturamento, volume de OS e ticket médio.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        {/* Mensal / Anual Toggle */}
                        <div className="inline-flex bg-[#0f1117] border border-white/10 rounded-xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={() => setPeriodMode('MONTHLY')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    periodMode === 'MONTHLY'
                                        ? 'bg-cyber-gold text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Mensal
                            </button>
                            <button
                                type="button"
                                onClick={() => setPeriodMode('ANNUAL')}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                                    periodMode === 'ANNUAL'
                                        ? 'bg-cyber-gold text-black'
                                        : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                Anual
                            </button>
                        </div>

                        {/* Period Stepper */}
                        <div className="inline-flex items-center bg-[#0f1117] border border-white/10 rounded-xl p-1 gap-1">
                            <button
                                type="button"
                                onClick={handlePrevious}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                aria-label="Período anterior"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 text-xs sm:text-sm font-extrabold text-cyber-gold min-w-[104px] text-center tabular-nums">
                                {periodoLabel}
                            </span>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                aria-label="Próximo período"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="min-h-[45vh] flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                    <p className="text-gray-400 text-sm animate-pulse">Carregando ranking de clientes...</p>
                </div>
            ) : isError ? (
                <div className="bg-red-500/10 border border-red-500/35 p-6 rounded-2xl">
                    <h3 className="text-red-300 font-bold text-base mb-1">Erro ao carregar ranking</h3>
                    <p className="text-red-200/80 text-sm">
                        Não foi possível consultar o ranking de clientes para {periodoLabel}. Tente novamente.
                    </p>
                </div>
            ) : (
                <>
                    {/* 4 KPIs Executivos */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-gradient-to-b from-cyber-gold/10 to-[#0f1117] border border-cyber-gold/30 rounded-xl p-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                Faturamento no Período
                            </span>
                            <span className="text-xl sm:text-2xl font-extrabold text-cyber-gold tabular-nums mt-1 block">
                                {formatCurrency(resumo.faturamentoTotal)}
                            </span>
                            <span className="text-[11px] text-gray-500 mt-1 block">
                                {periodMode === 'MONTHLY' ? 'Consolidado mensal' : 'Consolidado anual'}
                            </span>
                        </div>

                        <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                Clientes Atendidos
                            </span>
                            <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums mt-1 block">
                                {resumo.totalClientes}
                            </span>
                            <span className="text-[11px] text-gray-500 mt-1 block">
                                {resumo.totalOS} {resumo.totalOS === 1 ? 'ordem de serviço' : 'ordens de serviço'}
                            </span>
                        </div>

                        <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                Ticket Médio / OS
                            </span>
                            <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums mt-1 block">
                                {formatCurrency(resumo.ticketMedioOS)}
                            </span>
                            <span className="text-[11px] text-gray-500 mt-1 block tabular-nums">
                                Média de {formatCurrency(resumo.ticketMedioCliente)} por cliente
                            </span>
                        </div>

                        <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                                Concentração Top 3
                            </span>
                            <span className="text-xl sm:text-2xl font-extrabold text-white tabular-nums mt-1 block">
                                {resumo.concentracaoTop3.toFixed(1)}%
                            </span>
                            <span className="text-[11px] text-gray-500 mt-1 block tabular-nums">
                                {formatCurrency(resumo.top3Valor)} nos 3 maiores
                            </span>
                        </div>
                    </section>

                    {rankingData.length === 0 ? (
                        <div className="bg-[#0f1117] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-gray-500 flex items-center justify-center">
                                <Users size={24} />
                            </div>
                            <h2 className="text-base font-bold text-white">Nenhum cliente faturado no período</h2>
                            <p className="text-xs sm:text-sm text-gray-400 max-w-md">
                                Não há ordens de serviço faturadas em {periodoLabel}. Experimente navegar para outro mês ou alternar para a visão anual.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Pódio Top 3 */}
                            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {top3.map((cliente, idx) => {
                                    const share = calcularParticipacaoCliente(
                                        cliente.valorTotal,
                                        resumo.faturamentoTotal
                                    );
                                    const ticket = calcularTicketMedio(cliente);

                                    const medalStyles =
                                        idx === 0
                                            ? 'bg-cyber-gold/20 text-[#f3d778] border-cyber-gold/40'
                                            : idx === 1
                                                ? 'bg-slate-400/15 text-slate-200 border-slate-400/30'
                                                : 'bg-amber-600/20 text-amber-300 border-amber-600/35';

                                    return (
                                        <article
                                            key={cliente.clienteId}
                                            className={`rounded-2xl p-5 border transition-colors ${
                                                idx === 0
                                                    ? 'bg-gradient-to-br from-cyber-gold/12 via-[#0f1117] to-[#0f1117] border-cyber-gold/45'
                                                    : 'bg-[#0f1117] border-white/10'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${medalStyles}`}
                                                >
                                                    {idx === 0 ? <Trophy size={12} /> : <Award size={12} />}
                                                    {idx + 1}º Lugar
                                                </span>
                                                <span className="text-xs font-bold text-gray-400 tabular-nums">
                                                    {share.toFixed(1)}% do total
                                                </span>
                                            </div>

                                            <h3
                                                className="text-base font-extrabold text-white truncate"
                                                title={cliente.nomeFantasia}
                                            >
                                                {cliente.nomeFantasia}
                                            </h3>
                                            <div className="text-2xl font-extrabold text-cyber-gold tabular-nums mt-1 mb-3">
                                                {formatCurrency(cliente.valorTotal)}
                                            </div>

                                            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 tabular-nums">
                                                <span>{cliente.quantidadeOS} OS</span>
                                                <span>Ticket médio: {formatCurrency(ticket)}</span>
                                            </div>
                                        </article>
                                    );
                                })}
                            </section>

                            {/* Tabela Completa + Busca + Ordenação */}
                            <section className="bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden">
                                <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                    <div className="relative w-full md:max-w-xs">
                                        <Search
                                            size={15}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                        />
                                        <input
                                            type="text"
                                            value={busca}
                                            onChange={(e) => setBusca(e.target.value)}
                                            placeholder="Buscar cliente pelo nome..."
                                            className="w-full bg-[#090b10] border border-white/10 focus:border-cyber-gold rounded-lg pl-9 pr-8 py-2 text-xs sm:text-sm text-white placeholder:text-gray-500 outline-none"
                                        />
                                        {busca && (
                                            <button
                                                type="button"
                                                onClick={() => setBusca('')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white cursor-pointer"
                                                aria-label="Limpar busca"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(
                                            [
                                                { id: 'VALOR', label: 'Maior Faturamento' },
                                                { id: 'OS', label: 'Mais OS' },
                                                { id: 'TICKET', label: 'Maior Ticket Médio' },
                                            ] as const
                                        ).map((opt) => (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => setOrdem(opt.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                                    ordem === opt.id
                                                        ? 'bg-cyber-gold/15 border-cyber-gold/40 text-cyber-gold'
                                                        : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-white/[0.03] border-b border-white/10">
                                            <tr className="text-[11px] text-gray-400 uppercase tracking-wider">
                                                <th className="py-3 px-5 text-left font-bold w-16">Pos.</th>
                                                <th className="py-3 px-4 text-left font-bold">Cliente</th>
                                                <th className="py-3 px-4 text-right font-bold">Qtd. OS</th>
                                                <th className="py-3 px-4 text-right font-bold">Ticket Médio</th>
                                                <th className="py-3 px-4 text-right font-bold">Participação</th>
                                                <th className="py-3 px-5 text-right font-bold">Faturamento</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {listaFiltrada.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-10 text-center text-gray-500 text-sm">
                                                        Nenhum cliente encontrado para "{busca}".
                                                    </td>
                                                </tr>
                                            ) : (
                                                listaFiltrada.map((cliente, idx) => {
                                                    const ticket = calcularTicketMedio(cliente);
                                                    const share = calcularParticipacaoCliente(
                                                        cliente.valorTotal,
                                                        resumo.faturamentoTotal
                                                    );
                                                    return (
                                                        <tr
                                                            key={cliente.clienteId}
                                                            className="hover:bg-white/[0.02] transition-colors"
                                                        >
                                                            <td
                                                                className={`py-3.5 px-5 font-extrabold tabular-nums ${
                                                                    idx === 0 ? 'text-cyber-gold' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                #{idx + 1}
                                                            </td>
                                                            <td className="py-3.5 px-4 font-bold text-white">
                                                                {cliente.nomeFantasia}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right text-gray-300 tabular-nums">
                                                                {cliente.quantidadeOS}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right text-gray-400 tabular-nums">
                                                                {formatCurrency(ticket)}
                                                            </td>
                                                            <td className="py-3.5 px-4 text-right">
                                                                <div className="inline-flex items-center gap-2">
                                                                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-cyber-gold rounded-full"
                                                                            style={{ width: `${share}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs text-gray-400 tabular-nums w-11 text-right">
                                                                        {share.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 px-5 text-right font-extrabold text-cyber-gold tabular-nums">
                                                                {formatCurrency(cliente.valorTotal)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                        {listaFiltrada.length > 0 && (
                                            <tfoot className="bg-cyber-gold/[0.06] border-t-2 border-cyber-gold/40 font-extrabold">
                                                <tr>
                                                    <td colSpan={2} className="py-3.5 px-5 text-white">
                                                        TOTAL ({listaFiltrada.length}{' '}
                                                        {listaFiltrada.length === 1 ? 'cliente' : 'clientes'})
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-white tabular-nums">
                                                        {listaFiltrada.reduce((s, c) => s + (c.quantidadeOS || 0), 0)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right text-gray-400">—</td>
                                                    <td className="py-3.5 px-4 text-right text-gray-300 tabular-nums text-xs">
                                                        {calcularParticipacaoCliente(
                                                            listaFiltrada.reduce((s, c) => s + (c.valorTotal || 0), 0),
                                                            resumo.faturamentoTotal
                                                        ).toFixed(1)}
                                                        %
                                                    </td>
                                                    <td className="py-3.5 px-5 text-right text-cyber-gold tabular-nums text-base">
                                                        {formatCurrency(
                                                            listaFiltrada.reduce((s, c) => s + (c.valorTotal || 0), 0)
                                                        )}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden p-4 space-y-2.5">
                                    {listaFiltrada.length === 0 ? (
                                        <p className="text-center text-gray-500 text-sm py-6">
                                            Nenhum cliente encontrado para "{busca}".
                                        </p>
                                    ) : (
                                        listaFiltrada.map((cliente, idx) => {
                                            const ticket = calcularTicketMedio(cliente);
                                            const share = calcularParticipacaoCliente(
                                                cliente.valorTotal,
                                                resumo.faturamentoTotal
                                            );
                                            return (
                                                <div
                                                    key={cliente.clienteId}
                                                    className="bg-[#151923] border border-white/10 rounded-xl p-3.5 space-y-2"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0">
                                                            <span
                                                                className={`text-xs font-extrabold mr-1.5 ${
                                                                    idx === 0 ? 'text-cyber-gold' : 'text-gray-400'
                                                                }`}
                                                            >
                                                                #{idx + 1}
                                                            </span>
                                                            <span className="text-sm font-bold text-white break-words">
                                                                {cliente.nomeFantasia}
                                                            </span>
                                                        </div>
                                                        <strong className="text-sm font-extrabold text-cyber-gold tabular-nums shrink-0">
                                                            {formatCurrency(cliente.valorTotal)}
                                                        </strong>
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] text-gray-400 tabular-nums">
                                                        <span>{cliente.quantidadeOS} OS</span>
                                                        <span>Ticket: {formatCurrency(ticket)}</span>
                                                        <span>{share.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
};
