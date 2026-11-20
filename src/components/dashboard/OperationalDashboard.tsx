import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Wrench,
    Users,
    Plus,
    Activity,
    Search,
    Car,
    Package,
    CheckCircle2,
    ClipboardList,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import { VehicleHistoryModal } from '../modals/VehicleHistoryModal';
import { ActionModal } from '../modals/ActionModal';
import { YoYRevenueWidget } from './YoYRevenueWidget';
import type { ActionModalType } from '../modals/ActionModal';
import { limparPlaca, detectarTipoPlaca } from '../../utils/validators';

export const OperationalDashboard: React.FC = () => {
    const [searchPlate, setSearchPlate] = useState('');
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; placa: string; modelo: string }>({
        isOpen: false,
        placa: '',
        modelo: '',
    });
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: ActionModalType;
    }>({ isOpen: false, title: '', message: '', type: 'info' });
    const [isSearching, setIsSearching] = useState(false);

    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: osService.getDashboardStats,
    });

    const activeOSCount = stats?.activeOsCount || 0;
    const completedMonthCount = stats?.finalizedMonthCount || 0;
    const vehiclesThisMonth = stats?.veiculosMonthCount || 0;
    const partsThisMonth = stats?.pecasMonthCount || 0;

    const mesAtualCurto = new Date().toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const tipoPlacaDetectado = detectarTipoPlaca(searchPlate);

    const handlePlateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        setSearchPlate(cleaned.slice(0, 8));
    };

    const handleQuickSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const placaLimpa = limparPlaca(searchPlate);
        if (placaLimpa.length < 3) return;

        setIsSearching(true);
        try {
            const check = await osService.verificarPlaca(placaLimpa);
            if (check.existe && check.veiculoExistente) {
                setHistoryModal({
                    isOpen: true,
                    placa: placaLimpa,
                    modelo: check.veiculoExistente.modelo,
                });
                setSearchPlate('');
            } else {
                setActionModal({
                    isOpen: true,
                    title: 'Veículo Não Encontrado',
                    message: `A placa ${placaLimpa} não foi encontrada em nossa base de dados.`,
                    type: 'warning',
                });
            }
        } catch {
            setActionModal({
                isOpen: true,
                title: 'Erro na Busca',
                message: 'Não foi possível verificar a placa. Tente novamente.',
                type: 'danger',
            });
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Cabeçalho */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-orbitron font-bold text-white tracking-wide truncate">
                            Painel Operacional
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 hidden sm:block">
                            Visão geral da oficina, consulta de placas e desempenho do mês.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/clientes"
                        className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-gray-200 hover:border-cyber-gold/45 hover:text-cyber-gold transition-colors font-oxanium text-xs sm:text-sm font-semibold"
                    >
                        <Users className="w-4 h-4" />
                        Clientes
                    </Link>
                    <Link
                        to="/os"
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-all font-oxanium text-xs sm:text-sm shadow-lg shadow-cyber-gold/20"
                    >
                        <Plus className="w-4 h-4" />
                        Nova O.S.
                    </Link>
                </div>
            </div>

            {/* Consulta Rápida de Placa (Mercosul e Antiga) */}
            <div className="rounded-2xl bg-gradient-to-br from-[#141928] to-[#0f131d] border border-cyber-gold/35 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                        <Search className="w-4 h-4 text-cyber-gold shrink-0" />
                        Consulta Rápida de Veículo
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Digite a placa (Mercosul ou Antiga) para abrir o histórico de serviços do veículo.
                    </p>
                </div>

                <form
                    onSubmit={handleQuickSearch}
                    className="flex items-center gap-2 w-full lg:w-auto lg:min-w-[380px]"
                >
                    <div className="relative flex-1 min-w-0">
                        <input
                            type="text"
                            value={searchPlate}
                            onChange={handlePlateInputChange}
                            placeholder="ABC1D23 ou ABC-1234"
                            maxLength={8}
                            autoComplete="off"
                            className="w-full bg-[#090c12] border border-white/20 border-l-4 border-l-blue-600 text-white px-3 py-2.5 pr-20 rounded-xl font-mono text-sm sm:text-base font-bold tracking-widest uppercase focus:border-cyber-gold focus:border-l-blue-500 outline-none transition-colors placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-gray-500"
                        />
                        {tipoPlacaDetectado && (
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-oxanium font-bold uppercase bg-white/10 text-cyber-gold">
                                {tipoPlacaDetectado === 'MERCOSUL' ? 'Mercosul' : 'Antiga'}
                            </span>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching || limparPlaca(searchPlate).length < 3}
                        className="px-4 py-2.5 rounded-xl bg-cyber-gold/15 border border-cyber-gold/45 text-cyber-gold hover:bg-cyber-gold hover:text-black disabled:opacity-45 disabled:cursor-not-allowed transition-all font-oxanium text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 shrink-0"
                    >
                        {isSearching ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                        Verificar
                    </button>
                </form>
            </div>

            {/* 4 KPIs Operacionais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Link
                    to="/os"
                    className="min-w-0 overflow-hidden bg-black/45 border border-white/10 hover:border-amber-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors group"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400 truncate">Em Execução</span>
                        <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
                            <Wrench className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-orbitron font-bold text-white tabular-nums">
                            {isLoading ? '—' : activeOSCount}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">Ordens ativas agora</div>
                    </div>
                </Link>

                <Link
                    to="/os"
                    className="min-w-0 overflow-hidden bg-black/45 border border-white/10 hover:border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors group"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400 truncate">Finalizadas</span>
                        <span className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-orbitron font-bold text-white tabular-nums">
                            {isLoading ? '—' : completedMonthCount}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1 capitalize">
                            Concluídas em {mesAtualCurto}
                        </div>
                    </div>
                </Link>

                <div className="min-w-0 overflow-hidden bg-black/45 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400 truncate">Veículos</span>
                        <span className="w-8 h-8 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-orbitron font-bold text-white tabular-nums">
                            {isLoading ? '—' : vehiclesThisMonth}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">Atendidos no mês</div>
                    </div>
                </div>

                <div className="min-w-0 overflow-hidden bg-black/45 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-gray-400 truncate">Peças / Serviços</span>
                        <span className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4" />
                        </span>
                    </div>
                    <div>
                        <div className="text-2xl sm:text-3xl font-orbitron font-bold text-white tabular-nums">
                            {isLoading ? '—' : partsThisMonth}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">Volume no mês</div>
                    </div>
                </div>
            </div>

            {/* Seção Inferior: Comparativo YoY + Acesso Rápido */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-4">
                <YoYRevenueWidget />

                <div className="bg-black/45 border border-white/10 rounded-2xl p-5 min-w-0 overflow-hidden">
                    <h3 className="text-sm font-bold text-white mb-3.5">Acesso Rápido</h3>
                    <div className="space-y-2.5">
                        <Link
                            to="/os"
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyber-gold/40 hover:bg-white/[0.06] transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold flex items-center justify-center shrink-0">
                                    <ClipboardList className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-white truncate">Ordens de Serviço</div>
                                    <div className="text-[11px] text-gray-400 truncate">
                                        Abrir, acompanhar e gerar PDF
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyber-gold shrink-0 transition-colors" />
                        </Link>

                        <Link
                            to="/clientes"
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyber-gold/40 hover:bg-white/[0.06] transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-white truncate">Clientes</div>
                                    <div className="text-[11px] text-gray-400 truncate">
                                        Base de parceiros e particulares
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyber-gold shrink-0 transition-colors" />
                        </Link>

                        <Link
                            to="/catalogo"
                            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-cyber-gold/40 hover:bg-white/[0.06] transition-all group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                                    <Wrench className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-white truncate">Catálogo de Peças</div>
                                    <div className="text-[11px] text-gray-400 truncate">
                                        Serviços e valores padrão
                                    </div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-cyber-gold shrink-0 transition-colors" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Modal: Histórico do Veículo */}
            <VehicleHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal((prev) => ({ ...prev, isOpen: false }))}
                placa={historyModal.placa}
                modelo={historyModal.modelo}
            />

            {/* Modal: Aviso de Não Encontrado / Erro */}
            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal((prev) => ({ ...prev, isOpen: false }))}
                title={actionModal.title}
                message={actionModal.message}
                type={actionModal.type}
                showCancel={false}
                confirmText="OK"
            />
        </div>
    );
};
