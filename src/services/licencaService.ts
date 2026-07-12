import api from './api';

const BASE_URL = '/admin/licencas';

// =============================================
// TYPES - Licença (Reseller/White Label Partner)
// =============================================

export interface Licenca {
    id: number;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    email: string;
    telefone?: string;
    // Address
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    // Plan Snapshot
    planoTipo: string; // BASIC, PRO, ENTERPRISE
    valorMensalidade: number;
    valorPorTenant: number;
    limiteTenants?: number;
    // White Label Config
    logoUrl?: string;
    corPrimaria?: string;
    corSecundaria?: string;
    dominioCustomizado?: string;
    // Gateway
    gatewayPagamento?: string;
    // Status
    status: 'ATIVA' | 'SUSPENSA' | 'CANCELADA';
    vitalicia?: boolean;
    dataAtivacao?: string;
    dataSuspensao?: string;
    motivoSuspensao?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface LicencaCreateRequest {
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    email: string;
    telefone?: string;
    planoId: number; // References PlanoLicenca
    senhaAdmin: string; // Password for reseller admin user
}

export interface PlanoLicenca {
    id: number;
    nome: string;
    descricao?: string;
    valorMensalidade: number;
    valorPorTenant: number;
    limiteTenants?: number;
    limiteUsuariosPorTenant?: number;
    suportePrioritario: boolean;
    whiteLabel: boolean;
    dominioCustomizado: boolean;
    ativo: boolean;
    ordem?: number;
}

export interface PlanoLicencaCreateRequest {
    nome: string;
    descricao?: string;
    valorMensalidade: number;
    valorPorTenant: number;
    limiteTenants?: number;
    limiteUsuariosPorTenant?: number;
    suportePrioritario?: boolean;
    whiteLabel?: boolean;
    dominioCustomizado?: boolean;
}

// Paginated response from backend
export interface PaginatedResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
}

// =============================================
// SERVICE
// =============================================

export const licencaService = {
    // =====================================
    // Licenças (Resellers)
    // =====================================

    // GET /api/v1/admin/licencas
    listLicencas: async (page = 0, size = 20): Promise<PaginatedResponse<Licenca>> => {
        const response = await api.get<PaginatedResponse<Licenca>>(`${BASE_URL}?page=${page}&size=${size}`);
        return response.data;
    },

    // GET /api/v1/admin/licencas/{id}
    getLicenca: async (id: number): Promise<Licenca> => {
        const response = await api.get<Licenca>(`${BASE_URL}/${id}`);
        return response.data;
    },

    // POST /api/v1/admin/licencas?planoId={planoId}
    createLicenca: async (data: LicencaCreateRequest): Promise<Licenca> => {
        const { planoId, ...licencaData } = data;
        const response = await api.post<Licenca>(`${BASE_URL}?planoId=${planoId}`, licencaData);
        return response.data;
    },

    // PUT /api/v1/admin/licencas/{id}
    updateLicenca: async (id: number, data: Partial<LicencaCreateRequest>): Promise<Licenca> => {
        const response = await api.put<Licenca>(`${BASE_URL}/${id}`, data);
        return response.data;
    },

    // POST /api/v1/admin/licencas/{id}/suspender
    suspendLicenca: async (id: number, motivo: string): Promise<void> => {
        await api.post(`${BASE_URL}/${id}/suspender`, motivo, {
            headers: { 'Content-Type': 'text/plain' }
        });
    },

    // =====================================
    // Planos de Licença (White Label Plans)
    // =====================================

    // GET /api/v1/admin/planos-licenca
    listPlanosLicenca: async (): Promise<PlanoLicenca[]> => {
        const response = await api.get<PlanoLicenca[]>('/admin/planos-licenca');
        return response.data;
    },

    // POST /api/v1/admin/planos-licenca
    createPlanoLicenca: async (data: PlanoLicencaCreateRequest): Promise<PlanoLicenca> => {
        const response = await api.post<PlanoLicenca>('/admin/planos-licenca', data);
        return response.data;
    },

    // PUT /api/v1/admin/planos-licenca/{id}
    updatePlanoLicenca: async (id: number, data: Partial<PlanoLicencaCreateRequest>): Promise<PlanoLicenca> => {
        const response = await api.put<PlanoLicenca>(`/admin/planos-licenca/${id}`, data);
        return response.data;
    },

    // DELETE /api/v1/admin/planos-licenca/{id}
    deletePlanoLicenca: async (id: number): Promise<void> => {
        await api.delete(`/admin/planos-licenca/${id}`);
    }
};
