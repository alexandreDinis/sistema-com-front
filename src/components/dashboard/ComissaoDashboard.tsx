import React, { useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    DollarSign,
    ShieldOff,
    AlertCircle,
    CalendarX2,
} from 'lucide-react';
import { useComissao } from '../../hooks/useComissao';
import { usePermission } from '../../hooks/usePermission';
import { ComissaoCard } from './ComissaoCard';

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

interface ApiErrorLike {
    message?: string;
    response?: {
        status?: number;
        data?: {
            message?: string;
            mensagem?: string;
        };
    };
}

export const ComissaoDashboard: React.FC = () => {
    const today = new Date();
    const [ano, setAno] = useState(today.getFullYear());
    const [mes, setMes] = useState(today.getMonth() + 1);

    const { user } = usePermission();
    const participaComissao = user?.participaComissao !== false;

    const { comissao, isLoading, error, forceSync } = useComissao(ano, mes, {
        enabled: participaComissao,
    });

    const apiError = error as ApiErrorLike | null;
    const isNaoHabilitado = !participaComissao || apiError?.response?.status === 400;
    const periodoLabel = `${MESES_PT[mes - 1]} ${ano}`;

    const handlePreviousMonth = () => {
        if (mes === 1) {
            setMes(12);
            setAno((prev) => prev - 1);
        } else {
            setMes((prev) => prev - 1);
        }
    };

    const handleNextMonth = () => {
        if (mes === 12) {
            setMes(1);
            setAno((prev) => prev + 1);
        } else {
            setMes((prev) => prev + 1);
        }
    };

    const handleRefresh = async () => {
        await forceSync();
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide">
                            Minha Comissão
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Faturamento do período, faixa aplicada, adiantamentos e saldo líquido.
                        </p>
                    </div>
                </div>

                {/* Controles de período */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-between flex-1 sm:flex-initial bg-black/50 border border-white/10 rounded-xl p-1">
                        <button
                            type="button"
                            onClick={handlePreviousMonth}
                            aria-label="Mês anterior"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span
                            id="mes-ano-label"
                            className="px-3 sm:px-5 text-sm font-oxanium font-bold text-white text-center min-w-[140px]"
                        >
                            {periodoLabel}
                        </span>
                        <button
                            type="button"
                            onClick={handleNextMonth}
                            aria-label="Próximo mês"
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={isLoading || !participaComissao}
                        title="Atualizar cálculo"
                        className="h-11 px-3.5 rounded-xl bg-black/50 border border-white/10 text-gray-300 hover:text-cyber-gold hover:border-cyber-gold/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2 text-xs font-oxanium font-semibold"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyber-gold' : ''}`} />
                        <span className="hidden sm:inline">Atualizar</span>
                    </button>
                </div>
            </div>

            {/* Estados */}
            {isNaoHabilitado ? (
                <div className="rounded-2xl bg-black/45 border border-white/10 p-8 sm:p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-gray-400 flex items-center justify-center mx-auto mb-4">
                        <ShieldOff className="w-6 h-6" />
                    </div>
                    <h2 className="text-base sm:text-lg font-orbitron font-bold text-white mb-2">
                        Comissionamento não habilitado para este perfil
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                        Seu perfil está configurado apenas para gestão e não participa do cálculo automático de
                        comissões sobre vendas.
                    </p>
                </div>
            ) : error ? (
                <div className="rounded-2xl bg-red-500/10 border border-red-500/35 p-5 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-red-300">Não foi possível carregar sua comissão</h3>
                        <p className="text-xs text-red-200/80 mt-1">
                            {apiError?.response?.data?.message ||
                                apiError?.response?.data?.mensagem ||
                                apiError?.message ||
                                'Tente atualizar novamente em alguns instantes.'}
                        </p>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="space-y-4">
                    <div className="h-44 rounded-2xl bg-black/40 border border-white/10 animate-pulse" />
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className="h-24 rounded-xl bg-black/40 border border-white/10 animate-pulse"
                            />
                        ))}
                    </div>
                </div>
            ) : comissao ? (
                <ComissaoCard comissao={comissao} periodoLabel={periodoLabel} />
            ) : (
                <div className="rounded-2xl bg-black/40 border border-white/10 p-10 text-center">
                    <CalendarX2 className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                    <h3 className="text-sm sm:text-base font-bold text-white">
                        Nenhuma comissão calculada em {periodoLabel}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-sm mx-auto">
                        Assim que houver ordens de serviço faturadas nesse período, o demonstrativo aparecerá aqui.
                    </p>
                </div>
            )}
        </div>
    );
};
