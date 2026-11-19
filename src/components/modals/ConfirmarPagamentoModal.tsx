import React, { useMemo, useRef, useState } from 'react';
import {
    AlertOctagon,
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Lock,
    RotateCcw,
    X,
} from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { classificarPagamento } from '../../utils/pagamentoUtils';
import { formatarDataLocal } from '../../utils/faturaUtils';
import type { ContaPagar, MeioPagamento } from '../../types';

const MEIOS_PAGAMENTO: { value: MeioPagamento; label: string }[] = [
    { value: 'PIX', label: 'PIX' },
    { value: 'TRANSFERENCIA', label: 'Transferência (TED/DOC)' },
    { value: 'BOLETO', label: 'Boleto' },
    { value: 'DINHEIRO', label: 'Dinheiro' },
    { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
    { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
    { value: 'CHEQUE', label: 'Cheque' },
];

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const getTodayIso = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

interface ConfirmarPagamentoModalProps {
    conta: ContaPagar;
    meioPagamentoInicial?: MeioPagamento;
    onClose: () => void;
    onSuccess: (contaAtualizada: ContaPagar) => void;
    onSolicitarEstorno?: (conta: ContaPagar) => void;
}

export const ConfirmarPagamentoModal: React.FC<ConfirmarPagamentoModalProps> = ({
    conta,
    meioPagamentoInicial = 'PIX',
    onClose,
    onSuccess,
    onSolicitarEstorno,
}) => {
    const [dataPagamento, setDataPagamento] = useState(getTodayIso());
    const [meioPagamento, setMeioPagamento] = useState<MeioPagamento>(meioPagamentoInicial);
    const [confirmado, setConfirmado] = useState(false);
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const inFlightRef = useRef(false);

    const diagnostico = useMemo(
        () => classificarPagamento(conta, dataPagamento),
        [conta, dataPagamento]
    );

    const handleConfirmar = async () => {
        if (!diagnostico.podeConfirmar || !confirmado || inFlightRef.current) return;

        inFlightRef.current = true;
        setProcessando(true);
        setErro(null);

        try {
            const atualizada = await financeiroService.pagarConta(conta.id, {
                dataPagamento,
                meioPagamento,
            });
            onSuccess(atualizada);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErro(
                axiosErr.response?.data?.message ||
                    'Não foi possível registrar o pagamento. Verifique a conexão e tente novamente.'
            );
        } finally {
            inFlightRef.current = false;
            setProcessando(false);
        }
    };

    const bannerStyles = {
        NORMAL: 'bg-cyan-500/10 border-cyan-500/35 text-cyan-200',
        ANTECIPADO: 'bg-amber-500/10 border-amber-500/45 text-amber-200',
        FATURA_FUTURA: 'bg-red-500/15 border-red-500/55 text-red-200',
        BLOQUEADO: 'bg-red-500/20 border-red-500/60 text-red-200',
    }[diagnostico.nivel];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !processando && onClose()}
        >
            <div
                className="w-full max-w-lg bg-[#0f1117] border border-cyber-gold/40 rounded-xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-extrabold text-cyber-gold tracking-wide uppercase">
                            Confirmar Pagamento
                        </h2>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Confira atentamente os dados antes de registrar a saída no caixa.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processando}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors cursor-pointer disabled:opacity-40"
                        aria-label="Fechar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Resumo da Conta */}
                <div className="bg-[#161923] border border-white/10 rounded-lg p-4 mb-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-bold text-white">{conta.descricao}</div>
                            {conta.mesReferencia && (
                                <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                    Referência da Fatura: {conta.mesReferencia}
                                </span>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-[11px] uppercase text-gray-400">Valor</div>
                            <div className="text-2xl font-black text-cyber-error font-mono">
                                {formatCurrency(conta.valor)}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-white/10 text-xs">
                        <div>
                            <span className="text-gray-400 block">Data de Vencimento</span>
                            <strong className="text-gray-100 font-mono flex items-center gap-1 mt-0.5">
                                <Calendar size={12} className="text-cyber-gold" />
                                {formatarDataLocal(conta.dataVencimento)}
                            </strong>
                        </div>
                        {diagnostico.dataFechamentoReal && (
                            <div>
                                <span className="text-gray-400 block">Fechamento do Ciclo</span>
                                <strong className="text-gray-100 font-mono mt-0.5 block">
                                    {formatarDataLocal(diagnostico.dataFechamentoReal)}
                                </strong>
                            </div>
                        )}
                    </div>
                </div>

                {/* Banner de Nível de Atenção (4 níveis) */}
                <div className={`border rounded-lg p-3.5 mb-4 text-xs flex items-start gap-2.5 ${bannerStyles}`}>
                    {diagnostico.nivel === 'BLOQUEADO' && <Lock size={18} className="shrink-0 mt-0.5" />}
                    {diagnostico.nivel === 'FATURA_FUTURA' && <AlertOctagon size={18} className="shrink-0 mt-0.5" />}
                    {diagnostico.nivel === 'ANTECIPADO' && <AlertTriangle size={18} className="shrink-0 mt-0.5" />}
                    {diagnostico.nivel === 'NORMAL' && <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                    <div>
                        <div className="font-bold text-sm">{diagnostico.titulo}</div>
                        <p className="mt-0.5 opacity-90 leading-relaxed">{diagnostico.mensagem}</p>
                    </div>
                </div>

                {/* Campos editáveis (apenas quando pode confirmar) */}
                {diagnostico.podeConfirmar && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Data Efetiva do Pagamento
                                </label>
                                <input
                                    type="date"
                                    value={dataPagamento}
                                    onChange={(e) => {
                                        setDataPagamento(e.target.value);
                                        setErro(null);
                                    }}
                                    disabled={processando}
                                    className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-cyber-gold"
                                    style={{ colorScheme: 'dark' }}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                                    Meio de Pagamento
                                </label>
                                <select
                                    value={meioPagamento}
                                    onChange={(e) => setMeioPagamento(e.target.value as MeioPagamento)}
                                    disabled={processando}
                                    className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg px-3 py-2.5 outline-none focus:border-cyber-gold cursor-pointer"
                                    style={{ colorScheme: 'dark' }}
                                >
                                    {MEIOS_PAGAMENTO.map((mp) => (
                                        <option key={mp.value} value={mp.value}>
                                            {mp.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Impacto no Fluxo de Caixa */}
                        <div className="bg-black/50 border border-white/10 rounded-lg p-3 mb-4 text-xs text-gray-300">
                            <span className="text-gray-400 uppercase text-[10px] tracking-wider block mb-1">
                                Impacto no Fluxo de Caixa
                            </span>
                            Saída de <strong className="text-cyber-gold">{formatCurrency(conta.valor)}</strong> será
                            registrada no caixa de{' '}
                            <strong className="text-white">{diagnostico.mesImpactoCaixa}</strong> (data efetiva{' '}
                            <strong className="font-mono text-white">{formatarDataLocal(dataPagamento)}</strong>).
                            Correções futuras exigirão estorno auditável com justificativa.
                        </div>

                        {/* Checkbox Obrigatório */}
                        <label className="flex items-start gap-2.5 p-3 rounded-lg bg-white/[0.03] border border-white/10 mb-4 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={confirmado}
                                onChange={(e) => setConfirmado(e.target.checked)}
                                disabled={processando}
                                className="mt-0.5 accent-cyber-gold w-4 h-4 cursor-pointer"
                            />
                            <span className="text-xs text-gray-200 leading-relaxed">
                                Confirmo o valor, o vencimento e a data efetiva do pagamento acima, e desejo
                                registrar esta saída no fluxo de caixa.
                            </span>
                        </label>
                    </>
                )}

                {erro && (
                    <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs mb-4 flex items-start gap-2">
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <span>{erro}</span>
                    </div>
                )}

                {/* Botões */}
                <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processando}
                        className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white hover:border-white/30 transition-colors cursor-pointer disabled:opacity-40"
                    >
                        Cancelar
                    </button>

                    {!diagnostico.podeConfirmar && conta.status === 'PAGO' && onSolicitarEstorno && (
                        <button
                            type="button"
                            onClick={() => onSolicitarEstorno(conta)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 transition-colors cursor-pointer"
                        >
                            <RotateCcw size={14} />
                            Ir para Estorno Auditável
                        </button>
                    )}

                    {diagnostico.podeConfirmar && (
                        <button
                            type="button"
                            onClick={handleConfirmar}
                            disabled={!confirmado || processando || !dataPagamento}
                            className="px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-cyber-gold text-black hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {processando ? 'Processando...' : 'Confirmar Pagamento'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
