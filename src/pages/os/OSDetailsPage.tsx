import React, { useState, useMemo } from 'react';
import { formatarData } from '../../utils/formatters';
import { ajustarValorCobrado, filtrarCatalogo, formatarStatusOS } from '../../utils/osUtils';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import { prestadorService } from '../../services/prestadorService';
import { userService } from '../../services/userService';
import {
    ArrowLeft,
    Car,
    Wrench,
    CheckCircle2,
    Plus,
    Minus,
    Ban,
    History,
    FileDown,
    Trash2,
    User as UserIcon,
    Edit2,
    Save,
    ChevronDown,
    Image,
    EyeOff,
    Calendar,
    Clock,
    X,
    Search,
} from 'lucide-react';
import { VehicleHistoryModal } from '../../components/modals/VehicleHistoryModal';
import { DuplicatePlateModal } from '../../components/modals/DuplicatePlateModal';
import { ActionModal } from '../../components/modals/ActionModal';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { limparPlaca, validarPlaca } from '../../utils/validators';
import { PlateInput } from '../../components/forms/PlateInput';
import { VeiculoImagemGrid } from '../../components/os/VeiculoImagemGrid';
import type { ActionModalType } from '../../components/modals/ActionModal';
import type { AddPecaRequest, OSStatus, TipoPeca, VeiculoExistente, TipoExecucao } from '../../types';

interface ApiErrorLike {
    response?: {
        status?: number;
        data?: {
            error?: string;
            message?: string;
            mensagem?: string;
            limite?: number;
        };
    };
}

const getApiError = (err: unknown): ApiErrorLike => (err as ApiErrorLike) || {};

