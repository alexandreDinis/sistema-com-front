import React, { useState } from 'react';
import { DespesaForm } from '../components/forms/DespesaForm';
import { DespesaEditModal } from '../components/modals/DespesaEditModal';
import { ChevronRight, Home, Trash2, Calendar, Tag, CreditCard, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { despesaService } from '../services/despesaService';
import { formatarDataLocal } from '../utils/faturaUtils';
import type { Despesa } from '../types';

export const DespesaPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [despesaEditando, setDespesaEditando] = useState<Despesa | null>(null);

    const { data: despesas = [], isLoading } = useQuery({
        queryKey: ['despesas'],
        queryFn: despesaService.listar
    });

    const deleteMutation = useMutation({
        mutationFn: despesaService.excluir,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
            queryClient.invalidateQueries({ queryKey: ['relatorio'] });
        },
        onError: (error) => {
            alert('Erro ao excluir despesa. Verifique o console.');
            console.error(error);
        }
    });

    const handleDelete = (id: number) => {
        if (confirm('⚠️ EXCLUSÃO DE DESPESA\n\nIsso pode alterar faturas de cartão e fluxos de caixa associados.\nDeseja continuar?')) {
            deleteMutation.mutate(id);
        }
    };

    // Ordenar despesas por data (mais recentes primeiro) e pegar as ultimas 10
    const ultimasDespesas = [...despesas]
        .sort((a, b) => new Date(b.dataDespesa).getTime() - new Date(a.dataDespesa).getTime())
        .slice(0, 20);

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    return (
        <div className="container mx-auto px-4 py-12">
            <div className="max-w-xl mx-auto mb-10">
                <nav className="flex items-center gap-3 text-[9px] font-black text-cyber-gold/30 mb-8 uppercase tracking-[0.4em]">
                    <Link to="/" className="hover:text-cyber-gold transition-colors flex items-center gap-1.5 border border-cyber-gold/10 px-2 py-1 bg-black/40">
                        <Home className="w-2.5 h-2.5" />
                        RAIZ
                    </Link>
                    <ChevronRight className="w-2.5 h-2.5 opacity-20" />
                    <span className="text-cyber-gold/60">MÓDULO_DESPESAS_SAÍDA</span>
                </nav>

                <div className="relative mb-12">
                    <div className="absolute -left-4 top-0 bottom-0 w-px bg-cyber-gold/20"></div>
                    <h1 className="text-5xl font-black text-cyber-gold tracking-tighter italic italic-shadow uppercase glitch">
                        Console de Despesas
                    </h1>
                    <p className="text-cyber-gold/40 text-[10px] font-mono tracking-[0.2em] mt-3 uppercase max-w-lg">
                        ALOCAR_CUSTOS_OPERACIONAIS // RECÁLCULO_AUTOMÁTICO_FATURAS
                    </p>
                </div>
            </div>

            <DespesaForm />

            {/* LISTA DE DESPESAS */}
            <div className="max-w-2xl mx-auto mt-16">
                <h3 className="text-cyber-gold text-lg font-black italic mb-6 border-b border-cyber-gold/20 pb-2">
                    ÚLTIMOS LANÇAMENTOS // LOG_STREAM
                </h3>

                {isLoading ? (
                    <div className="text-cyber-gold/30 text-xs font-mono animate-pulse">CARREGANDO_STREAM...</div>
                ) : (
                    <div className="space-y-3">
                        {ultimasDespesas.length === 0 ? (
                            <div className="text-cyber-gold/30 text-xs font-mono">NENHUM REGISTRO ENCONTRADO. SISTEMA OCIOSO.</div>
                        ) : (
                            ultimasDespesas.map((despesa) => (
                                <div key={despesa.id} className="group relative bg-black/40 border border-cyber-gold/10 p-4 hover:border-cyber-gold/30 transition-all flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-cyber-gold/5 rounded text-cyber-gold/60">
                                            {despesa.cartao ? <CreditCard size={16} /> : <Tag size={16} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-black text-cyber-gold uppercase">
                                                    {despesa.descricao || 'SEM_DESCRIÇÃO'}
                                                </span>
                                                {despesa.cartao && (
                                                    <span className="text-[9px] bg-purple-500/10 text-purple-400 px-1 rounded border border-purple-500/20">
                                                        CARTÃO
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] text-cyber-gold/40 font-mono">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {formatarDataLocal(despesa.dataDespesa)}
                                                </span>
                                                <span className="uppercase">{despesa.categoria?.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <span className="text-sm font-black text-cyber-gold">
                                                {formatCurrency(despesa.valor)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setDespesaEditando(despesa)}
                                                className="p-2 hover:bg-cyber-gold/10 text-cyber-gold/60 hover:text-cyber-gold border border-transparent hover:border-cyber-gold/30 rounded transition-colors"
                                                title="Editar Registro"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(despesa.id)}
                                                className="p-2 hover:bg-red-500/10 text-red-500/50 hover:text-red-500 border border-transparent hover:border-red-500/30 rounded transition-colors"
                                                title="Excluir Registro"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {despesaEditando && (
                <DespesaEditModal
                    despesa={despesaEditando}
                    onClose={() => setDespesaEditando(null)}
                />
            )}
        </div>
    );
};
