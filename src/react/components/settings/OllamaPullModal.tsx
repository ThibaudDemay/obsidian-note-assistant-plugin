import {
    ModelResponse as OllamaModelResponse
} from 'ollama/browser';
import React, { useState, useEffect, useMemo } from 'react';

import { OllamaModel } from '@/@types';
import { usePlugin } from '@/react/contexts';
import { formatNumeric } from '@/utils';

import { ObsidianIcon } from '../shared/ObsidianIcon';
import styles from './OllamaPullModal.module.css';

interface DownloadProgress {
    status: string;
    digest?: string;
    total?: number;
    completed?: number;
    percent?: number;
}

interface OllamaPullModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPullComplete?: (modelName: string, modelType: 'llm'|'embedding') => void;
    modelType?: 'llm' | 'embedding';
    limit?: number;
}

const filterModelByType = (model: OllamaModel, type: 'llm'|'embedding'): boolean => {
    const arch = model.lastestDetails[0]?.description?.arch;
    if (arch) {
        const embeddingArchKeywords = ['bert'];

        if (type === 'embedding') {
            return embeddingArchKeywords.some(keyword => arch.includes(keyword));
        } else {
            return !embeddingArchKeywords.some(keyword => arch.includes(keyword));
        }
    } else {
        const embeddingCapabilities = ['embeddings', 'embedding', 'embed'];
        if (type === 'embedding') {
            return embeddingCapabilities.some(keyword => model.capabilities?.includes(keyword));
        } else {
            return !embeddingCapabilities.some(keyword => model.capabilities?.includes(keyword));
        }
    }
};

