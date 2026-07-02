import React, { useState, useEffect } from 'react';
import { useAdiantamento } from '../../hooks/useAdiantamento';
import { useForm } from '../../hooks/useForm';
import { userService } from '../../services/userService';
import type { User } from '../../types';
import { formatInputCurrency, parseCurrencyString } from '../../utils/formatters';

export const AdiantamentoForm: React.FC = () => {
    const { registrar, isLoading, error, isSuccess } = useAdiantamento();

    const [usuarios, setUsuarios] = useState<User[]>([]);

    useEffect(() => {
        userService.getUsers().then(setUsuarios).catch(console.error);
    }, []);

    // Usando memo para estabilizar initialValues e evitar loop no reset
    const initialValues = React.useMemo(() => ({
        dataPagamento: new Date().toISOString().split('T')[0],
        valor: '', // Usamos string para o mask
        descricao: '',
        usuarioId: '',
    }), []);

    const { values, reset, setValues, handleChange } = useForm<any>(initialValues);
    const [successMessage, setSuccessMessage] = useState(false);

    const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = formatInputCurrency(e.target.value);
        setValues((prev: any) => ({ ...prev, valor: maskedValue }));
    };

    // ✅ Limpar mensagem de sucesso após 3 segundos
    useEffect(() => {
        if (isSuccess) {
            setSuccessMessage(true);
            reset();
            const timer = setTimeout(() => {
                setSuccessMessage(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, reset]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const valorNumerico = parseCurrencyString(values.valor);

        if (!values.dataPagamento || valorNumerico <= 0) {
            alert('Por favor, preencha todos os campos obrigatórios com um valor maior que zero');
            return;
        }

        // ✅ OBRIGATÓRIO: Funcionário deve ser selecionado
        if (!values.usuarioId) {
            alert('Por favor, selecione o prestador para o adiantamento (obrigatório para auditoria)');
            return;
        }

        const usuarioIdNumber = parseInt(values.usuarioId);

        registrar({
            dataPagamento: values.dataPagamento,
            valor: valorNumerico,
            descricao: values.descricao,
            usuarioId: usuarioIdNumber,
        });
    };

    return (
        <div className="hud-card top-brackets bottom-brackets p-8 max-w-md mx-auto relative overflow-hidden bg-black/60">
            <div className="static-overlay opacity-10"></div>

            <div className="flex justify-between items-center mb-10 pb-4 border-b border-cyber-gold/20">
                <h2 className="text-xl font-black text-cyber-gold tracking-widest uppercase italic italic-shadow">
                    [CONSOLE_ALOC_CRÉDITO]
                </h2>
                <span className="text-[8px] font-mono text-cyber-gold/40">SIST_OVR: ALTO</span>
            </div>

            {error && (
                <div className="border border-cyber-error bg-cyber-error/5 p-4 text-cyber-error text-[10px] font-mono mb-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-error animate-pulse"></div>
                    <span className="font-black uppercase block mb-1">IO_ERROR:</span>
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="border border-cyber-gold bg-cyber-gold/5 p-4 text-cyber-gold text-[10px] font-mono mb-6 relative overflow-hidden animate-pulse">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold"></div>
                    <span className="font-black uppercase block mb-1">IO_SUCESSO:</span>
                    ALOCAÇÃO_ESTÁVEL. RECONSTRUINDO_GRÁFICO...
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="relative group/field">
                    <label className="hud-label group-focus-within/field:text-cyber-gold transition-colors">
                        REF_CARIMBO
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            name="dataPagamento"
                            value={values.dataPagamento}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-cyber-gold/10 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all"
                            required
                            id="adiantamento-date"
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-px bg-cyber-gold group-focus-within/field:w-full transition-all duration-500"></div>
                    </div>
                </div>



                <div className="relative group/field">
                    <label className="hud-label group-focus-within/field:text-cyber-gold transition-colors">
                        PRESTADOR (ALVO)
                    </label>
                    <div className="relative">
                        <select
                            name="usuarioId"
                            value={values.usuarioId}
                            onChange={handleChange as any}
                            className="w-full bg-black/40 border border-cyber-gold/10 text-cyber-gold text-sm font-mono p-3 outline-none focus:border-cyber-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all appearance-none"
                            id="adiantamento-usuario"
                            required
                        >
                            <option value="">[SELECIONE_AGENTE... *OBRIGATÓRIO]</option>
                            {usuarios.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.name || u.email}
                                </option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-cyber-gold/40 text-[10px]">▼</div>
                        <div className="absolute bottom-0 left-0 w-0 h-px bg-cyber-gold group-focus-within/field:w-full transition-all duration-500"></div>
                    </div>
                </div>

                <div className="relative group/field">
                    <label className="hud-label group-focus-within/field:text-cyber-gold transition-colors">
                        PESO_CRÉDITO (BRL)
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyber-gold/40 font-black font-mono text-xs">
                            ALLOC_
                        </span>
                        <input
                            type="text"
                            name="valor"
                            value={values.valor}
                            onChange={handleValorChange}
                            className="w-full bg-black/40 border border-cyber-gold/10 text-cyber-gold text-lg font-black italic p-3 pl-16 outline-none focus:border-cyber-gold focus:shadow-[0_0_20px_rgba(212,175,55,0.15)] transition-all"
                            placeholder="0,00"
                            required
                            id="adiantamento-valor"
                        />
                    </div>
                </div>

                <div className="relative group/field">
                    <label className="hud-label group-focus-within/field:text-cyber-gold transition-colors">
                        ANEXAR_METADADOS
                    </label>
                    <textarea
                        name="descricao"
                        value={values.descricao}
                        onChange={handleChange as any}
                        className="w-full bg-black/40 border border-cyber-gold/10 text-cyber-gold text-xs font-mono p-3 min-h-[100px] outline-none focus:border-cyber-gold focus:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all resize-none"
                        placeholder="FORNEÇA_CONTEXTO_SE_NECESSÁRIO..."
                        rows={3}
                        id="adiantamento-descricao"
                    />
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full hud-button"
                        id="adiantamento-submit"
                    >
                        {isLoading ? '>>> CRIPTOGRAFANDO...' : 'CONFIRMAR_ALOCAÇÃO'}
                    </button>
                    <p className="text-[9px] font-mono text-cyber-gold/60 text-center mt-3 tracking-wider">
                        ⚠️ ATENÇÃO: ESTA AÇÃO GERA UMA <span className="text-cyber-gold font-bold">DESPESA PAGA</span> AUTOMATICAMENTE NO FINANCEIRO.
                    </p>
                </div>

                <div className="flex justify-between items-center pt-2 text-[7px] text-cyber-gold/20 font-mono tracking-widest uppercase">
                    <span>OBOOS_SECURE_NODE_09</span>
                    <span>TAG: EXP_CREDIT</span>
                </div>
            </form>
        </div>
    );
};
