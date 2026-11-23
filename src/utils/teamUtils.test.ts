import { describe, expect, it } from 'vitest';
import type { User } from '../types';
import {
    countTeamStats,
    filterTeamUsers,
    generateSecureTempPassword,
    getFeatureLabel,
    getUserInitials,
    validateEmployeeForm,
} from './teamUtils';

const MOCK_USERS: User[] = [
    {
        id: 1,
        name: 'Alexandre Dinis',
        email: 'alexandre@empresa.com',
        role: 'ADMIN_EMPRESA',
        active: true,
        participaComissao: false,
    },
    {
        id: 2,
        name: 'Marcos Vinícius',
        email: 'marcos@empresa.com',
        role: 'FUNCIONARIO',
        active: true,
        participaComissao: true,
    },
    {
        id: 3,
        name: 'José Antônio',
        email: 'jose@empresa.com',
        role: 'FUNCIONARIO',
        active: true,
        participaComissao: true,
    },
];

describe('teamUtils', () => {
    it('filtra membros sem sensibilidade a acentos e por cargo', () => {
        expect(filterTeamUsers(MOCK_USERS, 'vinicius', 'ALL')).toHaveLength(1);
        expect(filterTeamUsers(MOCK_USERS, 'jose', 'FUNCIONARIO')).toHaveLength(1);
        expect(filterTeamUsers(MOCK_USERS, '', 'ADMIN_EMPRESA')).toHaveLength(1);
        expect(filterTeamUsers(MOCK_USERS, '', 'FUNCIONARIO')).toHaveLength(2);
    });

    it('calcula estatísticas da equipe corretamente', () => {
        expect(countTeamStats(MOCK_USERS)).toEqual({
            total: 3,
            admins: 1,
            prestadores: 2,
        });
    });

    it('valida formulário de criação e edição de usuário', () => {
        expect(
            validateEmployeeForm({
                isEditing: false,
                name: 'Carlos',
                email: 'carlos@oficina.com',
                password: '123',
            })
        ).toContain('8 caracteres');

        expect(
            validateEmployeeForm({
                isEditing: false,
                name: 'Carlos',
                email: 'invalido',
                password: 'Password1!',
            })
        ).toContain('e-mail');

        expect(
            validateEmployeeForm({
                isEditing: true,
                name: 'Carlos',
                email: '',
                password: '',
            })
        ).toBeNull();
    });

    it('gera senha temporária forte com pelo menos 12 caracteres', () => {
        const pw = generateSecureTempPassword(12);
        expect(pw).toHaveLength(12);
        expect(/[A-Z]/.test(pw)).toBe(true);
        expect(/[a-z]/.test(pw)).toBe(true);
        expect(/[0-9]/.test(pw)).toBe(true);
    });

    it('traduz códigos de permissão e extrai iniciais', () => {
        expect(getFeatureLabel('OS_READ')).toBe('Ver Ordens de Serviço');
        expect(getFeatureLabel('UNKNOWN_PERM')).toBe('UNKNOWN_PERM');
        expect(getUserInitials('Marcos Vinícius')).toBe('MV');
    });
});
