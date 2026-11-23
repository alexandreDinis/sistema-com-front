import type { UserResponse } from '../types';

export function normalizarEmailLogin(email: string): string {
    return email.trim();
}

/**
 * Regra de redirecionamento pós-login (Two Worlds):
 * - Senha temporária -> /change-password
 * - Perfis de empresa (tenant) -> /
 * - Super Admin global (sem empresa) ou Revendedor/Admin Licença -> /platform/dashboard
 * - Fallback seguro -> /
 */
export function resolverDestinoPosLogin(user: Pick<UserResponse, 'role' | 'empresa' | 'mustChangePassword'>): string {
    if (user.mustChangePassword) {
        return '/change-password';
    }

    const role = user.role ? user.role.toUpperCase().replace(/^ROLE_/, '') : '';

    const isTenantUser =
        role === 'ADMIN_EMPRESA' || role === 'USER' || role === 'TECNICO' || role === 'FINANCEIRO';

    const isPlatformSuperUser = (role === 'SUPER_ADMIN' || role === 'ADMIN_PLATAFORMA') && !user.empresa;
    const isResellerInfo = role === 'ADMIN_LICENCA' || role === 'REVENDEDOR';

    if (isTenantUser) {
        return '/';
    }
    if (isPlatformSuperUser || isResellerInfo) {
        return '/platform/dashboard';
    }
    return '/';
}

export function mapearErroLogin(err: unknown): string {
    const status =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number } }).response?.status === 'number'
            ? (err as { response?: { status?: number } }).response?.status
            : undefined;

    if (status === 401) {
        return 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.';
    }
    if (status === 429) {
        return 'Muitas tentativas de acesso. Aguarde alguns minutos antes de tentar novamente.';
    }
    if (status === 403) {
        return 'Conta inativa ou sem permissão de acesso.';
    }
    if (status !== undefined) {
        return 'Erro ao autenticar no servidor. Tente novamente em instantes.';
    }
    return 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
}
