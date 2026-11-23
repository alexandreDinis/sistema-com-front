import { describe, expect, it } from 'vitest';
import { mapearErroLogin, normalizarEmailLogin, resolverDestinoPosLogin } from './loginUtils';

describe('loginUtils', () => {
    it('normaliza email removendo espacos nas pontas', () => {
        expect(normalizarEmailLogin('  admin@empresa.com  ')).toBe('admin@empresa.com');
    });

    it('redireciona corretamente conforme perfil e mustChangePassword', () => {
        expect(resolverDestinoPosLogin({ role: 'ADMIN_EMPRESA', mustChangePassword: true })).toBe('/change-password');
        expect(resolverDestinoPosLogin({ role: 'ROLE_ADMIN_EMPRESA', empresa: { nome: 'Loja', plano: 'OURO' } })).toBe('/');
        expect(resolverDestinoPosLogin({ role: 'ROLE_SUPER_ADMIN', empresa: undefined })).toBe('/platform/dashboard');
        expect(resolverDestinoPosLogin({ role: 'SUPER_ADMIN', empresa: { nome: 'Tenant', plano: 'PRATA' } })).toBe('/');
        expect(resolverDestinoPosLogin({ role: 'REVENDEDOR' })).toBe('/platform/dashboard');
    });

    it('mapeia erros HTTP e falhas de rede em mensagens legiveis', () => {
        expect(mapearErroLogin({ response: { status: 401 } })).toContain('inválidos');
        expect(mapearErroLogin({ response: { status: 429 } })).toContain('Muitas tentativas');
        expect(mapearErroLogin({ response: { status: 403 } })).toContain('inativa');
        expect(mapearErroLogin({ response: { status: 500 } })).toContain('servidor');
        expect(mapearErroLogin(new Error('Network Error'))).toContain('conexão');
    });
});
