import React, { useState } from 'react';
import { X, DollarSign, Calendar, FileText, Loader2 } from 'lucide-react';
import { adiantamentoService } from '../../services/adiantamentoService';
import { formatInputCurrency, parseCurrencyString } from '../../utils/formatters';

interface AdiantamentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    funcionarioId: number;
    funcionarioNome: string;
}

export const AdiantamentoModal: React.FC<AdiantamentoModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    funcionarioId,
    funcionarioNome
}) => {
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValor(formatInputCurrency(e.target.value));
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
                descricao: descricao || `Adiantamento para ${funcionarioNome}`
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Erro ao registrar adiantamento.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-black/90 border border-cyber-gold/30 p-6 rounded-lg max-w-md w-full relative shadow-[0_0_50px_rgba(212,175,55,0.15)]">
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold animate-pulse"></div>

                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-orbitron text-cyber-gold uppercase tracking-wider flex items-center gap-2">
                        <DollarSign size={20} />
                        Lançar Adiantamento
                    </h3>
                    <button onClick={onClose} className="text-cyber-gold/40 hover:text-cyber-gold transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="mb-6 p-3 bg-cyber-gold/5 border border-cyber-gold/20">
                    <span className="text-[10px] font-mono text-cyber-gold/40 uppercase block mb-1">PRESTADOR_ALVO:</span>
                    <p className="text-lg font-bold text-cyber-gold italic tracking-tight">{funcionarioNome}</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-mono text-cyber-gold/60 uppercase block mb-1.5 flex items-center gap-1.5">
                            <Calendar size={12} /> Data do Pagamento
                        </label>
                        <input
                            type="date"
                            value={dataPagamento}
                            onChange={(e) => setDataPagamento(e.target.value)}
                            className="w-full bg-black/40 border border-cyber-gold/20 text-cyber-gold p-2.5 text-sm font-mono focus:border-cyber-gold outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-mono text-cyber-gold/60 uppercase block mb-1.5 flex items-center gap-1.5">
                            <DollarSign size={12} /> Valor do Adiantamento
                        </label>
                        <input
                            type="text"
                            value={valor}
                            onChange={handleValorChange}
                            placeholder="R$ 0,00"
                            className="w-full bg-black/40 border border-cyber-gold/20 text-cyber-gold p-2.5 text-lg font-black italic focus:border-cyber-gold outline-none transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-mono text-cyber-gold/60 uppercase block mb-1.5 flex items-center gap-1.5">
                            <FileText size={12} /> Observação / Motivo
                        </label>
                        <textarea
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Ex: Adiantamento de repasse..."
                            className="w-full bg-black/40 border border-cyber-gold/20 text-cyber-gold p-2.5 text-xs font-mono min-h-[80px] focus:border-cyber-gold outline-none transition-all resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-white/5 text-cyber-gold/60 py-3 font-oxanium text-xs uppercase hover:bg-white/10 transition-all border border-white/5"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || !valor}
                            className="flex-1 bg-cyber-gold text-black py-3 font-oxanium font-bold text-xs uppercase hover:bg-yellow-400 transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'CONFIRMAR'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
