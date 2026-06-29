import React, { useState } from 'react';
import { formatarData } from '../../utils/formatters';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { osService } from '../../services/osService';
import { prestadorService } from '../../services/prestadorService';
import { userService } from '../../services/userService';
import { ArrowLeft, Car, Wrench, CheckCircle, Plus, Ban, History, FileDown, Trash2, User as UserIcon, Edit2, Save, ChevronDown, Image } from 'lucide-react';
import { VehicleHistoryModal } from '../../components/modals/VehicleHistoryModal';
import { DuplicatePlateModal } from '../../components/modals/DuplicatePlateModal';
import { ActionModal } from '../../components/modals/ActionModal';
import { PdfQueueModal } from '../../components/modals/PdfQueueModal';
import { usePdfDownload } from '../../hooks/usePdfDownload';
import { limparPlaca, validarPlaca } from '../../utils/validators';
import { PlateInput } from '../../components/forms/PlateInput';
import { VeiculoImagemGrid } from '../../components/os/VeiculoImagemGrid';
import type { ActionModalType } from '../../components/modals/ActionModal';
import type { OSStatus, VeiculoExistente, TipoExecucao } from '../../types';


export const OSDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const osId = parseInt(id || '0');
    const { pdfState, startPdfDownload, retryPdfDownload, closePdfModal } = usePdfDownload(osService.getApiBaseUrl());

    // State for modals
    const [isVeiculoModalOpen, setVeiculoModalOpen] = useState(false);
    const [isPecaModalOpen, setPecaModalOpen] = useState<{ isOpen: boolean, veiculoId: number | null }>({ isOpen: false, veiculoId: null });
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, placa: string, modelo: string }>({ isOpen: false, placa: '', modelo: '' });
    const [duplicateModal, setDuplicateModal] = useState<{ isOpen: boolean, data?: VeiculoExistente }>({ isOpen: false });
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
        dataVencimentoPrestador: ''
    });

    const { data: os, isLoading } = useQuery({
        queryKey: ['ordem-servico', osId],
        queryFn: () => osService.getOSById(osId),
        enabled: !!osId
    });

    const { data: catalogo } = useQuery({
        queryKey: ['catalogo'],
        queryFn: osService.listTiposPeca
    });

    // Query para prestadores (para serviços terceirizados)
    const { data: prestadores } = useQuery({
        queryKey: ['prestadores'],
        queryFn: () => prestadorService.listar(true)
    });

    // Query para usuários (para selecionar responsável)
    const { data: users } = useQuery({
        queryKey: ['users-equipe'],
        queryFn: userService.getEquipe
    });

    const [isEditingUser, setIsEditingUser] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    // Mutation para mudar responsável
    const updateOwnerMutation = useMutation({
        mutationFn: (newUserId: number) => osService.updateOS(osId, { usuarioId: newUserId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            setIsEditingUser(false);
            alert('Responsável atualizado com sucesso!');
        },
        onError: (error) => {
            console.error('Erro ao atualizar responsável:', error);
            alert('Erro ao atualizar responsável.');
        }
    });

    const handleUpdateOwner = () => {
        if (!selectedUserId) return;

        const user = users?.find(u => u.id === parseInt(selectedUserId));
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
                updateOwnerMutation.mutate(parseInt(selectedUserId));
                setActionModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Mutations
    const addVeiculoMutation = useMutation({
        mutationFn: osService.addVeiculo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            setVeiculoModalOpen(false);
            setVeiculoForm({ placa: '', modelo: '', cor: '' });
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Veículo Adicionado',
                message: 'Veículo cadastrado com sucesso!',
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        },
        onError: (error: any) => {
            console.error('Erro ao adicionar veículo:', error);
            let title = 'Erro';
            let message = 'Não foi possível adicionar o veículo.';

            if (error.response?.status === 400) {
                title = 'Dados Inválidos';
                message = error.response.data?.mensagem || 'Verifique os dados informados e tente novamente. A placa pode estar em formato inválido.';
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
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    });

    const addPecaMutation = useMutation({
        mutationFn: osService.addPeca,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            setPecaModalOpen({ isOpen: false, veiculoId: null });
            setPecaForm({
                tipoPecaId: '',
                valorCobrado: '',
                descricao: '',
                tipoExecucao: 'INTERNO',
                prestadorId: '',
                custoPrestador: '',
                dataVencimentoPrestador: ''
            });
        }
    });

    const deletePecaMutation = useMutation({
        mutationFn: osService.deletePeca,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
            setActionModal({
                isOpen: true,
                type: 'success',
                title: 'Serviço Removido',
                message: 'O serviço foi removido com sucesso!',
                showCancel: false,
                confirmText: 'OK',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        },
        onError: (error: any) => {
            setActionModal({
                isOpen: true,
                type: 'danger',
                title: 'Erro',
                message: error.response?.data?.message || 'Não foi possível remover o serviço.',
                showCancel: false,
                confirmText: 'FECHAR',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    });



    const updateDiscountMutation = useMutation({
        mutationFn: (data: { tipoDesconto: 'PERCENTUAL' | 'VALOR_FIXO' | null, valorDesconto: number }) =>
            osService.updateDiscount(osId, data.tipoDesconto, data.valorDesconto),
        onSuccess: () => {
            // After applying discount, proceed to finalize
            updateStatusMutation.mutate('FINALIZADA');
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: (status: OSStatus) => osService.updateStatus(osId, status),
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });

            // ✅ Sync System: Update lists and financial data with delay to ensure backend commit
            setTimeout(() => {
                console.log('🔄 [SYNC] Hard Resetting system caches...');

                queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
                queryClient.invalidateQueries({ queryKey: ['os-list'] });

                // Invalidate Financial Reports to show new revenue immediately
                queryClient.invalidateQueries({ queryKey: ['relatorio'] });
                queryClient.invalidateQueries({ queryKey: ['financeiro'] });
                queryClient.invalidateQueries({ queryKey: ['faturamentos'] });

                queryClient.resetQueries({
                    queryKey: ['comissao'],
                    exact: false
                });
            }, 1000); // Reduced delay slightly to 1s
            setIsFinalizeModalOpen(false);
        },
        onError: (error: any) => {
            console.error('Erro ao atualizar status:', error);

            // Extract backend message
            const backendMessage = error.response?.data?.message || error.response?.data?.mensagem;

            // Check if it's the "no responsible" error
            if (backendMessage && backendMessage.includes('responsável')) {
                setActionModal({
                    isOpen: true,
                    type: 'warning',
                    title: 'Responsável Necessário',
                    message: backendMessage || 'Não é possível iniciar a OS sem um responsável técnico definido. Edite a OS e atribua um responsável.',
                    showCancel: false,
                    confirmText: 'ENTENDI',
                    onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
                });
            } else {
                // Generic error
                setActionModal({
                    isOpen: true,
                    type: 'danger',
                    title: 'Erro ao Atualizar Status',
                    message: backendMessage || 'Não foi possível atualizar o status da OS. Tente novamente.',
                    showCancel: false,
                    confirmText: 'FECHAR',
                    onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
                });
            }
        }
    });

    const handleConfirmFinalize = (e: React.FormEvent) => {
        e.preventDefault();

        const valorDesconto = discountForm.valorDesconto ? parseFloat(discountForm.valorDesconto) : 0;

        // If has discount, update first
        if (discountForm.tipoDesconto && valorDesconto > 0) {
            updateDiscountMutation.mutate({
                tipoDesconto: discountForm.tipoDesconto,
                valorDesconto
            });
        } else {
            // Direct finalize
            updateStatusMutation.mutate('FINALIZADA');
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: number) => osService.deleteOS(id),
        onSuccess: () => {
            console.log('OS e veículos excluídos com sucesso, redirecionando...');
            queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
            navigate('/os');
        },
        onError: (error) => {
            console.error('Erro ao excluir OS (Cascade Manual):', error);
            setActionModal({
                isOpen: true,
                title: 'Erro na Exclusão',
                message: 'Erro ao excluir a OS. Verifique se existem dependências ou consulte o log.',
                type: 'danger',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
        }
    });

    if (isLoading || !os) return <div className="text-cyber-gold p-8">Carregando detalhes da OS...</div>;

    const handleAddVeiculo = (e: React.FormEvent) => {
        e.preventDefault();

        // 1. LIMPAR
        const placaLimpa = limparPlaca(veiculoForm.placa);

        // 2. VALIDAR
        if (!validarPlaca(placaLimpa)) {
            setActionModal({
                isOpen: true,
                type: 'danger', // Fixed type
                title: 'Placa Inválida',
                message: `A placa "${veiculoForm.placa}" não atende aos formatos permitidos.`,
                confirmText: 'ENTENDI',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        // Check local duplicate
        const jaExiste = os.veiculos.some(v => limparPlaca(v.placa) === placaLimpa);
        if (jaExiste) {
            setActionModal({
                isOpen: true,
                type: 'warning',
                title: 'Veículo Duplicado',
                message: 'Este veículo já foi adicionado a esta Ordem de Serviço.',
                confirmText: 'OK',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }

        // 3. ENVIAR (Clean)
        addVeiculoMutation.mutate({
            ordemServicoId: osId,
            ...veiculoForm,
            placa: placaLimpa
        });
    };

    const handleAddPeca = (e: React.FormEvent) => {
        e.preventDefault();

        let valorToSend: number | undefined = undefined;
        if (pecaForm.valorCobrado) {
            valorToSend = parseFloat(pecaForm.valorCobrado);
        }

        // Montar o request com campos de terceirização
        const requestData: any = {
            veiculoId: isPecaModalOpen.veiculoId!,
            tipoPecaId: parseInt(pecaForm.tipoPecaId),
            valorCobrado: valorToSend,
            descricao: pecaForm.descricao || undefined,
            tipoExecucao: pecaForm.tipoExecucao
        };

        // Se TERCEIRIZADO, adicionar dados do prestador
        if (pecaForm.tipoExecucao === 'TERCEIRIZADO' && pecaForm.prestadorId) {
            requestData.prestadorId = parseInt(pecaForm.prestadorId);
            if (pecaForm.custoPrestador) {
                requestData.custoPrestador = parseFloat(pecaForm.custoPrestador);
            }
            if (pecaForm.dataVencimentoPrestador) {
                requestData.dataVencimentoPrestador = pecaForm.dataVencimentoPrestador;
            }
        }

        // Verificar serviço duplicado
        const veiculo = os.veiculos.find(v => v.id === isPecaModalOpen.veiculoId);
        const jaExiste = veiculo?.pecas.some(p => p.tipoPecaId === parseInt(pecaForm.tipoPecaId));

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
                    setActionModal(prev => ({ ...prev, isOpen: false }));
                    addPecaMutation.mutate(requestData);
                }
            });
            return;
        }

        addPecaMutation.mutate(requestData);
    };

    const onSelectPeca = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value);
        const item = catalogo?.find(t => t.id === id);
        setPecaForm(prev => ({
            ...prev,
            tipoPecaId: e.target.value,
            valorCobrado: item ? item.valorPadrao.toString() : ''
        }));
    };

    const isFinalized = os.status === 'FINALIZADA';

    const handleCheckPlaca = async () => {
        const placaLimpa = limparPlaca(veiculoForm.placa);
        if (placaLimpa.length >= 7) {
            // Optional: validate strictly before checking API to save bandwidth
            if (!validarPlaca(placaLimpa)) return;

            try {
                const check = await osService.verificarPlaca(placaLimpa);
                if (check.existe) {
                    setDuplicateModal({
                        isOpen: true,
                        data: check.veiculoExistente
                    });
                }
            } catch (error) {
                console.error("Erro ao verificar placa", error);
            }
        }
    };

    const handleDuplicateContinue = () => {
        // If we have existing vehicle data from backend, use it to add the vehicle directly
        if (duplicateModal.data) {
            const placaLimpa = limparPlaca(veiculoForm.placa);

            // Add vehicle with existing data from backend
            addVeiculoMutation.mutate({
                ordemServicoId: osId,
                placa: placaLimpa,
                modelo: duplicateModal.data.modelo,
                cor: duplicateModal.data.cor
            });
        }
        setDuplicateModal({ isOpen: false });
        setVeiculoModalOpen(false); // Close the add vehicle modal as well
    };

    const handleDuplicateCancel = () => {
        setDuplicateModal({ isOpen: false });
        setVeiculoForm(prev => ({ ...prev, placa: '' })); // Clear plate
    };

    const handleDuplicateViewHistory = () => {
        const plate = veiculoForm.placa;
        setDuplicateModal({ isOpen: false });
        setVeiculoForm(prev => ({ ...prev, placa: '' })); // Clear add form if viewing history
        setVeiculoModalOpen(false); // Close add modal

        // Open history
        setHistoryModal({
            isOpen: true,
            placa: plate,
            modelo: duplicateModal.data?.modelo || 'Veículo'
        });
    };

    const handleStartService = () => {
        if (!os.usuarioId) {
            setActionModal({
                isOpen: true,
                title: 'Responsável Obrigatório',
                message: 'Não é possível iniciar a execução sem um responsável definido. Por favor, atribua um técnico ou vendedor na seção "Responsável".',
                type: 'danger',
                showCancel: false,
                confirmText: 'ENTENDI',
                onConfirm: () => setActionModal(prev => ({ ...prev, isOpen: false }))
            });
            return;
        }
        updateStatusMutation.mutate('EM_EXECUCAO');
    };

    return (
        <div className="pb-20">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <button onClick={() => navigate('/os')} className="text-gray-400 hover:text-white flex items-center gap-2 font-oxanium">
                    <ArrowLeft className="w-4 h-4" /> VOLTAR
                </button>
                <div className="flex gap-3">
                    {/* PDF Download com opção de imagens */}
                    <div className="relative">
                        <button
                            onClick={() => setShowPdfMenu(!showPdfMenu)}
                            className="bg-cyber-gold/20 text-cyber-gold border border-cyber-gold/50 px-4 py-2 rounded hover:bg-cyber-gold hover:text-black transition-all font-oxanium flex items-center gap-2"
                        >
                            <FileDown className="w-4 h-4" /> BAIXAR PDF <ChevronDown className="w-3 h-3" />
                        </button>
                        {showPdfMenu && (
                            <div className="absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-gray-900 border border-gray-700 rounded shadow-xl z-50 w-max min-w-[240px] overflow-hidden">
                                <button
                                    onClick={() => {
                                        startPdfDownload(osService.getOSPdfPath(osId), `os-${osId}.pdf`);
                                        setShowPdfMenu(false);
                                    }}
                                    className="w-full text-left px-5 py-4 sm:py-3 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors font-oxanium text-base sm:text-sm flex items-center gap-3 border-b border-gray-800"
                                >
                                    <FileDown className="w-5 h-5 sm:w-4 sm:h-4 text-cyber-gold" /> PDF sem fotos
                                </button>
                                <button
                                    onClick={() => {
                                        startPdfDownload(
                                            osService.getOSPdfPath(osId) + '?imagens=true',
                                            `os-${osId}-fotos.pdf`
                                        ).catch((err: any) => {
                                            // Tratar erro de limite de imagens excedido
                                            if (err?.response?.data?.error === 'TooManyImages') {
                                                setActionModal({
                                                    isOpen: true,
                                                    title: 'Limite de imagens excedido',
                                                    message: err.response.data.message || `Esta OS tem muitas fotos para incluir no PDF de uma vez (limite: ${err.response.data.limite}). Considere baixar o PDF sem imagens, ou revisar a quantidade de fotos por veículo.`,
                                                    type: 'warning',
                                                    showCancel: false,
                                                    confirmText: 'Entendi',
                                                });
                                            }
                                        });
                                        setShowPdfMenu(false);
                                    }}
                                    className="w-full text-left px-5 py-4 sm:py-3 text-gray-200 hover:bg-gray-800 hover:text-white transition-colors font-oxanium text-base sm:text-sm flex items-center gap-3"
                                >
                                    <Image className="w-5 h-5 sm:w-4 sm:h-4 text-cyber-gold" /> PDF com fotos
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
                                        onConfirm: () => deleteMutation.mutate(osId)
                                    });
                                }}
                                className="bg-red-600/20 text-red-400 border border-red-600/50 px-4 py-2 rounded hover:bg-red-600/40 transition-all font-oxanium flex items-center gap-2"
                            >
                                <Ban className="w-4 h-4" /> CANCELAR (EXCLUIR)
                            </button>
                            <button
                                onClick={handleStartService}
                                className="bg-blue-600/20 text-blue-400 border border-blue-600/50 px-4 py-2 rounded hover:bg-blue-600/40 transition-all font-oxanium flex items-center gap-2"
                            >
                                <Wrench className="w-4 h-4" /> INICIAR SERVIÇO
                            </button>
                        </>
                    )}
                    {os.status === 'EM_EXECUCAO' && (
                        <button
                            onClick={() => setIsFinalizeModalOpen(true)}
                            className="bg-green-600/20 text-green-400 border border-green-600/50 px-4 py-2 rounded hover:bg-green-600/40 transition-all font-oxanium flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" /> FINALIZAR OS
                        </button>
                    )}
                    {isFinalized && (
                        <div className="text-green-500 font-bold font-oxanium border border-green-500/50 bg-green-500/10 px-4 py-2 rounded flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> FINALIZADA
                        </div>
                    )}
                    {os.status === 'CANCELADA' && (
                        <div className="text-red-500 font-bold font-oxanium border border-red-500/50 bg-red-500/10 px-4 py-2 rounded flex items-center gap-2">
                            <Ban className="w-4 h-4" /> CANCELADA
                        </div>
                    )}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Cliente */}
                <div className="bg-black/40 border border-white/10 p-6 rounded-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyber-gold"></div>
                    <h3 className="text-gray-400 text-sm font-oxanium mb-2 uppercase tracking-wide">Cliente</h3>
                    <div className="text-xl text-white font-bold font-orbitron">{os.cliente.nomeFantasia}</div>
                    <div className="text-sm text-gray-500">{os.cliente.razaoSocial}</div>
                    <div className="mt-4 text-sm text-gray-400 font-oxanium">
                        <p>{os.cliente.cnpj}</p>
                        <p>{os.cliente.contato}</p>
                    </div>
                </div>

                {/* Status Info */}
                <div className="bg-black/40 border border-white/10 p-6 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-400 text-sm font-oxanium uppercase tracking-wide">Status</h3>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${os.status === 'ABERTA' ? 'bg-blue-500/20 text-blue-400' :
                            os.status === 'EM_EXECUCAO' ? 'bg-yellow-500/20 text-yellow-400' :
                                os.status === 'CANCELADA' ? 'bg-red-500/20 text-red-400' :
                                    'bg-green-500/20 text-green-400'
                            }`}>
                            {os.status}
                        </span>
                    </div>
                    {os.tipoDesconto && os.valorDesconto && os.valorDesconto > 0 ? (
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-gray-400 font-mono">
                                <span>Subtotal</span>
                                <span className="line-through opacity-60">{(os.valorTotalSemDesconto || os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="flex justify-between text-xs text-green-400 font-mono">
                                <span>Desconto {os.tipoDesconto === 'PERCENTUAL' ? `(${os.valorDesconto}%)` : ''}</span>
                                <span>- {((os.valorTotalSemDesconto || 0) - (os.valorTotalComDesconto || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                            </div>
                            <div className="text-3xl text-cyber-gold font-bold font-orbitron border-t border-white/10 pt-1 mt-1">
                                {os.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-3xl text-cyber-gold font-bold font-orbitron mt-2">
                            {os.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">VALOR TOTAL {os.tipoDesconto ? 'COM DESCONTO' : 'ACUMULADO'}</div>
                </div>

                {/* Responsável (New Card) */}
                <div className="bg-black/40 border border-white/10 p-6 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-400 text-sm font-oxanium uppercase tracking-wide">Responsável</h3>
                        {!isFinalized && !isEditingUser && (
                            <button onClick={() => { setIsEditingUser(true); setSelectedUserId(os.usuarioId?.toString() || ''); }} className="text-cyber-gold hover:text-white transition-colors" title="Alterar Responsável">
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {isEditingUser ? (
                        <div className="flex gap-2 items-center">
                            <select
                                className="bg-black border border-white/20 text-white p-2 rounded text-sm w-full outline-none focus:border-cyber-gold"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {users?.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
                            </select>
                            <button onClick={handleUpdateOwner} className="text-green-400 hover:text-green-300 p-1" title="Salvar">
                                <Save className="w-5 h-5" />
                            </button>
                            <button onClick={() => setIsEditingUser(false)} className="text-red-400 hover:text-red-300 p-1" title="Cancelar">
                                <Ban className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-xl text-white font-bold font-orbitron truncate" title={os.usuarioEmail}>
                                {os.usuarioNome || os.usuarioEmail || 'Não Atribuído'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <UserIcon className="w-3 h-3" /> VENDEDOR / TÉCNICO
                            </div>
                        </>
                    )}
                </div>

                {/* Data */}
                <div className="bg-black/40 border border-white/10 p-6 rounded-lg flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-gray-400 text-sm font-oxanium uppercase tracking-wide">Data de Criação</h3>
                            <div className="text-2xl text-white font-bold font-orbitron mt-2">
                                {formatarData(os.data)}
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-gray-400 text-sm font-oxanium uppercase tracking-wide">Prazo Pagamento</h3>
                            <div className={`text-2xl font-bold font-orbitron mt-2 ${os.atrasado ? 'text-red-400' : 'text-white'}`}>
                                {os.dataVencimento ? formatarData(os.dataVencimento) : '—'}
                            </div>
                            {os.atrasado && (
                                <span className="inline-block px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded border border-red-500/50 animate-pulse mt-1">
                                    ATRASADO
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">ID: #{os.id}</div>
                </div>
            </div>

            {/* Vehicles & Parts */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-orbitron text-white flex items-center gap-2">
                        <Car className="text-cyber-gold" />
                        VEÍCULOS E SERVIÇOS
                    </h2>
                    {!isFinalized && (
                        <button
                            onClick={() => setVeiculoModalOpen(true)}
                            className="border border-cyber-gold/50 text-cyber-gold px-4 py-2 rounded hover:bg-cyber-gold hover:text-black transition-all flex items-center gap-2 font-oxanium text-sm"
                        >
                            <Plus className="w-4 h-4" /> ADICIONAR VEÍCULO
                        </button>
                    )}
                </div>

                {os.veiculos.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-lg text-gray-500 font-oxanium">
                        Nenhum veículo adicionado a esta Ordem de Serviço.
                    </div>
                ) : (
                    os.veiculos.map(v => (
                        <div key={v.id} className="bg-black/60 border border-white/10 rounded-lg overflow-hidden">
                            {/* Vehicle Header */}
                            <div className="bg-white/5 p-4 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="bg-cyber-gold/10 p-2 rounded text-cyber-gold">
                                        <Car className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white font-oxanium">{v.modelo} &bull; {v.placa}</h3>
                                        <div className="text-sm text-gray-400">Cor: {v.cor}</div>
                                    </div>
                                </div>
                                <div className="mt-2 md:mt-0 text-right">
                                    <div className="text-xs text-gray-500">SUBTOTAL VEÍCULO</div>
                                    <div className="text-lg font-bold text-white">
                                        {v.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </div>
                                    <button
                                        onClick={() => setHistoryModal({ isOpen: true, placa: v.placa, modelo: v.modelo })}
                                        className="text-[10px] text-cyber-gold hover:text-white underline mt-1 flex items-center justify-end gap-1"
                                    >
                                        <History className="w-3 h-3" /> VER HISTÓRICO
                                    </button>
                                </div>
                            </div>

                            {/* Parts List */}
                            <div className="p-4">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-xs text-gray-500 border-b border-white/5 font-oxanium">
                                            <th className="py-2 pl-2">DESCRIÇÃO</th>
                                            <th className="py-2 text-right pr-2">VALOR</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-gray-300">
                                        {v.pecas.map(p => (
                                            <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                                                <td className="py-3 pl-2">
                                                    <div>{p.nomePeca}</div>
                                                    {p.descricao && (
                                                        <div className="text-xs text-gray-500 mt-1 italic">
                                                            {p.descricao}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3 text-right pr-2 font-mono">
                                                    {p.valorCobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </td>
                                                {!isFinalized && (
                                                    <td className="py-3 pr-2 text-right w-10">
                                                        <button
                                                            onClick={() => {
                                                                setActionModal({
                                                                    isOpen: true,
                                                                    title: 'Remover Serviço?',
                                                                    message: `Deseja remover "${p.nomePeca}" deste veículo?`,
                                                                    type: 'warning',
                                                                    confirmText: 'SIM, REMOVER',
                                                                    onConfirm: () => deletePecaMutation.mutate(p.id)
                                                                });
                                                            }}
                                                            className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/20 transition-all"
                                                            title="Remover serviço"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {v.pecas.length === 0 && (
                                            <tr>
                                                <td colSpan={2} className="py-4 text-center text-gray-600 text-xs italic">
                                                    Nenhum serviço/peça lançado.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {!isFinalized && (
                                    <button
                                        onClick={() => setPecaModalOpen({ isOpen: true, veiculoId: v.id })}
                                        className="mt-4 w-full py-2 border border-dashed border-white/20 text-gray-400 hover:text-cyber-gold hover:border-cyber-gold/50 rounded flex justify-center items-center gap-2 text-sm transition-all"
                                    >
                                        <Plus className="w-4 h-4" /> Adicionar Serviço/Peça
                                    </button>
                                )}

                                <VeiculoImagemGrid veiculoId={v.id} osId={osId} imagens={v.imagens} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal: Add Vehicle */}
            {isVeiculoModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black/90 border border-cyber-gold/50 p-6 rounded-lg max-w-sm w-full">
                        <h3 className="text-xl font-orbitron text-white mb-4">Novo Veículo</h3>
                        <form onSubmit={handleAddVeiculo}>
                            <div className="space-y-3">
                                <PlateInput
                                    value={veiculoForm.placa}
                                    onChange={(val) => setVeiculoForm({ ...veiculoForm, placa: val })}
                                    className="mb-2"
                                    onBlur={handleCheckPlaca}
                                />
                                <input
                                    placeholder="Modelo"
                                    required
                                    className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                    value={veiculoForm.modelo}
                                    onChange={e => setVeiculoForm({ ...veiculoForm, modelo: e.target.value })}
                                />
                                <input
                                    placeholder="Cor"
                                    className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                    value={veiculoForm.cor}
                                    onChange={e => setVeiculoForm({ ...veiculoForm, cor: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setVeiculoModalOpen(false)} className="text-gray-500 hover:text-white px-3 py-1 font-oxanium text-sm">Cancelar</button>
                                <button type="submit" className="bg-cyber-gold text-black px-4 py-1 rounded font-bold hover:bg-yellow-400 font-oxanium text-sm">Adicionar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Add Peca */}
            {isPecaModalOpen.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black/90 border border-cyber-gold/50 p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-orbitron text-white mb-4">Adicionar Item</h3>
                        <form onSubmit={handleAddPeca}>
                            <div className="space-y-4">
                                {/* Item do Catálogo */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Item do Catálogo</label>
                                    <select
                                        className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                        value={pecaForm.tipoPecaId}
                                        onChange={onSelectPeca}
                                        required
                                    >
                                        <option value="">Selecione...</option>
                                        {catalogo?.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Valor Cobrado */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Valor Cobrado (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                        value={pecaForm.valorCobrado}
                                        onChange={e => setPecaForm({ ...pecaForm, valorCobrado: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-500 italic">Deixe vazio para usar o valor padrão.</p>
                                </div>

                                {/* Tipo de Execução */}
                                <div className="space-y-2 bg-white/5 p-3 rounded border border-white/10">
                                    <label className="text-xs text-cyber-gold font-bold">Tipo de Execução</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tipoExecucao"
                                                value="INTERNO"
                                                checked={pecaForm.tipoExecucao === 'INTERNO'}
                                                onChange={() => setPecaForm({ ...pecaForm, tipoExecucao: 'INTERNO', prestadorId: '', custoPrestador: '' })}
                                                className="accent-cyber-gold"
                                            />
                                            <span className="text-sm text-white">Interno</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="tipoExecucao"
                                                value="TERCEIRIZADO"
                                                checked={pecaForm.tipoExecucao === 'TERCEIRIZADO'}
                                                onChange={() => setPecaForm({ ...pecaForm, tipoExecucao: 'TERCEIRIZADO' })}
                                                className="accent-cyber-gold"
                                            />
                                            <span className="text-sm text-white">Terceirizado</span>
                                        </label>
                                    </div>

                                    {/* Campos de Prestador (visíveis apenas se TERCEIRIZADO) */}
                                    {pecaForm.tipoExecucao === 'TERCEIRIZADO' && (
                                        <div className="mt-3 space-y-3 animate-fadeIn">
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Prestador</label>
                                                <select
                                                    className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                                    value={pecaForm.prestadorId}
                                                    onChange={e => setPecaForm({ ...pecaForm, prestadorId: e.target.value })}
                                                    required
                                                >
                                                    <option value="">Selecione o prestador...</option>
                                                    {prestadores?.map(p => (
                                                        <option key={p.id} value={p.id}>{p.nome}</option>
                                                    ))}
                                                </select>
                                                {(!prestadores || prestadores.length === 0) && (
                                                    <p className="text-[10px] text-yellow-400">
                                                        Nenhum prestador cadastrado. <a href="/settings/prestadores" className="underline">Cadastrar</a>
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Custo do Prestador (R$)</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="Valor a pagar ao prestador"
                                                    className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                                    value={pecaForm.custoPrestador}
                                                    onChange={e => setPecaForm({ ...pecaForm, custoPrestador: e.target.value })}
                                                />
                                                <p className="text-[10px] text-gray-500 italic">
                                                    Valor que será pago ao prestador externo.
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-gray-400">Data de Vencimento</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm"
                                                    value={pecaForm.dataVencimentoPrestador}
                                                    onChange={e => setPecaForm({ ...pecaForm, dataVencimentoPrestador: e.target.value })}
                                                />
                                                <p className="text-[10px] text-gray-500 italic">
                                                    Data em que o prestador receberá. Se não informada, será 7 dias após a OS.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Observações */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Observações (opcional)</label>
                                    <textarea
                                        className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm resize-none"
                                        rows={2}
                                        placeholder="Ex: Cliente solicitou serviço mesmo sabendo das condições..."
                                        value={pecaForm.descricao}
                                        onChange={e => setPecaForm({ ...pecaForm, descricao: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setPecaModalOpen({ isOpen: false, veiculoId: null })} className="text-gray-500 hover:text-white px-3 py-1 font-oxanium text-sm">Cancelar</button>
                                <button
                                    type="submit"
                                    className="bg-cyber-gold text-black px-4 py-1 rounded font-bold hover:bg-yellow-400 font-oxanium text-sm disabled:opacity-50"
                                    disabled={pecaForm.tipoExecucao === 'TERCEIRIZADO' && !pecaForm.prestadorId}
                                >
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Vehicle History */}
            <VehicleHistoryModal
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
                placa={historyModal.placa}
                modelo={historyModal.modelo}
            />

            {/* Modal: Duplicate Plate Warning */}
            <DuplicatePlateModal
                isOpen={duplicateModal.isOpen}
                onClose={handleDuplicateCancel}
                onContinue={handleDuplicateContinue}
                onViewHistory={handleDuplicateViewHistory}
                veiculoData={duplicateModal.data}
            />

            {/* Modal: Finalize with Discount */}
            {isFinalizeModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-black/90 border border-cyber-gold/50 p-6 rounded-lg max-w-sm w-full">
                        <h3 className="text-xl font-orbitron text-white mb-4">Finalizar OS</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Confirme os valores finais antes de encerrar. Esta ação irá gerar o faturamento automaticamente.
                        </p>
                        <form onSubmit={handleConfirmFinalize}>
                            <div className="space-y-4 mb-6 bg-white/5 p-4 rounded border border-white/10">
                                <h4 className="text-cyber-gold font-bold font-oxanium text-sm mb-2">Aplicar Desconto? (Opcional)</h4>
                                <div>
                                    <label className="text-gray-500 text-xs block mb-1">Tipo de Desconto</label>
                                    <select
                                        className="w-full bg-black/60 border border-white/20 text-white p-2 text-sm focus:border-cyber-gold outline-none"
                                        value={discountForm.tipoDesconto || ''}
                                        onChange={e => setDiscountForm({
                                            ...discountForm,
                                            tipoDesconto: e.target.value ? (e.target.value as 'PERCENTUAL' | 'VALOR_FIXO') : null,
                                            valorDesconto: '' // Reset value when type changes
                                        })}
                                    >
                                        <option value="">Sem Desconto</option>
                                        <option value="PERCENTUAL">Porcentagem (%)</option>
                                        <option value="VALOR_FIXO">Valor Fixo (R$)</option>
                                    </select>
                                </div>
                                {discountForm.tipoDesconto && (
                                    <div>
                                        <label className="text-gray-500 text-xs block mb-2 font-oxanium">
                                            {discountForm.tipoDesconto === 'PERCENTUAL' ? 'Porcentagem do Desconto' : 'Valor do Desconto'}
                                        </label>
                                        <div className="relative">
                                            {discountForm.tipoDesconto === 'VALOR_FIXO' && (
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-gold font-bold text-sm">R$</span>
                                            )}

                                            <input
                                                type="number"
                                                min="0"
                                                step={discountForm.tipoDesconto === 'PERCENTUAL' ? "1" : "0.01"}
                                                max={discountForm.tipoDesconto === 'PERCENTUAL' ? "100" : undefined}
                                                className={`w-full bg-black/60 border border-white/20 text-white p-2 text-sm focus:border-cyber-gold outline-none transition-all font-mono
                                                    ${discountForm.tipoDesconto === 'VALOR_FIXO' ? 'pl-10' : ''}
                                                    ${discountForm.tipoDesconto === 'PERCENTUAL' ? 'pr-8' : ''}
                                                `}
                                                value={discountForm.valorDesconto}
                                                onChange={e => setDiscountForm({ ...discountForm, valorDesconto: e.target.value })}
                                                placeholder={discountForm.tipoDesconto === 'PERCENTUAL' ? '0' : '0.00'}
                                                required={!!discountForm.tipoDesconto}
                                                autoFocus
                                            />

                                            {discountForm.tipoDesconto === 'PERCENTUAL' && (
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyber-gold font-bold text-sm">%</span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Summary Preview */}
                            {/* Summary Preview */}
                            <div className="mt-4 bg-black/40 p-3 rounded border border-white/5 space-y-1">
                                <div className="flex justify-between items-center text-xs text-gray-400">
                                    <span>SUBTOTAL</span>
                                    <span>{(os.valorTotalSemDesconto || os.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                {discountForm.tipoDesconto && discountForm.valorDesconto && (
                                    <div className="flex justify-between items-center text-xs text-green-400">
                                        <span>DESCONTO PREVISTO</span>
                                        <span>
                                            - {(() => {
                                                const val = parseFloat(discountForm.valorDesconto);
                                                if (isNaN(val)) return 'R$ 0,00';

                                                const subtotal = os.valorTotalSemDesconto || os.valorTotal;
                                                let discountAmount = 0;

                                                if (discountForm.tipoDesconto === 'PERCENTUAL') {
                                                    discountAmount = subtotal * (val / 100);
                                                } else {
                                                    discountAmount = val;
                                                }
                                                return discountAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                            })()}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-sm font-bold text-cyber-gold border-t border-white/10 pt-2 mt-1">
                                    <span>TOTAL FINAL</span>
                                    <span>
                                        {(() => {
                                            const subtotal = os.valorTotalSemDesconto || os.valorTotal;
                                            let final = subtotal;

                                            if (discountForm.tipoDesconto && discountForm.valorDesconto) {
                                                const val = parseFloat(discountForm.valorDesconto);
                                                if (!isNaN(val)) {
                                                    if (discountForm.tipoDesconto === 'PERCENTUAL') {
                                                        final = subtotal - (subtotal * (val / 100));
                                                    } else {
                                                        final = subtotal - val;
                                                    }
                                                }
                                            }
                                            // Ensure non-negative
                                            return Math.max(0, final).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsFinalizeModalOpen(false)}
                                    className="text-gray-500 hover:text-white px-3 py-1 font-oxanium text-sm"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateDiscountMutation.isPending || updateStatusMutation.isPending}
                                    className="bg-green-500 text-black px-4 py-2 rounded font-bold hover:bg-green-400 font-oxanium text-sm flex items-center gap-2"
                                >
                                    {(updateDiscountMutation.isPending || updateStatusMutation.isPending) ? 'PROCESSANDO...' : (
                                        <>
                                            <CheckCircle className="w-4 h-4" /> CONFIRMAR E FINALIZAR
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

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
