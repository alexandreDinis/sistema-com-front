import { describe, expect, it } from 'vitest';
import {
    filterRelatoriosCatalog,
    type RelatorioCatalogItem,
} from './relatoriosHubUtils';

const SAMPLE_ITEMS: RelatorioCatalogItem[] = [
    {
        id: 'dre',
        category: 'GERENCIAL',
        title: 'DRE Mensal',
        description: 'Faturamento, despesas, impostos e lucro líquido.',
        keywords: ['financeiro', 'resultado', 'lucro'],
        path: '/relatorio/financeiro',
        hasPdf: true,
    },
    {
        id: 'das',
        category: 'FISCAL',
        title: 'Pagamento de DAS (Impostos)',
        description: 'Registro de guias de impostos pagos.',
        keywords: ['imposto', 'simples', 'tributo'],
        path: '/financeiro/imposto-pago',
    },
    {
        id: 'faturas',
        category: 'CAIXA',
        title: 'Faturas de Cartão',
        description: 'Faturas consolidadas de cartões corporativos.',
        keywords: ['cartao', 'credito'],
        path: '/financeiro/faturas',
    },
];

describe('relatoriosHubUtils', () => {
    it('filtra por categoria corretamente', () => {
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, '', 'GERENCIAL')).toHaveLength(1);
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, '', 'FISCAL')).toHaveLength(1);
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, '', 'CAIXA')).toHaveLength(1);
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, '', 'ALL')).toHaveLength(3);
    });

    it('filtra por texto sem sensibilidade a acentos e usando palavras-chave', () => {
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, 'cartao', 'ALL')).toHaveLength(1);
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, 'simples', 'ALL')).toHaveLength(1);
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, 'liquido', 'ALL')).toHaveLength(1);
    });

    it('retorna lista vazia quando não há correspondência', () => {
        expect(filterRelatoriosCatalog(SAMPLE_ITEMS, 'inexistente', 'ALL')).toEqual([]);
    });
});
