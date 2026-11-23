import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock, Save } from 'lucide-react';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { avaliarForcaSenha, validarAlteracaoSenha } from '../../utils/userMenuUtils';

export const ChangePasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = authService.getCurrentUser();
    const mustChange = Boolean(currentUser?.mustChangePassword);

    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const forcaSenha = useMemo(
        () => avaliarForcaSenha(passwords.newPassword),
        [passwords.newPassword]
    );

    const changePasswordMutation = useMutation({
        mutationFn: () => userService.changePassword(passwords.currentPassword, passwords.newPassword),
        onSuccess: () => {
            const user = authService.getCurrentUser();
            if (user) {
                user.mustChangePassword = false;
                localStorage.setItem('user', JSON.stringify(user));
            }
            setSuccess(true);
            setTimeout(() => navigate('/'), 1800);
        },
        onError: (err: unknown) => {
            const responseError =
                typeof err === 'object' &&
                err !== null &&
                'response' in err &&
                typeof (err as { response?: { data?: { error?: string; message?: string } } }).response?.data === 'object'
                    ? (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ||
                      (err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.message
                    : undefined;
            setError(responseError || 'Erro ao alterar senha. Verifique sua senha atual e tente novamente.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const erroValidacao = validarAlteracaoSenha(passwords);
        if (erroValidacao) {
            setError(erroValidacao);
            return;
        }

        changePasswordMutation.mutate();
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#080a0f] flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-[#0f1117] border border-emerald-500/35 p-8 rounded-2xl shadow-2xl text-center space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-400">
                        <CheckCircle2 size={28} />
                    </div>
                    <h1 className="text-xl font-extrabold text-white">Senha alterada com sucesso</h1>
                    <p className="text-sm text-gray-400">
                        Sua nova senha já está ativa. Redirecionando para o painel...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080a0f] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0f1117] border border-cyber-gold/25 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-cyber-gold/15 border border-cyber-gold/30 flex items-center justify-center text-cyber-gold shrink-0">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-white tracking-tight">Alterar Senha</h1>
                        <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                            {mustChange
                                ? 'Por segurança, defina uma nova senha antes de continuar.'
                                : 'Mantenha sua conta protegida com uma senha forte.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 rounded-xl flex items-center gap-2 text-red-300 text-xs">
                            <AlertTriangle size={15} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Senha Atual */}
                    <div>
                        <label
                            htmlFor="pwd-current"
                            className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                        >
                            Senha Atual
                        </label>
                        <div className="relative">
                            <input
                                id="pwd-current"
                                type={showPasswords.current ? 'text' : 'password'}
                                required
                                autoComplete="current-password"
                                className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold text-white text-sm px-3.5 py-2.5 pr-11 rounded-xl outline-none transition-colors placeholder:text-gray-600"
                                value={passwords.currentPassword}
                                onChange={(e) => {
                                    setPasswords({ ...passwords, currentPassword: e.target.value });
                                    if (error) setError('');
                                }}
                                placeholder="Digite sua senha atual"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyber-gold transition-colors p-1 cursor-pointer"
                                aria-label={showPasswords.current ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                            >
                                {showPasswords.current ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    {/* Nova Senha */}
                    <div>
                        <label
                            htmlFor="pwd-new"
                            className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                        >
                            Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                id="pwd-new"
                                type={showPasswords.new ? 'text' : 'password'}
                                required
                                autoComplete="new-password"
                                className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold text-white text-sm px-3.5 py-2.5 pr-11 rounded-xl outline-none transition-colors placeholder:text-gray-600"
                                value={passwords.newPassword}
                                onChange={(e) => {
                                    setPasswords({ ...passwords, newPassword: e.target.value });
                                    if (error) setError('');
                                }}
                                placeholder="Mínimo de 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyber-gold transition-colors p-1 cursor-pointer"
                                aria-label={showPasswords.new ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                            >
                                {showPasswords.new ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 mt-2">
                            {[1, 2, 3, 4].map((step) => (
                                <div
                                    key={step}
                                    className={`h-1 rounded-full transition-colors ${
                                        forcaSenha.score >= step ? forcaSenha.barClass : 'bg-white/10'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className={`text-[11px] mt-1.5 ${forcaSenha.textClass}`}>{forcaSenha.label}</p>
                    </div>

                    {/* Confirmar Nova Senha */}
                    <div>
                        <label
                            htmlFor="pwd-confirm"
                            className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5"
                        >
                            Confirmar Nova Senha
                        </label>
                        <div className="relative">
                            <input
                                id="pwd-confirm"
                                type={showPasswords.confirm ? 'text' : 'password'}
                                required
                                autoComplete="new-password"
                                className="w-full bg-[#090b10] border border-white/15 focus:border-cyber-gold text-white text-sm px-3.5 py-2.5 pr-11 rounded-xl outline-none transition-colors placeholder:text-gray-600"
                                value={passwords.confirmPassword}
                                onChange={(e) => {
                                    setPasswords({ ...passwords, confirmPassword: e.target.value });
                                    if (error) setError('');
                                }}
                                placeholder="Repita a nova senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-cyber-gold transition-colors p-1 cursor-pointer"
                                aria-label={showPasswords.confirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                            >
                                {showPasswords.confirm ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        {!mustChange && (
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                disabled={changePasswordMutation.isPending}
                                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <ArrowLeft size={15} />
                                Voltar
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={changePasswordMutation.isPending}
                            className="flex-1 inline-flex items-center justify-center gap-2 bg-cyber-gold hover:brightness-110 text-black font-extrabold py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Save size={15} />
                            {changePasswordMutation.isPending ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
