import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CreditCard, Wallet } from 'lucide-react';
import { despesaService } from '../../services/despesaService';
import { cartaoService } from '../../services/cartaoService';
import { calcularMesReferenciaFatura } from '../../utils/faturaUtils';
import type { CartaoCredito, Despesa, DespesaRequest } from '../../types';

interface DespesaFormProps {
    cartoes?: CartaoCredito[];
}

const getTodayIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const DespesaForm: React.FC<DespesaFormProps> = ({ cartoes: cartoesProp }) => {
    const queryClient = useQueryClient();
    const [modo, setModo] = useState<'cartao' | 'comum'>('comum');
    const [cartoesLocal, setCartoesLocal] = useState<CartaoCredito[]>([]);
    const cartoes = cartoesProp ?? cartoesLocal;

    const [dataDespesa, setDataDespesa] = useState(getTodayIso());
    const [valorStr, setValorStr] = useState('');
    const [categoria, setCategoria] = useState('DIVERSOS');
    const [descricao, setDescricao] = useState('');
    const [pagoAgora, setPagoAgora] = useState(false);
    const [meioPagamento, setMeioPagamento] = useState('');
    const [dataVencimento, setDataVencimento] = useState('');
    const [cartaoId, setCartaoId] = useState<number | undefined>(undefined);
    const [numeroParcelas, setNumeroParcelas] = useState(1);

    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState(false);

    useEffect(() => {
        if (!cartoesProp) {
            cartaoService.listar().then(setCartoesLocal).catch(console.error);
        }
    }, [cartoesProp]);

    // Ao alternar para modo cartão, selecionar automaticamente o primeiro cartão se houver
    const handleSetModo = (novoModo: 'cartao' | 'comum') => {
        setModo(novoModo);
        setError(null);
        if (novoModo === 'cartao') {
            if (!cartaoId && cartoes.length > 0) {
                setCartaoId(cartoes[0].id);
            }
            setPagoAgora(false);
            setMeioPagamento('CARTAO_CREDITO');
            setDataVencimento('');
        } else {
            setCartaoId(undefined);
            setNumeroParcelas(1);
            setMeioPagamento('');
        }
    };

    const { data: limiteInfo = null, isLoading: loadingLimite } = useQuery({
        queryKey: ['cartao-limite', cartaoId],
        queryFn: () => cartaoService.getLimiteDisponivel(cartaoId!),
        enabled: modo === 'cartao' && Boolean(cartaoId),
    });

    const cartaoSelecionado = useMemo(
        () => cartoes.find((c) => c.id === cartaoId),
        [cartoes, cartaoId]
    );

    const previaFatura = useMemo(() => {
        if (modo !== 'cartao' || !cartaoSelecionado) return null;
        return calcularMesReferenciaFatura(dataDespesa, cartaoSelecionado.diaFechamento);
    }, [modo, cartaoSelecionado, dataDespesa]);

    const numericValor = useMemo(() => {
        if (!valorStr) return 0;
        const parsed = parseFloat(valorStr.replace(/\./g, '').replace(',', '.'));
        return Number.isNaN(parsed) ? 0 : parsed;
    }, [valorStr]);

    const { mutate, isPending: isLoading } = useMutation<Despesa | Despesa[], unknown, DespesaRequest>({
        mutationFn: async (data) => {
            if (data.cartaoId && data.numeroParcelas && data.numeroParcelas > 1) {
                return despesaService.createParcelada(data);
            }
            return despesaService.create(data);
        },
        onSuccess: () => {
            setSuccessMessage(true);
            setValorStr('');
            setDescricao('');
            setNumeroParcelas(1);
            queryClient.invalidateQueries({ queryKey: ['cartao-limite'] });
            queryClient.invalidateQueries({ queryKey: ['comissao'] });
            queryClient.invalidateQueries({ queryKey: ['relatorio'] });
            queryClient.invalidateQueries({ queryKey: ['despesas'] });
            queryClient.invalidateQueries({ queryKey: ['financeiro'] });
            queryClient.invalidateQueries({ queryKey: ['faturas'] });
            setTimeout(() => setSuccessMessage(false), 3000);
        },
        onError: (err: unknown) => {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setError(axiosErr.response?.data?.message || 'Falha ao registrar despesa.');
        },
    });

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (!digits) {
            setValorStr('');
            return;
        }
        const num = parseInt(digits, 10) / 100;
        setValorStr(
            new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }).format(num)
        );
        setError(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (numericValor <= 0) {
            setError('Informe um valor válido maior que zero.');
            return;
        }

        if (modo === 'cartao') {
            if (!cartaoId) {
                setError('Selecione um cartão de crédito.');
                return;
            }
            mutate({
                dataDespesa,
                valor: numericValor,
                categoria,
                descricao,
                pagoAgora: false,
                meioPagamento: 'CARTAO_CREDITO',
                cartaoId,
                numeroParcelas,
            });
            return;
        }

        if (pagoAgora && !meioPagamento) {
            setError('Para pagamento à vista, informe o meio de pagamento.');
            return;
        }

        if (!pagoAgora && !dataVencimento) {
            setError('Para despesa a prazo, informe a data de vencimento.');
            return;
        }

        mutate({
            dataDespesa,
            valor: numericValor,
            categoria,
            descricao,
            pagoAgora,
            dataVencimento: pagoAgora ? undefined : dataVencimento,
            meioPagamento: meioPagamento || undefined,
            numeroParcelas: 1,
        });
    };

    const percentualUsado =
        limiteInfo && limiteInfo.limiteTotal
            ? Math.min(100, Math.max(0, ((limiteInfo.limiteUtilizado || 0) / limiteInfo.limiteTotal) * 100))
            : 0;

    return (
        <div className="bg-[#0f1117] border border-cyber-gold/25 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
                <h2 className="text-base font-bold text-cyber-gold tracking-wide flex items-center gap-2">
                    <span>＋</span> Novo Lançamento
                </h2>
                <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                    Automático
                </span>
            </div>

            {/* Alternador visual: Cartão vs Comum */}
            <div className="grid grid-cols-2 gap-1 bg-black/70 border border-cyber-gold/20 rounded-lg p-1 mb-5">
                <button
                    type="button"
                    onClick={() => handleSetModo('cartao')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        modo === 'cartao'
                            ? 'bg-cyber-gold text-black shadow'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <CreditCard size={14} />
                    Cartão de Crédito
                </button>
                <button
                    type="button"
                    onClick={() => handleSetModo('comum')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        modo === 'comum'
                            ? 'bg-cyber-gold text-black shadow'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <Wallet size={14} />
                    Despesa Comum
                </button>
            </div>

            {error && (
                <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs mb-4 flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {successMessage && (
                <div className="border border-emerald-500/50 bg-emerald-500/10 rounded-lg p-3 text-emerald-300 text-xs mb-4 flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>Lançamento salvo com sucesso!</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Bloco Cartão */}
                {modo === 'cartao' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Cartão Corporativo
                        </label>
                        {cartoes.length === 0 ? (
                            <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5">
                                Nenhum cartão ativo cadastrado. Cadastre um cartão em Financeiro → Cartões.
                            </p>
                        ) : (
                            <select
                                value={cartaoId ?? ''}
                                onChange={(e) => {
                                    setCartaoId(e.target.value ? Number(e.target.value) : undefined);
                                    setError(null);
                                }}
                                className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold transition-colors cursor-pointer"
                                style={{ colorScheme: 'dark' }}
                                required
                            >
                                <option value="">Selecione um cartão...</option>
                                {cartoes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nome} (Fecha dia {c.diaFechamento ?? 25} · Vence dia {c.diaVencimento})
                                    </option>
                                ))}
                            </select>
                        )}

                        {cartaoId && (
                            <div className="mt-2 bg-[#161923] border border-cyber-gold/20 rounded-lg p-2.5 text-xs">
                                {loadingLimite ? (
                                    <span className="text-gray-400 animate-pulse">Consultando limite disponível...</span>
                                ) : limiteInfo && limiteInfo.limiteTotal != null ? (
                                    <div>
                                        <div className="flex justify-between text-gray-400">
                                            <span>Limite disponível</span>
                                            <strong
                                                className={
                                                    (limiteInfo.limiteDisponivel || 0) < 0
                                                        ? 'text-cyber-error'
                                                        : 'text-cyber-gold'
                                                }
                                            >
                                                {formatCurrency(limiteInfo.limiteDisponivel || 0)} /{' '}
                                                {formatCurrency(limiteInfo.limiteTotal)}
                                            </strong>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mt-1.5">
                                            <div
                                                className="h-full bg-cyber-gold transition-all duration-300"
                                                style={{ width: `${percentualUsado}%` }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-gray-400">
                                        Agrupado automaticamente na fatura mensal do cartão.
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Data + Valor */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            {modo === 'cartao' ? 'Data da Compra' : 'Data da Despesa'}
                        </label>
                        <input
                            type="date"
                            value={dataDespesa}
                            onChange={(e) => {
                                setDataDespesa(e.target.value);
                                setError(null);
                            }}
                            className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold transition-colors"
                            style={{ colorScheme: 'dark' }}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Valor (R$)
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={valorStr}
                            onChange={handleValorChange}
                            placeholder="0,00"
                            className="w-full bg-[#161923] border border-white/10 text-cyber-gold font-bold text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold transition-colors"
                            required
                        />
                    </div>
                </div>

                {/* Prévia da Fatura em tempo real */}
                {modo === 'cartao' && cartaoSelecionado && previaFatura && (
                    <div
                        className={`rounded-lg p-2.5 text-xs border flex items-start gap-2 ${
                            previaFatura.caiuProximoMes
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                                : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                        }`}
                    >
                        {previaFatura.caiuProximoMes ? (
                            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
                        ) : (
                            <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-400" />
                        )}
                        <div>
                            <div className="font-bold">
                                Fatura de destino: {previaFatura.labelMes} ({previaFatura.mesReferencia})
                            </div>
                            <div className="text-[11px] opacity-85 mt-0.5">
                                {previaFatura.caiuProximoMes
                                    ? `Após fechamento (dia ${cartaoSelecionado.diaFechamento ?? 25}) — cairá na fatura do mês seguinte.`
                                    : `Dentro do fechamento (até dia ${cartaoSelecionado.diaFechamento ?? 25}) — entra na fatura deste mês.`}
                            </div>
                        </div>
                    </div>
                )}

                {/* Parcelamento (apenas cartão) */}
                {modo === 'cartao' && (
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Parcelamento
                        </label>
                        <select
                            value={numeroParcelas}
                            onChange={(e) => setNumeroParcelas(Number(e.target.value))}
                            className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                                const vParc = numericValor > 0 ? ` — ${formatCurrency(numericValor / num)}` : '';
                                return (
                                    <option key={num} value={num}>
                                        {num}x{vParc} {num === 1 ? '(À vista na fatura)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                {/* Opções Despesa Comum */}
                {modo === 'comum' && (
                    <div className="space-y-3 bg-white/[0.02] border border-white/10 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-semibold text-gray-200 block">Pago à vista?</span>
                                <span className="text-[11px] text-gray-400 block">
                                    Marque se o valor já saiu do caixa hoje.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPagoAgora((p) => !p)}
                                className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    pagoAgora ? 'bg-cyber-gold justify-end' : 'bg-white/15 justify-start'
                                }`}
                                aria-label="Alternar pago à vista"
                            >
                                <div className="w-5 h-5 rounded-full bg-black shadow" />
                            </button>
                        </div>

                        {pagoAgora ? (
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Meio de Pagamento
                                </label>
                                <select
                                    value={meioPagamento}
                                    onChange={(e) => setMeioPagamento(e.target.value)}
                                    className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                    required
                                >
                                    <option value="">Selecione...</option>
                                    <option value="PIX">PIX</option>
                                    <option value="DINHEIRO">Dinheiro</option>
                                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                                    <option value="TRANSFERENCIA">Transferência (TED/DOC)</option>
                                    <option value="BOLETO">Boleto</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Data de Vencimento
                                </label>
                                <input
                                    type="date"
                                    value={dataVencimento}
                                    onChange={(e) => setDataVencimento(e.target.value)}
                                    className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold"
                                    style={{ colorScheme: 'dark' }}
                                    required
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Categoria */}
                <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Categoria</label>
                    <select
                        value={categoria}
                        onChange={(e) => setCategoria(e.target.value)}
                        className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                        required
                    >
                        <optgroup label="── SERVIÇOS PRESTADOS ──">
                            <option value="MATERIAIS_APLICADOS">🔩 Materiais Aplicados</option>
                            <option value="SERVICOS_TERCEIROS">👥 Serviços de Terceiros</option>
                        </optgroup>
                        <optgroup label="── PESSOAL ──">
                            <option value="SALARIOS">💰 Valor Base do Repasse</option>
                            <option value="PROLABORE">👔 Pró-labore</option>
                            <option value="COMISSOES">🤝 Repasses por Serviço</option>
                            <option value="BENEFICIOS">🎁 Benefícios</option>
                            <option value="ADIANTAMENTOS">💸 Adiantamentos ao Prestador</option>
                        </optgroup>
                        <optgroup label="── ADMINISTRATIVO ──">
                            <option value="OCUPACAO">🏠 Ocupação (Aluguel)</option>
                            <option value="UTILIDADES">💡 Utilidades (Luz/Água)</option>
                            <option value="MANUTENCAO_PREDIAL">🔨 Manutenção Predial</option>
                            <option value="MATERIAL_USO_CONSUMO">📎 Material de Uso e Consumo</option>
                            <option value="SERVICOS_PROFISSIONAIS">⚖️ Serviços Profissionais</option>
                        </optgroup>
                        <optgroup label="── COMERCIAL ──">
                            <option value="MARKETING">📢 Marketing</option>
                            <option value="VIAGENS_REPRESENTACAO">✈️ Viagens</option>
                            <option value="COMBUSTIVEL">⛽ Combustível</option>
                            <option value="ALIMENTACAO">🍽️ Alimentação</option>
                            <option value="MANUTENCAO_VEICULO">🔧 Manutenção Veículo</option>
                        </optgroup>
                        <optgroup label="── FINANCEIRO ──">
                            <option value="TARIFAS_BANCARIAS">🏦 Tarifas Bancárias</option>
                            <option value="JUROS_PASSIVOS">📉 Juros Passivos</option>
                        </optgroup>
                        <optgroup label="── TRIBUTÁRIO ──">
                            <option value="IMPOSTOS_SOBRE_VENDA">📋 Impostos sobre Venda</option>
                            <option value="TAXAS_DIVERSAS">🎫 Taxas Diversas</option>
                        </optgroup>
                        <optgroup label="── OUTROS ──">
                            <option value="DIVERSOS">📦 Diversos</option>
                            <option value="OUTROS">❓ Outros</option>
                        </optgroup>
                    </select>
                </div>

                {/* Descrição */}
                <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">Descrição</label>
                    <input
                        type="text"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Ex.: Fornecedor, combustível, almoço..."
                        className="w-full bg-[#161923] border border-white/10 text-gray-100 text-sm rounded-lg p-2.5 outline-none focus:border-cyber-gold transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-cyber-gold text-black font-extrabold text-sm py-3 px-4 rounded-lg hover:brightness-110 transition-all disabled:opacity-50 cursor-pointer"
                >
                    {isLoading ? 'Salvando...' : 'Salvar Lançamento'}
                </button>
            </form>
        </div>
    );
};
