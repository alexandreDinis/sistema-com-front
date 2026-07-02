import React from 'react';
import { Check, X, Edit2, Trash2, Power, PowerOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { RegraComissao } from '../../types';

interface RegraComissaoCardProps {
    regra: RegraComissao;
    onEdit: (regra: RegraComissao) => void;
    onAtivar: (regra: RegraComissao) => void;
    onDesativar: (regra: RegraComissao) => void;
    onDelete: (regra: RegraComissao) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
};

const getTipoRegraLabel = (tipo: string) => {
    const labels: Record<string, string> = {
        'FAIXA_FATURAMENTO': 'Faixas de Faturamento',
        'FIXA_FUNCIONARIO': 'Fixa por Prestador',
        'FIXA_EMPRESA': 'Fixa da Empresa',
        'HIBRIDA': 'Híbrida'
    };
    return labels[tipo] || tipo;
};

export const RegraComissaoCard: React.FC<RegraComissaoCardProps> = ({
    regra,
    onEdit,
    onAtivar,
    onDesativar,
    onDelete,
    isExpanded = true,
    onToggleExpand
}) => {
    const isExpirada = regra.dataFim && new Date(regra.dataFim) < new Date();

    return (
        <div className={`bg-black/60 border rounded-sm overflow-hidden transition-all ${regra.ativa
                ? 'border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                : isExpirada
                    ? 'border-red-500/30'
                    : 'border-cyber-gold/30 hover:border-cyber-gold/50'
            }`}>
            {/* Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${regra.ativa ? 'bg-green-500 animate-pulse' : isExpirada ? 'bg-red-500' : 'bg-gray-500'
                        }`} />
                    <div>
                        <h3 className="text-cyber-gold font-bold text-lg">{regra.nome}</h3>
                        <p className="text-cyber-gold/50 text-xs font-mono">
                            {getTipoRegraLabel(regra.tipoRegra)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wider rounded-sm ${regra.ativa
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : isExpirada
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                        }`}>
                        {regra.ativa ? (
                            <span className="flex items-center gap-1"><Check size={12} /> Ativa</span>
                        ) : isExpirada ? (
                            <span className="flex items-center gap-1"><X size={12} /> Expirada</span>
                        ) : (
                            'Inativa'
                        )}
                    </span>

                    {/* Expand Toggle */}
                    {onToggleExpand && (
                        isExpanded ? <ChevronUp size={20} className="text-cyber-gold/50" /> : <ChevronDown size={20} className="text-cyber-gold/50" />
                    )}
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <>
                    {/* Info Section */}
                    <div className="px-4 pb-3 border-t border-cyber-gold/10 pt-3">
                        <div className="flex gap-4 text-xs text-cyber-gold/60">
                            <span>Início: <span className="text-cyber-gold">{formatDate(regra.dataInicio)}</span></span>
                            {regra.dataFim && (
                                <span>Fim: <span className="text-cyber-gold">{formatDate(regra.dataFim)}</span></span>
                            )}
                        </div>
                        {regra.descricao && (
                            <p className="text-cyber-gold/50 text-sm mt-2">{regra.descricao}</p>
                        )}
                    </div>

                    {/* Faixas Table */}
                    {regra.faixas && regra.faixas.length > 0 && (
                        <div className="px-4 pb-4">
                            <h4 className="text-xs font-bold text-cyber-gold/50 uppercase tracking-widest mb-2">
                                Faixas de Comissão
                            </h4>
                            <div className="bg-black/40 border border-cyber-gold/20 rounded-sm overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-cyber-gold/20">
                                            <th className="text-left p-2 text-cyber-gold/50 font-mono text-xs">Faixa</th>
                                            <th className="text-right p-2 text-cyber-gold/50 font-mono text-xs">Min</th>
                                            <th className="text-right p-2 text-cyber-gold/50 font-mono text-xs">Max</th>
                                            <th className="text-right p-2 text-cyber-gold/50 font-mono text-xs">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {regra.faixas.map((faixa, idx) => (
                                            <tr key={faixa.id || idx} className="border-b border-cyber-gold/10 last:border-0">
                                                <td className="p-2 text-cyber-gold/80">
                                                    {faixa.descricao || `Faixa ${idx + 1}`}
                                                </td>
                                                <td className="p-2 text-right font-mono text-cyber-gold">
                                                    {formatCurrency(faixa.minFaturamento)}
                                                </td>
                                                <td className="p-2 text-right font-mono text-cyber-gold">
                                                    {faixa.maxFaturamento ? formatCurrency(faixa.maxFaturamento) : '∞'}
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold text-green-400">
                                                    {faixa.porcentagem}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="px-4 pb-4 flex gap-2 flex-wrap">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(regra); }}
                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-cyber-gold/10 border border-cyber-gold/30 text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all flex items-center gap-1"
                        >
                            <Edit2 size={12} /> Editar
                        </button>

                        {regra.ativa ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDesativar(regra); }}
                                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500 hover:text-black transition-all flex items-center gap-1"
                            >
                                <PowerOff size={12} /> Desativar
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onAtivar(regra); }}
                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-black transition-all flex items-center gap-1"
                                >
                                    <Power size={12} /> Ativar
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDelete(regra); }}
                                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black transition-all flex items-center gap-1"
                                >
                                    <Trash2 size={12} /> Excluir
                                </button>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
