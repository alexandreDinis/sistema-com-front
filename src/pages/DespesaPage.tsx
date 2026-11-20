import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    CreditCard,
    Home,
    Pencil,
    Search,
    Trash2,
    Wallet,
    X,
} from 'lucide-react';
import { DespesaForm } from '../components/forms/DespesaForm';
import { DespesaEditModal } from '../components/modals/DespesaEditModal';
import { despesaService } from '../services/despesaService';
import { cartaoService } from '../services/cartaoService';
import { calcularMesReferenciaFatura, formatarDataLocal } from '../utils/faturaUtils';
import {
    CATEGORIA_LABELS,
    calcularResumoDespesas,
    extrairMesesDisponiveis,
    filtrarEOrdenarDespesas,
    formatarMesAno,
    getCategoriaLabel,
    type FiltrosDespesa,
    type OrdemDespesa,
    type TipoFiltroDespesa,
} from '../utils/despesaFilters';
import type { Despesa } from '../types';

const ITENS_POR_PAGINA = 10;

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getMesAtualIso = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const DespesaPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [despesaEditando, setDespesaEditando] = useState<Despesa | null>(null);
    const [paginaAtual, setPaginaAtual] = useState(1);

    const [filtros, setFiltros] = useState<FiltrosDespesa>({
        tipo: 'TODOS',
        busca: '',
        mesAno: 'TODOS',
        cartaoId: 'TODOS',
        categoria: 'TODOS',
        ordem: 'CRIACAO_DESC',
    });

    const { data: despesas = [], isLoading } = useQuery({
        queryKey: ['despesas'],
        queryFn: despesaService.listar,
    });

    const { data: cartoes = [] } = useQuery({
        queryKey: ['cartoes'],
        queryFn: cartaoService.listar,
    });

    const deleteMutation = useMutation({
        mutationFn: despesaService.excluir,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro'] });
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
            queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        },
        onError: (error) => {
            alert('Erro ao excluir despesa. Verifique o console.');
            console.error(error);
        },
    });

    const handleDelete = (id: number) => {
        if (
            confirm(
                '⚠️ EXCLUSÃO DE DESPESA\n\nIsso pode alterar faturas de cartão e fluxos de caixa associados.\nDeseja continuar?'
            )
        ) {
            deleteMutation.mutate(id);
        }
    };

    const atualizarFiltro = <K extends keyof FiltrosDespesa>(campo: K, valor: FiltrosDespesa[K]) => {
        setFiltros((prev) => ({ ...prev, [campo]: valor }));
        setPaginaAtual(1);
    };

    const limparFiltros = () => {
        setFiltros({
            tipo: 'TODOS',
            busca: '',
            mesAno: 'TODOS',
            cartaoId: 'TODOS',
            categoria: 'TODOS',
            ordem: 'CRIACAO_DESC',
        });
        setPaginaAtual(1);
    };

    const temFiltroAtivo =
        filtros.tipo !== 'TODOS' ||
        filtros.busca.trim() !== '' ||
        filtros.mesAno !== 'TODOS' ||
        filtros.cartaoId !== 'TODOS' ||
        filtros.categoria !== 'TODOS';

    const mesesDisponiveis = useMemo(
        () => extrairMesesDisponiveis(despesas, getMesAtualIso()),
        [despesas]
    );

    const despesasFiltradas = useMemo(
        () => filtrarEOrdenarDespesas(despesas, filtros),
        [despesas, filtros]
    );

    const resumo = useMemo(
        () => calcularResumoDespesas(despesasFiltradas),
        [despesasFiltradas]
    );

    const totalPaginas = Math.max(1, Math.ceil(despesasFiltradas.length / ITENS_POR_PAGINA));
    const paginaSegura = Math.min(paginaAtual, totalPaginas);
    const despesasPaginadas = useMemo(() => {
        const inicio = (paginaSegura - 1) * ITENS_POR_PAGINA;
        return despesasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA);
    }, [despesasFiltradas, paginaSegura]);

    const ordemLabel =
        filtros.ordem === 'CRIACAO_DESC'
            ? 'Recém-lançados'
            : filtros.ordem === 'DATA_DESC'
                ? 'Data da compra'
                : 'Maior valor';

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8">
            {/* Breadcrumb + Header */}
            <header className="mb-6">
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
                    <span className="text-cyber-gold font-medium">Despesas</span>
                </nav>

                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-cyber-gold rounded-full" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Lançamento de Despesas
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            Registre gastos operacionais e compras no cartão com recálculo automático de faturas.
                        </p>
                    </div>
                </div>
            </header>

            {/* KPIs Dinâmicos */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Total Filtrado</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-cyber-gold">
                        {formatCurrency(resumo.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{resumo.count} lançamento(s)</div>
                </div>

                <div className="bg-[#0f1117] border border-purple-500/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                        <span>Cartão de Crédito</span>
                        <CreditCard size={14} className="text-purple-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-purple-300">
                        {formatCurrency(resumo.totalCartao)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{resumo.countCartao} compra(s) no filtro</div>
                </div>

                <div className="bg-[#0f1117] border border-cyan-500/20 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1 flex items-center justify-between">
                        <span>Despesas Comuns</span>
                        <Wallet size={14} className="text-cyan-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-cyan-300">
                        {formatCurrency(resumo.totalComum)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{resumo.countComum} lançamento(s) no filtro</div>
                </div>

                <div className="bg-[#0f1117] border border-white/10 rounded-xl p-4">
                    <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">Ordenação</div>
                    <div className="text-base sm:text-lg font-bold text-gray-100 mt-1">{ordemLabel}</div>
                    <div className="text-xs text-gray-500 mt-1">
                        {despesas.length} registro(s) no total
                    </div>
                </div>
            </div>

            {/* Layout 2 Colunas: Formulário à esquerda + Histórico com Filtros à direita */}
            <div className="grid grid-cols-1 lg:grid-cols-[390px_1fr] gap-6 items-start">
                <aside className="lg:sticky lg:top-6">
                    <DespesaForm cartoes={cartoes} />
                </aside>

                <section className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-4 sm:p-5 shadow-lg">
                    {/* Abas Rápidas + Limpar Filtros */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="inline-flex bg-black/70 border border-white/10 rounded-lg p-1 gap-1">
                            {(
                                [
                                    { key: 'TODOS', label: 'Todos' },
                                    { key: 'CARTAO', label: '💳 Cartão' },
                                    { key: 'COMUM', label: '💵 Comuns' },
                                ] as { key: TipoFiltroDespesa; label: string }[]
                            ).map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => atualizarFiltro('tipo', tab.key)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                                        filtros.tipo === tab.key
                                            ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                            : 'text-gray-400 hover:text-gray-200 border border-transparent'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {temFiltroAtivo && (
                            <button
                                type="button"
                                onClick={limparFiltros}
                                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-cyber-gold border border-white/10 hover:border-cyber-gold/40 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={13} />
                                Limpar filtros
                            </button>
                        )}
                    </div>

                    {/* Barra de Filtros */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5 mb-4">
                        <div className="relative sm:col-span-2 xl:col-span-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <input
                                type="text"
                                value={filtros.busca}
                                onChange={(e) => atualizarFiltro('busca', e.target.value)}
                                placeholder="Buscar descrição..."
                                className="w-full bg-[#161923] border border-white/10 text-gray-100 text-xs rounded-lg pl-8 pr-3 py-2 outline-none focus:border-cyber-gold"
                            />
                        </div>

                        <select
                            value={filtros.mesAno}
                            onChange={(e) => atualizarFiltro('mesAno', e.target.value)}
                            className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-cyber-gold cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="TODOS">Todos os meses</option>
                            {mesesDisponiveis.map((m) => (
                                <option key={m} value={m}>
                                    {formatarMesAno(m)}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtros.cartaoId}
                            onChange={(e) => atualizarFiltro('cartaoId', e.target.value)}
                            className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-cyber-gold cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="TODOS">Todos os cartões</option>
                            {cartoes.map((c) => (
                                <option key={c.id} value={String(c.id)}>
                                    {c.nome}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtros.categoria}
                            onChange={(e) => atualizarFiltro('categoria', e.target.value)}
                            className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-cyber-gold cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="TODOS">Todas categorias</option>
                            {Object.entries(CATEGORIA_LABELS).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filtros.ordem}
                            onChange={(e) => atualizarFiltro('ordem', e.target.value as OrdemDespesa)}
                            className="bg-[#161923] border border-white/10 text-gray-200 text-xs rounded-lg px-2.5 py-2 outline-none focus:border-cyber-gold cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="CRIACAO_DESC">Recém-lançados</option>
                            <option value="DATA_DESC">Data da compra ↓</option>
                            <option value="VALOR_DESC">Maior valor ↓</option>
                        </select>
                    </div>

                    {/* Tabela de Lançamentos */}
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
                            Carregando lançamentos...
                        </div>
                    ) : despesasPaginadas.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 text-sm border border-white/5 rounded-lg bg-black/20">
                            Nenhum lançamento encontrado com os filtros atuais.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-white/10 rounded-lg">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-white/[0.03] border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                                        <th className="py-3 px-3.5">Descrição / Origem</th>
                                        <th className="py-3 px-3 hidden sm:table-cell">Categoria</th>
                                        <th className="py-3 px-3 whitespace-nowrap">Data</th>
                                        <th className="py-3 px-3 text-right">Valor</th>
                                        <th className="py-3 px-3.5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {despesasPaginadas.map((despesa) => {
                                        const previaFatura = despesa.cartao
                                            ? calcularMesReferenciaFatura(
                                                  despesa.dataDespesa,
                                                  despesa.cartao.diaFechamento
                                              )
                                            : null;
                                        return (
                                            <tr
                                                key={despesa.id}
                                                className="hover:bg-white/[0.03] transition-colors"
                                            >
                                                <td className="py-3 px-3.5">
                                                    <div className="font-semibold text-gray-100 leading-snug">
                                                        {despesa.descricao || 'Sem descrição'}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        {despesa.cartao ? (
                                                            <>
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                                                    <CreditCard size={11} />
                                                                    {despesa.cartao.nome}
                                                                </span>
                                                                {previaFatura && (
                                                                    <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                                                                        Fatura {formatarMesAno(previaFatura.mesReferencia)}
                                                                    </span>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded bg-cyber-gold/10 text-cyber-gold border border-cyber-gold/25">
                                                                <Wallet size={11} />
                                                                Comum
                                                            </span>
                                                        )}
                                                        <span className="sm:hidden text-[11px] text-gray-400">
                                                            · {getCategoriaLabel(despesa.categoria)}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="py-3 px-3 hidden sm:table-cell">
                                                    <span className="inline-block text-xs text-gray-300 bg-white/5 px-2 py-0.5 rounded">
                                                        {getCategoriaLabel(despesa.categoria)}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-3 text-xs text-gray-300 whitespace-nowrap font-mono">
                                                    {formatarDataLocal(despesa.dataDespesa)}
                                                </td>

                                                <td className="py-3 px-3 text-right font-extrabold text-cyber-gold whitespace-nowrap tabular-nums">
                                                    {formatCurrency(despesa.valor)}
                                                </td>

                                                <td className="py-3 px-3.5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDespesaEditando(despesa)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-white/5 text-gray-200 hover:bg-cyber-gold/15 hover:text-cyber-gold border border-white/10 hover:border-cyber-gold/40 transition-colors cursor-pointer"
                                                            title="Editar lançamento"
                                                        >
                                                            <Pencil size={13} />
                                                            <span className="hidden md:inline">Editar</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(despesa.id)}
                                                            className="p-1.5 rounded-md bg-white/5 text-gray-400 hover:bg-red-500/15 hover:text-red-400 border border-white/10 hover:border-red-500/40 transition-colors cursor-pointer"
                                                            title="Excluir lançamento"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginação */}
                    {despesasFiltradas.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 mt-4 text-xs text-gray-400">
                            <span>
                                Mostrando <strong className="text-gray-200">{despesasPaginadas.length}</strong> de{' '}
                                <strong className="text-gray-200">{despesasFiltradas.length}</strong> lançamento(s) ·
                                Página {paginaSegura} de {totalPaginas}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={paginaSegura <= 1}
                                    onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <ChevronLeft size={14} />
                                    Anterior
                                </button>
                                <button
                                    type="button"
                                    disabled={paginaSegura >= totalPaginas}
                                    onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#161923] border border-white/10 text-gray-200 hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    Próxima
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {despesaEditando && (
                <DespesaEditModal
                    despesa={despesaEditando}
                    onClose={() => setDespesaEditando(null)}
                />
            )}
        </div>
    );
};
