import { describe, it, expect } from 'vitest';
import { calcularDataPorPrazo, filtrarCatalogo, filtrarClientesPorBusca, formatarStatusOS, ajustarValorCobrado } from './osUtils';
import type { Cliente, TipoPeca } from '../types';

const clientesMock: Cliente[] = [
    {
        id: 1,
        razaoSocial: 'Auto Premium Comércio LTDA',
        nomeFantasia: 'Auto Premium Motors',
        cnpj: '12.345.678/0001-90',
    } as Cliente,
    {
        id: 2,
        razaoSocial: 'Estrela Veículos S/A',
        nomeFantasia: 'Concessionária Estrela',
        cnpj: '98765432000111',
    } as Cliente,
];

describe('osUtils', () => {
    it('calcula data de vencimento corretamente virando mês e ano', () => {
        expect(calcularDataPorPrazo('2026-11-20', 0)).toBe('2026-11-20');
        expect(calcularDataPorPrazo('2026-11-20', 15)).toBe('2026-12-05');
        expect(calcularDataPorPrazo('2026-12-20', 30)).toBe('2027-01-19');
    });

    it('filtra clientes por nome fantasia, razão social e CNPJ sem máscara', () => {
        expect(filtrarClientesPorBusca(clientesMock, 'premium')).toHaveLength(1);
        expect(filtrarClientesPorBusca(clientesMock, 'Veículos S/A')).toHaveLength(1);
        expect(filtrarClientesPorBusca(clientesMock, '12345678')).toHaveLength(1);
        expect(filtrarClientesPorBusca(clientesMock, '98.765.432')).toHaveLength(1);
        expect(filtrarClientesPorBusca(clientesMock, '')).toHaveLength(2);
    });

    it('formata status da OS de forma legível', () => {
        expect(formatarStatusOS('ABERTA')).toBe('Aberta');
        expect(formatarStatusOS('EM_EXECUCAO')).toBe('Em execução');
        expect(formatarStatusOS('FINALIZADA')).toBe('Finalizada');
        expect(formatarStatusOS('CANCELADA')).toBe('Cancelada');
    });

    it('filtra catálogo ignorando acentos, hífens e espaços', () => {
        const catalogoMock: TipoPeca[] = [
            { id: 1, nome: 'Capô Dianteiro', valorPadrao: 400 },
            { id: 2, nome: 'Para-lama Traseiro Direito', valorPadrao: 320 },
            { id: 3, nome: 'Teto — Chuva de Granizo', valorPadrao: 1200 },
        ];
        expect(filtrarCatalogo(catalogoMock, 'capo')).toHaveLength(1);
        expect(filtrarCatalogo(catalogoMock, 'paralama')).toHaveLength(1);
        expect(filtrarCatalogo(catalogoMock, 'para lama')).toHaveLength(1);
        expect(filtrarCatalogo(catalogoMock, 'granizo')[0].valorPadrao).toBe(1200);
    });

    it('ajusta valor cobrado em passos positivos e negativos sem ficar negativo', () => {
        expect(ajustarValorCobrado('350.00', 50)).toBe('400.00');
        expect(ajustarValorCobrado('350.00', -25)).toBe('325.00');
        expect(ajustarValorCobrado('20.00', -50)).toBe('0.00');
        expect(ajustarValorCobrado('', 50)).toBe('50.00');
    });
});
