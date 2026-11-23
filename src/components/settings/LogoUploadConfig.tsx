import React, { useState, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Image, Loader2, Check, AlertCircle, X } from 'lucide-react';
import { empresaService } from '../../services/empresaService';
import { MAX_LOGO_SIZE_MB, validateLogoFile } from '../../utils/empresaConfigUtils';

export const LogoUploadConfig: React.FC = () => {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const { data: config, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['empresa-config'],
        queryFn: empresaService.getConfig,
        staleTime: 60_000,
    });

    const getUploadErrorMessage = (error: unknown): string => {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError?.response?.status === 413) {
            return `Arquivo excede o limite do servidor (máx. ${MAX_LOGO_SIZE_MB}MB). Reduza o tamanho da imagem.`;
        }
        if (axiosError?.response?.status === 400) {
            return 'Formato de imagem inválido. Utilize PNG, JPEG ou WebP.';
        }
        return 'Não foi possível enviar o logo agora. Tente novamente.';
    };

    const uploadMutation = useMutation({
        mutationFn: (file: File) => {
            if (!config?.id) throw new Error('Empresa não encontrada');
            return empresaService.uploadLogo(config.id, file);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
            setPreviewUrl(null);
            setValidationError(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        onError: () => {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
    });

    const handleFileSelect = useCallback(
        (file: File) => {
            if (uploadMutation.isPending) return;
            setValidationError(null);

            const errorMsg = validateLogoFile(file);
            if (errorMsg) {
                setValidationError(errorMsg);
                setPreviewUrl(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);

            uploadMutation.mutate(file);
        },
        [uploadMutation]
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const currentLogoUrl =
        config?.logoUrl || (config?.id ? empresaService.getLogoUrl(config.id) : null);
    const displayUrl = previewUrl || (config?.logoUrl ? currentLogoUrl : null);

    if (isLoadingConfig) {
        return (
            <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-cyber-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-zinc-900/75 border border-white/10 p-5 sm:p-6 space-y-6">
            <div className="pb-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
                        <Image className="w-4 h-4 text-cyber-gold shrink-0" />
                        <span>Logo da Empresa</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">
                        Utilizado no cabeçalho do sistema, relatórios financeiros e PDFs de Ordem de Serviço.
                    </p>
                </div>
                {uploadMutation.isPending && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-cyber-gold font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Enviando...
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)] gap-6 items-center">
                {/* Preview */}
                <div className="flex flex-col items-center gap-2">
                    <div className="w-36 h-36 rounded-2xl border border-cyber-gold/30 bg-zinc-950/90 flex items-center justify-center overflow-hidden p-3">
                        {displayUrl ? (
                            <img
                                src={displayUrl}
                                alt="Logo da empresa"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <Image className="w-10 h-10 text-zinc-600" />
                        )}
                    </div>
                    <span className="text-xs text-zinc-500">
                        {displayUrl ? 'Logo atual' : 'Nenhum logo enviado'}
                    </span>
                </div>

                {/* Dropzone */}
                <div
                    onClick={() => !uploadMutation.isPending && fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`rounded-2xl border-2 border-dashed p-7 text-center transition-all ${
                        isDragOver
                            ? 'border-cyber-gold bg-cyber-gold/10'
                            : 'border-cyber-gold/30 hover:border-cyber-gold/60 bg-zinc-950/50'
                    } ${uploadMutation.isPending ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleInputChange}
                        className="hidden"
                    />

                    <div className="w-11 h-11 rounded-xl bg-cyber-gold/10 text-cyber-gold flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-zinc-300">
                        {isDragOver ? (
                            'Solte o arquivo aqui'
                        ) : (
                            <>
                                <span className="text-cyber-gold font-semibold">
                                    Clique para selecionar
                                </span>{' '}
                                ou arraste uma nova imagem
                            </>
                        )}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5">
                        Formatos aceitos: PNG, JPEG ou WebP • Máximo {MAX_LOGO_SIZE_MB}MB
                    </p>
                </div>
            </div>

            {validationError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{validationError}</span>
                    <button
                        type="button"
                        onClick={() => setValidationError(null)}
                        className="text-amber-300/70 hover:text-amber-200"
                        aria-label="Fechar aviso"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}

            {uploadMutation.isError && (
                <div className="flex items-center gap-2.5 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{getUploadErrorMessage(uploadMutation.error)}</span>
                </div>
            )}

            {uploadMutation.isSuccess && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-xs text-emerald-300">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Logo atualizado com sucesso.</span>
                </div>
            )}
        </div>
    );
};
