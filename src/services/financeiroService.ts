import api, { API_BASE_URL } from './api';
import type {
    ContaPagar,
    ContaReceber,
    ResumoFinanceiro,
    FluxoCaixa,
    PagarContaRequest,
    ReceberContaRequest,
    EstornarContaRequest,
    EstornoContaPagar,
    PageResponse,
} from '../types';

export const financeiroService = {
    // ========================================
    // CONTAS A PAGAR
    // ========================================

    listarContasPagar: async (status?: string): Promise<ContaPagar[]> => {
        const params = status ? `?status=${status}` : '';
        const response = await api.get(`/financeiro/contas-pagar${params}`);
        return response.data;
    },

    pagarConta: async (id: number, request: PagarContaRequest): Promise<ContaPagar> => {
        const response = await api.post(`/financeiro/contas-pagar/${id}/pagar`, request);
        return response.data;
    },

    estornarContaPagar: async (id: number, request: EstornarContaRequest): Promise<EstornoContaPagar> => {
        const response = await api.post(`/financeiro/contas-pagar/${id}/estornar`, request);
        return response.data;
    },

    listarEstornos: async (): Promise<EstornoContaPagar[]> => {
        const response = await api.get('/financeiro/estornos');
        return response.data;
    },

    listarContasPagarPaginado: async (params: {
        mes?: number;
        ano?: number;
        status?: string;
        tipo?: string;
        busca?: string;
        page?: number;
        size?: number;
    }): Promise<PageResponse<ContaPagar>> => {
        const response = await api.get('/financeiro/contas-pagar/paginado', { params });
        return response.data;
    },

    listarFaturasPaginado: async (page = 0, size = 12): Promise<PageResponse<ContaPagar>> => {
        const response = await api.get('/financeiro/faturas/paginado', { params: { page, size } });
        return response.data;
    },

    listarEstornosPaginado: async (page = 0, size = 15): Promise<PageResponse<EstornoContaPagar>> => {
        const response = await api.get('/financeiro/estornos/paginado', { params: { page, size } });
        return response.data;
    },

    listarContasReceberPaginado: async (params: {
        status?: string;
        busca?: string;
        page?: number;
        size?: number;
    }): Promise<PageResponse<ContaReceber>> => {
        const response = await api.get('/financeiro/contas-receber/paginado', { params });
        return response.data;
    },

    // ========================================
    // CONTAS A RECEBER
    // ========================================

    listarContasReceber: async (status?: string): Promise<ContaReceber[]> => {
        const params = status ? `?status=${status}` : '';
        const response = await api.get(`/financeiro/contas-receber${params}`);
        return response.data;
    },

    receberConta: async (id: number, request: ReceberContaRequest): Promise<ContaReceber> => {
        const response = await api.post(`/financeiro/contas-receber/${id}/receber`, request);
        return response.data;
    },

    registrarRecebimentoParcial: async (id: number, request: {
        valor: number;
        dataRecebimento?: string;
        meioPagamento: string;
        observacao?: string;
    }): Promise<ContaReceber> => {
        const response = await api.post(`/financeiro/contas-receber/${id}/recebimento-parcial`, request);
        return response.data;
    },

    baixarSaldo: async (id: number, request: { motivo: string }): Promise<ContaReceber> => {
        const response = await api.post(`/financeiro/contas-receber/${id}/baixar`, request);
        return response.data;
    },

    estornarRecebimento: async (recebimentoId: number): Promise<ContaReceber> => {
        const response = await api.delete(`/financeiro/contas-receber/recebimentos/${recebimentoId}`);
        return response.data;
    },

    listarRecebimentos: async (contaId: number) => {
        const response = await api.get(`/financeiro/contas-receber/${contaId}/recebimentos`);
        return response.data;
    },

    atualizarVencimento: async (id: number, novaDataVencimento: string): Promise<ContaReceber> => {
        const response = await api.patch(`/financeiro/contas-receber/${id}/vencimento`, { novaDataVencimento });
        return response.data;
    },

    getFluxoCaixa: async (mes: number, ano: number): Promise<FluxoCaixa> => {
        const response = await api.get(`/financeiro/fluxo-caixa?mes=${mes}&ano=${ano}`);
        return response.data;
    },

    getFluxoCaixaDetalhado: async (mes: number, ano: number): Promise<{
        periodo: string;
        saldoInicial: number;
        totalEntradas: number;
        totalSaidas: number;
        resultadoPeriodo: number;
        saldoFinal: number;
        entradas: Array<{ data: string; descricao: string; categoria: string; valor: number }>;
        saidas: Array<{ data: string; descricao: string; categoria: string; valor: number }>;
    }> => {
        const response = await api.get(`/relatorios/contabeis/fluxo-caixa/dados?mes=${mes}&ano=${ano}`);
        return response.data;
    },

    // ========================================
    // RESUMO FINANCEIRO
    // ========================================

    getResumo: async (): Promise<ResumoFinanceiro> => {
        const response = await api.get('/financeiro/resumo');
        return response.data;
    },

    // ========================================
    // DISTRIBUIÇÃO DE LUCROS
    // ========================================

    listarDistribuicoesLucro: async (): Promise<ContaPagar[]> => {
        const response = await api.get('/financeiro/distribuicao-lucros');
        return response.data;
    },

    criarDistribuicaoLucros: async (request: {
        valor: number;
        dataCompetencia: string;
        dataVencimento: string;
        descricao?: string;
    }): Promise<ContaPagar> => {
        const response = await api.post('/financeiro/distribuicao-lucros', request);
        return response.data;
    },

    // ========================================
    // RECEITA POR CAIXA (BASE DAS)
    // ========================================

    getReceitasCaixa: async (mes: number, ano: number) => {
        const response = await api.get(`/financeiro/receitas-caixa?mes=${mes}&ano=${ano}`);
        return response.data;
    },

    // ========================================
    // PAGAMENTO DE IMPOSTO (DAS)
    // ========================================

    criarImpostoPago: async (request: {
        valor: number;
        dataCompetencia: string;
        dataVencimento: string;
        descricao?: string;
    }): Promise<ContaPagar> => {
        const response = await api.post('/financeiro/imposto-pago', request);
        return response.data;
    },

    listarImpostosPagos: async (): Promise<ContaPagar[]> => {
        const response = await api.get('/financeiro/imposto-pago');
        return response.data;
    },

    cancelarImpostoPago: async (id: number): Promise<ContaPagar> => {
        const response = await api.patch(`/financeiro/imposto-pago/${id}/cancelar`);
        return response.data;
    },

    // ========================================
    // RELATÓRIOS PDF (PATH BUILDERS for usePdfDownload hook)
    // ========================================
    getReceitaCaixaPdfPath: (mes: number, ano: number) => `relatorios/contabeis/receita-caixa?mes=${mes}&ano=${ano}`,
    getFluxoCaixaPdfPath: (mes: number, ano: number) => `relatorios/contabeis/fluxo-caixa?mes=${mes}&ano=${ano}`,
    getContasPagarPdfPath: (mes: number, ano: number) => `relatorios/contabeis/contas-pagar?mes=${mes}&ano=${ano}`,
    getDistribuicaoLucrosPdfPath: (mes: number, ano: number) => `relatorios/contabeis/distribuicao-lucros?mes=${mes}&ano=${ano}`,
    getApiBaseUrl: () => API_BASE_URL,
};

export default financeiroService;
