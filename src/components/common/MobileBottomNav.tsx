import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Users, TrendingDown, DollarSign } from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { Feature } from '../../types/features';

const tabs = [
    { path: '/', label: 'INÍCIO', icon: Home, feature: Feature.DASHBOARD_VIEW },
    { path: '/os', label: 'OS', icon: FileText, feature: Feature.OS_READ },
    { path: '/clientes', label: 'CLIENTES', icon: Users, feature: Feature.CLIENTE_READ },
    { path: '/despesa', label: 'DESPESAS', icon: TrendingDown, feature: Feature.RELATORIO_FINANCEIRO_VIEW },
    { path: '/minha-comissao', label: 'REPASSES', icon: DollarSign, feature: Feature.RELATORIO_COMISSAO_VIEW },
];

export const MobileBottomNav: React.FC = () => {
    const location = useLocation();
    const { hasFeature } = usePermission();

    const visibleTabs = tabs.filter(tab => hasFeature(tab.feature));

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a] border-t border-cyber-gold/30">
            <div className="flex justify-around items-center h-16 px-1">
                {visibleTabs.map(tab => {
                    const isActive = location.pathname === tab.path ||
                        (tab.path !== '/' && location.pathname.startsWith(tab.path));
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`flex flex-col items-center justify-center gap-1 py-2 px-2 min-w-[56px] transition-colors ${isActive
                                    ? 'text-cyber-gold'
                                    : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                            <span className={`text-[9px] tracking-wider font-bold ${isActive ? 'text-cyber-gold' : 'text-gray-500'}`}>
                                {tab.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
            {/* Safe area padding for phones with home indicator */}
            <div className="h-[env(safe-area-inset-bottom)] bg-[#0a0a0a]" />
        </nav>
    );
};
