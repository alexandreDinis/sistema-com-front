import api from './api';
import type { Despesa, DespesaRequest } from '../types';

export const despesaService = {
    create: async (despesa: DespesaRequest): Promise<Despesa> => {
        const response = await api.post<Despesa>('despesas', despesa);
        return response.data;
    },
    createParcelada: async (despesa: DespesaRequest): Promise<Despesa[]> => {
        const response = await api.post<Despesa[]>('despesas/parcelada', despesa);
        return response.data;
    },
    listar: async (): Promise<Despesa[]> => {
        const response = await api.get<Despesa[]>('despesas');
        return response.data;
    },

    atualizar: async (id: number, despesa: DespesaRequest): Promise<Despesa> => {
        const response = await api.put<Despesa>(`despesas/${id}`, despesa);
        return response.data;
    },

    excluir: async (id: number): Promise<void> => {
        await api.delete(`despesas/${id}`);
    }
};
