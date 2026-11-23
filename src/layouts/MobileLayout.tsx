import React from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Home, FileText, Users, TrendingDown, DollarSign, Monitor } from 'lucide-react';
import { ExpirationBanner } from '../components/common/ExpirationBanner';
import { UserMenu } from '../components/common/UserMenu';
import { APP_VERSION_LABEL } from '../config/version';
import logo from '../assets/log.png';

// Rotas permitidas no mobile (mesmo que no native app)
export const MOBILE_ALLOWED_ROUTES = [
    '/',
    '/os',
    '/clientes',
    '/despesa',
    '/minha-comissao',
];

// Verifica se uma rota é permitida no mobile
export const isMobileAllowedRoute = (path: string): boolean => {
    if (MOBILE_ALLOWED_ROUTES.includes(path)) return true;
    if (path.startsWith('/os/')) return true;
    if (path.startsWith('/login') || path.startsWith('/change-password')) return true;
    return false;
};

interface TabItem {
    path: string;
    icon: React.ReactNode;
    label: string;
}

const TABS: TabItem[] = [
    { path: '/', icon: <Home size={20} />, label: 'Início' },
    { path: '/os', icon: <FileText size={20} />, label: 'OS' },
    { path: '/clientes', icon: <Users size={20} />, label: 'Clientes' },
    { path: '/despesa', icon: <TrendingDown size={20} />, label: 'Despesas' },
    { path: '/minha-comissao', icon: <DollarSign size={20} />, label: 'Comissões' },
];

export const MobileLayout: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const isTabActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <div className="min-h-screen bg-cyber-bg flex flex-col selection:bg-cyber-gold/30 selection:text-white">
            <ExpirationBanner />

            {/* Header Mobile Moderno com Logo */}
            <header className="bg-[#0d1019]/90 backdrop-blur-md border-b border-white/10 px-4 h-15 sticky top-0 z-40 safe-area-top flex items-center justify-between gap-3">
                <Link to="/" className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl border border-cyber-gold/40 bg-cyber-gold/10 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                            src={logo}
                            alt="Martelinho Digital"
                            className="w-full h-full object-cover scale-125 brightness-110"
                        />
                    </div>
                    <span className="text-sm font-orbitron font-bold tracking-wider text-white truncate">
                        MARTELINHO <span className="text-cyber-gold">DIGITAL</span>
                    </span>
                </Link>

                <div className="shrink-0">
                    <UserMenu />
                </div>
            </header>

            {/* Conteúdo com margens laterais confortáveis */}
            <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24 flex flex-col">
                <div className="flex-1">
                    <Outlet />
                </div>

                {/* Rodapé discreto */}
                <footer className="mt-8 pt-4 border-t border-white/10 flex flex-col items-center gap-1.5 text-center text-[11px] text-gray-500">
                    <span>Powered by Oroboros Technology</span>
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold text-cyber-gold bg-cyber-gold/10 border border-cyber-gold/35">
                        {APP_VERSION_LABEL}
                    </span>
                </footer>
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[#0d1019]/95 backdrop-blur-md border-t border-white/10 safe-area-bottom z-40">
                <div className="flex justify-around items-center h-16">
                    {TABS.map((tab) => {
                        const isActive = isTabActive(tab.path);
                        return (
                            <button
                                key={tab.path}
                                type="button"
                                onClick={() => navigate(tab.path)}
                                className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                                    isActive ? 'text-cyber-gold' : 'text-gray-400 hover:text-white'
                                }`}
                            >
                                {tab.icon}
                                <span className={`text-[10px] mt-1 font-oxanium ${isActive ? 'font-bold' : 'font-medium'}`}>
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <div className="absolute top-0 w-10 h-0.5 rounded-full bg-cyber-gold" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

// Componente para bloquear rotas não permitidas no mobile
export const MobileRouteBlocker: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (!isMobileAllowedRoute(location.pathname)) {
            navigate('/', { replace: true });
        }
    }, [location.pathname, navigate]);

    if (!isMobileAllowedRoute(location.pathname)) {
        return (
            <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
                <div className="bg-[#111520] border border-white/10 rounded-2xl p-6 text-center max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-cyber-gold/10 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center mx-auto mb-4">
                        <Monitor className="w-6 h-6" />
                    </div>
                    <h2 className="text-white font-orbitron font-bold text-base mb-2">
                        Funcionalidade Desktop
                    </h2>
                    <p className="text-gray-400 text-xs mb-5 leading-relaxed">
                        Esta funcionalidade está disponível apenas na versão desktop. Por favor, acesse em um computador.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="bg-cyber-gold text-black font-bold px-5 py-2.5 rounded-xl text-xs font-oxanium hover:bg-yellow-400 transition-colors"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default MobileLayout;
