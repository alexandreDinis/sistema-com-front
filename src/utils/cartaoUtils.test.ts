import { describe, expect, it } from 'vitest';
import type { CartaoCredito, ContaPagar, LimiteDisponivelDTO } from '../types';
import {
    calcularUsoLimite,
    consolidarLimitesCartoes,
    contarFaturasAbertasPorCartao,
    descreverRegraCiclo,
    filtrarCartoesPorBusca,
    validarFormularioCartao,
} from './cartaoUtils';

const makeCartao = (overrides: Partial<CartaoCredito> = {}): CartaoCredito => ({
    id: 1,
    nome: 'Nubank PJ',
    diaFechamento: 25,
    diaVencimento: 5,
    limite: 10000,
    ativo: true,
    ...overrides,
});

describe('cartaoUtils', () => {
    it('descreve corretamente a regra de vencimento no mesmo mes vs mes seguinte', () => {
        const mesSeguinte = descreverRegraCiclo(25, 5);
        expect(mesSeguinte.venceNoMesmoMes).toBe(false);
        expect(mesSeguinte.resumoCurto).toBe('Vence no mês seguinte');

        const mesmoMes = descreverRegraCiclo(10, 20);
        expect(mesmoMes.venceNoMesmoMes).toBe(true);
        expect(mesmoMes.resumoCurto).toBe('Vence no mesmo mês');
    });

    it('calcula percentual e faixa semantica de uso do limite', () => {
        expect(calcularUsoLimite({ limiteTotal: 10000, limiteUtilizado: 4000, limiteDisponivel: 6000 })).toEqual({
            percentual: 40,
            nivel: 'ok',
        });
        expect(calcularUsoLimite({ limiteTotal: 10000, limiteUtilizado: 7500, limiteDisponivel: 2500 })).toEqual({
            percentual: 75,
            nivel: 'warn',
        });
        expect(calcularUsoLimite({ limiteTotal: 10000, limiteUtilizado: 9500, limiteDisponivel: 500 })).toEqual({
            percentual: 95,
            nivel: 'crit',
        });
    });

    it('consolida limites totais ignorando cartoes sem limite definido', () => {
        const cartoes = [
            makeCartao({ id: 1, nome: 'Nubank PJ', limite: 15000 }),
            makeCartao({ id: 2, nome: 'Itau Empresas', limite: 10000 }),
            makeCartao({ id: 3, nome: 'Sem Limite', limite: undefined }),
        ];
        const limites: Record<number, LimiteDisponivelDTO> = {
            1: { limiteTotal: 15000, limiteUtilizado: 5000, limiteDisponivel: 10000 },
            2: { limiteTotal: 10000, limiteUtilizado: 7500, limiteDisponivel: 2500 },
        };

        const resumo = consolidarLimitesCartoes(cartoes, limites);
        expect(resumo.totalCartoes).toBe(3);
        expect(resumo.cartoesComLimite).toBe(2);
        expect(resumo.limiteTotal).toBe(25000);
        expect(resumo.limiteUtilizado).toBe(12500);
        expect(resumo.limiteDisponivel).toBe(12500);
        expect(resumo.percentualGlobal).toBe(50);
    });

    it('filtra cartoes por busca sem diferenciar acentos e conta faturas abertas', () => {
        const cartoes = [
            makeCartao({ id: 1, nome: 'Itaú Business' }),
            makeCartao({ id: 2, nome: 'Nubank PJ' }),
        ];
        expect(filtrarCartoesPorBusca(cartoes, 'itau')).toHaveLength(1);
        expect(filtrarCartoesPorBusca(cartoes, 'itau')[0].id).toBe(1);

        const contas: ContaPagar[] = [
            {
                id: 10,
                descricao: 'Fatura Itaú',
                valor: 500,
                dataCompetencia: '2026-10-10',
                dataVencimento: '2026-10-20',
                status: 'PENDENTE',
                tipo: 'FATURA_CARTAO',
                cartao: cartoes[0],
                dataCriacao: '2026-10-01',
            },
            {
                id: 11,
                descricao: 'Aluguel',
                valor: 2000,
                dataCompetencia: '2026-10-01',
                dataVencimento: '2026-10-05',
                status: 'PENDENTE',
                tipo: 'IMPOSTOS',
                dataCriacao: '2026-10-01',
            },
        ];

        const contagem = contarFaturasAbertasPorCartao(contas);
        expect(contagem.totalAbertas).toBe(1);
        expect(contagem.porCartao[1]).toBe(1);
        expect(contagem.porCartao[2]).toBeUndefined();
    });

    it('valida campos do formulario de cartao', () => {
        expect(validarFormularioCartao({ nome: '   ', diaFechamento: 25, diaVencimento: 5, limite: '' })).toContain('nome');
        expect(validarFormularioCartao({ nome: 'XP', diaFechamento: 0, diaVencimento: 5, limite: '' })).toContain('fechamento');
        expect(validarFormularioCartao({ nome: 'XP', diaFechamento: 25, diaVencimento: 32, limite: '' })).toContain('vencimento');
        expect(validarFormularioCartao({ nome: 'XP', diaFechamento: 25, diaVencimento: 5, limite: '-10' })).toContain('limite');
        expect(validarFormularioCartao({ nome: 'XP', diaFechamento: 25, diaVencimento: 5, limite: '5000' })).toBeNull();
    });
});
