import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ComissaoDashboard } from '../components/dashboard/ComissaoDashboard';

export const MinhaComissaoPage: React.FC = () => {
    return (
        <div className="pb-16">
            <Link
                to="/relatorio"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-cyber-gold transition-colors font-oxanium text-xs mb-5 font-semibold"
            >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Central
            </Link>
            <ComissaoDashboard />
        </div>
    );
};