export const OllamaPullModal: React.FC<OllamaPullModalProps> = ({
    isOpen,
    onClose,
    onPullComplete,
    modelType = 'llm',
    limit = 4
}) => {
    const plugin = usePlugin();

    const [searchTerm, setSearchTerm] = useState('');
    const [installedModels, setInstalledModels] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<OllamaModel[]>([]);
    const [popularModels, setPopularModels] = useState<OllamaModel[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // Charger les modèles du registry
    const loadRegistryModels = async () => {
        if (!plugin) return;

        setIsLoading(true);
        setDownloadError(null);

        try {
            const installed = await plugin.ollamaService.getInstalledModels();
            const installedNames = installed.map((model: OllamaModelResponse) => model.name.toLowerCase());
            setInstalledModels(installedNames);

            await plugin.ollamaScraper.scrape();
            const allModels = plugin.ollamaScraper.modelsList;
            setAvailableModels(allModels);

            const filteredModels = allModels
                .filter(model => filterModelByType(model, modelType))
                .sort((a, b) => b.pullCount - a.pullCount) // Trier par popularité
                .slice(0, limit);

            setPopularModels(filteredModels);
        } catch(error) {
            console.error('Erreur lors du chargement des modèles:', error);
            setDownloadError('Impossible de charger les modèles du registry');
        } finally {
            setIsLoading(false);
        }
    };

    // Charger les modèles à l'ouverture
    useEffect(() => {
        if (isOpen && plugin) {
            loadRegistryModels();
        }
    }, [isOpen, plugin, modelType]);

    // Reset au fermeture
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setIsDownloading(false);
            setDownloadProgress(null);
            setDownloadError(null);
            setInstalledModels([]);
        }
    }, [isOpen]);

    // Filtrer les modèles selon la recherche
    const filteredModels = useMemo(() => {
        if (!searchTerm.trim()) return [];

        const query = searchTerm.toLowerCase().split(':')[0];
        return availableModels
            .filter(model =>
                filterModelByType(model, modelType) &&
                model.name.toLowerCase().includes(query)
            )
            .slice(0, 4);
    }, [availableModels, searchTerm, modelType]);

    const handleDownload = async () => {
        if (!plugin) return;

        const modelToDownload = searchTerm.trim();
        if (!modelToDownload || isDownloading) return;

        setIsDownloading(true);
        setDownloadProgress(null);
        setDownloadError(null);

        try {
            await plugin.ollamaService.pullModel(modelToDownload, (progress: DownloadProgress) => {
                setDownloadProgress(progress);
            });

            // Succès
            onPullComplete?.(modelToDownload, modelType);

            await loadRegistryModels();

            onClose();

        } catch (error) {
            console.error('Erreur téléchargement:', error);
            setDownloadError(error instanceof Error ? error.message : 'Erreur de téléchargement');
        } finally {
            setIsDownloading(false);
            setDownloadProgress(null);
        }
    };

    const handleModelSelect = (modelName: string) => {
        setSearchTerm(modelName);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchTerm.trim() && !isDownloading) {
            handleDownload();
        }
        if (e.key === 'Escape') {
            onClose();
        }
    };

    // Calculer le pourcentage de progression
    const getProgressPercent = () => {
        if (!downloadProgress) return 0;
        if (downloadProgress.percent !== undefined) return downloadProgress.percent;
        if (downloadProgress.total && downloadProgress.completed) {
            return Math.round((downloadProgress.completed / downloadProgress.total) * 100);
        }
        return 0;
    };

    // Vérifier si un modèle est installé
    const isModelInstalled = (modelName: string) => {
        return installedModels.some(installed =>
            installed === modelName.toLowerCase() ||
            installed.startsWith(modelName.toLowerCase() + ':')
        );
    };


    // Obtenir la taille du modèle depuis lastestDetails
    const getModelSize = (model: OllamaModel): string | null => {
        const modelDetail = model.lastestDetails?.find(detail => detail.name === 'model');
        return modelDetail?.size || null;
    };

    const canDownload = searchTerm.trim() && !isDownloading && plugin;

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={styles.modal}>
                {/* Header */}
                <div className={styles.header}>
                    <h3 className={styles.title}>
              Télécharger un modèle {modelType === 'embedding' ? 'embedding' : 'LLM'}
                    </h3>
                    <button className={styles.close} onClick={onClose} disabled={isDownloading}>
                        <ObsidianIcon iconName='x' />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Champ de recherche - masqué pendant le téléchargement */}
                    {!isDownloading && (
                        <div className={styles.searchBox}>
                            <input
                                type="text"
                                placeholder={`Nom du modèle ${modelType} (ex: ${modelType === 'embedding' ? 'nomic-embed-text' : 'llama3.2:3b'})`}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleKeyPress}
                                className={styles.searchInput}
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Erreur de chargement - masquée pendant le téléchargement */}
                    {!isDownloading && downloadError && (
                        <div className={styles.errorMessage}>
                            {downloadError}
                            {!isLoading && (
                                <button
                                    onClick={loadRegistryModels}
                                    className={styles.retryBtn}
                                >
                    Réessayer
                                </button>
                            )}
                        </div>
                    )}

                    {/* Résultats de recherche - masqués pendant le téléchargement */}
                    {!isDownloading && searchTerm && filteredModels.length > 0 && (
                        <div className={styles.suggestions}>
                            {filteredModels.map((model) => {
                                const isInstalled = isModelInstalled(model.name);
                                const modelSize = getModelSize(model);
                                return (
                                    <div
                                        key={model.name}
                                        className={`${styles.suggestion} ${isInstalled ? styles.installed : ''}`}
                                        onClick={() => handleModelSelect(model.name)}
                                    >
                                        <div className={styles.modelInfo}>
                                            <div className={styles.modelHeader}>
                                                <span className={styles.modelName}>
                                                    {model.name}
                                                    {isInstalled && <span className={styles.installedBadge}>✓</span>}
                                                </span>
                                                <span className={styles.pullCount}>
                                                    {formatNumeric(model.pullCount, 'us')} pulls
                                                </span>
                                            </div>
                                            {model.capabilities.length > 0 && (
                                                <div className={styles.capabilities}>
                                                    {model.capabilities.slice(0, 3).map(cap => (
                                                        <span key={cap} className={styles.capability}>{cap}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={styles.modelDesc}>{model.description}</div>
                                            <div className={styles.modelMeta}>
                                                <div className={styles.paramSection}>
                                                    <span className={styles.paramLabel}>Paramètres :</span>
                                                    {model.sizes.map(size => (
                                                        <span key={size} className={styles.paramSize}>
                                                            {size}
                                                        </span>
                                                    ))}
                                                </div>
                                                {modelSize && (
                                                    <div className={styles.sizeSection}>
                                                        <span className={styles.sizeLabel}>Taille :</span>
                                                        <span className={styles.modelSize}>
                                                            {modelSize}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );})}
                        </div>
                    )}

                    {/* Modèles populaires - masqués pendant le téléchargement */}
                    {!isDownloading && !isLoading && popularModels.length > 0 && (
                        <div className={styles.popular}>
                            <span className={styles.popularLabel}>
                  Populaires ({modelType}):
                            </span>
                            <div className={styles.popularGrid}>
                                {popularModels.map((model) => {
                                    const isInstalled = isModelInstalled(model.name);
                                    return (
                                        <div
                                            key={model.name}
                                            className={`${styles.popularItem} ${isInstalled ? styles.installed : ''}`}
                                            onClick={() => handleModelSelect(model.name)}
                                        >
                                            <div className={styles.popularHeader}>
                                                <span className={styles.popularName}>
                                                    {model.name}
                                                    {isInstalled && <span className={styles.installedBadge}>✓</span>}
                                                </span>
                                                <span className={styles.popularPulls}>
                                                    {formatNumeric(model.pullCount, 'us')}
                                                </span>
                                            </div>
                                            <div className={styles.popularDesc}>{model.description}</div>
                                        </div>
                                    );})}
                            </div>
                        </div>
                    )}

                    {/* Loading des modèles - masqué pendant le téléchargement */}
                    {!isDownloading && isLoading && (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                            <span>Chargement des modèles du registry...</span>
                        </div>
                    )}

                    {/* État de téléchargement avec progression */}
                    {isDownloading && (
                        <div className={styles.downloadSection}>
                            <div className={styles.downloadCard}>
                                <div className={styles.downloadHeader}>
                                    <div className={styles.downloadIcon}>
                                        <div className={styles.spinner}></div>
                                    </div>
                                    <div className={styles.downloadInfo}>
                                        <div className={styles.downloadTitle}>
                        Téléchargement de {searchTerm}
                                        </div>
                                        <div className={styles.downloadSubtitle}>
                                            {downloadProgress?.status || 'Initialisation...'}
                                        </div>
                                    </div>
                                </div>

                                {downloadProgress && (
                                    <div className={styles.progressSection}>
                                        <div className={styles.progressBar}>
                                            <div
                                                className={styles.progressFill}
                                                style={{ width: `${getProgressPercent()}%` }}
                                            ></div>
                                        </div>
                                        <div className={styles.progressStats}>
                                            <span className={styles.progressPercent}>
                                                {getProgressPercent()}%
                                            </span>
                                            {downloadProgress.total && downloadProgress.completed && (
                                                <span className={styles.progressSize}>
                                                    {Math.round(downloadProgress.completed / 1024 / 1024)} MB /
                                                    {Math.round(downloadProgress.total / 1024 / 1024)} MB
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button
                        onClick={onClose}
                        className={styles.btnCancel}
                        disabled={isDownloading}
                    >
                        {isDownloading ? 'Annuler' : 'Fermer'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className={styles.btnDownload}
                        disabled={!canDownload}
                    >
                        {isDownloading ? 'Téléchargement...' : 'Télécharger'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook personnalisé pour utiliser le modal
export const useOllamaPullModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'llm' | 'embedding'>('llm');

    const openModal = (type: 'llm' | 'embedding' = 'llm') => {
        setModalType(type);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    const OllamaPullModalComponent = ({
        onPullComplete,
        limit = 4
    }: {
    onPullComplete?: (modelName: string, modeltype: 'llm'|'embedding') => void;
    limit?: number;
  }) => (
        <OllamaPullModal
            isOpen={isModalOpen}
            onClose={closeModal}
            onPullComplete={onPullComplete}
            modelType={modalType}
            limit={limit}
        />
    );

    return {
        openModal,
        closeModal,
        OllamaPullModalComponent,
        isModalOpen,
        modalType
    };
};
