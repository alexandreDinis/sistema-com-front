import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Wrench, Settings, LayoutDashboard, DollarSign, BarChart2 } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { Feature } from '../../types/features';
import { UserMenu } from './UserMenu';
import logo from '../../assets/log.png';

export const AppHeader: React.FC = () => {
    const location = useLocation();
    const { hasFeature } = usePermission();

    const isActive = (path: string) => location.pathname === path;

    const isSectionActive = (paths: string[]) =>
        paths.some((path) => {
            if (location.pathname === path) return true;
            if (path === '/settings' || path === '/financeiro' || path === '/relatorio') {
                return false;
            }
            return location.pathname.startsWith(`${path}/`);
        });

    const allNavGroups = [
        {
            label: 'Operação',
            icon: Wrench,
            items: [
                { label: 'Ordens de Serviço', path: '/os', feature: Feature.OS_READ },
                { label: 'Clientes', path: '/clientes', feature: Feature.CLIENTE_READ },
                { label: 'Catálogo', path: '/catalogo', feature: Feature.PRODUTO_READ },
            ],
        },
        {
            label: 'Financeiro',
            icon: LayoutDashboard,
            items: [
                { label: 'Dashboard', path: '/financeiro', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Gestão de Despesas', path: '/despesa', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Contas a Receber', path: '/financeiro/contas-receber', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Contas a Pagar', path: '/financeiro/contas-pagar', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Cartões Corporativos', path: '/financeiro/cartoes', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Faturas de Cartão', path: '/financeiro/faturas', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
            ],
        },
        {
            label: 'Comissões',
            icon: DollarSign,
            items: [
                { label: 'Minhas Comissões', path: '/minha-comissao', feature: Feature.RELATORIO_COMISSAO_VIEW },
                { label: 'Gestão de Pagamentos', path: '/settings/comissao/pagamentos', feature: Feature.ADMIN_CONFIG },
                { label: 'Regras de Comissão', path: '/settings/comissao', feature: Feature.ADMIN_CONFIG },
            ],
        },
        {
            label: 'Relatórios',
            icon: BarChart2,
            items: [
                { label: 'Hub de Relatórios', path: '/relatorio', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'DRE Mensal', path: '/relatorio/financeiro', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'DRE / Visão Anual', path: '/relatorio/anual', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
                { label: 'Ranking Clientes', path: '/relatorio/ranking', feature: Feature.RELATORIO_FINANCEIRO_VIEW },
            ],
        },
        {
            label: 'Configurações',
            icon: Settings,
            alignRight: true,
            items: [
                { label: 'Administração', path: '/settings', feature: Feature.ADMIN_CONFIG },
                { label: 'Tributação', path: '/settings/tributacao', feature: Feature.ADMIN_CONFIG },
                { label: 'Terceirizados', path: '/settings/prestadores', feature: Feature.ADMIN_CONFIG },
            ],
        },
    ];

    const navGroups = allNavGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => hasFeature(item.feature)),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <header className="bg-[#0d1019]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-3 group shrink-0">
                    <div className="w-10 h-10 rounded-xl border border-cyber-gold/40 bg-cyber-gold/10 overflow-hidden flex items-center justify-center group-hover:border-cyber-gold transition-colors">
                        <img
                            src={logo}
                            alt="Martelinho Digital"
                            className="w-full h-full object-cover scale-125 brightness-110"
                        />
                    </div>
                    <span className="text-sm sm:text-base font-orbitron font-bold tracking-wider text-white">
                        MARTELINHO <span className="text-cyber-gold">DIGITAL</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-1">
                    {hasFeature(Feature.DASHBOARD_VIEW) && (
                        <Link
                            to="/"
                            className={`px-3 py-2 rounded-lg text-xs font-oxanium font-semibold tracking-wide transition-all border ${
                                isActive('/')
                                    ? 'bg-cyber-gold/15 border-cyber-gold/40 text-cyber-gold'
                                    : 'border-transparent text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            Painel
                        </Link>
                    )}

                    {navGroups.map((group) => {
                        const sectionActive = isSectionActive(group.items.map((i) => i.path));
                        return (
                            <div key={group.label} className="relative group/menu">
                                <button
                                    type="button"
                                    className={`px-3 py-2 rounded-lg text-xs font-oxanium font-semibold tracking-wide transition-all inline-flex items-center gap-1.5 border ${
                                        sectionActive
                                            ? 'bg-cyber-gold/15 border-cyber-gold/40 text-cyber-gold'
                                            : 'border-transparent text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <span>{group.label}</span>
                                    <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover/menu:rotate-180 transition-transform duration-150" />
                                </button>

                                {/* Dropdown */}
                                <div
                                    className={`absolute top-full pt-2 w-56 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-150 translate-y-1 group-hover/menu:translate-y-0 z-50 ${
                                        group.alignRight ? 'right-0' : 'left-0'
                                    }`}
                                >
                                    <div className="bg-[#131826]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 shadow-2xl shadow-black/70">
                                        {group.items.map((item) => (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                className={`block px-3 py-2.5 rounded-lg text-xs font-oxanium font-semibold transition-colors ${
                                                    isActive(item.path)
                                                        ? 'bg-cyber-gold/15 text-cyber-gold'
                                                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {item.label}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </nav>

                {/* User Menu (Desktop & Mobile) */}
                <div className="shrink-0">
                    <UserMenu />
                </div>
            </div>
        </header>
    );
};
