import { describe, it, expect } from 'vitest';
import {
    calcularResumoDespesas,
    extrairMesesDisponiveis,
    filtrarEOrdenarDespesas,
    formatarMesAno,
    type FiltrosDespesa,
} from './despesaFilters';
import type { Despesa } from '../types';

const mockDespesas: Despesa[] = [
    {
        id: 10,
        dataDespesa: '2027-03-10', // Parcela futura
        valor: 200,
        categoria: 'MATERIAIS_APLICADOS',
        descricao: 'Insumos - Parcela 5/6',
        dataCriacao: '2026-11-01T10:00:00',
        cartao: { id: 1, nome: 'Itaú Black', diaVencimento: 5, diaFechamento: 20, ativo: true },
    },
    {
        id: 11,
        dataDespesa: '2026-11-19', // Lançamento feito hoje
        valor: 1000,
        categoria: 'DIVERSOS',
        descricao: 'Compra Ferramenta',
        dataCriacao: '2026-11-19T18:00:00',
        cartao: { id: 1, nome: 'Itaú Black', diaVencimento: 5, diaFechamento: 20, ativo: true },
    },
    {
        id: 12,
        dataDespesa: '2026-11-05',
        valor: 650,
        categoria: 'UTILIDADES',
        descricao: 'Conta de Luz',
        dataCriacao: '2026-11-05T09:00:00',
    },
];

const filtrosBase: FiltrosDespesa = {
    tipo: 'TODOS',
    busca: '',
    mesAno: 'TODOS',
    cartaoId: 'TODOS',
    categoria: 'TODOS',
    ordem: 'CRIACAO_DESC',
};

describe('despesaFilters', () => {
    it('deve colocar lançamento recém-criado no topo na ordenação CRIACAO_DESC mesmo havendo parcela futura', () => {
        const resultado = filtrarEOrdenarDespesas(mockDespesas, filtrosBase);
        expect(resultado.map((d) => d.id)).toEqual([11, 12, 10]);
    });

    it('deve filtrar apenas despesas de cartão de crédito', () => {
        const resultado = filtrarEOrdenarDespesas(mockDespesas, { ...filtrosBase, tipo: 'CARTAO' });
        expect(resultado).toHaveLength(2);
        expect(resultado.every((d) => Boolean(d.cartao))).toBe(true);
    });

    it('deve filtrar por mês/ano e busca textual', () => {
        const resultado = filtrarEOrdenarDespesas(mockDespesas, {
            ...filtrosBase,
            mesAno: '2026-11',
            busca: 'ferramenta',
        });
        expect(resultado).toHaveLength(1);
        expect(resultado[0].id).toBe(11);
    });

    it('deve calcular KPIs de resumo corretamente', () => {
        const resumo = calcularResumoDespesas(mockDespesas);
        expect(resumo).toEqual({
            total: 1850,
            count: 3,
            totalCartao: 1200,
            countCartao: 2,
            totalComum: 650,
            countComum: 1,
        });
    });

    it('deve extrair meses únicos ordenados decrescentemente e formatar mês/ano', () => {
        const meses = extrairMesesDisponiveis(mockDespesas, '2026-11');
        expect(meses).toEqual(['2027-03', '2026-11']);
        expect(formatarMesAno('2026-11')).toBe('Nov/2026');
    });
});
