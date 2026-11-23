import { describe, expect, it } from 'vitest';
import {
    agruparRecebimentosPorMeio,
    calcularEstimativaDas,
    calcularTicketMedio,
    filterRecebimentosCaixa,
    formatMeioPagamentoLabel,
    type ReceitaCaixaItem,
} from './receitaCaixaUtils';

const MOCK_ITEMS: ReceitaCaixaItem[] = [
    { dataRecebimento: '2026-11-10', valor: 4000, origem: 'OS #142', cliente: 'Auto Prime', meioPagamento: 'PIX' },
    { dataRecebimento: '2026-11-12', valor: 2000, origem: 'OS #143', cliente: 'José Oficina', meioPagamento: 'PIX' },
    { dataRecebimento: '2026-11-15', valor: 3500, origem: 'OS #144', cliente: 'Estrela Motors', meioPagamento: 'CARTAO_CREDITO' },
];

describe('receitaCaixaUtils', () => {
    it('agrupa recebimentos por meio de pagamento ordenados do maior para o menor', () => {
        const res = agruparRecebimentosPorMeio(MOCK_ITEMS);
        expect(res).toHaveLength(2);
        expect(res[0]).toMatchObject({ meio: 'PIX', label: 'PIX', total: 6000, quantidade: 2 });
        expect(res[1]).toMatchObject({
            meio: 'CARTAO_CREDITO',
            label: 'Cartão de Crédito',
            total: 3500,
            quantidade: 1,
        });
    });

    it('filtra por meio de pagamento e busca sem acento', () => {
        expect(filterRecebimentosCaixa(MOCK_ITEMS, 'jose', 'ALL')).toHaveLength(1);
        expect(filterRecebimentosCaixa(MOCK_ITEMS, '', 'PIX')).toHaveLength(2);
        expect(filterRecebimentosCaixa(MOCK_ITEMS, 'estrela', 'PIX')).toHaveLength(0);
    });

    it('calcula ticket médio e estimativa de DAS corretamente', () => {
        expect(calcularTicketMedio(9500, 3)).toBeCloseTo(3166.67, 1);
        expect(calcularTicketMedio(9500, 0)).toBe(0);
        expect(calcularEstimativaDas(22400, 0.06)).toBeCloseTo(1344, 2);
        expect(calcularEstimativaDas(22400, undefined)).toBe(0);
    });

    it('formata rótulos de meio de pagamento', () => {
        expect(formatMeioPagamentoLabel('CARTAO_DEBITO')).toBe('Cartão de Débito');
        expect(formatMeioPagamentoLabel(undefined)).toBe('Não informado');
    });
});
