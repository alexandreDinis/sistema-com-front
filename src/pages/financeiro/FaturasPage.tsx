import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, CheckCircle, ChevronRight, CreditCard, Home } from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { ConfirmarPagamentoModal } from '../../components/modals/ConfirmarPagamentoModal';
import { formatarDataLocal } from '../../utils/faturaUtils';
import type { ContaPagar } from '../../types';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const FaturasPage = () => {
    const queryClient = useQueryClient();
    const [faturas, setFaturas] = useState<ContaPagar[]>([]);
    const [loading, setLoading] = useState(true);
    const [faturaSelecionada, setFaturaSelecionada] = useState<ContaPagar | null>(null);

    const loadFaturas = async () => {
        try {
            setLoading(true);
            const data = await financeiroService.listarContasPagar('PENDENTE');
            const faturasCartao = data
                .filter((c) => c.tipo === 'FATURA_CARTAO')
                .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
            setFaturas(faturasCartao);
        } catch (err) {
            console.error('Erro ao carregar faturas:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFaturas();
    }, []);

    const handlePagamentoConcluido = () => {
        queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        queryClient.invalidateQueries({ queryKey: ['despesas'] });
        queryClient.invalidateQueries({ queryKey: ['financeiro'] });
        queryClient.invalidateQueries({ queryKey: ['faturas'] });
        queryClient.invalidateQueries({ queryKey: ['cartao-limite'] });
        setFaturaSelecionada(null);
        loadFaturas();
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-cyber-gold/30 border-t-cyber-gold rounded-full animate-spin" />
                <p className="text-gray-400 text-sm animate-pulse">Carregando faturas...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto px-4 py-6 sm:py-8">
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
                    <span className="text-cyber-gold font-medium">Faturas de Cartão</span>
                </nav>

                <div className="flex items-center gap-3">
                    <span className="w-1.5 h-8 bg-cyber-gold rounded-full" />
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Faturas de Cartão
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            Faturas consolidadas em aberto por ciclo de fechamento e vencimento.
                        </p>
                    </div>
                </div>
            </header>

            {faturas.length === 0 ? (
                <div className="bg-[#0f1117] border border-cyber-gold/20 rounded-xl p-12 text-center text-gray-500 text-sm">
                    Nenhuma fatura pendente encontrada.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {faturas.map((fatura) => (
                        <div
                            key={fatura.id}
                            className="bg-[#0f1117] border border-cyber-gold/20 hover:border-cyber-gold/45 rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors shadow-lg"
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300 shrink-0">
                                    <CreditCard size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-bold text-base text-white leading-snug">
                                            {fatura.descricao}
                                        </h3>
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                            PENDENTE
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2 font-mono">
                                        <span className="flex items-center gap-1">
                                            <Calendar size={12} className="text-cyber-gold" />
                                            Vence: {formatarDataLocal(fatura.dataVencimento)}
                                        </span>
                                        {fatura.dataCompetencia && (
                                            <span>Fecha: {formatarDataLocal(fatura.dataCompetencia)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                <div>
                                    <span className="text-[10px] uppercase text-gray-500 block">Valor Total</span>
                                    <span className="text-xl font-extrabold text-cyber-gold tabular-nums">
                                        {formatCurrency(fatura.valor)}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setFaturaSelecionada(fatura)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-cyber-gold text-black text-xs font-extrabold hover:brightness-110 transition-all cursor-pointer"
                                >
                                    <CheckCircle size={14} />
                                    Registrar Pagamento
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {faturaSelecionada && (
                <ConfirmarPagamentoModal
                    conta={faturaSelecionada}
                    meioPagamentoInicial="TRANSFERENCIA"
                    onClose={() => setFaturaSelecionada(null)}
                    onSuccess={handlePagamentoConcluido}
                />
            )}
        </div>
    );
};

export default FaturasPage;
