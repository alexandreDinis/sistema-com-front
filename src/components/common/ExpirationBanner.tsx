import React, { useState, useEffect } from 'react';
import { AlertCircle, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/userService';

export const ExpirationBanner: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [daysLeft, setDaysLeft] = useState<number | undefined>(undefined);

    const { data: userProfile } = useQuery({
        queryKey: ['user-me'],
        queryFn: userService.getMe,
        refetchInterval: 1000 * 60 * 60 * 2, // A cada 2 horas
        staleTime: 1000 * 60 * 30, // 30 minutos
    });

    useEffect(() => {
        // Só exibir para ADMIN_EMPRESA — nunca para SUPER_ADMIN, REVENDEDOR ou FUNCIONARIO
        if (!userProfile || userProfile.role !== 'ADMIN_EMPRESA') {
            setIsVisible(false);
            setDaysLeft(undefined);
            return;
        }

        if (userProfile.diasParaVencimento !== undefined && userProfile.diasParaVencimento !== null) {
            const dias = userProfile.diasParaVencimento;
            // Mostrar apenas se faltam 5 dias ou menos (spec: <= 5)
            if (dias >= 0 && dias <= 5) {
                setDaysLeft(dias);
                
                // Check if already dismissed in this session FOR THIS SPECIFIC NUMBER OF DAYS
                const dismissedDays = sessionStorage.getItem('expiration_banner_dismissed_days');
                if (dismissedDays !== dias.toString()) {
                    setIsVisible(true);
                }
            } else {
                setIsVisible(false);
                setDaysLeft(undefined);
            }
        } else {
            // Sem fatura pendente próxima — esconder banner
            setIsVisible(false);
            setDaysLeft(undefined);
        }
    }, [userProfile]);

    const handleDismiss = () => {
        setIsVisible(false);
        if (daysLeft !== undefined) {
            sessionStorage.setItem('expiration_banner_dismissed_days', daysLeft.toString());
        }
    };

    if (!isVisible || daysLeft === undefined) return null;

    // Cores dinâmicas conforme urgência
    const isUrgent = daysLeft <= 2;
    const bannerGradient = isUrgent
        ? 'from-red-600 to-red-700'       // Vermelho: <= 2 dias
        : 'from-amber-500 to-orange-500';  // Amarelo: 3-5 dias

    const getMessage = () => {
        if (daysLeft === 0) return "Seu plano vence HOJE! Regularize seu pagamento para evitar bloqueio.";
        if (daysLeft === 1) return "Seu plano vence AMANHÃ! Regularize seu pagamento para evitar bloqueio.";
        return `Seu plano vence em ${daysLeft} dias. Regularize seu pagamento para evitar bloqueio.`;
    };

    return (
        <div className={`bg-gradient-to-r ${bannerGradient} text-white py-3 px-4 shadow-lg border-b border-white/10 animate-pulse-subtle z-70 relative`}>
            <div className="container mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-full shrink-0">
                        <AlertCircle size={20} className="text-white" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                        <p className="font-bold text-sm md:text-base leading-tight">
                            {getMessage()}
                        </p>
                        <Link 
                            to="/settings/subscription" 
                            className="text-xs md:text-sm font-medium underline underline-offset-4 decoration-white/50 hover:decoration-white flex items-center gap-1 transition-all"
                        >
                            Ver detalhes do pagamento <ExternalLink size={14} />
                        </Link>
                    </div>
                </div>
                
                <button 
                    onClick={handleDismiss}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors shrink-0 outline-none focus:ring-2 focus:ring-white/20"
                    title="Fechar aviso por agora"
                >
                    <X size={20} />
                </button>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.95; }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}} />
        </div>
    );
};
