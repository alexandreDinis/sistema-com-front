import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Users, Plus, Activity, Search, Car, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import { VehicleHistoryModal } from '../modals/VehicleHistoryModal';
import { ActionModal } from '../modals/ActionModal';
import { PlateInput } from '../forms/PlateInput';
import { YoYRevenueWidget } from './YoYRevenueWidget';
import type { ActionModalType } from '../modals/ActionModal';

import { limparPlaca, validarPlaca } from '../../utils/validators';

export const OperationalDashboard: React.FC = () => {
    const [searchPlate, setSearchPlate] = React.useState('');
    const [historyModal, setHistoryModal] = React.useState<{ isOpen: boolean, placa: string, modelo: string }>({ isOpen: false, placa: '', modelo: '' });
    const [actionModal, setActionModal] = React.useState<{ isOpen: boolean, title: string, message: string, type: ActionModalType }>({ isOpen: false, title: '', message: '', type: 'info' });
    const [isSearching, setIsSearching] = React.useState(false);

    const handleQuickSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. LIMPAR
        const placaLimpa = limparPlaca(searchPlate);
        console.log('🔍 Buscando placa:', placaLimpa);

        if (placaLimpa.length < 3) return;

        // 2. VALIDAR (Aviso não-bloqueante ou apenas informativo)
        if (!validarPlaca(placaLimpa)) {
            // Opção: Logar ou mostrar aviso rápido. Como o modal é bloqueante, 
            // vamos mostrar APENAS se não encontrarmos, ou podemos deixar o fluxo seguir.
            // Se mostrarmos warning agora, e o search for rápido, o warning some.
            // Se demorar, o usuário vê "Formato possivelmente incorreto".
            console.warn(`Placa ${placaLimpa} com formato inválido, mas buscando...`);
        }

        setIsSearching(true);
        try {
            const check = await osService.verificarPlaca(placaLimpa);
            if (check.existe && check.veiculoExistente) {
                setHistoryModal({
                    isOpen: true,
                    placa: placaLimpa,
                    modelo: check.veiculoExistente.modelo
                });
                setSearchPlate('');
            } else {
                setActionModal({
                    isOpen: true,
                    title: 'Veículo Não Encontrado',
                    message: `A placa ${placaLimpa} não foi encontrada em nossa base de dados.`,
                    type: 'warning'
                });
            }
        } catch (error) {
            console.error(error);
            setActionModal({
                isOpen: true,
                title: 'Erro na Busca',
                message: 'Não foi possível verificar a placa. Tente novamente.',
                type: 'danger'
            });
        } finally {
            setIsSearching(false);
        }
    };
    // Fetch stats via React Query from backend endpoint
    const { data: stats, isLoading } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: osService.getDashboardStats
    });

    const activeOSCount = stats?.activeOsCount || 0;
    const completedMonthCount = stats?.finalizedMonthCount || 0;
    const vehiclesThisMonth = stats?.veiculosMonthCount || 0;
    const partsThisMonth = stats?.pecasMonthCount || 0;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {/* Quick Actions Card */}
                <div className="md:col-span-1 hud-card p-6 flex flex-col justify-between group">
                    <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Activity size={20} className="text-cyber-gold" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black italic text-cyber-gold mb-1">AÇÕES RÁPIDAS</h3>
                        <p className="text-[10px] text-cyber-gold/60 font-mono mb-4 uppercase">Iniciar Fluxo Operacional</p>

                        <div className="space-y-3">
                            {/* Quick Search */}
                            <form onSubmit={handleQuickSearch} className="mb-4">
                                <PlateInput
                                    value={searchPlate}
                                    onChange={setSearchPlate}
                                    placeholder="BUSCAR PLACA..."
                                    className="mb-2"
                                />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="w-full bg-cyber-gold/10 border border-cyber-gold/30 text-cyber-gold hover:bg-cyber-gold/20 py-2 rounded font-oxanium text-sm transition-colors flex items-center justify-center gap-2"
                                >
                                    <Search size={16} /> VERIFICAR
                                </button>
                            </form>

                            <Link to="/os" className="w-full text-left hud-button py-3 px-4 text-xs flex items-center gap-2">
                                <Plus size={14} /> NOVA ORDEM DE SERVIÇO
                            </Link>
                            <Link to="/clientes" className="w-full text-left hud-button py-3 px-4 text-xs flex items-center gap-2 border-cyber-gold/30 text-cyber-gold/70 hover:text-cyber-gold">
                                <Users size={14} /> CADASTRAR CLIENTE
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Stats Card - Active OS */}
                <div className="md:col-span-1 hud-card p-6 relative overflow-hidden group">
                    <div className="static-overlay opacity-5"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black italic text-cyber-gold">EM EXECUÇÃO</h3>
                                <p className="text-[10px] text-cyber-gold/60 font-mono uppercase">Ordens de Serviço Ativas</p>
                            </div>
                            <Wrench className="text-cyber-gold animate-pulse" size={24} />
                        </div>

                        <div className="mt-4">
                            <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                                {isLoading ? '-' : activeOSCount}
                            </span>
                            <div className="w-full bg-cyber-gold/10 h-1 mt-2 mb-1">
                                <div className="bg-cyber-gold h-full" style={{ width: `${Math.min(activeOSCount * 10, 100)}%` }}></div>
                            </div>
                            <span className="text-[9px] font-mono text-cyber-gold/50">CAPACIDADE: INDEFINIDA</span>
                        </div>
                    </div>
                </div>

                {/* Stats Card - Monthly Completed */}
                <div className="md:col-span-1 hud-card p-6 relative overflow-hidden">
                    <div className="static-overlay opacity-5"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black italic text-cyber-gold">FINALIZADAS</h3>
                                <p className="text-[10px] text-cyber-gold/60 font-mono uppercase">Este Mês</p>
                            </div>
                            <div className="text-cyber-gold/40 font-mono text-xs border border-cyber-gold/40 px-1">
                                {new Date().toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}
                            </div>
                        </div>

                        <div className="mt-4 text-right">
                            <span className="text-6xl font-black text-white italic tracking-tighter opacity-80">
                                {isLoading ? '-' : completedMonthCount}
                            </span>
                            <p className="text-[10px] text-cyber-gold/40 font-mono mt-1">
                                TAXA DE CONVERSÃO: N/A
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Card - Vehicles Month */}
                <div className="md:col-span-1 hud-card p-6 relative overflow-hidden">
                    <div className="static-overlay opacity-5"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black italic text-cyber-gold">VEÍCULOS</h3>
                                <p className="text-[10px] text-cyber-gold/60 font-mono uppercase">Atendidos no Mês</p>
                            </div>
                            <Car className="text-cyber-gold" size={24} />
                        </div>

                        <div className="mt-4">
                            <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                                {isLoading ? '-' : vehiclesThisMonth}
                            </span>
                            <div className="w-full bg-cyber-gold/10 h-1 mt-2 mb-1">
                                <div className="bg-cyber-gold h-full" style={{ width: `${Math.min(vehiclesThisMonth * 2, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Card - Parts Month */}
                <div className="md:col-span-1 hud-card p-6 relative overflow-hidden">
                    <div className="static-overlay opacity-5"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black italic text-cyber-gold">PEÇAS/SERV.</h3>
                                <p className="text-[10px] text-cyber-gold/60 font-mono uppercase">Volume no Mês</p>
                            </div>
                            <Package className="text-cyber-gold" size={24} />
                        </div>

                        <div className="mt-4">
                            <span className="text-6xl font-black text-white italic tracking-tighter drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]">
                                {isLoading ? '-' : partsThisMonth}
                            </span>
                            <div className="w-full bg-cyber-gold/10 h-1 mt-2 mb-1">
                                <div className="bg-cyber-gold h-full" style={{ width: `${Math.min(partsThisMonth, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* YoY Revenue Widget */}
                <div className="md:col-span-1">
                    <YoYRevenueWidget />
                </div>
            </div>

            {/* Modal: Vehicle History */}
            <VehicleHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
                placa={historyModal.placa}
                modelo={historyModal.modelo}
            />

            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                title={actionModal.title}
                message={actionModal.message}
                type={actionModal.type}
                showCancel={false}
                confirmText="OK"
            />
        </>
    );
};
