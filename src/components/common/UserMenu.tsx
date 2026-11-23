import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, KeyRound, LogOut, Shield } from 'lucide-react';
import { authService } from '../../services/authService';
import { getRoleBadgeInfo, getUserDisplayName, getUserInitials } from '../../utils/userMenuUtils';

interface UserMenuProps {
    mobile?: boolean;
    onClose?: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ mobile, onClose }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const user = authService.getCurrentUser();

    useEffect(() => {
        if (mobile || !isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [mobile, isOpen]);

    if (!user) return null;

    const displayName = getUserDisplayName(user.name, user.email);
    const initials = getUserInitials(user.name, user.email);
    const roleBadge = getRoleBadgeInfo(user.role);

    const handleLogout = () => {
        setIsOpen(false);
        authService.logout();
        navigate('/login');
        if (onClose) onClose();
    };

    // Expanded view (used inside full-width drawers if requested)
    if (mobile) {
        return (
            <div className="w-full space-y-3">
                <div className="flex items-center gap-3 p-3 bg-[#131826] rounded-xl border border-white/10">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyber-gold/30 to-cyber-gold/10 border border-cyber-gold/40 flex items-center justify-center text-cyber-gold text-sm font-extrabold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-bold truncate">{displayName}</p>
                        <p className="text-gray-400 text-xs truncate">{user.email}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full ${roleBadge.badgeClass}`}>
                                <Shield size={10} />
                                {roleBadge.label}
                            </span>
                            {user.empresa?.nome && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10 rounded-full truncate max-w-[140px]">
                                    <Building2 size={10} />
                                    {user.empresa.nome}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <Link
                        to="/change-password"
                        onClick={onClose}
                        className="flex items-center gap-3 px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-gray-200 hover:text-white hover:border-cyber-gold/40 hover:bg-white/[0.06] transition-colors"
                    >
                        <span className="w-8 h-8 rounded-lg bg-cyber-gold/10 border border-cyber-gold/25 text-cyber-gold flex items-center justify-center shrink-0">
                            <KeyRound size={15} />
                        </span>
                        <div className="min-w-0">
                            <span className="text-xs font-bold block">Alterar Senha</span>
                            <span className="text-[11px] text-gray-500 block">Atualize sua senha de acesso</span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-red-500/5 border border-red-500/20 rounded-xl text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer text-left"
                    >
                        <span className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0">
                            <LogOut size={15} />
                        </span>
                        <div className="min-w-0">
                            <span className="text-xs font-bold block">Sair da Conta</span>
                            <span className="text-[11px] text-red-400/70 block">Encerrar sessão neste dispositivo</span>
                        </div>
                    </button>
                </div>
            </div>
        );
    }

    // Dropdown view (Desktop & Mobile header)
    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-label="Menu do usuário"
                className={`flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    isOpen
                        ? 'bg-white/[0.07] border-cyber-gold/45'
                        : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-cyber-gold/35'
                }`}
            >
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-cyber-gold/30 to-cyber-gold/10 border border-cyber-gold/45 flex items-center justify-center text-cyber-gold text-xs font-extrabold shrink-0">
                    {initials}
                    <span className="absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1019]" />
                </div>

                <div className="hidden lg:flex flex-col items-start text-left leading-tight">
                    <span className="text-xs font-bold text-white truncate max-w-[135px]">
                        {displayName}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${roleBadge.textClass}`}>
                        {roleBadge.label}
                    </span>
                </div>

                <ChevronDown
                    size={14}
                    className={`transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-cyber-gold' : 'text-gray-400'
                    }`}
                />
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full mt-2.5 w-72 bg-[#131826]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl shadow-black/80 z-50 overflow-hidden"
                >
                    {/* User Info Header */}
                    <div className="p-4 bg-gradient-to-br from-cyber-gold/12 via-[#131826] to-[#0f1117] border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyber-gold/30 to-cyber-gold/10 border border-cyber-gold/45 flex items-center justify-center text-cyber-gold text-sm font-extrabold shrink-0">
                                {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-white truncate">{displayName}</p>
                                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full ${roleBadge.badgeClass}`}>
                                <Shield size={10} />
                                {roleBadge.label}
                            </span>
                            {user.empresa?.nome && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-white/5 text-gray-300 border border-white/10 rounded-full truncate max-w-[140px]">
                                    <Building2 size={10} />
                                    {user.empresa.nome}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        <Link
                            role="menuitem"
                            to="/change-password"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-white/[0.06] transition-colors group"
                        >
                            <span className="w-9 h-9 rounded-lg bg-cyber-gold/10 border border-cyber-gold/25 text-cyber-gold flex items-center justify-center shrink-0 group-hover:bg-cyber-gold/15">
                                <KeyRound size={16} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">Alterar Senha</span>
                                    {user.mustChangePassword && (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            Obrigatório
                                        </span>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-400 block">Atualize sua senha de acesso</span>
                            </div>
                        </Link>
                    </div>

                    {/* Logout */}
                    <div className="p-2 border-t border-white/10 bg-black/20">
                        <button
                            role="menuitem"
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl hover:bg-red-500/15 transition-colors cursor-pointer text-left group"
                        >
                            <span className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center shrink-0">
                                <LogOut size={16} />
                            </span>
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-red-300 group-hover:text-red-200 block">
                                    Sair da Conta
                                </span>
                                <span className="text-[11px] text-gray-500 block">
                                    Encerrar sessão neste dispositivo
                                </span>
                            </div>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
