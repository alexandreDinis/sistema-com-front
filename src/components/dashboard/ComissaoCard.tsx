import React from 'react';
import type { ComissaoCalculada } from '../../types';
import { formatarMoeda, formatarPorcentagem } from '../../utils/formatters';
import {
    TrendingUp,
    Percent,
    Wallet,
    ReceiptText,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from 'lucide-react';

interface ComissaoCardProps {
    comissao: ComissaoCalculada;
    periodoLabel?: string;
}

export const ComissaoCard: React.FC<ComissaoCardProps> = ({ comissao, periodoLabel }) => {
    const saldo = comissao.saldoAReceber ?? 0;
    const isPositivo = saldo >= 0;
    const isQuitado = Boolean(comissao.quitado);
    const saldoAnterior = comissao.saldoAnterior || 0;
    const temSaldoAnterior = saldoAnterior !== 0;
    const valorQuitado = comissao.valorQuitado || 0;

    return (
        <div className="space-y-4">
            {/* Alerta de Saldo Anterior (Carryover) */}
            {temSaldoAnterior && (
                <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold text-amber-200">
                                Saldo anterior acumulado
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Valor transportado do fechamento do período anterior
                            </p>
                        </div>
                    </div>
                    <span className="text-sm sm:text-base font-bold text-amber-400 font-mono tabular-nums shrink-0">
                        {saldoAnterior > 0 ? '+ ' : ''}
                        {formatarMoeda(saldoAnterior)}
                    </span>
                </div>
            )}

            {/* Hero Card: Saldo Líquido a Receber (Demonstrativo) */}
            <div
                className={`rounded-2xl p-5 sm:p-6 border bg-gradient-to-br from-[#161c2c] via-[#10131d] to-[#141824] ${
                    !isPositivo
                        ? 'border-red-500/40'
                        : isQuitado
                          ? 'border-emerald-500/40'
                          : 'border-cyber-gold/40'
                }`}
            >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    {isQuitado ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-oxanium font-bold uppercase tracking-wide bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Quitado
                        </span>
                    ) : !isPositivo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-oxanium font-bold uppercase tracking-wide bg-red-500/15 border border-red-500/35 text-red-400">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Saldo devedor
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-oxanium font-bold uppercase tracking-wide bg-amber-500/15 border border-amber-500/35 text-amber-400">
                            <Clock className="w-3.5 h-3.5" />
                            Em aberto
                        </span>
                    )}

                    {comissao.faixaComissao && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-oxanium font-bold uppercase tracking-wide bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold">
                            {comissao.faixaComissao} · {formatarPorcentagem(comissao.porcentagemComissao)}
                        </span>
                    )}
                </div>

                <div className="text-[11px] font-oxanium uppercase tracking-wider text-gray-400 font-semibold">
                    Saldo Líquido a Receber
                </div>

                <div
                    className={`text-3xl sm:text-5xl font-orbitron font-bold tracking-tight tabular-nums mt-1 ${
                        !isPositivo ? 'text-red-400' : isQuitado ? 'text-emerald-400' : 'text-cyber-gold'
                    }`}
                >
                    {formatarMoeda(saldo)}
                </div>

                <p className="text-xs text-gray-400 mt-1.5">
                    {isQuitado && comissao.dataQuitacao
                        ? `Quitado em ${new Date(comissao.dataQuitacao).toLocaleDateString('pt-BR')} · `
                        : ''}
                    Referência: {periodoLabel || comissao.anoMesReferencia}
                </p>

                {/* Composição visual do saldo */}
                <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-white/10">
                        Bruta{' '}
                        <strong className="text-white font-mono tabular-nums">
                            {formatarMoeda(comissao.valorBrutoComissao)}
                        </strong>
                    </span>

                    {temSaldoAnterior && (
                        <>
                            <span className="text-gray-500 font-bold">{saldoAnterior >= 0 ? '+' : '−'}</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-white/10">
                                Anterior{' '}
                                <strong className="text-amber-300 font-mono tabular-nums">
                                    {formatarMoeda(Math.abs(saldoAnterior))}
                                </strong>
                            </span>
                        </>
                    )}

                    <span className="text-gray-500 font-bold">−</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-white/10">
                        Adiant.{' '}
                        <strong className="text-amber-400 font-mono tabular-nums">
                            {formatarMoeda(comissao.valorAdiantado)}
                        </strong>
                    </span>

                    <span className="text-gray-500 font-bold">−</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/35 border border-white/10">
                        Já pago{' '}
                        <strong className="text-emerald-400 font-mono tabular-nums">
                            {formatarMoeda(valorQuitado)}
                        </strong>
                    </span>
                </div>
            </div>

            {/* Grid de 5 KPIs (2 colunas no celular com Faturamento em destaque, 5 no desktop) */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="col-span-2 lg:col-span-1 bg-black/45 border border-white/10 hover:border-cyber-gold/35 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-gray-400">Faturamento Mensal</span>
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-cyber-gold flex items-center justify-center">
                            <TrendingUp className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">
                        {formatarMoeda(comissao.faturamentoMensal)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Base para cálculo da faixa</div>
                </div>

                <div className="bg-black/45 border border-white/10 hover:border-cyber-gold/35 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-gray-400">Taxa Aplicada</span>
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-cyber-gold flex items-center justify-center">
                            <Percent className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">
                        {formatarPorcentagem(comissao.porcentagemComissao)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1 truncate">
                        {comissao.faixaComissao || 'Faixa ativa'}
                    </div>
                </div>

                <div className="bg-black/45 border border-white/10 hover:border-cyber-gold/35 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-gray-400">Comissão Bruta</span>
                        <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-cyber-gold flex items-center justify-center">
                            <ReceiptText className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-white font-mono tabular-nums">
                        {formatarMoeda(comissao.valorBrutoComissao)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Antes de descontos</div>
                </div>

                <div className="bg-black/45 border border-white/10 hover:border-amber-500/35 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-gray-400">Adiantamentos</span>
                        <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono tabular-nums">
                        {formatarMoeda(comissao.valorAdiantado)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Vales / saques prévios</div>
                </div>

                <div className="bg-black/45 border border-white/10 hover:border-emerald-500/35 rounded-xl p-4 transition-colors">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-gray-400">Já Pago</span>
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-emerald-400 font-mono tabular-nums">
                        {formatarMoeda(valorQuitado)}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-1">Quitado no período</div>
                </div>
            </div>
        </div>
    );
};
