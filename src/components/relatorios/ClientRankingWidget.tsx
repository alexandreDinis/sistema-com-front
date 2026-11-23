import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Trophy, Users } from 'lucide-react';
import { relatorioService } from '../../services/relatorioService';
import { formatarMoeda } from '../../utils/formatters';
import { calcularParticipacaoCliente } from '../../utils/rankingClientesUtils';

interface ClientRankingWidgetProps {
    selectedAno?: number;
    selectedMes?: number;
}

export const ClientRankingWidget: React.FC<ClientRankingWidgetProps> = ({ selectedAno, selectedMes }) => {
    const [filterType, setFilterType] = useState<'MONTHLY' | 'ANNUAL'>('MONTHLY');

    const currentDate = new Date();
    const targetYear = selectedAno || currentDate.getFullYear();
    const targetMonth = selectedMes || currentDate.getMonth() + 1;

    const { data: rankingData = [], isLoading } = useQuery({
        queryKey: ['ranking-clientes', filterType, targetYear, filterType === 'MONTHLY' ? targetMonth : null],
        queryFn: () =>
            relatorioService.getRankingClientes(
                targetYear,
                filterType === 'MONTHLY' ? targetMonth : undefined
            ),
    });

    const totalValor = useMemo(
        () => rankingData.reduce((acc, c) => acc + (c.valorTotal || 0), 0),
        [rankingData]
    );

    return (
        <div className="bg-[#0f1117] border border-white/10 p-5 sm:p-6 rounded-2xl h-full flex flex-col">
            {/* Header with Filter Toggle */}
            <div className="flex items-start justify-between gap-3 mb-5">
                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyber-gold" />
                        Ranking de Clientes
                    </h3>
                    <div className="text-lg font-extrabold text-white mt-0.5">
                        Top Clientes
                    </div>
                </div>

                <div className="inline-flex bg-[#090b10] rounded-lg p-1 border border-white/10">
                    <button
                        type="button"
                        onClick={() => setFilterType('MONTHLY')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            filterType === 'MONTHLY'
                                ? 'bg-cyber-gold text-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Mês
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilterType('ANNUAL')}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                            filterType === 'ANNUAL'
                                ? 'bg-cyber-gold text-black'
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Ano
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-2.5 animate-pulse">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="h-11 bg-white/5 rounded-lg" />
                        ))}
                    </div>
                ) : rankingData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-44 text-gray-500">
                        <Filter className="w-7 h-7 mb-2 opacity-50" />
                        <span className="text-xs">Nenhum cliente faturado no período</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-white/10">
                                <th className="py-2 pl-2 font-bold">Pos.</th>
                                <th className="py-2 font-bold">Cliente</th>
                                <th className="py-2 text-center font-bold">OS</th>
                                <th className="py-2 text-right pr-2 font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-white/5">
                            {rankingData.map((cliente, index) => {
                                const share = calcularParticipacaoCliente(cliente.valorTotal, totalValor);
                                return (
                                    <tr
                                        key={cliente.clienteId}
                                        className={`hover:bg-white/[0.03] transition-colors ${
                                            index === 0 ? 'bg-cyber-gold/[0.07]' : ''
                                        }`}
                                    >
                                        <td className="py-2.5 pl-2 w-11">
                                            {index < 3 ? (
                                                <span
                                                    className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-[11px] font-extrabold ${
                                                        index === 0
                                                            ? 'bg-cyber-gold text-black'
                                                            : index === 1
                                                                ? 'bg-slate-300 text-black'
                                                                : 'bg-amber-600 text-white'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-500 font-bold pl-1">
                                                    #{index + 1}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2.5 pr-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span
                                                    className="font-semibold text-white truncate max-w-[160px]"
                                                    title={cliente.nomeFantasia}
                                                >
                                                    {cliente.nomeFantasia}
                                                </span>
                                                {index === 0 && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyber-gold/20 text-cyber-gold text-[9px] font-extrabold uppercase shrink-0">
                                                        <Trophy size={9} />
                                                        Top 1
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                                                <div
                                                    className="h-full bg-cyber-gold rounded-full"
                                                    style={{ width: `${share}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-2.5 text-center text-gray-400 text-xs tabular-nums">
                                            {cliente.quantidadeOS}
                                        </td>
                                        <td className="py-2.5 text-right pr-2 font-bold text-cyber-gold tabular-nums text-xs sm:text-sm">
                                            {formatarMoeda(cliente.valorTotal)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer Info */}
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center text-[11px] text-gray-500">
                <span>
                    {filterType === 'MONTHLY'
                        ? `Referência: ${targetMonth.toString().padStart(2, '0')}/${targetYear}`
                        : `Referência: Ano ${targetYear}`}
                </span>
                <span>
                    {rankingData.length} {rankingData.length === 1 ? 'cliente' : 'clientes'}
                </span>
            </div>
        </div>
    );
};
