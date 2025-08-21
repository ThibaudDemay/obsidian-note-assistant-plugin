import React, {
    MouseEvent,
    useEffect,
    useState
} from 'react';

import { ServiceStatus, StatusProps } from '@/@types/react/components/settings';
import { EmbeddingStatus } from '@/react/components/settings';
import { ObsidianIcon } from '@/react/components/shared';
import { usePlugin } from '@/react/contexts';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import styles from './GlobalStatus.module.css';

const StatusLine: React.FC<StatusProps> = ({status}) => {
    return  (
        <div className={styles.statusLine + ' ' + status.class}>
            <span className={styles.statusIcon}>{status.icon}</span>
            <span className={styles.statusLabel}>{status.label}</span>
            <span className={styles.statusInfo}>{status.info}</span>
        </div>
    );
};

export const GlobalStatus: React.FC<SettingTabChildProps> = ({
    settings,
    onUpdateSettings
}) => {
    const plugin = usePlugin();
    const [ollamaConnected, setOllamaConnected] = useState<boolean>(false);
    const [refresh, setRefresh] = useState<boolean>(false);
    const [ollamaStatus, setOllamaStatus] = useState<ServiceStatus>({
        label: 'Ollama',
        icon: '❌',
        info: 'Disconnected',
        class: styles.statusDisconnected
    });
    const [llmModelStatus, setLlmModelStatus] = useState<ServiceStatus>({
        label: 'LLM Model:',
        icon: '⚫',
        info: 'unavailable',
        class: styles.statusDisabled
    });

    const [embeddingModelStatus, setEmbeddingModelStatus] = useState<ServiceStatus>({
        label: 'Embedding Model:',
        icon: '⚫',
        info: 'unavailable',
        class: styles.statusDisabled
    });

    const fetchOllamaStatus = async () => {
        const isOllamaConnected = await plugin?.ollamaService.testConnection();
        if (isOllamaConnected) {
            setOllamaConnected(true);
            const version = await plugin?.ollamaService.getOllamaVersion();
            let info = 'Connected';
            if (version) {
                info += ` (v${version})`;
            }
            setOllamaStatus({
                ...ollamaStatus,
                info: info,
                icon: '✅',
                class: styles.statusConnected
            });

        } else {
            setOllamaConnected(false);
            setOllamaStatus({
                ...ollamaStatus,
                info: 'Disconnected',
                icon: '❌',
                class: styles.statusDisconnected
            });
        }
    };

    const fetchLlmModelStatus = async () => {
        if (ollamaConnected && plugin?.settings.llmModel) {
            const ollamaModels = await plugin?.ollamaService.getInstalledModels();
            const llmModelInstalled = ollamaModels?.some(m => m.name === plugin.settings.llmModel);

            if (llmModelInstalled) {
                const isLoaded = await plugin?.ollamaService.isModelLoaded(plugin.settings.llmModel);

                if (isLoaded) {
                    setLlmModelStatus({
                        ...llmModelStatus,
                        icon: '🟢',
                        info: `${plugin.settings.llmModel} - Ready`,
                        class: styles.statusLoaded
                    });
                } else {
                    setLlmModelStatus({
                        ...llmModelStatus,
                        icon: '🟡',
                        info: `${plugin.settings.llmModel} - Available`,
                        class: styles.statusAvailable
                    });
                }
            } else {
                setLlmModelStatus({
                    ...llmModelStatus,
                    icon: '❌',
                    info: `${plugin.settings.llmModel} - Not Found`,
                    class: styles.statusError
                });
            }
        } else if (!plugin?.settings.llmModel) {
            setLlmModelStatus({
                ...llmModelStatus,
                icon: '⚠️',
                info: 'Not Selected',
                class: styles.statusWarning
            });
        } else {
            setLlmModelStatus({
                ...llmModelStatus,
                icon: '⚫',
                info: 'unavailable',
                class: styles.statusDisabled
            });
        }
    };

    const fetchEmbeddingModelStatus = async () => {
        if (ollamaConnected && plugin?.settings.embeddingModel) {
            const ollamaModels = await plugin?.ollamaService.getInstalledModels();
            const embeddingModelExists = ollamaModels?.some(m => m.name === plugin.settings.embeddingModel);

            if (embeddingModelExists) {
                const isLoaded = await plugin?.ollamaService.isModelLoaded(plugin.settings.embeddingModel);

                let statusText = plugin.settings.embeddingModel;

                if (plugin.embeddingService) {
                    const embeddingsCount = plugin.embeddingService.getEmbeddingsCount();
                    if (embeddingsCount > 0) {
                        statusText += ` (${embeddingsCount} notes)`;
                    }
                }

                if (isLoaded) {
                    setEmbeddingModelStatus({
                        ...embeddingModelStatus,
                        icon: '🟢',
                        info: `${statusText} - Ready`,
                        class: styles.statusLoaded
                    });
                } else {
                    setEmbeddingModelStatus({
                        ...embeddingModelStatus,
                        icon: '🟡',
                        info: `${statusText} - Available`,
                        class: styles.statusAvailable
                    });
                }
            } else {
                setEmbeddingModelStatus({
                    ...embeddingModelStatus,
                    icon: '❌',
                    info: `${plugin.settings.embeddingModel} - Not Found`,
                    class: styles.statusError
                });
            }
        } else if (!plugin?.settings.llmModel) {
            setEmbeddingModelStatus({
                ...embeddingModelStatus,
                icon: '⚠️',
                info: 'Not Selected',
                class: styles.statusWarning
            });
        } else {
            setEmbeddingModelStatus({
                ...embeddingModelStatus,
                icon: '⚫',
                info: 'unavailable',
                class: styles.statusDisabled
            });
        }
    };

    const handleRefresh = async (event: MouseEvent<HTMLButtonElement>) => {
        setRefresh(true);
        event.preventDefault();
        fetchOllamaStatus().then(() => {
            fetchLlmModelStatus();
            fetchEmbeddingModelStatus();
        }).finally(() => setRefresh(false));
    };

    useEffect(() => {
        setRefresh(true);
        fetchOllamaStatus().then(() => {
            fetchLlmModelStatus();
            fetchEmbeddingModelStatus();
        }).finally(() => setRefresh(false));
    }, [settings]);

    useEffect(() => {
        setRefresh(true);
        fetchLlmModelStatus();
        fetchEmbeddingModelStatus();
        setRefresh(false);
    }, [ollamaConnected]);


    return (
        <div className={styles.globalStatusContainer}>
            <div className={styles.globalStatusHeader}>
                <h3 className={styles.globalStatusTitle}>System Status</h3>
                <button
                    title="Refresh Status"
                    className={styles.statusRefreshButtonInline}
                    onClick={handleRefresh}
                    disabled={refresh}
                >
                    {refresh ? <ObsidianIcon iconName="hourglass" />: <ObsidianIcon iconName="refresh-cw" />}
                </button>
            </div>
            <div className={styles.statusList}>
                <StatusLine status={ollamaStatus} />
                <StatusLine status={llmModelStatus} />
                <StatusLine status={embeddingModelStatus} />
            </div>
            {/* Composant de statut des embeddings */}
            <EmbeddingStatus />
        </div>
    );
};
