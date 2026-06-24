import React, { useRef, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Trash2, MoveLeft, MoveRight, Loader2, X, ImagePlus, ChevronUp, ChevronDown, MousePointerClick, ZoomIn } from 'lucide-react';
import { osService } from '../../services/osService';
import type { VeiculoImagem } from '../../types';

interface Props {
    veiculoId: number;
    osId: number;
    imagens?: VeiculoImagem[];
}

interface ImageCardProps {
    img: VeiculoImagem;
    index: number;
    total: number;
    isSelected: boolean;
    onDelete: (id: number) => void;
    onLegendaBlur: (id: number, currentLegenda: string, newLegenda: string) => void;
    onMove: (index: number, direction: -1 | 1) => void;
    onImageClick: (id: number, url: string) => void;
    onZoomClick: (url: string) => void;
    isPending: boolean;
}

const ImageCard = ({ img, index, total, isSelected, onDelete, onLegendaBlur, onMove, onImageClick, onZoomClick, isPending }: ImageCardProps) => {
    return (
        <div 
            className={`relative group bg-black border ${isSelected ? 'border-cyber-gold shadow-[0_0_15px_rgba(255,215,0,0.4)]' : 'border-gray-700'} rounded overflow-hidden flex flex-col transition-all`}
        >
            {/* Actions Top */}
            <div className="absolute top-1 right-1 flex gap-1 z-20">
                <button 
                    onClick={(e) => { e.stopPropagation(); onZoomClick(img.url); }}
                    className="bg-black/80 text-gray-300 p-1.5 rounded-full hover:text-white hover:bg-gray-700 transition-colors"
                    title="Ampliar"
                >
                    <ZoomIn className="w-3 h-3" />
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
                    className="bg-black/80 text-red-400 p-1.5 rounded-full hover:text-red-300 hover:bg-red-900 transition-colors"
                    title="Excluir"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>

            {/* Selection Hint Indicator */}
            <div className="absolute top-1 left-1 bg-black/60 text-gray-400 p-1 rounded z-20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <MousePointerClick className="w-4 h-4" />
            </div>

            {/* Image Area (Click to Select) */}
            <div 
                className={`aspect-video w-full bg-gray-900 cursor-pointer overflow-hidden border-b ${isSelected ? 'border-cyber-gold' : 'border-gray-800'}`}
                onClick={() => onImageClick(img.id, img.url)}
            >
                <img 
                    src={img.url} 
                    alt={img.legenda || 'Veículo'} 
                    className={`w-full h-full object-cover transition-transform duration-300 pointer-events-none ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                />
            </div>

            {/* Controls Bottom */}
            <div className="p-2 flex flex-col gap-2 bg-gray-900/50 z-20">
                <input 
                    type="text" 
                    placeholder="Adicionar legenda..."
                    defaultValue={img.legenda || ''}
                    onBlur={(e) => onLegendaBlur(img.id, img.legenda || '', e.target.value)}
                    className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyber-gold focus:ring-1 focus:ring-cyber-gold transition-colors"
                />
                <div className="flex justify-between items-center px-1">
                    <button 
                        onClick={() => onMove(index, -1)}
                        disabled={index === 0 || isPending}
                        className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <MoveLeft className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] text-gray-600 font-mono">{index + 1}</span>
                    <button 
                        onClick={() => onMove(index, 1)}
                        disabled={index === total - 1 || isPending}
                        className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"
                    >
                        <MoveRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper arrayMove functions since we removed dnd-kit
function arrayMove<T>(array: T[], from: number, to: number): T[] {
    const newArray = [...array];
    const item = newArray.splice(from, 1)[0];
    newArray.splice(to, 0, item);
    return newArray;
}

export const VeiculoImagemGrid: React.FC<Props> = ({ veiculoId, osId, imagens = [] }) => {
    const queryClient = useQueryClient();
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [localImagens, setLocalImagens] = useState<VeiculoImagem[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [selectedImageId, setSelectedImageId] = useState<number | null>(null);

    useEffect(() => {
        setLocalImagens([...imagens].sort((a, b) => a.ordem - b.ordem));
    }, [imagens]);

    const invalidateOS = () => {
        queryClient.invalidateQueries({ queryKey: ['ordem-servico', osId] });
    };

    const uploadMutation = useMutation({
        mutationFn: (file: File) => osService.uploadVeiculoImagem(veiculoId, file),
        onSuccess: () => invalidateOS(),
        onError: (err) => {
            console.error('Erro no upload', err);
            alert('Falha ao enviar imagem. Tente novamente.');
        },
        onSettled: () => setIsUploading(false)
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => osService.deleteVeiculoImagem(id),
        onSuccess: () => invalidateOS(),
        onError: () => alert('Falha ao excluir imagem.')
    });

    const updateLegendaMutation = useMutation({
        mutationFn: ({ id, legenda }: { id: number, legenda: string }) => osService.updateVeiculoImagemLegenda(id, legenda),
        onSuccess: () => invalidateOS()
    });

    const reorderMutation = useMutation({
        mutationFn: (ids: number[]) => osService.reorderVeiculoImagens(veiculoId, ids),
        onSuccess: () => invalidateOS(),
        onError: () => {
            alert('Falha ao salvar a nova ordem das imagens.');
            invalidateOS(); // Reverte para a ordem do servidor em caso de erro
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            uploadMutation.mutate(file);
        }
        e.target.value = '';
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Deseja excluir esta foto permanentemente?')) {
            deleteMutation.mutate(id);
            setLocalImagens(prev => prev.filter(img => img.id !== id)); // Optimistic UI
            if (selectedImageId === id) setSelectedImageId(null);
        }
    };

    const handleLegendaBlur = (id: number, currentLegenda: string, newLegenda: string) => {
        if (currentLegenda !== newLegenda) {
            updateLegendaMutation.mutate({ id, legenda: newLegenda });
        }
    };

    const moveImage = (index: number, direction: -1 | 1) => {
        if (index + direction < 0 || index + direction >= localImagens.length) return;
        
        const newOrder = [...localImagens];
        const temp = newOrder[index];
        newOrder[index] = newOrder[index + direction];
        newOrder[index + direction] = temp;
        
        setLocalImagens(newOrder);
        reorderMutation.mutate(newOrder.map(img => img.id));
    };

    const handleImageTap = (id: number, url: string) => {
        if (selectedImageId === null) {
            // Toque 1: Seleciona
            setSelectedImageId(id);
        } else if (selectedImageId === id) {
            // Cancelar seleção (toggle off)
            setSelectedImageId(null);
        } else {
            // Toque 2: Mover
            const oldIndex = localImagens.findIndex(i => i.id === selectedImageId);
            const newIndex = localImagens.findIndex(i => i.id === id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newOrder = arrayMove(localImagens, oldIndex, newIndex);
                setLocalImagens(newOrder);
                reorderMutation.mutate(newOrder.map(img => img.id));
            }
            setSelectedImageId(null);
        }
    };

    return (
        <div className="mt-4 border-t border-white/10 pt-4 relative">
            {isUploading && (
                <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center rounded backdrop-blur-sm">
                    <Loader2 className="w-8 h-8 text-cyber-gold animate-spin" />
                </div>
            )}
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0 mb-3">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 hover:bg-white/5 px-2 py-1 -ml-2 rounded transition-colors group text-left w-full md:w-auto"
                >
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-cyber-gold" /> : <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-cyber-gold" />}
                    <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2 font-oxanium uppercase m-0">
                        <Camera className="w-4 h-4 text-gray-400" />
                        Fotos ({localImagens.length}/30) <span className="text-gray-500 font-normal lowercase text-xs ml-1">— faltam {30 - localImagens.length}</span>
                    </h4>
                </button>
                
                <div className="flex gap-2">
                    <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        ref={cameraInputRef} 
                        onChange={handleFileChange} 
                    />
                    <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        ref={galleryInputRef} 
                        onChange={handleFileChange} 
                    />
                    <button 
                        onClick={() => cameraInputRef.current?.click()}
                        disabled={localImagens.length >= 30 || isUploading}
                        className="bg-cyber-gold/20 text-cyber-gold border border-cyber-gold/50 px-3 py-1.5 rounded hover:bg-cyber-gold hover:text-black transition-all font-oxanium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Tirar Foto"
                    >
                        <Camera className="w-3 h-3" /> CÂMERA
                    </button>
                    <button 
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={localImagens.length >= 30 || isUploading}
                        className="bg-white/10 text-gray-300 border border-white/20 px-3 py-1.5 rounded hover:bg-white/20 hover:text-white transition-all font-oxanium text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Escolher da Galeria"
                    >
                        <ImagePlus className="w-3 h-3" /> GALERIA
                    </button>
                </div>
            </div>

            {isExpanded && (
                <>
                {localImagens.length > 0 ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-5 px-1 py-2">
                        {localImagens.map((img, index) => (
                            <ImageCard 
                                key={img.id}
                                img={img}
                                index={index}
                                total={localImagens.length}
                                isSelected={selectedImageId === img.id}
                                onDelete={handleDelete}
                                onLegendaBlur={handleLegendaBlur}
                                onMove={moveImage}
                                onImageClick={handleImageTap}
                                onZoomClick={setLightboxImage}
                                isPending={reorderMutation.isPending}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 bg-black/20 rounded border border-white/5 border-dashed">
                        <Camera className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
                        <p className="text-gray-400 font-oxanium text-sm">Nenhuma foto adicionada para este veículo.</p>
                        <p className="text-gray-500 text-xs mt-1">Limite de 30 fotos. O excedente causará erro ao gerar o PDF.</p>
                    </div>
                )}
                </>
            )}

            {/* Lightbox Modal */}
            {lightboxImage && (
                <div 
                    className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
                    onClick={() => setLightboxImage(null)}
                >
                    <button 
                        className="absolute top-4 right-4 text-white hover:text-cyber-gold bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-[101]"
                        onClick={() => setLightboxImage(null)}
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img 
                            src={lightboxImage} 
                            alt="Zoom" 
                            className="max-w-full max-h-full object-contain rounded"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
