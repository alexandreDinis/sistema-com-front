import api from './api';

const BASE_URL = '/platform';

export interface PlatformStats {
    totalTenants: number;
    activeTenants: number;
    totalUsers: number;
    mrr: number;
}

export interface TenantSummary {
    id: number;
    nome: string;
    cnpj: string;
    plano: 'BRONZE' | 'PRATA' | 'OURO';
    ativo: boolean;
    vitalicia?: boolean;
    dataCriacao: string;
    dataAtualizacao?: string;
    // Frontend convenience computed property
    status?: 'ACTIVE' | 'BLOCKED';
    adminEmail?: string;
    createdAt?: string;
}

export interface TenantCreateRequest {
    nome: string;
    cnpj: string;
    plano: string;
    adminEmail: string;
    adminPassword?: string;
    licencaId?: number; // Optional: For Super Admin
}

export interface PlanSummary {
    id: string;
    name: string;
    price: number;
    features?: string[];
}

export interface TenantUpdateRequest {
    nome: string;
    cnpj: string;
    plano: string;
    adminEmail?: string;
}

export const platformService = {
    // GET /api/v1/platform/stats
    getStats: async (): Promise<PlatformStats> => {
        const response = await api.get<PlatformStats>(`${BASE_URL}/stats`);
        return response.data;
    },

    // GET /api/v1/platform/tenants
    listTenants: async (): Promise<TenantSummary[]> => {
        const response = await api.get<TenantSummary[]>(`${BASE_URL}/tenants`);
        return response.data;
    },

    // POST /api/v1/platform/tenants
    createTenant: async (data: TenantCreateRequest): Promise<TenantSummary> => {
        const response = await api.post<TenantSummary>(`${BASE_URL}/tenants`, data);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}
    updateTenant: async (id: number, data: TenantUpdateRequest): Promise<TenantSummary> => {
        const response = await api.put<TenantSummary>(`${BASE_URL}/tenants/${id}`, data);
        return response.data;
    },

    // GET /api/v1/platform/plans
    listPlans: async (): Promise<PlanSummary[]> => {
        const response = await api.get<PlanSummary[]>(`${BASE_URL}/plans`);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}/toggle-status
    toggleTenantStatus: async (id: number): Promise<TenantSummary> => {
        const response = await api.put<TenantSummary>(`${BASE_URL}/tenants/${id}/toggle-status`);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}/dar-baixa
    darBaixaTenant: async (id: number): Promise<TenantSummary> => {
        const response = await api.put<TenantSummary>(`${BASE_URL}/tenants/${id}/dar-baixa`);
        return response.data;
    },

    // ========================================
    // OWNER DASHBOARD — Per-Reseller Stats
    // ========================================

    // GET /api/v1/platform/licencas
    listLicencas: async (): Promise<LicencaSummary[]> => {
        const response = await api.get<LicencaSummary[]>(`${BASE_URL}/licencas`);
        return response.data;
    },

    // GET /api/v1/platform/licencas/{id}/stats
    getLicencaStats: async (id: number): Promise<LicencaStats> => {
        const response = await api.get<LicencaStats>(`${BASE_URL}/licencas/${id}/stats`);
        return response.data;
    },

    // PUT /api/v1/platform/licencas/{id}/toggle-status
    toggleLicencaStatus: async (id: number): Promise<LicencaSummary> => {
        const response = await api.put<LicencaSummary>(`${BASE_URL}/licencas/${id}/toggle-status`);
        return response.data;
    },

    // PUT /api/v1/platform/licencas/{id}/dar-baixa
    darBaixaLicenca: async (id: number): Promise<LicencaSummary> => {
        const response = await api.put<LicencaSummary>(`${BASE_URL}/licencas/${id}/dar-baixa`);
        return response.data;
    },

    // POST /api/v1/platform/licencas/{id}/rescindir
    rescindirLicenca: async (id: number): Promise<void> => {
        await api.post(`${BASE_URL}/licencas/${id}/rescindir`);
    },

    // GET /api/v1/platform/tenants/orphans
    listOrphanTenants: async (): Promise<TenantSummary[]> => {
        const response = await api.get<TenantSummary[]>(`${BASE_URL}/tenants/orphans`);
        return response.data;
    },

    // POST /api/v1/platform/tenants/{id}/reassign
    reassignTenant: async (tenantId: number, licencaId: number): Promise<TenantSummary> => {
        const response = await api.post<TenantSummary>(`${BASE_URL}/tenants/${tenantId}/reassign?licencaId=${licencaId}`);
        return response.data;
    },
    // POST /api/v1/platform/admin/migration/transfer-tenant
    migrateTenant: async (data: { empresaId: number; novaLicencaId: number; motivo: string }): Promise<void> => {
        await api.put(`${BASE_URL}/admin/migration/transfer-tenant`, data);
    },

    // GET /api/v1/platform/tenants/risk
    getRiskyTenants: async (): Promise<TenantSummary[]> => {
        const response = await api.get<TenantSummary[]>(`${BASE_URL}/tenants/risk`);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}/reset-password
    resetTenantPassword: async (id: number, newPassword: string): Promise<void> => {
        await api.put(`${BASE_URL}/tenants/${id}/reset-password`, { newPassword });
    },

    // ========================================
    // VITALÍCIO (Lifetime)
    // ========================================

    // PUT /api/v1/platform/licencas/{id}/tornar-vitalicia
    tornarLicencaVitalicia: async (id: number): Promise<LicencaSummary> => {
        const response = await api.put<LicencaSummary>(`${BASE_URL}/licencas/${id}/tornar-vitalicia`);
        return response.data;
    },

    // PUT /api/v1/platform/licencas/{id}/revogar-vitalicia
    revogarLicencaVitalicia: async (id: number): Promise<LicencaSummary> => {
        const response = await api.put<LicencaSummary>(`${BASE_URL}/licencas/${id}/revogar-vitalicia`);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}/tornar-vitalicio
    tornarTenantVitalicio: async (id: number): Promise<TenantSummary> => {
        const response = await api.put<TenantSummary>(`${BASE_URL}/tenants/${id}/tornar-vitalicio`);
        return response.data;
    },

    // PUT /api/v1/platform/tenants/{id}/revogar-vitalicio
    revogarTenantVitalicio: async (id: number): Promise<TenantSummary> => {
        const response = await api.put<TenantSummary>(`${BASE_URL}/tenants/${id}/revogar-vitalicio`);
        return response.data;
    }
};

// Additional types for Owner Dashboard
export interface LicencaSummary {
    id: number;
    razaoSocial: string;
    nomeFantasia?: string;
    cnpj: string;
    email: string;
    status: 'ATIVA' | 'SUSPENSA' | 'CANCELADA';
    vitalicia?: boolean;
    planoTipo?: string;
}

export interface LicencaStats {
    licencaId: number;
    razaoSocial: string;
    nomeFantasia?: string;
    status: string;
    totalTenants: number;
    tenantsAtivos: number;
    tenantsBloqueados: number;
    receitaTotalTenants: number;
    receitaRevendedor: number;
    receitaOwner: number;
    crescimentoMensal: number;
}