export const OSDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const osId = parseInt(id || '0', 10);
    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(
        osService.getApiBaseUrl()
    );

    // Modals & UI State
    const [isVeiculoModalOpen, setVeiculoModalOpen] = useState(false);
    const [isPecaModalOpen, setPecaModalOpen] = useState<{ isOpen: boolean; veiculoId: number | null }>({
        isOpen: false,
        veiculoId: null,
    });
    const [catalogoSearch, setCatalogoSearch] = useState('');
    const [passoValor, setPassoValor] = useState<number>(50);
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean; placa: string; modelo: string }>({
        isOpen: false,
        placa: '',
        modelo: '',
    });
    const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean; data?: VeiculoExistente }>({
        isOpen: false,
    });
    const [actionModal, setActionModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: ActionModalType;
        confirmText?: string;
        cancelText?: string;
        onConfirm?: () => void;
        showCancel?: boolean;
    }>({ isOpen: false, title: '', message: '', type: 'info' });

    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);
    const [showPdfMenu, setShowPdfMenu] = useState(false);
    const [ocultarTotalPdf, setOcultarTotalPdf] = useState(false);
    const [discountForm, setDiscountForm] = useState<{
        tipoDesconto: 'PERCENTUAL' | 'VALOR_FIXO' | null;
        valorDesconto: string;
    }>({ tipoDesconto: null, valorDesconto: '' });

    // Forms State
    const [veiculoForm, setVeiculoForm] = useState({ placa: '', modelo: '', cor: '' });
    const [pecaForm, setPecaForm] = useState<{
        tipoPecaId: string;
        valorCobrado: string;
        descricao: string;
        tipoExecucao: TipoExecucao;
        prestadorId: string;
        custoPrestador: string;
        dataVencimentoPrestador: string;
    }>({
        tipoPecaId: '',
        valorCobrado: '',
        descricao: '',
        tipoExecucao: 'INTERNO',
        prestadorId: '',
        custoPrestador: '',
        dataVencimentoPrestador: '',
    });

    const [isEditingUser, setIsEditingUser] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Queries
    const { data: os, isLoading } = useQuery({
        queryKey: ['ordem-servico', osId],
        queryFn: () => osService.getOSById(osId),
        enabled: !!osId,
    });

    const { data: catalogo = [] } = useQuery({
        queryKey: ['catalogo'],
        queryFn: osService.listTiposPeca,
    });

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores'],
        queryFn: () => prestadorService.listar(true),
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users-equipe'],
        queryFn: userService.getEquipe,
    });

    const catalogoFiltrado = useMemo(
        () => filtrarCatalogo(catalogo, catalogoSearch),
        [catalogo, catalogoSearch]
    );

    const selectedCatalogItem = useMemo(
        () => catalogo.find((item) => item.id === parseInt(pecaForm.tipoPecaId, 10)) || null,
        [catalogo, pecaForm.tipoPecaId]
    );

    // Mutations
    const updateOwnerMutation = useMutation({
        mutationFn: (newUserId: number) => osService.updateOS(osId, { usuarioId: newUserId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setIsEditingUser(false);
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Responsável Atualizado',
                message: 'O responsável técnico/vendedor foi atualizado com sucesso.',
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: () => {
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro',
                message: 'Não foi possível atualizar o responsável.',
                showCancel: false,
                confirmText: 'FECHAR',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const handleUpdateOwner = () => {
        if (!selectedUserId) return;
        const user = users.find((u) => u.id === parseInt(selectedUserId, 10));
        const userName = user?.name || user?.email || 'este usuário';

        setActionModal({
            isOpen: true,
            title: 'Confirmar Responsável',
            message: `Deseja definir "${userName}" como responsável técnico/vendedor desta OS? Isso é importante para o cálculo de comissões.`,
            type: 'info',
            showCancel: true,
            confirmText: 'SIM, DEFINIR',
            cancelText: 'CANCELAR',
            onConfirm: () => {
                updateOwnerMutation.mutate(parseInt(selectedUserId, 10));
                setActionModal((prev) => ({ ...prev, isOpen: false }));
            },
        });
    };

    const addVeiculoMutation = useMutation({
        mutationFn: osService.addVeiculo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setVeiculoModalOpen(false);
            setVeiculoForm({ placa: '', modelo: '', cor: '' });
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Veículo Adicionado',
                message: 'Veículo cadastrado com sucesso!',
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: (err: unknown) => {
            const error = getApiError(err);
            let title = 'Erro';
            let message = 'Não foi possível adicionar o veículo.';

            if (error.response?.status === 400) {
                title = 'Dados Inválidos';
                message =
                    error.response.data?.mensagem ||
                    'Verifique os dados informados e tente novamente. A placa pode estar em formato inválido.';
            } else if (error.response?.status === 500) {
                title = 'Erro no Servidor';
                message = 'Ocorreu um erro interno no servidor. Tente novamente mais tarde.';
            }

            setActionModal({
                isOpen: true,
                type: 'danger',
                title,
                message,
                showCancel: false,
                confirmText: 'FECHAR',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const addPecaMutation = useMutation({
        mutationFn: osService.addPeca,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setPecaModalOpen({ isOpen: false, veiculoId: null });
            setCatalogoSearch('');
            setPecaForm({
                tipoPecaId: '',
                valorCobrado: '',
                descricao: '',
                tipoExecucao: 'INTERNO',
                prestadorId: '',
                custoPrestador: '',
                dataVencimentoPrestador: '',
            });
        },
    });

    const deletePecaMutation = useMutation({
        mutationFn: osService.deletePeca,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Serviço Removido',
                message: 'O serviço foi removido com sucesso!',
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
        onError: (err: unknown) => {
            const error = getApiError(err);
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro',
                message: error.response?.data?.message || 'Não foi possível remover o serviço.',
                showCancel: false,
                confirmText: 'FECHAR',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: OSStatus) => osService.updateStatus(osId, status),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            queryClient.invalidateQueries({ queryKey: ['ordens-servico-contadores'] });

            setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
                queryClient.invalidateQueries({ queryKey: ['ordens-servico-contadores'] });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                queryClient.invalidateQueries({ queryKey: ['relatorio'] });
                queryClient.invalidateQueries({ queryKey: ['financeiro'] });
                queryClient.invalidateQueries({ queryKey: ['faturamentos'] });
                queryClient.resetQueries({ queryKey: ['comissao'], exact: false });
            }, 1000);
            setIsFinalizeModalOpen(false);
        },
        onError: (err: unknown) => {
            const error = getApiError(err);
            const backendMessage = error.response?.data?.message || error.response?.data?.mensagem;

            if (backendMessage && backendMessage.includes('responsável')) {
                setActionModal({
                    isOpen: true,
                    type: 'warning',
                    title: 'Responsável Necessário',
                    message:
                        backendMessage ||
                        'Não é possível iniciar a OS sem um responsável técnico definido. Edite a OS e atribua um responsável.',
                    showCancel: false,
                    confirmText: 'ENTENDI',
                    onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
                });
            } else {
                setActionModal({
                    isOpen: true,
                    type: 'danger',
                    title: 'Erro ao Atualizar Status',
                    message: backendMessage || 'Não foi possível atualizar o status da OS. Tente novamente.',
                    showCancel: false,
                    confirmText: 'FECHAR',
                    onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
                });
            }
        },
    });

    const updateDiscountMutation = useMutation({
        mutationFn: (data: { tipoDesconto: 'PERCENTUAL' | 'VALOR_FIXO' | null; valorDesconto: number }) =>
            osService.updateDiscount(osId, data.tipoDesconto, data.valorDesconto),
        onSuccess: () => {
            updateStatusMutation.mutate('FINALIZADA');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (targetId: number) => osService.deleteOS(targetId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            queryClient.invalidateQueries({ queryKey: ['ordens-servico-contadores'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            navigate('/os');
        },
        onError: () => {
            setActionModal({
                isOpen: true,
                title: 'Erro na Exclusão',
                message: 'Erro ao excluir a OS. Verifique se existem dependências ou consulte o log.',
                type: 'danger',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
        },
    });

    if (isLoading || !os) {
        return (
            <div className="space-y-4 pb-20">
                <div className="h-12 rounded-xl bg-black/40 border border-white/10 animate-pulse" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 h-40 rounded-xl bg-black/40 border border-white/10 animate-pulse" />
                    <div className="h-40 rounded-xl bg-black/40 border border-white/10 animate-pulse" />
                </div>
            </div>
        );
    }

    const isFinalized = os.status === 'FINALIZADA';
    const isCanceled = os.status === 'CANCELADA';
    const canEdit = !isFinalized && !isCanceled;
    const totalServicos = os.veiculos.reduce((acc, v) => acc + (v.pecas?.length || 0), 0);
    const tecnicoNome =
        os.usuarioNome ||
        users.find((u) => u.id === os.usuarioId)?.name ||
        os.usuarioEmail ||
        'Não atribuído';

    const handleConfirmFinalize = (e: React.FormEvent) => {
        e.preventDefault();
        const valorDesconto = discountForm.valorDesconto ? parseFloat(discountForm.valorDesconto) : 0;

        if (discountForm.tipoDesconto && valorDesconto > 0) {
            updateDiscountMutation.mutate({
                tipoDesconto: discountForm.tipoDesconto,
                valorDesconto,
            });
        } else {
            updateStatusMutation.mutate('FINALIZADA');
        }
    };

    const handleAddVeiculo = (e: React.FormEvent) => {
        e.preventDefault();
        const placaLimpa = limparPlaca(veiculoForm.placa);

        if (!validarPlaca(placaLimpa)) {
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Placa Inválida',
                message: `A placa "${veiculoForm.placa}" não atende aos formatos permitidos.`,
                confirmText: 'ENTENDI',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
            return;
        }

        const jaExiste = os.veiculos.some((v) => limparPlaca(v.placa) === placaLimpa);
        if (jaExiste) {
            setActionModal({
                isOpen: true,
                type: 'warning',
                title: 'Veículo Duplicado',
                message: 'Este veículo já foi adicionado a esta Ordem de Serviço.',
                confirmText: 'OK',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
            return;
        }

        addVeiculoMutation.mutate({
            ordemServicoId: osId,
            ...veiculoForm,
            placa: placaLimpa,
        });
    };

    const handleAddPeca = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isPecaModalOpen.veiculoId || !pecaForm.tipoPecaId) return;

        const valorToSend = pecaForm.valorCobrado ? parseFloat(pecaForm.valorCobrado) : undefined;
        const requestData: AddPecaRequest = {
            veiculoId: isPecaModalOpen.veiculoId,
            tipoPecaId: parseInt(pecaForm.tipoPecaId, 10),
            valorCobrado: valorToSend,
            descricao: pecaForm.descricao || undefined,
            tipoExecucao: pecaForm.tipoExecucao,
        };

        if (pecaForm.tipoExecucao === 'TERCEIRIZADO' && pecaForm.prestadorId) {
            requestData.prestadorId = parseInt(pecaForm.prestadorId, 10);
            if (pecaForm.custoPrestador) {
                requestData.custoPrestador = parseFloat(pecaForm.custoPrestador);
            }
            if (pecaForm.dataVencimentoPrestador) {
                requestData.dataVencimentoPrestador = pecaForm.dataVencimentoPrestador;
            }
        }

        const veiculo = os.veiculos.find((v) => v.id === isPecaModalOpen.veiculoId);
        const jaExiste = veiculo?.pecas.some((p) => p.tipoPecaId === parseInt(pecaForm.tipoPecaId, 10));

        if (jaExiste) {
            setActionModal({
                isOpen: true,
                type: 'warning',
                title: 'Serviço Duplicado',
                message: 'Esse serviço já foi adicionado a este veículo. Deseja continuar?',
                confirmText: 'SIM, ADICIONAR',
                cancelText: 'CANCELAR',
                showCancel: true,
                onConfirm: () => {
                    setActionModal((prev) => ({ ...prev, isOpen: false }));
                    addPecaMutation.mutate(requestData);
                },
            });
            return;
        }

        addPecaMutation.mutate(requestData);
    };

    const handleSelectCatalogItem = (item: TipoPeca) => {
        const valorNum = item.valorPadrao != null ? Number(item.valorPadrao) : NaN;
        setPecaForm((prev) => ({
            ...prev,
            tipoPecaId: String(item.id),
            valorCobrado: !isNaN(valorNum) ? valorNum.toFixed(2) : '',
        }));
    };

    const handleCheckPlaca = async () => {
        const placaLimpa = limparPlaca(veiculoForm.placa);
        if (placaLimpa.length >= 7 && validarPlaca(placaLimpa)) {
            try {
                const check = await osService.verificarPlaca(placaLimpa);
                if (check.existe) {
                    setDuplicateModal({
                        isOpen: true,
                        data: check.veiculoExistente,
                    });
                }
            } catch (error) {
                console.error('Erro ao verificar placa', error);
            }
        }
    };

    const handleDuplicateContinue = () => {
        if (duplicateModal.data) {
            const placaLimpa = limparPlaca(veiculoForm.placa);
            addVeiculoMutation.mutate({
                ordemServicoId: osId,
                placa: placaLimpa,
                modelo: duplicateModal.data.modelo,
                cor: duplicateModal.data.cor,
            });
        }
        setDuplicateModal({ isOpen: false });
        setVeiculoModalOpen(false);
    };

    const handleDuplicateCancel = () => {
        setDuplicateModal({ isOpen: false });
        setVeiculoForm((prev) => ({ ...prev, placa: '' }));
    };

    const handleDuplicateViewHistory = () => {
        const plate = veiculoForm.placa;
        setDuplicateModal({ isOpen: false });
        setVeiculoForm((prev) => ({ ...prev, placa: '' }));
        setVeiculoModalOpen(false);
        setHistoryModal({
            isOpen: true,
            placa: plate,
            modelo: duplicateModal.data?.modelo || 'Veículo',
        });
    };

    const handleStartService = () => {
        if (!os.usuarioId) {
            setActionModal({
                isOpen: true,
                title: 'Responsável Obrigatório',
                message:
                    'Não é possível iniciar a execução sem um responsável definido. Por favor, atribua um técnico ou vendedor na seção "Responsável".',
                type: 'danger',
                showCancel: false,
                confirmText: 'ENTENDI',
                onConfirm: () => setActionModal((prev) => ({ ...prev, isOpen: false })),
            });
            return;
        }
        updateStatusMutation.mutate('EM_EXECUCAO');
    };

    const getStatusBadgeClasses = (status: OSStatus) => {
        switch (status) {
            case 'ABERTA':
                return 'bg-blue-500/15 text-blue-400 border-blue-500/35';
            case 'EM_EXECUCAO':
                return 'bg-amber-500/15 text-amber-400 border-amber-500/35';
            case 'FINALIZADA':
                return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/35';
            case 'CANCELADA':
                return 'bg-red-500/15 text-red-400 border-red-500/35';
        }
    };

    // Preview do desconto no modal de finalização
    const subtotalPreview = os.valorTotalSemDesconto || os.valorTotal;
    const rawDesc = parseFloat(discountForm.valorDesconto);
    const descontoCalculadoPreview =
        discountForm.tipoDesconto && !isNaN(rawDesc) && rawDesc > 0
            ? discountForm.tipoDesconto === 'PERCENTUAL'
                ? Math.min(subtotalPreview, subtotalPreview * (rawDesc / 100))
                : Math.min(subtotalPreview, rawDesc)
            : 0;
    const totalFinalPreview = Math.max(0, subtotalPreview - descontoCalculadoPreview);

    return (
        <div className="pb-40 md:pb-12">
            {/* Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate('/os')}
                        aria-label="Voltar para lista de OS"
                        className="w-9 h-9 rounded-xl bg-black/50 border border-white/10 text-gray-400 hover:text-white hover:border-white/25 flex items-center justify-center transition-colors shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-lg sm:text-2xl font-orbitron font-bold text-white">
                                O.S. #{os.id}
                            </h1>
                            <span
                                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold font-oxanium uppercase tracking-wide ${getStatusBadgeClasses(os.status)}`}
                            >
                                {formatarStatusOS(os.status)}
                            </span>
                            {os.atrasado && (
                                <span className="px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/15 text-red-400 text-[10px] font-bold font-oxanium uppercase">
                                    Atrasada
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                            Emitida em {formatarData(os.data)} · {os.veiculos.length} veículo
                            {os.veiculos.length === 1 ? '' : 's'} · {totalServicos} serviço
                            {totalServicos === 1 ? '' : 's'}
                        </p>
                    </div>
                </div>

                {/* Ações principais */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* PDF Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPdfMenu(!showPdfMenu)}
                            className="bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/45 px-3.5 py-2 rounded-xl hover:bg-cyber-gold hover:text-black transition-all font-oxanium text-xs sm:text-sm font-bold flex items-center gap-2"
                        >
                            <FileDown className="w-4 h-4" />
                            <span>PDF</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        {showPdfMenu && (
                            <div className="absolute top-full mt-2 right-0 bg-[#131826] border border-white/15 rounded-xl shadow-2xl z-50 w-max min-w-[255px] overflow-hidden">
                                <label className="w-full px-4 py-3 bg-black/30 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 border-b border-white/10 cursor-pointer select-none">
                                    <span className="flex items-center gap-2 text-gray-200 font-oxanium text-xs sm:text-sm">
                                        <EyeOff className="w-4 h-4 text-cyber-gold shrink-0" />
                                        Esconder valor total?
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={ocultarTotalPdf}
                                        onChange={(e) => setOcultarTotalPdf(e.target.checked)}
                                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                                    />
                                </label>
                                <button
                                    onClick={() => {
                                        startPdfDownload(
                                            osService.getOSPdfPath(osId, { ocultarTotal: ocultarTotalPdf }),
                                            osService.getOSPdfFilename(osId, os.data)
                                        );
                                        setShowPdfMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-200 hover:bg-white/5 hover:text-white transition-colors font-oxanium text-sm flex items-center gap-2.5 border-b border-white/5"
                                >
                                    <FileDown className="w-4 h-4 text-cyber-gold" /> PDF sem fotos
                                </button>
                                <button
                                    onClick={() => {
                                        startPdfDownload(
                                            osService.getOSPdfPath(osId, {
                                                imagens: true,
                                                ocultarTotal: ocultarTotalPdf,
                                            }),
                                            osService.getOSPdfFilename(osId, os.data)
                                        ).catch((err: unknown) => {
                                            const apiErr = getApiError(err);
                                            if (apiErr.response?.data?.error === 'TooManyImages') {
                                                setActionModal({
                                                    isOpen: true,
                                                    title: 'Limite de imagens excedido',
                                                    message:
                                                        apiErr.response.data.message ||
                                                        `Esta OS tem muitas fotos para incluir no PDF de uma vez (limite: ${apiErr.response.data.limite}). Considere baixar o PDF sem imagens ou revisar a quantidade de fotos por veículo.`,
                                                    type: 'warning',
                                                    showCancel: false,
                                                    confirmText: 'Entendi',
                                                });
                                            }
                                        });
                                        setShowPdfMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-gray-200 hover:bg-white/5 hover:text-white transition-colors font-oxanium text-sm flex items-center gap-2.5"
                                >
                                    <Image className="w-4 h-4 text-cyber-gold" /> PDF com fotos
                                </button>
                            </div>
                        )}
                    </div>

                    {os.status === 'ABERTA' && (
                        <>
                            <button
                                onClick={() => {
                                    setActionModal({
                                        isOpen: true,
                                        title: 'Cancelar OS?',
                                        message: 'Deseja cancelar esta OS? Ela será excluída permanentemente.',
                                        type: 'danger',
                                        confirmText: 'SIM, CANCELAR',
                                        onConfirm: () => deleteMutation.mutate(osId),
                                    });
                                }}
                                className="bg-red-500/10 text-red-400 border border-red-500/35 px-3 py-2 rounded-xl hover:bg-red-500/20 transition-all font-oxanium text-xs sm:text-sm font-semibold flex items-center gap-1.5"
                            >
                                <Ban className="w-4 h-4" />
                                <span className="hidden sm:inline">Cancelar</span>
                            </button>
                            <button
                                onClick={handleStartService}
                                className="hidden md:inline-flex bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-400 transition-all font-oxanium text-sm font-bold items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                <Wrench className="w-4 h-4" /> Iniciar Serviço
                            </button>
                        </>
                    )}

                    {os.status === 'EM_EXECUCAO' && (
                        <button
                            onClick={() => setIsFinalizeModalOpen(true)}
                            className="hidden md:inline-flex bg-emerald-500 text-black px-4 py-2 rounded-xl hover:bg-emerald-400 transition-all font-oxanium text-sm font-bold items-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Finalizar O.S.
                        </button>
                    )}
                </div>
            </div>

            {/* Resumo em 2 colunas balanceadas */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 mb-7">
                {/* Cliente + Metadados */}
                <div className="bg-black/45 border border-white/10 rounded-2xl p-4 sm:p-5">
                    <div className="flex flex-wrap justify-between items-start gap-2 pb-3.5 mb-3.5 border-b border-white/10">
                        <div className="min-w-0">
                            <span className="text-[10px] font-oxanium uppercase tracking-wider text-gray-500">
                                Cliente
                            </span>
                            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                                {os.cliente.nomeFantasia || os.cliente.razaoSocial}
                            </h2>
                            <p className="text-xs text-gray-400 truncate">
                                {[os.cliente.razaoSocial, os.cliente.cnpj].filter(Boolean).join(' · ')}
                            </p>
                        </div>
                        {os.cliente.contato && (
                            <span className="text-xs text-gray-400 font-mono">{os.cliente.contato}</span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {/* Responsável */}
                        <div className="col-span-2 sm:col-span-1 bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-oxanium">
                                    Responsável
                                </span>
                                {canEdit && !isEditingUser && (
                                    <button
                                        onClick={() => {
                                            setIsEditingUser(true);
                                            setSelectedUserId(os.usuarioId?.toString() || '');
                                        }}
                                        className="text-cyber-gold hover:text-white transition-colors"
                                        title="Alterar Responsável"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            {isEditingUser ? (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    <select
                                        className="bg-black border border-white/20 text-white px-2 py-1 rounded-lg text-xs w-full outline-none focus:border-cyber-gold"
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                    >
                                        <option value="">Selecione...</option>
                                        {users.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.name || u.email}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleUpdateOwner}
                                        className="text-emerald-400 hover:text-emerald-300 p-1"
                                        title="Salvar"
                                    >
                                        <Save className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setIsEditingUser(false)}
                                        className="text-red-400 hover:text-red-300 p-1"
                                        title="Cancelar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="text-sm font-bold text-white mt-1 truncate flex items-center gap-1.5"
                                    title={os.usuarioEmail}
                                >
                                    <UserIcon className="w-3.5 h-3.5 text-cyber-gold shrink-0" />
                                    <span className="truncate">{tecnicoNome}</span>
                                </div>
                            )}
                        </div>

                        {/* Data emissão */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-oxanium">
                                Emissão
                            </span>
                            <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                {formatarData(os.data)}
                            </div>
                        </div>

                        {/* Prazo */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500 font-oxanium">
                                Vencimento
                            </span>
                            <div
                                className={`text-sm font-bold mt-1 flex items-center gap-1.5 ${
                                    os.atrasado ? 'text-red-400' : 'text-white'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                {os.dataVencimento ? formatarData(os.dataVencimento) : '—'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card Financeiro */}
                <div className="bg-gradient-to-br from-[#161b29] to-[#0f131c] border border-cyber-gold/35 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                    <div>
                        <span className="text-[10px] font-oxanium uppercase tracking-wider text-cyber-gold font-bold">
                            Resumo Financeiro
                        </span>
                        {os.tipoDesconto && os.valorDesconto && os.valorDesconto > 0 ? (
                            <div className="mt-2 space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-400 font-mono">
                                    <span>Subtotal</span>
                                    <span className="line-through opacity-75">
                                        {(os.valorTotalSemDesconto || os.valorTotal).toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                        })}
                                    </span>
                                </div>
                                <div className="flex justify-between text-emerald-400 font-mono">
                                    <span>
                                        Desconto {os.tipoDesconto === 'PERCENTUAL' ? `(${os.valorDesconto}%)` : ''}
                                    </span>
                                    <span>
                                        -{' '}
                                        {(
                                            (os.valorTotalSemDesconto || 0) - (os.valorTotalComDesconto || 0)
                                        ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-gray-400 mt-1">
                                {os.veiculos.length} veículo{os.veiculos.length === 1 ? '' : 's'} · {totalServicos}{' '}
                                serviço{totalServicos === 1 ? '' : 's'}
                            </p>
                        )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-oxanium">
                            Valor total {os.tipoDesconto ? 'com desconto' : 'acumulado'}
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-cyber-gold font-orbitron tabular-nums mt-0.5">
                            {os.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Veículos e Serviços */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-base sm:text-lg font-orbitron font-bold text-white flex items-center gap-2">
                        <Car className="w-5 h-5 text-cyber-gold" />
                        Veículos e Serviços
                        <span className="text-xs font-sans font-semibold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                            {os.veiculos.length}
                        </span>
                    </h2>
                    {canEdit && (
                        <button
                            onClick={() => setVeiculoModalOpen(true)}
                            className="hidden md:inline-flex items-center gap-1.5 bg-cyber-gold text-black px-4 py-2 rounded-xl hover:bg-yellow-400 transition-all font-oxanium text-xs sm:text-sm font-bold shadow-lg shadow-cyber-gold/25"
                        >
                            <Plus className="w-4 h-4" /> Adicionar Veículo
                        </button>
                    )}
                </div>

                {os.veiculos.length === 0 ? (
                    <div className="text-center py-12 px-4 border border-dashed border-white/15 rounded-2xl text-gray-400 font-oxanium">
                        <Car className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-sm">Nenhum veículo adicionado a esta Ordem de Serviço.</p>
                        {canEdit && (
                            <button
                                onClick={() => setVeiculoModalOpen(true)}
                                className="mt-4 inline-flex items-center gap-1.5 bg-cyber-gold text-black font-bold px-4 py-2 rounded-xl text-xs hover:bg-yellow-400 transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Adicionar Primeiro Veículo
                            </button>
                        )}
                    </div>
                ) : (
                    os.veiculos.map((v) => (
                        <div
                            key={v.id}
                            className="bg-black/45 border border-white/10 rounded-2xl overflow-hidden"
                        >
                            {/* Vehicle Header */}
                            <div className="bg-white/[0.04] px-4 py-3.5 border-b border-white/10 flex flex-wrap justify-between items-center gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="px-3 py-1 rounded-md bg-white text-gray-950 border border-gray-300 border-t-[5px] border-t-blue-700 font-mono text-sm sm:text-base font-black tracking-widest uppercase shadow-md shrink-0">
                                        {v.placa}
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="text-sm sm:text-base font-bold text-white truncate">
                                            {v.modelo}
                                        </h3>
                                        <div className="text-xs text-gray-400">
                                            {v.cor ? `${v.cor} · ` : ''}
                                            {v.pecas.length} serviço{v.pecas.length === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 ml-auto">
                                    <button
                                        onClick={() =>
                                            setHistoryModal({ isOpen: true, placa: v.placa, modelo: v.modelo })
                                        }
                                        className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-gray-300 hover:text-cyber-gold hover:border-cyber-gold/40 transition-colors inline-flex items-center gap-1"
                                    >
                                        <History className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">Histórico</span>
                                    </button>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-500 uppercase">Subtotal</div>
                                        <div className="text-sm sm:text-base font-bold text-white font-mono tabular-nums">
                                            {v.valorTotal.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Services List */}
                            <div className="p-4">
                                {v.pecas.length === 0 ? (
                                    <div className="py-4 text-center text-gray-500 text-xs italic">
                                        Nenhum serviço/peça lançado para este veículo.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {v.pecas.map((p) => (
                                            <div
                                                key={p.id}
                                                className="py-3 first:pt-1 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium text-white flex items-center gap-2 flex-wrap">
                                                        <span className="uppercase">{p.nomePeca}</span>
                                                        {p.tipoExecucao === 'TERCEIRIZADO' && (
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                                Terceirizado
                                                            </span>
                                                        )}
                                                    </div>
                                                    {p.descricao && (
                                                        <p className="text-xs text-gray-400 mt-0.5 italic">
                                                            {p.descricao}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-sm font-mono font-semibold text-gray-200 tabular-nums">
                                                        {p.valorCobrado.toLocaleString('pt-BR', {
                                                            style: 'currency',
                                                            currency: 'BRL',
                                                        })}
                                                    </span>
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => {
                                                                setActionModal({
                                                                    isOpen: true,
                                                                    title: 'Remover Serviço?',
                                                                    message: `Deseja remover "${p.nomePeca}" deste veículo?`,
                                                                    type: 'warning',
                                                                    confirmText: 'SIM, REMOVER',
                                                                    onConfirm: () => deletePecaMutation.mutate(p.id),
                                                                });
                                                            }}
                                                            className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/15 transition-colors"
                                                            title="Remover serviço"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {canEdit && (
                                    <button
                                        onClick={() => {
                                            setCatalogoSearch('');
                                            setPecaModalOpen({ isOpen: true, veiculoId: v.id });
                                        }}
                                        className="mt-3 w-full py-2.5 border border-dashed border-white/20 text-gray-300 hover:text-cyber-gold hover:border-cyber-gold/50 hover:bg-cyber-gold/5 rounded-xl flex justify-center items-center gap-2 text-xs sm:text-sm font-semibold transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar Serviço / Peça
                                    </button>
                                )}

                                <div className="mt-4 pt-3 border-t border-white/10">
                                    <VeiculoImagemGrid veiculoId={v.id} osId={osId} imagens={v.imagens} />
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Botão flutuante compacto "+ Veículo" no modo celular (não obstrui conteúdo graças ao pb-40) */}
            {canEdit && (
                <button
                    onClick={() => setVeiculoModalOpen(true)}
                    aria-label="Adicionar Veículo"
                    className="md:hidden fixed bottom-20 right-4 z-30 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-cyber-gold text-black border border-yellow-300/60 shadow-xl shadow-cyber-gold/30 text-xs font-oxanium font-bold active:scale-95 transition-transform"
                >
                    <Car className="w-4 h-4" />
                    <Plus className="w-3.5 h-3.5 -ml-1" />
                    <span>Veículo</span>
                </button>
            )}

            {/* Barra fixa inferior exclusiva no celular (Total + Ação Principal) */}
            {canEdit && (
                <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#10141e]/95 backdrop-blur-md border-t border-white/10 px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-oxanium">
                            Total da O.S.
                        </div>
                        <div className="text-base font-bold text-cyber-gold font-orbitron tabular-nums">
                            {os.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    </div>
                    {os.status === 'ABERTA' && (
                        <button
                            onClick={handleStartService}
                            className="bg-blue-500 text-white px-4 py-2.5 rounded-xl font-oxanium text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                        >
                            <Wrench className="w-4 h-4" /> Iniciar Serviço
                        </button>
                    )}
                    {os.status === 'EM_EXECUCAO' && (
                        <button
                            onClick={() => setIsFinalizeModalOpen(true)}
                            className="bg-emerald-500 text-black px-4 py-2.5 rounded-xl font-oxanium text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Finalizar O.S.
                        </button>
                    )}
                </div>
            )}

            {/* Modal / Bottom-Sheet: Novo Veículo */}
            {isVeiculoModalOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setVeiculoModalOpen(false);
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-base font-orbitron font-bold text-white">Novo Veículo</h3>
                            <button
                                type="button"
                                onClick={() => setVeiculoModalOpen(false)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleAddVeiculo}>
                            <div className="p-5 space-y-3.5">
                                <PlateInput
                                    value={veiculoForm.placa}
                                    onChange={(val) => setVeiculoForm({ ...veiculoForm, placa: val })}
                                    onBlur={handleCheckPlaca}
                                />
                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                        Modelo *
                                    </label>
                                    <input
                                        placeholder="Ex: Corolla XEi"
                                        required
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                        value={veiculoForm.modelo}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1">
                                        Cor
                                    </label>
                                    <input
                                        placeholder="Ex: Prata"
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                        value={veiculoForm.cor}
                                        onChange={(e) => setVeiculoForm({ ...veiculoForm, cor: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setVeiculoModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={addVeiculoMutation.isPending}
                                    className="bg-cyber-gold text-black px-5 py-2 rounded-xl font-bold hover:bg-yellow-400 font-oxanium text-xs sm:text-sm disabled:opacity-60"
                                >
                                    {addVeiculoMutation.isPending ? 'Adicionando...' : 'Adicionar Veículo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal / Bottom-Sheet: Adicionar Serviço/Peça */}
            {isPecaModalOpen.isOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setPecaModalOpen({ isOpen: false, veiculoId: null });
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-base font-orbitron font-bold text-white">Adicionar Serviço / Peça</h3>
                            <button
                                type="button"
                                onClick={() => setPecaModalOpen({ isOpen: false, veiculoId: null })}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddPeca} className="flex flex-col flex-1 overflow-y-auto">
                            <div className="p-5 space-y-4">
                                {/* Seletor moderno de Peça / Serviço do Catálogo (sem select nativo) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold">
                                            Serviço / Peça do Catálogo *
                                        </label>
                                        {!selectedCatalogItem && (
                                            <span className="text-[11px] text-gray-500">
                                                {catalogoFiltrado.length} de {catalogo.length}
                                            </span>
                                        )}
                                    </div>

                                    {!selectedCatalogItem ? (
                                        <>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar peça ou serviço (ex: capô, porta, teto)..."
                                                    value={catalogoSearch}
                                                    onChange={(e) => setCatalogoSearch(e.target.value)}
                                                    className="w-full bg-black/50 border border-white/15 text-white pl-9 pr-8 py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none"
                                                    autoComplete="off"
                                                />
                                                {catalogoSearch && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCatalogoSearch('')}
                                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                                                        aria-label="Limpar busca"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="max-h-52 overflow-y-auto rounded-xl bg-[#0b0e16] border border-white/15 divide-y divide-white/5">
                                                {catalogoFiltrado.length > 0 ? (
                                                    catalogoFiltrado.map((c) => {
                                                        const preco = c.valorPadrao != null ? Number(c.valorPadrao) : 0;
                                                        return (
                                                            <button
                                                                key={c.id}
                                                                type="button"
                                                                onClick={() => handleSelectCatalogItem(c)}
                                                                className="w-full text-left px-3.5 py-3 hover:bg-cyber-gold/10 active:bg-cyber-gold/15 transition-colors flex items-center justify-between gap-3"
                                                            >
                                                                <span className="flex items-center gap-2.5 min-w-0">
                                                                    <Wrench className="w-3.5 h-3.5 text-cyber-gold/80 shrink-0" />
                                                                    <span className="text-sm font-medium text-white truncate uppercase">
                                                                        {c.nome}
                                                                    </span>
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded-md bg-cyber-gold/10 border border-cyber-gold/30 text-cyber-gold font-mono text-xs font-bold shrink-0 tabular-nums">
                                                                    {preco.toLocaleString('pt-BR', {
                                                                        style: 'currency',
                                                                        currency: 'BRL',
                                                                    })}
                                                                </span>
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="px-4 py-5 text-center text-xs text-gray-400">
                                                        Nenhuma peça encontrada para "{catalogoSearch}".
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35">
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                                                    <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                                    <span className="truncate uppercase">{selectedCatalogItem.nome}</span>
                                                </div>
                                                <div className="text-[11px] text-emerald-300/80 font-mono mt-0.5">
                                                    Valor padrão:{' '}
                                                    {Number(selectedCatalogItem.valorPadrao || 0).toLocaleString(
                                                        'pt-BR',
                                                        { style: 'currency', currency: 'BRL' }
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPecaForm((prev) => ({
                                                        ...prev,
                                                        tipoPecaId: '',
                                                        valorCobrado: '',
                                                    }));
                                                }}
                                                className="px-2.5 py-1.5 rounded-lg border border-white/15 text-xs text-gray-200 hover:text-white hover:border-white/30 shrink-0"
                                            >
                                                Trocar
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Valor Cobrado + Controle de ajuste rápido (- / + de X em X) */}
                                <div className="space-y-2.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold">
                                            Valor Cobrado (R$)
                                        </label>
                                        {selectedCatalogItem &&
                                            pecaForm.valorCobrado !==
                                                Number(selectedCatalogItem.valorPadrao || 0).toFixed(2) && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setPecaForm((prev) => ({
                                                            ...prev,
                                                            valorCobrado: Number(
                                                                selectedCatalogItem.valorPadrao || 0
                                                            ).toFixed(2),
                                                        }))
                                                    }
                                                    className="text-[11px] text-cyber-gold hover:underline font-oxanium"
                                                >
                                                    Restaurar padrão
                                                </button>
                                            )}
                                    </div>

                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2.5 rounded-xl text-base font-bold focus:border-cyber-gold outline-none font-mono"
                                        value={pecaForm.valorCobrado}
                                        onChange={(e) => setPecaForm({ ...pecaForm, valorCobrado: e.target.value })}
                                        placeholder="0.00"
                                    />

                                    {/* Botões - / + com o passo selecionado */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPecaForm((prev) => ({
                                                    ...prev,
                                                    valorCobrado: ajustarValorCobrado(prev.valorCobrado, -passoValor),
                                                }))
                                            }
                                            className="py-2.5 px-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 active:scale-[0.98] transition-all font-mono text-sm font-bold flex items-center justify-center gap-1.5"
                                        >
                                            <Minus className="w-4 h-4" /> R$ {passoValor}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPecaForm((prev) => ({
                                                    ...prev,
                                                    valorCobrado: ajustarValorCobrado(prev.valorCobrado, passoValor),
                                                }))
                                            }
                                            className="py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 active:scale-[0.98] transition-all font-mono text-sm font-bold flex items-center justify-center gap-1.5"
                                        >
                                            <Plus className="w-4 h-4" /> R$ {passoValor}
                                        </button>
                                    </div>

                                    {/* Seletor de passo (de quanto em quanto alterar) */}
                                    <div className="flex items-center justify-between gap-2 pt-0.5">
                                        <span className="text-[11px] text-gray-400 shrink-0">Ajustar de:</span>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {[10, 25, 50, 100].map((valor) => (
                                                <button
                                                    key={valor}
                                                    type="button"
                                                    onClick={() => setPassoValor(valor)}
                                                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                                                        passoValor === valor
                                                            ? 'bg-cyber-gold/20 border-cyber-gold/60 text-cyber-gold'
                                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                >
                                                    R$ {valor}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Tipo de Execução (Segmented Toggle) */}
                                <div className="space-y-2.5">
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold">
                                        Tipo de Execução
                                    </label>
                                    <div className="grid grid-cols-2 gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPecaForm({
                                                    ...pecaForm,
                                                    tipoExecucao: 'INTERNO',
                                                    prestadorId: '',
                                                    custoPrestador: '',
                                                })
                                            }
                                            className={`py-2 rounded-lg text-xs font-bold font-oxanium transition-all ${
                                                pecaForm.tipoExecucao === 'INTERNO'
                                                    ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                                    : 'text-gray-400 hover:text-white border border-transparent'
                                            }`}
                                        >
                                            Interno
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPecaForm({ ...pecaForm, tipoExecucao: 'TERCEIRIZADO' })}
                                            className={`py-2 rounded-lg text-xs font-bold font-oxanium transition-all ${
                                                pecaForm.tipoExecucao === 'TERCEIRIZADO'
                                                    ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                                    : 'text-gray-400 hover:text-white border border-transparent'
                                            }`}
                                        >
                                            Terceirizado
                                        </button>
                                    </div>

                                    {pecaForm.tipoExecucao === 'TERCEIRIZADO' && (
                                        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                                            <div>
                                                <label className="text-xs text-gray-400 block mb-1">Prestador *</label>
                                                <select
                                                    className="w-full bg-black/60 border border-white/15 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-cyber-gold"
                                                    value={pecaForm.prestadorId}
                                                    onChange={(e) =>
                                                        setPecaForm({ ...pecaForm, prestadorId: e.target.value })
                                                    }
                                                    required
                                                >
                                                    <option value="">Selecione o prestador...</option>
                                                    {prestadores.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.nome}
                                                        </option>
                                                    ))}
                                                </select>
                                                {prestadores.length === 0 && (
                                                    <p className="text-[11px] text-amber-400 mt-1">
                                                        Nenhum prestador cadastrado.{' '}
                                                        <a href="/settings/prestadores" className="underline">
                                                            Cadastrar
                                                        </a>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">
                                                        Custo Prestador (R$)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0,00"
                                                        className="w-full bg-black/60 border border-white/15 text-white px-3 py-2 rounded-lg text-sm outline-none focus:border-cyber-gold"
                                                        value={pecaForm.custoPrestador}
                                                        onChange={(e) =>
                                                            setPecaForm({ ...pecaForm, custoPrestador: e.target.value })
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-400 block mb-1">
                                                        Vencimento
                                                    </label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-black/60 border border-white/15 text-white px-2.5 py-2 rounded-lg text-sm outline-none focus:border-cyber-gold"
                                                        value={pecaForm.dataVencimentoPrestador}
                                                        onChange={(e) =>
                                                            setPecaForm({
                                                                ...pecaForm,
                                                                dataVencimentoPrestador: e.target.value,
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Observações */}
                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-gray-400 mb-1">
                                        Observações (opcional)
                                    </label>
                                    <textarea
                                        className="w-full bg-black/50 border border-white/15 text-white px-3 py-2 rounded-xl text-sm resize-none focus:border-cyber-gold outline-none"
                                        rows={2}
                                        placeholder="Ex: Amassado próximo ao vinco..."
                                        value={pecaForm.descricao}
                                        onChange={(e) => setPecaForm({ ...pecaForm, descricao: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPecaModalOpen({ isOpen: false, veiculoId: null })}
                                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="bg-cyber-gold text-black px-5 py-2 rounded-xl font-bold hover:bg-yellow-400 font-oxanium text-xs sm:text-sm disabled:opacity-50"
                                    disabled={
                                        !pecaForm.tipoPecaId ||
                                        addPecaMutation.isPending ||
                                        (pecaForm.tipoExecucao === 'TERCEIRIZADO' && !pecaForm.prestadorId)
                                    }
                                >
                                    {addPecaMutation.isPending ? 'Adicionando...' : 'Adicionar Serviço'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal / Bottom-Sheet: Finalizar O.S. com Desconto */}
            {isFinalizeModalOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsFinalizeModalOpen(false);
                    }}
                >
                    <div className="bg-[#111520] border border-cyber-gold/40 rounded-t-2xl sm:rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5" />
                        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-orbitron font-bold text-white">
                                    Finalizar O.S. #{os.id}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    O faturamento será gerado automaticamente ao confirmar.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFinalizeModalOpen(false)}
                                className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmFinalize}>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-[11px] font-oxanium font-bold uppercase tracking-wider text-cyber-gold mb-1.5">
                                        Desconto (opcional)
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
                                        {[
                                            { val: null, label: 'Sem desconto' },
                                            { val: 'PERCENTUAL' as const, label: 'Percentual (%)' },
                                            { val: 'VALOR_FIXO' as const, label: 'Fixo (R$)' },
                                        ].map((opt) => (
                                            <button
                                                key={opt.label}
                                                type="button"
                                                onClick={() =>
                                                    setDiscountForm({ tipoDesconto: opt.val, valorDesconto: '' })
                                                }
                                                className={`py-2 px-1 rounded-lg text-[11px] font-bold font-oxanium transition-all ${
                                                    discountForm.tipoDesconto === opt.val
                                                        ? 'bg-cyber-gold/15 text-cyber-gold border border-cyber-gold/40'
                                                        : 'text-gray-400 hover:text-white border border-transparent'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {discountForm.tipoDesconto && (
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1 font-oxanium">
                                            {discountForm.tipoDesconto === 'PERCENTUAL'
                                                ? 'Porcentagem do Desconto (%)'
                                                : 'Valor do Desconto (R$)'}
                                        </label>
                                        <div className="relative">
                                            {discountForm.tipoDesconto === 'VALOR_FIXO' && (
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-gold font-bold text-sm">
                                                    R$
                                                </span>
                                            )}
                                            <input
                                                type="number"
                                                min="0"
                                                step={discountForm.tipoDesconto === 'PERCENTUAL' ? '1' : '0.01'}
                                                max={discountForm.tipoDesconto === 'PERCENTUAL' ? '100' : undefined}
                                                className={`w-full bg-black/50 border border-white/15 text-white py-2.5 rounded-xl text-sm focus:border-cyber-gold outline-none font-mono ${
                                                    discountForm.tipoDesconto === 'VALOR_FIXO'
                                                        ? 'pl-10 pr-3'
                                                        : 'pl-3 pr-8'
                                                }`}
                                                value={discountForm.valorDesconto}
                                                onChange={(e) =>
                                                    setDiscountForm({ ...discountForm, valorDesconto: e.target.value })
                                                }
                                                placeholder={discountForm.tipoDesconto === 'PERCENTUAL' ? '0' : '0.00'}
                                                required
                                                autoFocus
                                            />
                                            {discountForm.tipoDesconto === 'PERCENTUAL' && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-gold font-bold text-sm">
                                                    %
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Prévia em tempo real */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-gray-400">
                                        <span>Subtotal</span>
                                        <span className="font-mono">
                                            {subtotalPreview.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            })}
                                        </span>
                                    </div>
                                    {descontoCalculadoPreview > 0 && (
                                        <div className="flex justify-between text-emerald-400">
                                            <span>Desconto previsto</span>
                                            <span className="font-mono">
                                                -{' '}
                                                {descontoCalculadoPreview.toLocaleString('pt-BR', {
                                                    style: 'currency',
                                                    currency: 'BRL',
                                                })}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm font-bold text-white border-t border-white/10 pt-2 mt-1">
                                        <span>Total Final</span>
                                        <span className="text-base text-cyber-gold font-orbitron tabular-nums">
                                            {totalFinalPreview.toLocaleString('pt-BR', {
                                                style: 'currency',
                                                currency: 'BRL',
                                            })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3.5 border-t border-white/10 bg-black/25 flex justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFinalizeModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-white/15 text-gray-300 hover:text-white font-oxanium text-xs sm:text-sm font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateDiscountMutation.isPending || updateStatusMutation.isPending}
                                    className="bg-emerald-500 text-black px-5 py-2 rounded-xl font-bold hover:bg-emerald-400 font-oxanium text-xs sm:text-sm flex items-center gap-1.5 disabled:opacity-60"
                                >
                                    {updateDiscountMutation.isPending || updateStatusMutation.isPending ? (
                                        'Processando...'
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" /> Confirmar Finalização
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Auxiliary Modals */}
            <VehicleHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
                placa={historyModal.placa}
                modelo={historyModal.modelo}
            />

            <DuplicatePlateModal
                isOpen={duplicateModal.isOpen}
                onClose={handleDuplicateCancel}
                onContinue={handleDuplicateContinue}
                onViewHistory={handleDuplicateViewHistory}
                veiculoData={duplicateModal.data}
            />

            <ActionModal
                isOpen={actionModal.isOpen}
                onClose={() => setActionModal({ ...actionModal, isOpen: false })}
                onConfirm={() => {
                    if (actionModal.onConfirm) actionModal.onConfirm();
                    setActionModal({ ...actionModal, isOpen: false });
                }}
                title={actionModal.title}
                message={actionModal.message}
                type={actionModal.type}
            />

            <PdfQueueModal state={pdfState} onRetry={retryPdfDownload} onClose={closePdfModal} />
        </div>
    );
};
