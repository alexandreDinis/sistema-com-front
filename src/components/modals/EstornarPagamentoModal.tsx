import React, { useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { financeiroService } from '../../services/financeiroService';
import { formatarDataLocal } from '../../utils/faturaUtils';
import type { ContaPagar, EstornoContaPagar } from '../../types';

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface EstornarPagamentoModalProps {
    conta: ContaPagar;
    onClose: () => void;
    onSuccess: (estorno: EstornoContaPagar) => void;
}

export const EstornarPagamentoModal: React.FC<EstornarPagamentoModalProps> = ({
    conta,
    onClose,
    onSuccess,
}) => {
    const [motivo, setMotivo] = useState('');
    const [processando, setProcessando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const inFlightRef = useRef(false);

    const motivoValido = motivo.trim().length >= 10;

    const handleEstornar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!motivoValido || inFlightRef.current) return;

        inFlightRef.current = true;
        setProcessando(true);
        setErro(null);

        try {
            const estorno = await financeiroService.estornarContaPagar(conta.id, {
                motivo: motivo.trim(),
                reabrirConta: true,
            });
            onSuccess(estorno);
        } catch (err: unknown) {
            const axiosErr = err as { response?: { data?: { message?: string } } };
            setErro(
                axiosErr.response?.data?.message ||
                    'Não foi possível concluir o estorno. Nenhuma alteração foi aplicada.'
            );
        } finally {
            inFlightRef.current = false;
            setProcessando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !processando && onClose()}
        >
            <div
                className="w-full max-w-lg bg-[#0f1117] border border-amber-500/45 rounded-xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 pb-4 mb-5 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                            <RotateCcw size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-amber-300 tracking-wide uppercase">
                                Estorno Financeiro Auditável
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Operação registrada permanentemente para auditoria.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processando}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white border border-white/10 cursor-pointer disabled:opacity-40"
                        aria-label="Fechar modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Snapshot do pagamento original */}
                <div className="bg-[#161923] border border-white/10 rounded-lg p-4 mb-4 text-xs space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-white">{conta.descricao}</span>
                        <span className="text-lg font-black text-cyber-gold font-mono">
                            {formatCurrency(conta.valor)}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-gray-300">
                        <div>
                            <span className="text-gray-400 block">Pago em</span>
                            <strong className="font-mono">
                                {conta.dataPagamento ? formatarDataLocal(conta.dataPagamento) : '—'}
                            </strong>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Vencimento</span>
                            <strong className="font-mono">{formatarDataLocal(conta.dataVencimento)}</strong>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/35 rounded-lg p-3 mb-4 text-xs text-amber-200 flex items-start gap-2">
                    <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-400" />
                    <span>
                        Use o estorno <strong>apenas para corrigir um pagamento registrado por engano</strong>.
                        O pagamento original <strong>não será apagado</strong> (ficará preservado como{' '}
                        <strong>CANCELADO</strong> na auditoria), o valor sairá do fluxo de caixa pago e a
                        conta/fatura voltará automaticamente para <strong>PENDENTE</strong>.
                    </span>
                </div>

                <form onSubmit={handleEstornar} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                            Justificativa do Estorno (obrigatória, mín. 10 caracteres)
                        </label>
                        <textarea
                            value={motivo}
                            onChange={(e) => {
                                setMotivo(e.target.value);
                                setErro(null);
                            }}
                            disabled={processando}
                            rows={3}
                            maxLength={500}
                            placeholder="Ex.: Fatura de novembro marcada como paga acidentalmente em outubro..."
                            className="w-full bg-[#161923] border border-white/15 text-gray-100 text-sm rounded-lg p-3 outline-none focus:border-amber-400 resize-none"
                            required
                        />
                        <div className="flex justify-between text-[11px] mt-1">
                            <span className={motivoValido ? 'text-emerald-400' : 'text-gray-400'}>
                                {motivoValido
                                    ? 'Justificativa válida'
                                    : `Faltam ${Math.max(0, 10 - motivo.trim().length)} caracteres`}
                            </span>
                            <span className="text-gray-500">{motivo.length}/500</span>
                        </div>
                    </div>

                    {erro && (
                        <div className="border border-cyber-error/60 bg-cyber-error/10 rounded-lg p-3 text-cyber-error text-xs flex items-start gap-2">
                            <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                            <span>{erro}</span>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processando}
                            className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-white/15 text-gray-300 hover:text-white cursor-pointer disabled:opacity-40"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!motivoValido || processando}
                            className="px-5 py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wider bg-amber-400 text-black hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            {processando ? 'Estornando...' : 'Confirmar Estorno'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
