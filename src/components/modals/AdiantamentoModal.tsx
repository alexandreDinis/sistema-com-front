import React, { useState } from 'react';
import { X, Wallet, Calendar, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { adiantamentoService } from '../../services/adiantamentoService';
import { formatInputCurrency, parseCurrencyString } from '../../utils/formatters';

interface AdiantamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    funcionarioId: number;
    funcionarioNome: string;
}

interface ApiErrorLike {
    response?: {
        data?: {
            message?: string;
            mensagem?: string;
        };
    };
}

const getHojeIso = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const getIniciais = (nome?: string): string => {
    if (!nome) return 'PR';
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[1][0]).toUpperCase();
};

export const AdiantamentoModal: React.FC<AdiantamentoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    funcionarioId,
    funcionarioNome,
}) => {
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataPagamento, setDataPagamento] = useState(getHojeIso);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        if (isLoading) return;
        setError(null);
        onClose();
    };

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValor(formatInputCurrency(e.target.value));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const valorNumerico = parseCurrencyString(valor);
        if (valorNumerico <= 0) {
            setError('O valor deve ser maior que zero.');
            return;
        }

        setIsLoading(true);
        try {
            await adiantamentoService.registrarAdiantamento({
                usuarioId: funcionarioId,
                valor: valorNumerico,
                dataPagamento,
                descricao: descricao.trim() || `Adiantamento para ${funcionarioNome}`,
            });
            setValor('');
            setDescricao('');
            setDataPagamento(getHojeIso());
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const apiErr = (err as ApiErrorLike) || {};
            setError(
                apiErr.response?.data?.message ||
                    apiErr.response?.data?.mensagem ||
                    'Erro ao registrar adiantamento.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) handleClose();
            }}
        >
            <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />

                {/* Header */}
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-cyber-gold/15 border border-cyber-gold/35 text-cyber-gold flex items-center justify-center shrink-0">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-orbitron font-bold text-white">Lançar Adiantamento</h3>
                            <p className="text-[11px] text-gray-400">O valor será descontado do saldo de repasse.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Fechar"
                        className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-5 space-y-4">
                        {/* Prestador */}
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/10">
                            <div className="w-9 h-9 rounded-lg bg-cyber-gold/15 border border-cyber-gold/30 text-cyber-gold text-xs font-bold flex items-center justify-center shrink-0">
                                {getIniciais(funcionarioNome)}
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-oxanium uppercase tracking-wider text-gray-500 block">
                                    Prestador
                                </span>
                                <p className="text-sm font-bold text-white truncate">{funcionarioNome}</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/35 text-red-200 text-xs">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> Data *
                                </label>
                                <input
                                    type="date"
                                    value={dataPagamento}
                                    onChange={(e) => setDataPagamento(e.target.value)}
                                    className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none transition-colors"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5 block">
                                    Valor (R$) *
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={valor}
                                    onChange={handleValorChange}
                                    placeholder="R$ 0,00"
                                    className="w-full bg-black/50 border border-white/15 text-cyber-gold px-3 py-2.5 rounded-xl text-base font-mono font-bold focus:border-cyber-gold outline-none transition-colors"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" /> Observação / Motivo (opcional)
                            </label>
                            <textarea
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                placeholder="Ex: Vale quinzenal, adiantamento de repasse..."
                                rows={2}
                                className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none transition-colors resize-none"
                            />
                        </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !valor}
                            className="bg-cyber-gold text-black font-bold px-5 py-2 rounded-xl hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-oxanium text-xs sm:text-sm inline-flex items-center gap-1.5"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            {isLoading ? 'Salvando...' : 'Confirmar Adiantamento'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
