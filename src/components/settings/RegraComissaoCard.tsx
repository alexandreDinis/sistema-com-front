import React from 'react';
import {
    Check,
    ChevronDown,
    ChevronUp,
    Edit2,
    Power,
    PowerOff,
    Trash2,
    X,
} from 'lucide-react';
import type { RegraComissao } from '../../types';
import {
    formatRuleDate,
    getTipoRegraLabel,
    isRegraExpirada,
} from '../../utils/comissaoRulesUtils';

interface RegraComissaoCardProps {
    regra: RegraComissao;
    onEdit: (regra: RegraComissao) => void;
    onAtivar: (regra: RegraComissao) => void;
    onDesativar: (regra: RegraComissao) => void;
    onDelete: (regra: RegraComissao) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const RegraComissaoCard: React.FC<RegraComissaoCardProps> = ({
    regra,
    onEdit,
    onAtivar,
    onDesativar,
    onDelete,
    isExpanded = true,
    onToggleExpand,
}) => {
    const expirada = isRegraExpirada(regra.dataFim);

    return (
        <article
            className={`rounded-2xl border overflow-hidden transition-all min-w-0 ${
                regra.ativa
                    ? 'bg-gradient-to-b from-emerald-950/25 to-zinc-900/80 border-emerald-500/35'
                    : expirada
                        ? 'bg-zinc-900/70 border-red-500/25'
                        : 'bg-zinc-900/75 border-white/10 hover:border-cyber-gold/30'
            }`}
        >
            {/* Header */}
            <div
                className={`p-5 flex items-start sm:items-center justify-between gap-3 ${
                    onToggleExpand ? 'cursor-pointer' : ''
                }`}
                onClick={onToggleExpand}
            >
                <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-white truncate">
                        {regra.nome}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        {getTipoRegraLabel(regra.tipoRegra)} • Vigência desde{' '}
                        {formatRuleDate(regra.dataInicio)}
                        {regra.dataFim ? ` até ${formatRuleDate(regra.dataFim)}` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            regra.ativa
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : expirada
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-white/5 text-zinc-400 border-white/10'
                        }`}
                    >
                        {regra.ativa ? (
                            <>
                                <Check className="w-3 h-3" />
                                Ativa
                            </>
                        ) : expirada ? (
                            <>
                                <X className="w-3 h-3" />
                                Expirada
                            </>
                        ) : (
                            'Inativa'
                        )}
                    </span>

                    {onToggleExpand && (
                        <span className="p-1 text-zinc-400">
                            {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
                    {regra.descricao && (
                        <p className="text-sm text-zinc-300 leading-relaxed">{regra.descricao}</p>
                    )}

                    {/* Faixas Table */}
                    {regra.faixas && regra.faixas.length > 0 && (
                        <div className="rounded-xl border border-white/10 bg-black/30 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-400">
                                        <th className="text-left px-3.5 py-2.5 font-semibold">Faixa</th>
                                        <th className="text-right px-3.5 py-2.5 font-semibold">Mínimo</th>
                                        <th className="text-right px-3.5 py-2.5 font-semibold">Máximo</th>
                                        <th className="text-right px-3.5 py-2.5 font-semibold">Repasse</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {regra.faixas.map((faixa, idx) => (
                                        <tr
                                            key={faixa.id || idx}
                                            className="border-b border-white/5 last:border-0"
                                        >
                                            <td className="px-3.5 py-2.5 text-zinc-200 font-medium">
                                                {faixa.descricao || `Faixa ${idx + 1}`}
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                                                {formatCurrency(faixa.minFaturamento)}
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right text-zinc-300 tabular-nums whitespace-nowrap">
                                                {faixa.maxFaturamento !== null &&
                                                faixa.maxFaturamento !== undefined
                                                    ? formatCurrency(faixa.maxFaturamento)
                                                    : 'Sem limite'}
                                            </td>
                                            <td className="px-3.5 py-2.5 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                                                {faixa.porcentagem}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(regra);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
                        >
                            <Edit2 className="w-3.5 h-3.5 text-cyber-gold" />
                            <span>Editar</span>
                        </button>

                        {regra.ativa ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDesativar(regra);
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-xs font-semibold text-amber-300 transition-colors"
                            >
                                <PowerOff className="w-3.5 h-3.5" />
                                <span>Desativar</span>
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAtivar(regra);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-colors"
                                >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>Ativar</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(regra);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-semibold text-red-300 transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </article>
    );
};
