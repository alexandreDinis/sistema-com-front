import { describe, expect, it } from 'vitest';
import {
    calcularComposicaoReceita,
    calcularMargemLiquida,
    filtrarDespesasPositivas,
    formatCategoriaDespesa,
    parsePeriodoParams,
} from './dreUtils';

describe('dreUtils', () => {
    describe('filtrarDespesasPositivas', () => {
        it('remove categorias zeradas ou negativas e ordena do maior para o menor', () => {
            const resultado = filtrarDespesasPositivas(
                {
                    ALIMENTACAO: 350,
                    MARKETING: 0,
                    OCUPACAO: 2500,
                    COMBUSTIVEL: 1200,
                    OUTROS: 0,
                },
                4050
            );

            expect(resultado).toHaveLength(3);
            expect(resultado[0]).toMatchObject({
                categoria: 'OCUPACAO',
                label: 'Ocupação (Aluguel/Cond)',
                valor: 2500,
            });
            expect(resultado[1]).toMatchObject({
                categoria: 'COMBUSTIVEL',
                label: 'Combustível',
                valor: 1200,
            });
            expect(resultado[2]).toMatchObject({
                categoria: 'ALIMENTACAO',
                label: 'Alimentação',
                valor: 350,
            });
            expect(resultado[0].percentual).toBeCloseTo(61.73, 1);
        });

        it('retorna lista vazia quando todas as despesas estão zeradas ou mapa é nulo', () => {
            expect(filtrarDespesasPositivas({ ALIMENTACAO: 0, OUTROS: 0 }, 0)).toEqual([]);
            expect(filtrarDespesasPositivas(undefined, 0)).toEqual([]);
        });
    });

    describe('parsePeriodoParams', () => {
        const fallback = new Date(2026, 10, 23); // Novembro 2026

        it('aceita ano e mês válidos', () => {
            expect(parsePeriodoParams('2025', '7', fallback)).toEqual({ ano: 2025, mes: 7 });
        });

        it('faz fallback seguro para parâmetros inválidos ou fora do intervalo', () => {
            expect(parsePeriodoParams('abc', '99', fallback)).toEqual({ ano: 2026, mes: 11 });
            expect(parsePeriodoParams('1800', '0', fallback)).toEqual({ ano: 2026, mes: 11 });
            expect(parsePeriodoParams(null, null, fallback)).toEqual({ ano: 2026, mes: 11 });
        });
    });

    describe('calcularMargemLiquida', () => {
        it('calcula margem positiva e negativa corretamente', () => {
            expect(calcularMargemLiquida(10000, 3500)).toBeCloseTo(35, 2);
            expect(calcularMargemLiquida(10000, -1500)).toBeCloseTo(-15, 2);
        });

        it('retorna 0 quando faturamento é zero ou negativo', () => {
            expect(calcularMargemLiquida(0, -500)).toBe(0);
        });
    });

    describe('calcularComposicaoReceita', () => {
        it('calcula percentuais sem ultrapassar 100% em cenário de lucro', () => {
            const comp = calcularComposicaoReceita({
                faturamentoTotal: 10000,
                imposto: 600,
                despesasTotal: 2400,
                comissaoAlocada: 3000,
                lucroLiquido: 4000,
            });

            expect(comp.impostosPct).toBeCloseTo(6, 2);
            expect(comp.despesasPct).toBeCloseTo(24, 2);
            expect(comp.comissoesPct).toBeCloseTo(30, 2);
            expect(comp.lucroPct).toBeCloseTo(40, 2);
        });

        it('zera lucroPct em cenário de prejuízo', () => {
            const comp = calcularComposicaoReceita({
                faturamentoTotal: 5000,
                imposto: 500,
                despesasTotal: 4000,
                comissaoAlocada: 2000,
                lucroLiquido: -1500,
            });

            expect(comp.lucroPct).toBe(0);
        });
    });

    describe('formatCategoriaDespesa', () => {
        it('formata chaves desconhecidas de forma legível', () => {
            expect(formatCategoriaDespesa('NOVA_CATEGORIA_TESTE')).toBe('Nova Categoria Teste');
        });
    });
});
