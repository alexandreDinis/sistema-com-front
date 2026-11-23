import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Shield,
    Users,
    X,
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { userService } from '../../services/userService';

interface PlanDetails {
    label: string;
    limitLabel: string;
    limitNumber: number | null;
    accentText: string;
    accentBorder: string;
    description: string;
}

const getPlanDetails = (plan: string): PlanDetails => {
    switch (plan) {
        case 'OURO':
            return {
                label: 'Ouro',
                limitLabel: 'Ilimitado',
                limitNumber: null,
                accentText: 'text-cyber-gold',
                accentBorder: 'border-cyber-gold/40',
                description: 'Acesso completo aos módulos de O.S., Financeiro, DRE e Comissões.',
            };
        case 'PRATA':
            return {
                label: 'Prata',
                limitLabel: '5 Usuários',
                limitNumber: 5,
                accentText: 'text-zinc-200',
                accentBorder: 'border-zinc-400/40',
                description: 'Ideal para pequenas equipes em crescimento.',
            };
        default:
            return {
                label: 'Bronze',
                limitLabel: '2 Usuários',
                limitNumber: 2,
                accentText: 'text-amber-400',
                accentBorder: 'border-amber-500/40',
                description: 'Ideal para operação individual ou inicial.',
            };
    }
};

const PLAN_BENEFITS = [
    'Ordens de Serviço e PDFs personalizados',
    'Financeiro completo e DRE mensal',
    'Gestão de Comissões e Repasses',
    'Isolamento multi-tenant seguro',
];

export const SubscriptionSettings: React.FC = () => {
    const { user } = usePermission();
    const [showCompareModal, setShowCompareModal] = useState(false);

    const plano = user?.empresa?.plano || 'BRONZE';
    const details = getPlanDetails(plano);

    const { data: users } = useQuery({
        queryKey: ['team-users'],
        queryFn: userService.getUsers,
        staleTime: 60_000,
    });

    const userCount = users?.length ?? 0;
    const usagePercent = details.limitNumber
        ? Math.min((userCount / details.limitNumber) * 100, 100)
        : Math.min(Math.max(userCount * 10, 15), 100);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 pb-24">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Link
                    to="/settings"
                    className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-cyber-gold transition-colors"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Configurações</span>
                </Link>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-200 font-medium">Plano &amp; Assinatura</span>
            </div>

            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Plano &amp; Assinatura
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Detalhes do plano atual e recursos disponíveis para a sua empresa.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowCompareModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black font-semibold text-sm transition-all shadow-lg shadow-cyber-gold/15 self-start sm:self-auto whitespace-nowrap"
                >
                    <Shield className="w-4 h-4" />
                    <span>Comparar Planos</span>
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Current Plan Card */}
                <article
                    className={`lg:col-span-5 rounded-2xl bg-gradient-to-b from-cyber-gold/10 to-zinc-900/80 border ${details.accentBorder} p-6 flex flex-col justify-between gap-6 min-w-0`}
                >
                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Plano Atual
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <Check className="w-3 h-3" />
                                Ativo
                            </span>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                            <div
                                className={`w-12 h-12 rounded-2xl border ${details.accentBorder} bg-black/40 flex items-center justify-center shrink-0`}
                            >
                                <Shield className={`w-6 h-6 ${details.accentText}`} />
                            </div>
                            <div className="min-w-0">
                                <p className={`text-3xl font-extrabold uppercase tracking-tight ${details.accentText}`}>
                                    {details.label}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Limite de equipe: {details.limitLabel}
                                </p>
                            </div>
                        </div>

                        <p className="text-sm text-zinc-300 mt-4 leading-relaxed">
                            {details.description}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={() => setShowCompareModal(true)}
                            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 transition-colors"
                        >
                            Ver comparativo de planos
                        </button>
                    </div>
                </article>

                {/* Usage & Benefits Card */}
                <article className="lg:col-span-7 rounded-2xl bg-zinc-900/75 border border-white/10 p-6 flex flex-col justify-between gap-6 min-w-0">
                    <div>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-cyber-gold shrink-0" />
                                <span>Uso da Conta</span>
                            </h2>
                            <span className="text-xs font-semibold text-cyber-gold tabular-nums">
                                {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">
                            Contagem sincronizada com a Gestão de Equipe.
                        </p>

                        <div className="mt-5">
                            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                                <span>Usuários Cadastrados</span>
                                <span className="font-semibold text-white tabular-nums">
                                    {userCount} / {details.limitLabel}
                                </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyber-gold to-amber-400 transition-all duration-500"
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-white/10">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                            Recursos incluídos na plataforma
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {PLAN_BENEFITS.map((benefit) => (
                                <div
                                    key={benefit}
                                    className="flex items-center gap-2 text-xs text-zinc-300"
                                >
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <span>{benefit}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </div>

            {/* Compare Plans Modal */}
            {showCompareModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                    <div className="bg-zinc-950 border border-cyber-gold/35 rounded-t-2xl sm:rounded-2xl w-full max-w-2xl p-5 sm:p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                            <div>
                                <h2 className="text-lg font-bold text-white">Comparativo de Planos</h2>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    Conheça os limites de usuários disponíveis em cada plano.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCompareModal(false)}
                                className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {(['BRONZE', 'PRATA', 'OURO'] as const).map((tier) => {
                                const info = getPlanDetails(tier);
                                const isCurrent = plano === tier;
                                return (
                                    <div
                                        key={tier}
                                        className={`rounded-xl p-4 border ${
                                            isCurrent
                                                ? 'border-cyber-gold bg-cyber-gold/10'
                                                : 'border-white/10 bg-zinc-900/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className={`text-sm font-bold uppercase ${info.accentText}`}>
                                                {info.label}
                                            </h3>
                                            {isCurrent && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyber-gold/20 text-cyber-gold">
                                                    Atual
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-semibold text-white mt-2">
                                            {info.limitLabel}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                                            {info.description}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="text-xs text-zinc-400">
                            Para alterar seu plano, entre em contato com o suporte ou administrador da plataforma.
                        </p>

                        <div className="flex justify-end pt-2 border-t border-white/10">
                            <button
                                type="button"
                                onClick={() => setShowCompareModal(false)}
                                className="px-4 py-2 rounded-xl bg-cyber-gold hover:bg-amber-400 text-black text-xs font-semibold transition-colors"
                            >
                                Entendi
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
