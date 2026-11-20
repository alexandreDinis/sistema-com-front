import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { despesaService } from '../../services/despesaService';
import { cartaoService } from '../../services/cartaoService';
import { calcularMesReferenciaFatura } from '../../utils/faturaUtils';
import type { CartaoCredito, Despesa, DespesaRequest } from '../../types';

interface DespesaEditModalProps {
    despesa: Despesa;
    onClose: () => void;
}

const formatValorInput = (val: number): string =>
    new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(val);

export const DespesaEditModal: React.FC<DespesaEditModalProps> = ({ despesa, onClose }) => {
    const queryClient = useQueryClient();

    const [dataDespesa, setDataDespesa] = useState(despesa.dataDespesa.slice(0, 10));
    const [valorStr, setValorStr] = useState(formatValorInput(despesa.valor));
    const [categoria, setCategoria] = useState<string>(despesa.categoria || 'DIVERSOS');
    const [descricao, setDescricao] = useState(despesa.descricao || '');
    const [cartaoId, setCartaoId] = useState<number | undefined>(despesa.cartao?.id);
    const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        cartaoService.listar().then(setCartoes).catch(console.error);
    }, []);

    const cartaoSelecionado = useMemo(() => {
        if (!cartaoId) return undefined;
        return cartoes.find((c) => c.id === cartaoId) ?? (despesa.cartao?.id === cartaoId ? despesa.cartao : undefined);
    }, [cartaoId, cartoes, despesa.cartao]);

    const previaFatura = useMemo(() => {
        if (!cartaoSelecionado) return null;
        return calcularMesReferenciaFatura(dataDespesa, cartaoSelecionado.diaFechamento);
    }, [cartaoSelecionado, dataDespesa]);

    const updateMutation = useMutation({
        mutationFn: (payload: DespesaRequest) => despesaService.atualizar(despesa.id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro'] });
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
            queryClient.invalidateQueries({ queryKey: ['relatorio'] });
            onClose();
        },
        onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Erro ao atualizar despesa.');
        },
    });

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (!digits) {
            setValorStr('');
            return;
        }
        const numeric = parseInt(digits, 10) / 100;
        setValorStr(formatValorInput(numeric));
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericValor = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
        if (Number.isNaN(numericValor) || numericValor <= 0) {
            setError('Informe um valor positivo válido.');
            return;
        }

        const payload: DespesaRequest = {
            dataDespesa,
            valor: numericValor,
            categoria,
            descricao,
            cartaoId,
            pagoAgora: false,
            meioPagamento: cartaoId ? 'CARTAO_CREDITO' : undefined,
        };

        updateMutation.mutate(payload);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="hud-card top-brackets bottom-brackets w-full max-w-lg bg-black border border-cyber-gold/40 p-6 relative max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-cyber-gold/20">
                    <div>
                        <h3 className="text-lg font-black text-cyber-gold uppercase tracking-widest italic">
                            Editar Lançamento #{despesa.id}
                        </h3>
                        <p className="text-[10px] font-mono text-cyber-gold/50 uppercase">
                            RECÁLCULO AUTOMÁTICO DE FATURAS E CONTAS A PAGAR
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-cyber-gold/60 hover:text-cyber-gold border border-cyber-gold/20 hover:border-cyber-gold/50 transition-colors"
                        aria-label="Fechar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {error && (
                    <div className="border border-cyber-error bg-cyber-error/10 p-3 text-cyber-error text-xs font-mono mb-5 flex items-start gap-2">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Cartão de Crédito */}
                    <div>
                        <label className="hud-label">CARTÃO CORPORATIVO (Opcional)</label>
                        <select
                            value={cartaoId ?? ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setCartaoId(val ? Number(val) : undefined);
                                setError(null);
                            }}
                            className="w-full bg-black border border-cyber-gold/30 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold"
                            style={{ colorScheme: 'dark' }}
                        >
                            <option value="">— NENHUM (Despesa Comum) —</option>
                            {cartoes.map((c) => (
                                <option key={c.id} value={c.id}>
                                    💳 {c.nome} (Fecha dia {c.diaFechamento ?? 25} / Vence dia {c.diaVencimento})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Data + Prévia da Fatura */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="hud-label flex items-center gap-1">
                                <Calendar size={12} /> DATA DA DESPESA
                            </label>
                            <input
                                type="date"
                                value={dataDespesa}
                                onChange={(e) => {
                                    setDataDespesa(e.target.value);
                                    setError(null);
                                }}
                                className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold"
                                style={{ colorScheme: 'dark' }}
                                required
                            />
                        </div>

                        <div>
                            <label className="hud-label">VALOR (BRL)</label>
                            <input
                                type="text"
                                value={valorStr}
                                onChange={handleValorChange}
                                className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold text-base font-black p-3 outline-none focus:border-cyber-gold"
                                placeholder="0,00"
                                required
                            />
                        </div>
                    </div>

                    {/* Prévia dinâmica da fatura do cartão */}
                    {cartaoSelecionado && previaFatura && (
                        <div
                            className={`p-3 border text-xs font-mono flex items-start gap-2.5 ${
                                previaFatura.caiuProximoMes
                                    ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'
                                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            }`}
                        >
                            {previaFatura.caiuProximoMes ? (
                                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            ) : (
                                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                            )}
                            <div>
                                <div className="font-bold flex items-center gap-1.5">
                                    <CreditCard size={13} />
                                    Fatura de destino: {previaFatura.labelMes} ({previaFatura.mesReferencia})
                                </div>
                                <div className="text-[11px] opacity-80 mt-0.5">
                                    {previaFatura.caiuProximoMes
                                        ? `Data após o fechamento (dia ${cartaoSelecionado.diaFechamento ?? 25}) — será lançada na fatura do mês seguinte.`
                                        : `Data dentro do fechamento (até dia ${cartaoSelecionado.diaFechamento ?? 25}) — permanece na fatura deste mês.`}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Categoria */}
                    <div>
                        <label className="hud-label">CATEGORIA</label>
                        <select
                            value={categoria}
                            onChange={(e) => setCategoria(e.target.value)}
                            className="w-full bg-black border border-cyber-gold/30 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold"
                            style={{ colorScheme: 'dark' }}
                            required
                        >
                            <optgroup label="── SERVIÇOS PRESTADOS ──">
                                <option value="MATERIAIS_APLICADOS">🔩 MATERIAIS APLICADOS</option>
                                <option value="SERVICOS_TERCEIROS">👥 SERVIÇOS DE TERCEIROS</option>
                            </optgroup>
                            <optgroup label="── PESSOAL ──">
                                <option value="SALARIOS">💰 VALOR BASE DO REPASSE</option>
                                <option value="PROLABORE">👔 PRÓ-LABORE</option>
                                <option value="COMISSOES">🤝 REPASSES POR SERVIÇO</option>
                                <option value="BENEFICIOS">🎁 BENEFÍCIOS</option>
                                <option value="ADIANTAMENTOS">💸 ADIANTAMENTOS AO PRESTADOR</option>
                            </optgroup>
                            <optgroup label="── ADMINISTRATIVO ──">
                                <option value="OCUPACAO">🏠 OCUPAÇÃO (ALUGUEL)</option>
                                <option value="UTILIDADES">💡 UTILIDADES (LUZ/ÁGUA)</option>
                                <option value="MANUTENCAO_PREDIAL">🔨 MANUTENÇÃO PREDIAL</option>
                                <option value="MATERIAL_USO_CONSUMO">📎 MATERIAL DE USO E CONSUMO</option>
                                <option value="SERVICOS_PROFISSIONAIS">⚖️ SERVIÇOS PROFISSIONAIS</option>
                            </optgroup>
                            <optgroup label="── COMERCIAL ──">
                                <option value="MARKETING">📢 MARKETING</option>
                                <option value="VIAGENS_REPRESENTACAO">✈️ VIAGENS</option>
                                <option value="COMBUSTIVEL">⛽ COMBUSTÍVEL</option>
                                <option value="ALIMENTACAO">🍽️ ALIMENTAÇÃO</option>
                                <option value="MANUTENCAO_VEICULO">🔧 MANUTENÇÃO VEÍCULO</option>
                            </optgroup>
                            <optgroup label="── FINANCEIRO ──">
                                <option value="TARIFAS_BANCARIAS">🏦 TARIFAS BANCÁRIAS</option>
                                <option value="JUROS_PASSIVOS">📉 JUROS PASSIVOS</option>
                            </optgroup>
                            <optgroup label="── TRIBUTÁRIO ──">
                                <option value="IMPOSTOS_SOBRE_VENDA">📋 IMPOSTOS SOBRE VENDA</option>
                                <option value="TAXAS_DIVERSAS">🎫 TAXAS DIVERSAS</option>
                            </optgroup>
                            <optgroup label="── OUTROS ──">
                                <option value="DIVERSOS">📦 DIVERSOS</option>
                                <option value="OUTROS">❓ OUTROS</option>
                            </optgroup>
                        </select>
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="hud-label">DESCRIÇÃO</label>
                        <input
                            type="text"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full bg-black/60 border border-cyber-gold/30 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold"
                            placeholder="Descrição da despesa"
                        />
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-cyber-gold/20">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-mono uppercase border border-cyber-gold/30 text-cyber-gold/70 hover:text-cyber-gold hover:border-cyber-gold transition-colors"
                            disabled={updateMutation.isPending}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-xs font-black uppercase tracking-widest bg-cyber-gold text-black hover:bg-cyber-gold/90 transition-colors disabled:opacity-50"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
