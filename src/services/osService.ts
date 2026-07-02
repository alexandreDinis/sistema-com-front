import api, { API_BASE_URL } from './api';
import type {
    Cliente, ClienteRequest, ClienteFiltros,
    TipoPeca, TipoPecaRequest,
    OrdemServico, CreateOSRequest,
    AddVeiculoRequest, AddPecaRequest, UpdateOSStatusRequest,
    VeiculoOS, OSStatus,
    PlacaCheckResponse, HistoricoResponse, PageResponse, DashboardStatsResponse
} from '../types';

export const osService = {
    // --- Clientes ---
    createCliente: async (data: ClienteRequest): Promise<Cliente> => {
        const response = await api.post<Cliente>('/clientes', data);
        return response.data;
    },

    listClientes: async (filtros?: ClienteFiltros): Promise<Cliente[]> => {
        const params = new URLSearchParams();
        if (filtros) {
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
        }
        const response = await api.get<Cliente[]>(`/clientes?${params.toString()}`);
        return response.data;
    },

    updateCliente: async ({ id, data }: { id: number; data: ClienteRequest }): Promise<Cliente> => {
        const response = await api.put<Cliente>(`/clientes/${id}`, data);
        return response.data;
    },

    deleteCliente: async (id: number): Promise<void> => {
        await api.delete(`/clientes/${id}`);
    },

    // --- Catálogo (Tipos de Peça) ---
    createTipoPeca: async (data: TipoPecaRequest): Promise<TipoPeca> => {
        const response = await api.post<TipoPeca>('/tipos-peca', data);
        return response.data;
    },

    deleteTipoPeca: async (id: number): Promise<void> => {
        await api.delete(`/tipos-peca/${id}`);
    },

    listTiposPeca: async (): Promise<TipoPeca[]> => {
        const response = await api.get<TipoPeca[]>('/tipos-peca');
        return response.data;
    },

    // --- Ordem de Serviço (Core) ---
    createOS: async (data: CreateOSRequest): Promise<OrdemServico> => {
        const response = await api.post<OrdemServico>('/ordens-servico', data);
        return response.data;
    },

    listOS: async (): Promise<OrdemServico[]> => {
        const response = await api.get<OrdemServico[]>('/ordens-servico');
        return response.data;
    },

    getDashboardStats: async (): Promise<DashboardStatsResponse> => {
        const response = await api.get<DashboardStatsResponse>('/dashboard/stats');
        return response.data;
    },

    listOSGrid: async (page: number, size: number, filters?: { status?: string, search?: string, date?: string, atrasado?: boolean }): Promise<PageResponse<OrdemServico>> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('size', size.toString());
        if (filters) {
            if (filters.status) params.append('status', filters.status);
            if (filters.search) params.append('search', filters.search);
            if (filters.date) params.append('date', filters.date);
            if (filters.atrasado) params.append('atrasado', 'true');
        }
        const response = await api.get<PageResponse<OrdemServico>>(`/ordens-servico/grid`, { params });
        return response.data;
    },

    deleteOS: async (id: number): Promise<void> => {
        await api.delete(`/ordens-servico/${id}`);
    },

    getOSById: async (id: number): Promise<OrdemServico> => {
        const response = await api.get<OrdemServico>(`/ordens-servico/${id}`);
        return response.data;
    },

    addVeiculo: async (data: AddVeiculoRequest): Promise<VeiculoOS> => {
        const response = await api.post<any>('/ordens-servico/veiculos', data);
        return response.data;
    },

    deleteVeiculo: async (id: number): Promise<void> => {
        // Trying the likely endpoint matching the POST
        await api.delete(`/ordens-servico/veiculos/${id}`);
    },

    verificarPlaca: async (placa: string): Promise<PlacaCheckResponse> => {
        const response = await api.get<PlacaCheckResponse>(`/veiculos/verificar-placa`, {
            params: { placa }
        });
        return response.data;
    },

    obterHistorico: async (placa: string): Promise<HistoricoResponse> => {
        const response = await api.get<HistoricoResponse>(`/veiculos/${placa}/historico`);
        return response.data;
    },

    checkPlaca: async (placa: string): Promise<{ exists: boolean; message: string }> => {
        // Deprecated wrapper to maintain backward compatibility if needed temporarily,
        // but ideally we switch usages to verificarPlaca.
        // For now, I'll remove it or keep it? Current code usages will be updated.
        // Let's replace it fully as per plan.
        const response = await api.get<PlacaCheckResponse>(`/veiculos/verificar-placa`, { params: { placa } });
        return {
            exists: response.data.existe,
            message: response.data.mensagem
        };
    },

    addPeca: async (data: AddPecaRequest): Promise<any> => {
        const response = await api.post<any>('/ordens-servico/pecas', data);
        return response.data;
    },

    deletePeca: async (id: number): Promise<OrdemServico> => {
        const response = await api.delete<OrdemServico>(`/ordens-servico/pecas/${id}`);
        return response.data;
    },

    updateStatus: async (id: number, status: OSStatus): Promise<OrdemServico> => {
        const payload: UpdateOSStatusRequest = { status };
        const response = await api.patch<OrdemServico>(`/ordens-servico/${id}/status`, payload);
        return response.data;
    },

    updateDiscount: async (id: number, tipoDesconto: 'PERCENTUAL' | 'VALOR_FIXO' | null, valorDesconto: number): Promise<OrdemServico> => {
        const payload = { tipoDesconto, valorDesconto };
        const response = await api.patch<OrdemServico>(`/ordens-servico/${id}`, payload);
        return response.data;
    },

    updateOS: async (id: number, data: any): Promise<OrdemServico> => {
        const response = await api.patch<OrdemServico>(`/ordens-servico/${id}`, data);
        return response.data;
    },

    // --- Imagens de Veículos ---
    uploadVeiculoImagem: async (veiculoId: number, file: File, legenda?: string): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        if (legenda) formData.append('legenda', legenda);
        
        const response = await api.post<any>(`/veiculos/${veiculoId}/imagens`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    deleteVeiculoImagem: async (imagemId: number): Promise<void> => {
        // Validação de multi-tenancy é feita no backend
        await api.delete(`/veiculos/imagens/${imagemId}`);
    },

    updateVeiculoImagemLegenda: async (imagemId: number, legenda: string): Promise<any> => {
        // Validação de multi-tenancy é feita no backend
        const response = await api.patch<any>(`/veiculos/imagens/${imagemId}`, { legenda });
        return response.data;
    },

    reorderVeiculoImagens: async (veiculoId: number, ids: number[]): Promise<any> => {
        const response = await api.put<any>(`/veiculos/${veiculoId}/imagens/ordem`, { ids });
        return response.data;
    },

    // --- PDF ---
    // Path builders for PDF downloads (used by usePdfDownload hook)
    getRelatorioPdfPath: (ano: number, mes: number) => `relatorios/${ano}/${mes}/pdf`,
    getOSPdfPath: (osId: number) => `ordens-servico/${osId}/pdf`,
    getApiBaseUrl: () => API_BASE_URL
};
