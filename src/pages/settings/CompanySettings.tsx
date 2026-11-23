import React, { useState } from 'react';
import {
    Calculator,
    Check,
    ChevronRight,
    CreditCard,
    Image,
    Percent,
    Shield,
    Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModoComissaoConfig } from '../../components/settings/ModoComissaoConfig';
import { LogoUploadConfig } from '../../components/settings/LogoUploadConfig';
import { BillingConfig } from '../../components/settings/BillingConfig';

type SettingsTab = 'dados' | 'logo' | 'comissao';

export const CompanySettings: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<SettingsTab>('dados');

    const quickLinks = [
        {
            title: 'Sua Equipe',
            description: 'Prestadores, perfis e acessos',
            icon: Users,
            path: '/settings/team',
        },
        {
            title: 'Plano & Assinatura',
            description: 'Detalhes do plano e faturas',
            icon: Shield,
            path: '/settings/subscription',
        },
        {
            title: 'Regras de Comissão',
            description: 'Faixas e percentuais de repasse',
            icon: Calculator,
            path: '/settings/comissao',
        },
        {
            title: 'Tributação',
            description: 'Regime e alíquota de imposto',
            icon: Percent,
            path: '/settings/tributacao',
        },
    ];

    const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
        { id: 'dados', label: 'Dados & Cobrança', icon: CreditCard },
        { id: 'logo', label: 'Identidade & Logo', icon: Image },
        { id: 'comissao', label: 'Modo de Comissão', icon: Users },
    ];

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-white/10">
                <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                        Configurações da Empresa
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Identidade visual, dados cadastrais, cobrança no PDF e exibição de comissões.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 self-start sm:self-auto whitespace-nowrap">
                    <Check className="w-3.5 h-3.5" />
                    Conta Ativa
                </span>
            </header>

            {/* Quick Access Shortcuts */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {quickLinks.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => navigate(item.path)}
                            className="group text-left rounded-2xl bg-zinc-900/75 border border-white/10 hover:border-cyber-gold/40 p-4 transition-all min-w-0 overflow-hidden flex flex-col justify-between gap-3"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="w-9 h-9 rounded-xl bg-cyber-gold/10 border border-cyber-gold/20 text-cyber-gold flex items-center justify-center shrink-0">
                                    <Icon className="w-4 h-4" />
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyber-gold group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-sm font-semibold text-white truncate">
                                    {item.title}
                                </h2>
                                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                                    {item.description}
                                </p>
                            </div>
                        </button>
                    );
                })}
            </section>

            {/* Navigation Tabs */}
            <nav
                className="flex items-center gap-1.5 p-1.5 rounded-xl bg-zinc-900/80 border border-white/10 overflow-x-auto"
                role="tablist"
                aria-label="Seções de configuração da empresa"
            >
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 min-w-fit inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/35'
                                    : 'text-zinc-400 hover:text-white border border-transparent'
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Tab Content */}
            <section role="tabpanel">
                {activeTab === 'dados' && <BillingConfig />}
                {activeTab === 'logo' && <LogoUploadConfig />}
                {activeTab === 'comissao' && <ModoComissaoConfig />}
            </section>
        </div>
    );
};
