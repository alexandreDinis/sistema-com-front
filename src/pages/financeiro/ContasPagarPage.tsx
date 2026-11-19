import { useEffect, useState, useMemo } from 'react';
import { financeiroService } from '../../services/financeiroService';
import type { ContaPagar, ResumoFinanceiro } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { ConfirmarPagamentoModal } from '../../components/modals/ConfirmarPagamentoModal';
import { EstornarPagamentoModal } from '../../components/modals/EstornarPagamentoModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const NOMES_MESES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const ContasPagarPage = () => {
    const queryClient = useQueryClient();
    const now = new Date();
    const [contas, setContas] = useState<ContaPagar[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');
    const [mesSelecionado, setMesSelecionado] = useState(now.getMonth() + 1);
    const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());
    const [resumo, setResumo] = useState<ResumoFinanceiro | null>(null);
    const [modalPagar, setModalPagar] = useState<ContaPagar | null>(null);
    const [modalEstornar, setModalEstornar] = useState<ContaPagar | null>(null);
    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(financeiroService.getApiBaseUrl());

    // Carregar todas as contas (sem filtro de status no backend para poder filtrar localmente)
    useEffect(() => {
        loadContas();
        loadResumo();
    }, []);

    const loadContas = async () => {
        try {
            setLoading(true);
            // Buscar todas as contas para filtrar localmente por mês e status
            const [pendentes, pagas, vencidas] = await Promise.all([
                financeiroService.listarContasPagar('PENDENTE'),
                financeiroService.listarContasPagar('PAGO'),
                financeiroService.listarContasPagar('VENCIDO'),
            ]);
            // Merge e deduplica por ID
            const map = new Map<number, ContaPagar>();
            [...pendentes, ...pagas, ...vencidas].forEach(c => map.set(c.id, c));
            setContas(Array.from(map.values()));
        } catch (err) {
            console.error('Erro ao carregar contas:', err);
            setError('Erro ao carregar contas a pagar');
        } finally {
            setLoading(false);
        }
    };

    const loadResumo = async () => {
        try {
            const data = await financeiroService.getResumo();
            setResumo(data);
        } catch (err) {
            console.error('Erro ao carregar resumo:', err);
        }
    };

    // Filtrar contas pelo mês/ano selecionado e status
    const contasFiltradas = useMemo(() => {
        return contas.filter(conta => {
            // Filtro por mês: usa dataVencimento
            const dataVenc = new Date(conta.dataVencimento + 'T12:00:00');
            const mesMatch = dataVenc.getMonth() + 1 === mesSelecionado && dataVenc.getFullYear() === anoSelecionado;
            if (!mesMatch) return false;

            // Filtro por status
            if (filtroStatus === 'TODOS') return true;
            if (filtroStatus === 'VENCIDO') {
                return conta.status === 'PENDENTE' && new Date(conta.dataVencimento + 'T12:00:00') < new Date();
            }
            return conta.status === filtroStatus;
        });
    }, [contas, mesSelecionado, anoSelecionado, filtroStatus]);

    // Totais do mês
    const totaisMes = useMemo(() => {
        const contasDoMes = contas.filter(conta => {
            const dataVenc = new Date(conta.dataVencimento + 'T12:00:00');
            return dataVenc.getMonth() + 1 === mesSelecionado && dataVenc.getFullYear() === anoSelecionado;
        });

        const totalPendente = contasDoMes
            .filter(c => c.status === 'PENDENTE')
            .reduce((sum, c) => sum + c.valor, 0);

        const totalPago = contasDoMes
            .filter(c => c.status === 'PAGO')
            .reduce((sum, c) => sum + c.valor, 0);

        const totalVencido = contasDoMes
            .filter(c => c.status === 'PENDENTE' && new Date(c.dataVencimento + 'T12:00:00') < new Date())
            .reduce((sum, c) => sum + c.valor, 0);

        const totalMes = totalPendente + totalPago;

        return { totalPendente, totalPago, totalVencido, totalMes };
    }, [contas, mesSelecionado, anoSelecionado]);

    const invalidarCachesFinanceiros = () => {
        queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        queryClient.invalidateQueries({ queryKey: ['despesas'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['faturas'] });
        queryClient.invalidateQueries({ queryKey: ['cartao-limite'] });
    };

    const handlePagamentoConcluido = () => {
        invalidarCachesFinanceiros();
        setModalPagar(null);
        loadContas();
        loadResumo();
    };

    const handleEstornoConcluido = () => {
        invalidarCachesFinanceiros();
        setModalEstornar(null);
        loadContas();
        loadResumo();
    };

    const isVencido = (dataVencimento: string) => {
        return new Date(dataVencimento + 'T12:00:00') < new Date();
    };

    const handleExportPdf = () => {
        startPdfDownload(
            financeiroService.getContasPagarPdfPath(mesSelecionado, anoSelecionado),
            `contas-pagar-${anoSelecionado}-${mesSelecionado}.pdf`
        );
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin"></div>
                <p className="text-cyber-gold font-mono text-sm tracking-widest animate-pulse">CARREGANDO...</p>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-[calc(100vh-64px)] py-6 space-y-6 animate-fadeIn">
                {/* Header */}
                <header className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <span className="w-2 h-10 bg-cyber-error"></span>
                        <div>
                            <h1 className="text-2xl font-black italic text-cyber-gold tracking-widest uppercase">
                                Contas a Pagar
                            </h1>
                            <p className="text-cyber-gold/50 font-mono text-xs tracking-[0.3em]">
                            // GESTÃO DE SAÍDAS
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Seletor de Mês - AGORA FILTRA A TELA */}
                        <div className="flex items-center gap-1 bg-black/80 border border-cyber-gold/50 px-2 py-1 rounded">
                            <select
                                value={mesSelecionado}
                                onChange={(e) => setMesSelecionado(parseInt(e.target.value))}
                                className="bg-transparent text-cyber-gold font-mono text-xs focus:outline-none cursor-pointer"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>
                                        {NOMES_MESES[m - 1]}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={anoSelecionado}
                                onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
                                className="bg-transparent text-cyber-gold font-mono text-xs focus:outline-none cursor-pointer"
                            >
                                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(a => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        {/* Filtro de Status */}
                        <select
                            value={filtroStatus}
                            onChange={(e) => setFiltroStatus(e.target.value)}
                            className="bg-black/80 border border-cyber-gold/50 text-cyber-gold px-3 py-2 font-mono text-xs focus:outline-none focus:border-cyber-gold transition-colors cursor-pointer"
                        >
                            <option value="TODOS">TODOS</option>
                            <option value="PENDENTE">PENDENTES</option>
                            <option value="PAGO">PAGAS</option>
                            <option value="VENCIDO">VENCIDAS</option>
                        </select>

                        {/* Botão PDF separado */}
                        <button
                            onClick={handleExportPdf}
                            className="px-4 py-2 bg-cyber-gold/10 border border-cyber-gold/50 text-cyber-gold font-mono text-xs font-bold hover:bg-cyber-gold hover:text-black transition-all"
                            title="Exportar PDF do mês"
                        >
                            📄 PDF
                        </button>
                    </div>
                </header>

                {/* Cards de Resumo do Mês */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total do Mês */}
                    <div className="bg-black/60 border border-cyber-gold/20 p-4 rounded-sm hover:border-cyber-gold/50 transition-all">
                        <h3 className="text-xs font-mono text-cyber-gold/60 mb-1 tracking-widest uppercase">
                            // Total do Mês
                        </h3>
                        <p className="text-2xl font-black text-cyber-gold">
                            {formatCurrency(totaisMes.totalMes)}
                        </p>
                        <p className="text-[10px] text-cyber-gold/40 mt-1">
                            {NOMES_MESES[mesSelecionado - 1]}/{anoSelecionado}
                        </p>
                    </div>

                    {/* Pendente no Mês */}
                    <div className="bg-black/60 border border-yellow-500/20 p-4 rounded-sm hover:border-yellow-500/50 transition-all">
                        <h3 className="text-xs font-mono text-yellow-400/80 mb-1 tracking-widest uppercase">
                            // Pendente
                        </h3>
                        <p className="text-2xl font-black text-yellow-400">
                            {formatCurrency(totaisMes.totalPendente)}
                        </p>
                        <p className="text-[10px] text-yellow-400/40 mt-1">
                            A pagar no mês
                        </p>
                    </div>

                    {/* Pago no Mês */}
                    <div className="bg-black/60 border border-green-500/20 p-4 rounded-sm hover:border-green-500/50 transition-all">
                        <h3 className="text-xs font-mono text-green-400/80 mb-1 tracking-widest uppercase">
                            // Pago
                        </h3>
                        <p className="text-2xl font-black text-green-400">
                            {formatCurrency(totaisMes.totalPago)}
                        </p>
                        <p className="text-[10px] text-green-400/40 mt-1">
                            Já pago no mês
                        </p>
                    </div>

                    {/* Saldo em Caixa */}
                    <div className="bg-black/60 border border-cyber-gold/20 p-4 rounded-sm hover:border-cyber-gold/50 transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-cyber-gold/5 rounded-full blur-2xl"></div>
                        <h3 className="text-xs font-mono text-cyber-gold/60 mb-1 tracking-widest uppercase">
                            // Saldo em Caixa
                        </h3>
                        <p className="text-2xl font-black text-cyber-gold">
                            {formatCurrency(resumo?.saldoAtual || 0)}
                        </p>
                        <p className="text-[10px] text-cyber-gold/40 mt-1">
                            Disponível: {formatCurrency((resumo?.saldoAtual || 0) - totaisMes.totalPendente)}
                        </p>
                    </div>
                </div>

                {/* Vencido Alert */}
                {totaisMes.totalVencido > 0 && (
                    <div className="bg-red-900/20 border border-cyber-error/30 rounded-sm p-3 flex items-center gap-3">
                        <span className="text-cyber-error text-lg">⚠</span>
                        <p className="text-cyber-error text-sm font-mono">
                            <strong>{formatCurrency(totaisMes.totalVencido)}</strong> em contas vencidas neste mês
                        </p>
                    </div>
                )}

                {error && (
                    <div className="hud-card p-4 border-cyber-error/50 text-cyber-error font-mono text-sm">
                        ⚠ {error}
                    </div>
                )}

                {contasFiltradas.length === 0 ? (
                    <div className="hud-card top-brackets p-12 text-center">
                        <div className="static-overlay"></div>
                        <p className="text-cyber-gold/50 font-mono text-lg">[ NENHUMA CONTA ENCONTRADA ]</p>
                        <p className="text-cyber-gold/30 font-mono text-sm mt-2">
                            Nenhuma conta com vencimento em {NOMES_MESES[mesSelecionado - 1]}/{anoSelecionado}
                            {filtroStatus !== 'TODOS' ? ` com status ${filtroStatus}` : ''}
                        </p>
                    </div>
                ) : (
                    <div className="hud-card bottom-brackets overflow-hidden">
                        <div className="static-overlay"></div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-black/60">
                                    <tr>
                                        <th className="text-left p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">DESCRIÇÃO</th>
                                        <th className="text-left p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">TIPO</th>
                                        <th className="text-left p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">COMPETÊNCIA</th>
                                        <th className="text-left p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">VENCIMENTO</th>
                                        <th className="text-right p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">VALOR</th>
                                        <th className="text-center p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">STATUS</th>
                                        <th className="text-center p-4 text-cyber-gold/70 font-mono text-xs tracking-wider">AÇÕES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contasFiltradas.map((conta, index) => (
                                        <tr
                                            key={conta.id}
                                            className={`border-b border-cyber-gold/10 hover:bg-cyber-gold/5 transition-colors ${isVencido(conta.dataVencimento) && conta.status === 'PENDENTE' ? 'bg-cyber-error/10' : ''
                                                }`}
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            <td className="p-4 text-cyber-text">{conta.descricao}</td>
                                            <td className="p-4">
                                                <span className="hud-tag">{conta.tipo.replace(/_/g, ' ')}</span>
                                            </td>
                                            <td className="p-4 text-cyber-gold/60 font-mono text-sm">
                                                {new Date(conta.dataCompetencia + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className={`p-4 font-mono text-sm ${isVencido(conta.dataVencimento) && conta.status === 'PENDENTE'
                                                ? 'text-cyber-error'
                                                : 'text-cyber-gold/60'
                                                }`}>
                                                {new Date(conta.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="p-4 text-right text-cyber-error font-bold font-mono text-lg">
                                                {formatCurrency(conta.valor)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 font-mono text-xs font-bold ${conta.status === 'PENDENTE'
                                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                    : conta.status === 'PAGO'
                                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                    }`}>
                                                    {conta.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                {conta.status === 'PENDENTE' && (
                                                    <button
                                                        onClick={() => setModalPagar(conta)}
                                                        className="px-4 py-2 bg-cyber-gold/10 border border-cyber-gold/50 text-cyber-gold font-mono text-xs font-bold hover:bg-cyber-gold hover:text-black transition-all cursor-pointer"
                                                    >
                                                        PAGAR
                                                    </button>
                                                )}
                                                {conta.status === 'PAGO' && (
                                                    <button
                                                        onClick={() => setModalEstornar(conta)}
                                                        className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer"
                                                        title="Registrar estorno auditável"
                                                    >
                                                        ESTORNAR
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Total footer */}
                                <tfoot className="bg-black/40 border-t-2 border-cyber-gold/30">
                                    <tr>
                                        <td colSpan={4} className="p-4 text-cyber-gold font-mono text-sm font-bold tracking-wider">
                                            TOTAL ({contasFiltradas.length} {contasFiltradas.length === 1 ? 'conta' : 'contas'})
                                        </td>
                                        <td className="p-4 text-right text-cyber-error font-black font-mono text-xl">
                                            {formatCurrency(contasFiltradas.reduce((sum, c) => sum + c.valor, 0))}
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Modal de Confirmação Segura de Pagamento (4 níveis de alerta) */}
                {modalPagar && (
                    <ConfirmarPagamentoModal
                        conta={modalPagar}
                        onClose={() => setModalPagar(null)}
                        onSuccess={handlePagamentoConcluido}
                        onSolicitarEstorno={(contaPaga) => {
                            setModalPagar(null);
                            setModalEstornar(contaPaga);
                        }}
                    />
                )}

                {/* Modal de Estorno Financeiro Auditável */}
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
