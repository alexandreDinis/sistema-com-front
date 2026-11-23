import { describe, expect, it } from 'vitest';
import type { Prestador } from '../types';
import { filterTerceirizados } from './terceirizadosUtils';

const MOCK_LIST: Prestador[] = [
    {
        id: 1,
        nome: 'João Funileiro',
        telefone: '(11) 99811-2233',
        chavePix: '11998112233',
        ativo: true,
    },
    {
        id: 2,
        nome: 'Vidraçaria Central',
        telefone: '(11) 97123-0099',
        chavePix: 'vidros@central.com.br',
        ativo: true,
    },
];

describe('terceirizadosUtils', () => {
    it('filtra por nome sem sensibilidade a acentos', () => {
        expect(filterTerceirizados(MOCK_LIST, 'joao')).toHaveLength(1);
        expect(filterTerceirizados(MOCK_LIST, 'vidracaria')).toHaveLength(1);
    });

    it('filtra por telefone ou chave PIX', () => {
        expect(filterTerceirizados(MOCK_LIST, '99811')).toHaveLength(1);
        expect(filterTerceirizados(MOCK_LIST, 'central.com')).toHaveLength(1);
    });

    it('retorna todos quando busca está vazia', () => {
        expect(filterTerceirizados(MOCK_LIST, '   ')).toHaveLength(2);
    });
});
