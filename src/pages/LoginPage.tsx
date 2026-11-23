import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';
import { OuroborosEmblem } from '../components/auth/OuroborosEmblem';

export const LoginPage: React.FC = () => {
    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden"
            style={{
                background:
                    'radial-gradient(circle at 22% 50%, rgba(212, 175, 55, 0.09), transparent 48%), radial-gradient(circle at 82% 20%, rgba(212, 175, 55, 0.05), transparent 40%), #07090e',
            }}
        >
            <div className="w-full max-w-[1080px] lg:min-h-[600px] lg:bg-[#0b0e16]/85 lg:border lg:border-white/10 lg:rounded-3xl lg:shadow-2xl lg:shadow-black/70 overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
                {/* Brand Panel (Desktop) */}
                <section className="hidden lg:flex lg:col-span-6 flex-col justify-between p-10 border-r border-white/10 bg-gradient-to-br from-cyber-gold/[0.06] via-[#0b0e16]/90 to-[#07090e]">
                    <div>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-cyber-gold bg-cyber-gold/10 border border-cyber-gold/30">
                            Oroboros Technology
                        </span>
                    </div>

                    <div className="flex flex-col items-center text-center my-6">
                        <OuroborosEmblem size="lg" />
                        <h1 className="mt-5 text-2xl font-orbitron font-extrabold tracking-wider text-white">
                            MARTELINHO <span className="text-cyber-gold">DIGITAL</span>
                        </h1>
                        <p className="mt-2.5 text-sm text-gray-400 max-w-sm leading-relaxed">
                            Ciclo contínuo de gestão operacional, comissões e controle financeiro em um só lugar.
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                        <div className="bg-white/[0.025] border border-white/10 rounded-xl p-3">
                            <strong className="block text-xs text-white font-bold">Operação & OS</strong>
                            <span className="text-[11px] text-gray-500">Fluxo completo</span>
                        </div>
                        <div className="bg-white/[0.025] border border-white/10 rounded-xl p-3">
                            <strong className="block text-xs text-white font-bold">Financeiro</strong>
                            <span className="text-[11px] text-gray-500">Caixa, DRE e faturas</span>
                        </div>
                        <div className="bg-white/[0.025] border border-white/10 rounded-xl p-3">
                            <strong className="block text-xs text-white font-bold">Comissões</strong>
                            <span className="text-[11px] text-gray-500">Cálculo transparente</span>
                        </div>
                    </div>
                </section>

                {/* Form Panel */}
                <section className="lg:col-span-6 flex items-center justify-center p-2 sm:p-6 lg:p-10">
                    <LoginForm />
                </section>
            </div>
        </div>
    );
};
