import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/common/AppHeader';
import { MobileBottomNav } from '../components/common/MobileBottomNav';
import { ExpirationBanner } from '../components/common/ExpirationBanner';

export const AppLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-cyber-bg relative selection:bg-cyber-gold/30 selection:text-white flex flex-col">
            <ExpirationBanner />
            <AppHeader />

            <main className="container mx-auto px-4 py-4 md:py-8 flex-1 relative">
                <Outlet />
            </main>

            <footer className="border-t border-white/10 bg-[#0a0d14]/80 mt-auto pb-20 md:pb-4">
                <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-400">Martelinho Digital</span>
                    <div className="flex items-center gap-2.5">
                        <span>Powered by Oroboros Technology</span>
                        <span className="px-2 py-0.5 rounded-full font-mono text-[11px] font-bold text-cyber-gold bg-cyber-gold/10 border border-cyber-gold/35">
                            v2.1.1
                        </span>
                    </div>
                </div>
            </footer>

            <MobileBottomNav />
        </div>
    );
};
