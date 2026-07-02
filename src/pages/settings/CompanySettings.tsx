import React from 'react';
import { Users, Shield, Calculator, Image, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModoComissaoConfig } from '../../components/settings/ModoComissaoConfig';
import { LogoUploadConfig } from '../../components/settings/LogoUploadConfig';
import { BillingConfig } from '../../components/settings/BillingConfig';

export const CompanySettings: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8">
            <div className="border-b border-cyber-gold/20 pb-4">
                <h1 className="text-3xl font-black text-cyber-gold tracking-tighter uppercase glitch">Configurações da Empresa</h1>
                <p className="text-cyber-gold/60 font-mono text-sm mt-2">Gestão de Equipe, Assinatura e Comissões</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Gestão de Equipe */}
                <section className="bg-black/40 border border-cyber-gold/30 p-6 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-cyber-gold/10 rounded-lg border border-cyber-gold/30 text-cyber-gold">
                            <Users size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-cyber-gold uppercase">Sua Equipe</h2>
                    </div>
                    <p className="text-cyber-gold/50 text-sm mb-6">Adicione prestadores, defina perfis (Mecânico, Vendedor) e gerencie acessos.</p>
                    <button
                        onClick={() => navigate('/settings/team')}
                        className="px-4 py-2 bg-cyber-gold/10 border border-cyber-gold text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all font-bold uppercase text-xs tracking-wider cursor-pointer"
                    >
                        Gerenciar Prestadores
                    </button>
                </section>

                {/* Assinatura */}
                <section className="bg-black/40 border border-cyber-gold/30 p-6 relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-cyber-gold/10 rounded-lg border border-cyber-gold/30 text-cyber-gold">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-cyber-gold uppercase">Plano & Assinatura</h2>
                    </div>
                    <div className="mb-6">
                        <div className="text-cyber-gold/40 text-xs uppercase mb-1">Plano Atual</div>
                        <div className="text-2xl font-black text-cyber-gold">OURO <span className="text-xs align-top opacity-50">🏆</span></div>
                    </div>
                    <button
                        onClick={() => navigate('/settings/subscription')}
                        className="px-4 py-2 bg-cyber-gold/10 border border-cyber-gold text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all font-bold uppercase text-xs tracking-wider cursor-pointer"
                    >
                        Ver Detalhes
                    </button>
                </section>
            </div>

            {/* Logo da Empresa */}
            <section className="bg-black/40 border border-cyber-gold/30 p-6 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-cyber-gold/10 rounded-lg border border-cyber-gold/30 text-cyber-gold">
                        <Image size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-cyber-gold uppercase">Logo da Empresa</h2>
                </div>
                <LogoUploadConfig />
            </section>

            {/* Dados da Empresa e Cobrança */}
            <section className="bg-black/40 border border-cyber-gold/30 p-6 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-cyber-gold/10 rounded-lg border border-cyber-gold/30 text-cyber-gold">
                        <CreditCard size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-cyber-gold uppercase">Dados &amp; Cobrança</h2>
                        <p className="text-cyber-gold/50 text-xs mt-1">Dados da empresa, PIX e conta bancária (aparecem no PDF da OS)</p>
                    </div>
                </div>
                <BillingConfig />
            </section>

            {/* Comissão Configuration */}
            <section className="bg-black/40 border border-cyber-gold/30 p-6 relative group overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-cyber-gold/10 rounded-lg border border-cyber-gold/30 text-cyber-gold">
                        <Calculator size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-cyber-gold uppercase">Configuração de Comissão</h2>
                </div>
                <ModoComissaoConfig />
                <div className="mt-4 pt-4 border-t border-cyber-gold/20">
                    <p className="text-cyber-gold/50 text-sm mb-3">Configure as faixas de comissão e regras avançadas.</p>
                    <button
                        onClick={() => navigate('/settings/comissao')}
                        className="px-4 py-2 bg-cyber-gold/10 border border-cyber-gold text-cyber-gold hover:bg-cyber-gold hover:text-black transition-all font-bold uppercase text-xs tracking-wider cursor-pointer"
                    >
                        Gerenciar Regras de Comissão
                    </button>
                </div>
            </section>
        </div>
    );
};
