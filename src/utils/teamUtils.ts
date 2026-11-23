import { AVAILABLE_FEATURES } from '../config/permissions';
import type { User } from '../types';

export type TeamRoleFilter = 'ALL' | 'ADMIN_EMPRESA' | 'FUNCIONARIO';

const FEATURE_LABEL_MAP: Record<string, string> = Object.fromEntries(
    AVAILABLE_FEATURES.map((f) => [f.key, f.label])
);

export function normalizeSearchText(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

export function getFeatureLabel(featureCode: string): string {
    return FEATURE_LABEL_MAP[featureCode] || featureCode;
}

export function getUserInitials(name?: string, email?: string): string {
    const source = (name || email?.split('@')[0] || 'US').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
}

export function filterTeamUsers(
    users: User[] | undefined,
    searchTerm: string,
    roleFilter: TeamRoleFilter
): User[] {
    if (!users) return [];
    const normalizedQuery = normalizeSearchText(searchTerm);

    return users.filter((u) => {
        const isAdmin = u.role === 'ADMIN_EMPRESA';
        const matchesRole =
            roleFilter === 'ALL' ||
            (roleFilter === 'ADMIN_EMPRESA' && isAdmin) ||
            (roleFilter === 'FUNCIONARIO' && !isAdmin);

        if (!matchesRole) return false;
        if (!normalizedQuery) return true;

        const nameNorm = normalizeSearchText(u.name || '');
        const emailNorm = normalizeSearchText(u.email || '');
        return nameNorm.includes(normalizedQuery) || emailNorm.includes(normalizedQuery);
    });
}

export function countTeamStats(users: User[] | undefined): {
    total: number;
    admins: number;
    prestadores: number;
} {
    if (!users) return { total: 0, admins: 0, prestadores: 0 };
    const admins = users.filter((u) => u.role === 'ADMIN_EMPRESA').length;
    return {
        total: users.length,
        admins,
        prestadores: users.length - admins,
    };
}

export function validateEmployeeForm(params: {
    isEditing: boolean;
    name: string;
    email: string;
    password: string;
}): string | null {
    if (!params.name.trim()) {
        return 'Informe o nome completo do usuário.';
    }
    if (!params.isEditing) {
        const emailTrimmed = params.email.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
            return 'Informe um e-mail válido.';
        }
        if (params.password.length < 8) {
            return 'A senha temporária deve ter pelo menos 8 caracteres.';
        }
    }
    return null;
}

export function generateSecureTempPassword(length = 12): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&*';
    const all = upper + lower + digits + symbols;

    const getRandomIndex = (max: number) => {
        if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
            const arr = new Uint32Array(1);
            globalThis.crypto.getRandomValues(arr);
            return arr[0] % max;
        }
        return Math.floor(Math.random() * max);
    };

    const required = [
        upper[getRandomIndex(upper.length)],
        lower[getRandomIndex(lower.length)],
        digits[getRandomIndex(digits.length)],
        symbols[getRandomIndex(symbols.length)],
    ];

    const chars = [...required];
    while (chars.length < Math.max(length, 8)) {
        chars.push(all[getRandomIndex(all.length)]);
    }

    for (let i = chars.length - 1; i > 0; i--) {
        const j = getRandomIndex(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
}
