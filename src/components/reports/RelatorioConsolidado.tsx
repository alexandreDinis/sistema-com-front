import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { relatorioService } from '../../services/relatorioService';
import { ShieldCheck, Truck, Utensils, Construction, FileText, TrendingDown, Megaphone, Server, Briefcase, Box, TrendingUp, Wallet, type LucideIcon } from 'lucide-react';
import { AxiosError } from 'axios';
import { empresaService } from '../../services/empresaService';

interface RelatorioConsolidadoProps {
    ano: number;
    mes: number;
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    ALIMENTACAO: Utensils,
    MANUTENCAO_VEICULO: Construction,
    COMBUSTIVEL: Truck,
    FERRAMENTAS: Construction,
    MARKETING: Megaphone,
    INFRAESTRUTURA: Server,
    PROLABORE: Briefcase,
    DIVERSOS: Box,
    OUTROS: FileText,
};

export const RelatorioConsolidado: React.FC<RelatorioConsolidadoProps> = ({ ano, mes }) => {
    const { data: report, isLoading: isReportLoading, error } = useQuery({
        queryKey: ['relatorio', ano, mes],
        queryFn: () => relatorioService.getRelatorio(ano, mes),
    });

    const { data: config, isLoading: isConfigLoading } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: () => empresaService.getConfig(),
    });

    const isLoading = isReportLoading || isConfigLoading;

    // Debug: log what we receive
    console.log('[RelatorioConsolidado] Data:', report, 'Error:', error);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-48 h-px bg-cyber-gold/10 relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-cyber-gold w-1/4 animate-[loading_2s_infinite_linear]"></div>
            </div>
            <p className="text-[10px] font-mono text-cyber-gold/40 uppercase tracking-[0.4em]">Compilando trilha de auditoria...</p>
        </div>
    );

    const axiosError = error as AxiosError;

    if (error || !report) return (
        <div className="p-8 border border-cyber-error bg-cyber-error/5 text-cyber-error text-xs font-mono hud-card bottom-brackets">
            <span className="font-black animate-pulse">[CRITICAL_AUDIT_FAILURE]</span>
            <p className="mt-2 opacity-70">
                {error instanceof Error ? error.message : 'Não foi possível recuperar as sequências consolidadas.'}
            </p>
            {axiosError && axiosError.response && (
                <div className="mt-4 p-4 bg-black/40 border border-cyber-error/20 font-mono text-[9px]">
                    <span className="opacity-50 block mb-1">FLUXO_ERRO_STDOUT_0xERRO:</span>
                    <pre className="text-cyber-error/80 whitespace-pre-wrap break-all">
                        {JSON.stringify(axiosError.response.data, null, 2)}
                    </pre>
                    <p className="mt-2 text-[8px] text-cyber-error/40 italic">
                        PATH: {axiosError.response.config?.url} // STATUS: {axiosError.response.status}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="view-transition space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Expenses Breakdown */}
                <div className="lg:col-span-2 hud-card top-brackets bottom-brackets p-8 bg-black/60 relative overflow-hidden">
                    <div className="static-overlay opacity-5"></div>
                    <div className="flex items-center gap-3 mb-8 border-b border-cyber-gold/20 pb-4">
                        <TrendingDown className="w-4 h-4 text-cyber-gold/60" />
                        <h3 className="text-xl font-black text-cyber-gold tracking-widest italic italic-shadow">
                            DETALHAMENTO_DESPESAS_DRE
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {Object.entries(report.despesasPorCategoria || {}).map(([cat, val]) => {
                            const Icon = CATEGORY_ICONS[cat] || FileText;
                            const percentage = report.despesasTotal > 0
                                ? Math.min(((val as number) / report.despesasTotal) * 100, 100)
                                : 0;
                            return (
                                <div key={cat} className="p-4 bg-black/40 border border-cyber-gold/10 hover:border-cyber-gold/30 transition-all relative group">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Icon className="w-8 h-8 text-cyber-gold" />
                                    </div>
                                    <span className="hud-label text-[7px]">{cat}</span>
                                    <p className="text-xl font-black text-cyber-gold/90 italic tabular-nums">
                                        {formatCurrency(val as number)}
                                    </p>
                                    <div className="w-full h-1 bg-cyber-gold/5 mt-3 overflow-hidden">
                                        <div
                                            className="h-full bg-cyber-gold/40"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Vertical Audit Summary */}
                <div className="hud-card top-brackets bottom-brackets p-8 bg-black/80 relative overflow-hidden">
                    <div className="static-overlay opacity-5"></div>
                    <div className="flex items-center gap-3 mb-8 border-b border-cyber-gold/20 pb-4">
                        <ShieldCheck className="w-4 h-4 text-cyber-gold/60" />
                        <h3 className="text-xl font-black text-cyber-gold tracking-widest italic italic-shadow">
                            LOG_AUDITORIA_0x42
                        </h3>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end border-b border-cyber-gold/10 pb-4">
                            <div>
                                <span className="hud-label">FATURAMENTO_TOTAL</span>
                                <p className="text-xl font-black text-cyber-gold italic">{formatCurrency(report.faturamentoTotal)}</p>
                            </div>
                            <div className="text-right">
                                <TrendingUp className="w-5 h-5 text-cyber-gold/40 mb-1 ml-auto" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-cyber-gold/40">DESPESAS_BRUTAS</span>
                                <span className="text-cyber-gold/60">{formatCurrency(report.despesasTotal)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-cyber-gold/40">
                                    OBRIGAÇÃO_FISCAL{config?.aliquotaImposto !== undefined ? `_${(config.aliquotaImposto * 100).toFixed(1)}%` : ''}
                                </span>
                                <span className="text-cyber-gold/60">{formatCurrency(report.imposto)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-mono">
                                <span className="text-cyber-gold/40">ALOC_REPASSE</span>
                                <span className="text-cyber-gold/60">{formatCurrency(report.comissaoAlocada)}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-cyber-gold/10">
                            <span className="hud-label">SAÍDA_TOTAL</span>
                            <p className="text-2xl font-black text-cyber-gold/80 italic">{formatCurrency(report.totalGeral)}</p>
                        </div>

                        <div className="pt-8 border-t-2 border-dashed border-cyber-gold/20">
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="w-3 h-3 text-cyber-gold" />
                                <span className="hud-label text-cyber-gold">LUCRO_LÍQUIDO_FINAL</span>
                            </div>
                            <p className="text-5xl font-black text-cyber-gold italic italic-shadow drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                                {formatCurrency(report.lucroLiquido)}
                            </p>
                            <div className="mt-4 flex gap-1">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                    <div key={i} className="h-1 flex-1 bg-cyber-gold/20 animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
