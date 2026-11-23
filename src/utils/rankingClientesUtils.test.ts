import { describe, expect, it } from 'vitest';
import type { RankingCliente } from '../types';
import {
    calcularParticipacaoCliente,
    calcularResumoRanking,
    calcularTicketMedio,
    filtrarEOrdenarRanking,
} from './rankingClientesUtils';

const clientesMock: RankingCliente[] = [
    { clienteId: 1, nomeFantasia: 'AutoPrime Brasília', quantidadeOS: 10, valorTotal: 10000 },
    { clienteId: 2, nomeFantasia: 'Locadora Velocity', quantidadeOS: 20, valorTotal: 6000 },
    { clienteId: 3, nomeFantasia: 'Seminovos Central', quantidadeOS: 2, valorTotal: 4000 },
    { clienteId: 4, nomeFantasia: 'Oficina Express', quantidadeOS: 8, valorTotal: 5000 },
];

describe('rankingClientesUtils', () => {
    it('calcula resumo consolidado, ticket medio e concentracao Top 3', () => {
        const resumo = calcularResumoRanking(clientesMock);
        expect(resumo.faturamentoTotal).toBe(25000);
        expect(resumo.totalClientes).toBe(4);
        expect(resumo.totalOS).toBe(40);
        expect(resumo.ticketMedioOS).toBe(625);
        expect(resumo.ticketMedioCliente).toBe(6250);
        // Top 3 por valor: 10000 + 6000 + 5000 = 21000 (84% de 25000)
        expect(resumo.top3Valor).toBe(21000);
        expect(resumo.concentracaoTop3).toBe(84);
    });

    it('filtra por busca sem acento e ordena por faturamento, OS e ticket medio', () => {
        const busca = filtrarEOrdenarRanking(clientesMock, 'brasilia', 'VALOR');
        expect(busca).toHaveLength(1);
        expect(busca[0].clienteId).toBe(1);

        const porOs = filtrarEOrdenarRanking(clientesMock, '', 'OS');
        expect(porOs[0].clienteId).toBe(2);

        const porTicket = filtrarEOrdenarRanking(clientesMock, '', 'TICKET');
        expect(porTicket[0].clienteId).toBe(3); // 4000 / 2 = 2000
    });

    it('trata divisao por zero no ticket medio e participacao', () => {
        expect(calcularTicketMedio({ valorTotal: 1000, quantidadeOS: 0 })).toBe(0);
        expect(calcularParticipacaoCliente(500, 0)).toBe(0);
        expect(calcularParticipacaoCliente(500, 2000)).toBe(25);
    });
});
