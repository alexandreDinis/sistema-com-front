import React from 'react';
import { Outlet } from 'react-router-dom';
import { PlatformHeader } from '../components/common/PlatformHeader';

export const PlatformLayout: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            <PlatformHeader />
            <main className="container mx-auto py-8 flex-1">
                <Outlet />
            </main>
        </div>
    );
};
