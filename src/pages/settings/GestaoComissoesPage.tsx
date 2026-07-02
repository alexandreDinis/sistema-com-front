import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle, DollarSign, Check, RefreshCw, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { comissaoService } from '../../services/comissaoService';
import type { ComissaoFuncionario } from '../../services/comissaoService';
import { ActionModal } from '../../components/modals/ActionModal';
import type { ActionModalType } from '../../components/modals/ActionModal';
import { AdiantamentoModal } from '../../components/modals/AdiantamentoModal';

const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export const GestaoComissoesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const agora = new Date();
    const [ano, setAno] = useState(agora.getFullYear());
    const [mes, setMes] = useState(agora.getMonth() + 1);
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        type: ActionModalType;
        title: string;
        message: string;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        type: 'info',
        title: '',
        message: ''
    });

    const [adiantamentoModal, setAdiantamentoModal] = useState<{
        isOpen: boolean;
        funcionarioId: number | null;
        funcionarioNome: string;
    }>({
        isOpen: false,
        funcionarioId: null,
        funcionarioNome: ''
    });

    const { data: comissoes, isLoading, isError, refetch } = useQuery({
        queryKey: ['comissoes-empresa', ano, mes],
        queryFn: () => comissaoService.listarComissoesEmpresa(ano, mes)
    });

    const quitarMutation = useMutation({
        mutationFn: (id: number) => comissaoService.quitarComissao(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comissoes-empresa', ano, mes] });
        }
    });

    const recalcularMutation = useMutation({
        mutationFn: () => comissaoService.listarComissoesEmpresa(ano, mes, true),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comissoes-empresa'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });

            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Sucesso',
                message: 'Comissão recalculada com sucesso',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        },
        onError: (error) => {
            console.error(error);
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro',
                message: 'Erro ao recalcular comissões',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    });

    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-cyber-gold/20 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-cyber-gold tracking-tighter uppercase glitch flex items-center gap-3">
                        <DollarSign size={28} />
                        Gestão de Pagamentos
                    </h1>
                    <p className="text-cyber-gold/60 font-mono text-sm mt-2">
                        Visualize e pague repasses de todos os prestadores
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/settings/comissao"
                        className="text-cyber-gold/60 hover:text-cyber-gold px-4 py-2 font-oxanium text-sm uppercase transition-colors flex items-center gap-2"
                    >
                        <ArrowLeft size={16} /> Voltar
                    </Link>
                </div>
            </div>

            {/* Aviso de Recálculo Necessário */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                <p className="text-yellow-500/90 text-sm font-mono">
                    Atenção: É necessário recalcular os repasses ao acessar esta página para garantir que os valores estejam atualizados com o faturamento mais recente.
                </p>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 items-center bg-black/40 border border-cyber-gold/20 p-4">
                <label className="text-cyber-gold/60 text-sm font-mono">PERÍODO:</label>
                <select
                    value={mes}
                    onChange={(e) => setMes(parseInt(e.target.value))}
                    className="bg-black border border-cyber-gold/30 text-cyber-gold px-4 py-2 text-sm font-mono"
                >
                    {meses.map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                    ))}
                </select>
                <select
                    value={ano}
                    onChange={(e) => setAno(parseInt(e.target.value))}
                    className="bg-black border border-cyber-gold/30 text-cyber-gold px-4 py-2 text-sm font-mono"
                >
                    {[2024, 2025, 2026].map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>

                {/* Botão Atualizar REMOVIDO conforme solicitado */}

                <button
                    onClick={() => recalcularMutation.mutate()}
                    disabled={recalcularMutation.isPending}
                    className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors flex items-center gap-2 ml-auto disabled:opacity-50"
                    title="Força o recálculo de todos os repasses (exceto pagos)"
                >
                    {recalcularMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Recalcular
                </button>
            </div>

            {/* Loading */}
            {
                isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-cyber-gold animate-spin" />
                        <span className="ml-3 text-cyber-gold/60 font-mono">Carregando repasses...</span>
                    </div>
                )
            }

            {/* Error */}
            {
                isError && (
                    <div className="bg-red-500/10 border border-red-500/30 p-6 text-center">
                        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
                        <p className="text-red-400 mb-4">Erro ao carregar repasses</p>
                        <button
                            onClick={() => refetch()}
                            className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw size={14} /> Tentar Novamente
                        </button>
                    </div>
                )
            }

            {/* Empty */}
            {
                !isLoading && !isError && (!comissoes || comissoes.length === 0) && (
                    <div className="bg-black/40 border border-cyber-gold/20 p-10 text-center">
                        <DollarSign className="w-12 h-12 text-cyber-gold/30 mx-auto mb-4" />
                        <h3 className="text-cyber-gold font-bold text-lg mb-2">Nenhum Repasse</h3>
                        <p className="text-cyber-gold/50 text-sm">
                            Nenhum prestador tem repasse calculado para este período.
                        </p>
                    </div>
                )
            }

            {/* Table */}
            {
                !isLoading && !isError && comissoes && comissoes.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full border border-cyber-gold/20">
                            <thead className="bg-cyber-gold/10">
                                <tr className="text-left text-xs font-mono text-cyber-gold/80 uppercase tracking-wider">
                                    <th className="p-4 border-b border-cyber-gold/20">Prestador</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">Faturamento</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">%</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">Bruto</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">Adiant.</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">Já Pago</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-right">Saldo</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-center">Status</th>
                                    <th className="p-4 border-b border-cyber-gold/20 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comissoes.map((c: ComissaoFuncionario) => (
                                    <tr key={c.id} className="border-b border-cyber-gold/10 hover:bg-cyber-gold/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-cyber-gold">{c.funcionarioNome}</div>
                                            <div className="text-xs text-cyber-gold/50">{c.funcionarioEmail}</div>
                                        </td>
                                        <td className="p-4 text-right font-mono text-cyber-gold/80">{formatarMoeda(c.faturamento)}</td>
                                        <td className="p-4 text-right font-mono text-cyber-gold/60">{c.porcentagem}%</td>
                                        <td className="p-4 text-right font-mono text-cyber-gold/80">{formatarMoeda(c.valorBruto)}</td>
                                        <td className="p-4 text-right font-mono text-red-400/80">-{formatarMoeda(c.adiantamentos)}</td>
                                        <td className="p-4 text-right font-mono text-blue-400/80">-{formatarMoeda(c.valorQuitado || 0)}</td>
                                        <td className="p-4 text-right font-mono font-bold text-cyber-gold">{formatarMoeda(c.saldoAPagar)}</td>
                                        <td className="p-4 text-center">
                                            {c.quitado ? (
                                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-mono rounded">PAGO</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-mono rounded">PENDENTE</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            {!c.quitado && (
                                                <div className="flex gap-2 justify-center">
                                                    <button
                                                        onClick={() => setAdiantamentoModal({
                                                            isOpen: true,
                                                            funcionarioId: c.funcionarioId,
                                                            funcionarioNome: c.funcionarioNome
                                                        })}
                                                        className="px-3 py-1 bg-cyber-gold/20 border border-cyber-gold/40 text-cyber-gold text-xs hover:bg-cyber-gold/30 flex items-center gap-1"
                                                        title="Lançar Adiantamento para este prestador"
                                                    >
                                                        <Wallet size={12} /> Adiantar
                                                    </button>
                                                    {c.saldoAPagar > 0 && (
                                                        <button
                                                            onClick={() => quitarMutation.mutate(c.id)}
                                                            disabled={quitarMutation.isPending}
                                                            className="px-3 py-1 bg-green-500/20 border border-green-500/40 text-green-400 text-xs hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1"
                                                            title="Marcar como pago manualmente"
                                                        >
                                                            <Check size={12} /> Quitar
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {c.quitado && c.dataQuitacao && (
                                                <span className="text-xs text-cyber-gold/40">{new Date(c.dataQuitacao).toLocaleDateString('pt-BR')}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            }

            <AdiantamentoModal
                isOpen={adiantamentoModal.isOpen}
                onClose={() => setAdiantamentoModal(prev => ({ ...prev, isOpen: false }))}
                onSuccess={() => {
                    refetch();
                    setActionModal({
                        isOpen: true,
                        type: 'success',
                        title: 'Sucesso',
                        message: 'Adiantamento registrado e repasse atualizado.',
                        onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
                    });
                }}
                funcionarioId={adiantamentoModal.funcionarioId || 0}
                funcionarioNome={adiantamentoModal.funcionarioNome}
            />

            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                type={actionModal.type}
                title={actionModal.title}
                message={actionModal.message}
                onConfirm={actionModal.onConfirm}
                showCancel={actionModal.type === 'warning'}
                confirmText={actionModal.type === 'warning' ? 'SIM, RECALCULAR' : 'OK'}
            />
        </div >
    );
};

