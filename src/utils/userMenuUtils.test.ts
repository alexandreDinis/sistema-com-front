import { describe, expect, it } from 'vitest';
import {
    avaliarForcaSenha,
    getRoleBadgeInfo,
    getUserDisplayName,
    getUserInitials,
    validarAlteracaoSenha,
} from './userMenuUtils';

describe('userMenuUtils', () => {
    it('gera nome de exibicao e iniciais corretamente', () => {
        expect(getUserDisplayName('Dinis Silva', 'dinis@empresa.com')).toBe('Dinis Silva');
        expect(getUserInitials('Dinis Silva', 'dinis@empresa.com')).toBe('DS');

        expect(getUserDisplayName('', 'carlos@empresa.com')).toBe('Carlos');
        expect(getUserInitials('', 'carlos@empresa.com')).toBe('CA');
    });

    it('mapeia perfis de acesso para labels legiveis', () => {
        expect(getRoleBadgeInfo('ROLE_ADMIN_EMPRESA').label).toBe('Administrador');
        expect(getRoleBadgeInfo('SUPER_ADMIN').label).toBe('Admin Plataforma');
        expect(getRoleBadgeInfo('FUNCIONARIO').label).toBe('Usuário');
    });

    it('avalia forca da senha em 4 niveis', () => {
        expect(avaliarForcaSenha('').score).toBe(0);
        expect(avaliarForcaSenha('123456').score).toBe(1);
        expect(avaliarForcaSenha('minhasenha12').score).toBe(2);
        expect(avaliarForcaSenha('MinhaSenha12').score).toBe(3);
        expect(avaliarForcaSenha('MinhaSenha12!').score).toBe(4);
    });

    it('valida regras de alteracao de senha', () => {
        expect(
            validarAlteracaoSenha({ currentPassword: '', newPassword: 'abcdef', confirmPassword: 'abcdef' })
        ).toContain('atual');
        expect(
            validarAlteracaoSenha({ currentPassword: '123456', newPassword: '123', confirmPassword: '123' })
        ).toContain('6 caracteres');
        expect(
            validarAlteracaoSenha({ currentPassword: '123456', newPassword: 'abcdef', confirmPassword: 'abcdeg' })
        ).toContain('coincide');
        expect(
            validarAlteracaoSenha({ currentPassword: 'abcdef', newPassword: 'abcdef', confirmPassword: 'abcdef' })
        ).toContain('diferente');
        expect(
            validarAlteracaoSenha({ currentPassword: 'abcdef', newPassword: 'novaSenha1!', confirmPassword: 'novaSenha1!' })
        ).toBeNull();
    });
});
