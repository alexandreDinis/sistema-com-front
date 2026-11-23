import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { authService } from '../../services/authService';
import { useForm } from '../../hooks/useForm';
import { OuroborosEmblem } from './OuroborosEmblem';
import { mapearErroLogin, normalizarEmailLogin, resolverDestinoPosLogin } from '../../utils/loginUtils';

export const LoginForm: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const { values, handleChange } = useForm({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            const user = await authService.login({
                email: normalizarEmailLogin(values.email),
                password: values.password,
            });
            const destino = resolverDestinoPosLogin(user);
            navigate(destino);
        } catch (err: unknown) {
            setError(mapearErroLogin(err));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-[400px] bg-[#0f121a]/95 border border-cyber-gold/25 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/70 backdrop-blur-md">
            {/* Compact Ouroboros Header on Mobile/Tablet */}
            <div className="lg:hidden flex flex-col items-center text-center mb-6">
                <OuroborosEmblem size="sm" />
                <span className="mt-2.5 text-sm font-orbitron font-bold tracking-wider text-white">
                    MARTELINHO <span className="text-cyber-gold">DIGITAL</span>
                </span>
            </div>

            <div className="mb-6 text-center lg:text-left">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight normal-case">
                    Entrar na Conta
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                    Informe suas credenciais para acessar o sistema.
                </p>
            </div>

            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/35 text-red-300 px-3.5 py-3 rounded-xl text-xs mb-5 leading-relaxed"
                >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label
                        htmlFor="login-email"
                        className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                    >
                        E-mail
                    </label>
                    <div className="relative">
                        <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            id="login-email"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={values.email}
                            onChange={(e) => {
                                handleChange(e);
                                if (error) setError(null);
                            }}
                            className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold focus:ring-2 focus:ring-cyber-gold/15 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-gray-600"
                            placeholder="seu@email.com"
                            required
                        />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor="login-password"
                            className="block text-[11px] font-bold uppercase tracking-wider text-gray-400"
                        >
                            Senha
                        </label>
                        <Link
                            to="/forgot-password"
                            className="text-[11px] font-semibold text-cyber-gold hover:underline transition-colors"
                        >
                            Esqueci minha senha
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            id="login-password"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            autoComplete="current-password"
                            value={values.password}
                            onChange={(e) => {
                                handleChange(e);
                                if (error) setError(null);
                            }}
                            className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold focus:ring-2 focus:ring-cyber-gold/15 text-white text-sm pl-10 pr-11 py-2.5 rounded-xl outline-none transition-all placeholder:text-gray-600"
                            placeholder="Digite sua senha"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyber-gold transition-colors p-1 cursor-pointer"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#e2c055] to-cyber-gold text-[#090b10] text-sm font-extrabold tracking-wide hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Entrando...
                        </>
                    ) : (
                        'Entrar'
                    )}
                </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/10 text-center text-[11px] text-gray-500">
                Powered by <span className="text-cyber-gold font-semibold">Oroboros Technology</span> · Acesso protegido
            </div>
        </div>
    );
};
