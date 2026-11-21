import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { comissaoService } from '../../services/comissaoService';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const MESES_PT = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
];

export const YoYRevenueWidget: React.FC = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const mesNome = MESES_PT[currentMonth - 1];

    const { data: yoyData, isLoading, isError } = useQuery({
        queryKey: ['yoy-comparison', currentYear, currentMonth],
        queryFn: () => comissaoService.obterComparacaoYoY(currentYear, currentMonth),
    });

    if (isLoading) {
        return (
            <div className="bg-black/45 border border-white/10 p-5 rounded-2xl animate-pulse space-y-4">
                <div className="h-4 bg-white/10 rounded w-44" />
                <div className="h-9 bg-white/10 rounded w-52" />
                <div className="space-y-2.5 pt-2">
                    <div className="h-3 bg-white/10 rounded w-full" />
                    <div className="h-3 bg-white/10 rounded w-4/5" />
                </div>
            </div>
        );
    }

    if (isError || !yoyData) {
        return (
            <div className="bg-black/45 border border-red-500/25 p-5 rounded-2xl">
                <h3 className="text-sm font-bold text-white mb-1">Faturamento vs Ano Anterior</h3>
                <p className="text-xs text-red-400">Não foi possível carregar o comparativo anual.</p>
            </div>
        );
    }

    const faturamentoAtual = yoyData.faturamentoAtual || 0;
    const faturamentoAnterior = yoyData.temDadosAnoAnterior ? yoyData.faturamentoAnoAnterior || 0 : 0;
    const maxValor = Math.max(faturamentoAtual, faturamentoAnterior, 1);
    const pctAtual = Math.round((faturamentoAtual / maxValor) * 100);
    const pctAnterior = Math.round((faturamentoAnterior / maxValor) * 100);

    const isPositive = yoyData.diferencaPercentual > 0;
    const isNeutral = yoyData.diferencaPercentual === 0;

    return (
        <div className="bg-black/45 border border-white/10 rounded-2xl p-5 min-w-0 overflow-hidden flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">Faturamento vs Ano Anterior</h3>
                <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-oxanium font-semibold text-gray-300 shrink-0">
                    {mesNome} {currentYear}
                </span>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-2xl sm:text-3xl font-orbitron font-bold text-cyber-gold tabular-nums">
                    {faturamentoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>

                {yoyData.temDadosAnoAnterior ? (
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                            isPositive
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : isNeutral
                                  ? 'bg-white/5 border-white/10 text-gray-400'
                                  : 'bg-red-500/15 border-red-500/30 text-red-400'
                        }`}
                    >
                        {isPositive ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                        ) : isNeutral ? (
                            <Minus className="w-3.5 h-3.5" />
                        ) : (
                            <TrendingDown className="w-3.5 h-3.5" />
                        )}
                        {isPositive ? '+' : ''}
                        {yoyData.diferencaPercentual.toFixed(1)}% vs {currentYear - 1}
                    </span>
                ) : (
                    <span className="text-xs text-gray-500">Sem histórico em {currentYear - 1}</span>
                )}
            </div>

            {yoyData.temDadosAnoAnterior ? (
                <div className="space-y-3 pt-1">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>
                                {mesNome} {currentYear} (Atual)
                            </span>
                            <strong className="text-white font-mono tabular-nums">
                                {faturamentoAtual.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </strong>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-cyber-gold to-yellow-300 transition-all duration-500"
                                style={{ width: `${Math.max(pctAtual, faturamentoAtual > 0 ? 4 : 0)}%` }}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>
                                {mesNome} {currentYear - 1}
                            </span>
                            <strong className="text-gray-300 font-mono tabular-nums">
                                {faturamentoAnterior.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </strong>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full bg-slate-500 transition-all duration-500"
                                style={{ width: `${Math.max(pctAnterior, faturamentoAnterior > 0 ? 4 : 0)}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-[11px] text-gray-500 pt-1 border-t border-white/5">
                        Diferença:{' '}
                        <span className="text-gray-300 font-mono">
                            {yoyData.diferencaAbsoluta >= 0 ? '+' : ''}
                            {yoyData.diferencaAbsoluta.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            })}
                        </span>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-gray-500 pt-2 border-t border-white/5">
                    Assim que houver faturamento registrado no mesmo mês do ano anterior, a comparação aparecerá aqui.
                </p>
            )}
        </div>
    );
};
