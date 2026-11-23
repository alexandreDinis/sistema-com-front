export interface RoleBadgeInfo {
    label: string;
    badgeClass: string;
    textClass: string;
}

export interface ForcaSenhaInfo {
    score: 0 | 1 | 2 | 3 | 4;
    label: string;
    barClass: string;
    textClass: string;
}

export interface AlterarSenhaInput {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export function getUserDisplayName(name?: string | null, email?: string | null): string {
    const cleanName = name?.trim();
    if (cleanName) return cleanName;

    const cleanEmail = email?.trim();
    if (cleanEmail) {
        const prefix = cleanEmail.split('@')[0]?.trim();
        if (prefix) {
            return prefix.charAt(0).toUpperCase() + prefix.slice(1);
        }
        return cleanEmail;
    }

    return 'Usuário';
}

export function getUserInitials(name?: string | null, email?: string | null): string {
    const cleanName = name?.trim();
    if (cleanName) {
        const parts = cleanName.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return parts[0].slice(0, 2).toUpperCase();
    }

    const cleanEmail = email?.trim();
    if (cleanEmail) {
        return cleanEmail.slice(0, 2).toUpperCase();
    }

    return 'US';
}

export function getRoleBadgeInfo(role?: string | null): RoleBadgeInfo {
    const normalized = role?.toUpperCase().replace(/^ROLE_/, '');
    switch (normalized) {
        case 'SUPER_ADMIN':
        case 'ADMIN_PLATAFORMA':
            return {
                label: 'Admin Plataforma',
                badgeClass: 'text-blue-300 bg-blue-500/15 border-blue-500/30',
                textClass: 'text-blue-400',
            };
        case 'ADMIN':
        case 'ADMIN_EMPRESA':
            return {
                label: 'Administrador',
                badgeClass: 'text-cyber-gold bg-cyber-gold/15 border-cyber-gold/30',
                textClass: 'text-cyber-gold',
            };
        default:
            return {
                label: 'Usuário',
                badgeClass: 'text-gray-300 bg-white/5 border-white/15',
                textClass: 'text-gray-400',
            };
    }
}

export function avaliarForcaSenha(senha: string): ForcaSenhaInfo {
    if (!senha) {
        return {
            score: 0,
            label: 'Digite uma nova senha (mínimo 6 caracteres)',
            barClass: 'bg-white/10',
            textClass: 'text-gray-500',
        };
    }

    let score = 0;
    if (senha.length >= 6) score += 1;
    if (senha.length >= 10) score += 1;
    if (/[A-Z]/.test(senha) && /[0-9]/.test(senha)) score += 1;
    if (/[^A-Za-z0-9]/.test(senha)) score += 1;

    const clamped = Math.max(1, Math.min(4, score)) as 1 | 2 | 3 | 4;

    if (clamped === 1) {
        return { score: 1, label: 'Força da senha: Fraca', barClass: 'bg-red-400', textClass: 'text-red-400' };
    }
    if (clamped === 2) {
        return { score: 2, label: 'Força da senha: Razoável', barClass: 'bg-amber-400', textClass: 'text-amber-400' };
    }
    if (clamped === 3) {
        return { score: 3, label: 'Força da senha: Boa', barClass: 'bg-blue-400', textClass: 'text-blue-400' };
    }
    return { score: 4, label: 'Força da senha: Forte', barClass: 'bg-emerald-400', textClass: 'text-emerald-400' };
}

export function validarAlteracaoSenha(input: AlterarSenhaInput): string | null {
    if (!input.currentPassword) {
        return 'Informe sua senha atual.';
    }
    if (input.newPassword.length < 6) {
        return 'A nova senha deve ter pelo menos 6 caracteres.';
    }
    if (input.newPassword !== input.confirmPassword) {
        return 'A confirmação da nova senha não coincide.';
    }
    if (input.newPassword === input.currentPassword) {
        return 'A nova senha deve ser diferente da senha atual.';
    }
    return null;
}
