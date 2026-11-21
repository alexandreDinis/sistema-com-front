import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { OperationalDashboard } from '../components/dashboard/OperationalDashboard';

export const HomePage: React.FC = () => {
    const { user } = usePermission();

    // Proteção SaaS síncrona para evitar flicker de Super Admin global
    if (user) {
        const role = user.role?.toUpperCase() || '';
        const isPlatformAdmin = (role === 'SUPER_ADMIN' || role === 'ADMIN_PLATAFORMA') && !user.empresa;

        if (isPlatformAdmin) {
            return <Navigate to="/platform/dashboard" replace />;
        }
    }

    return (
        <div className="min-h-[calc(100vh-64px)] py-2 sm:py-4 pb-20 md:pb-8">
            <OperationalDashboard />
        </div>
    );
};
