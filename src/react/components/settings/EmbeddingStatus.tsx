// src/react/components/settings/EmbeddingStatus.tsx
import React, { useEffect, useState } from 'react';

import { ObsidianIcon } from '@/react/components/shared/ObsidianIcon';
import { usePlugin } from '@/react/contexts';

import styles from './EmbeddingStatus.module.css';

interface EmbeddingStats {
    totalEmbeddings: number;
    totalFiles: number;
    averageSectionsPerFile: number;
    embeddingDimensions: number;
    diskUsageEstimate: string;
    isRunning: boolean;
    progress?: {
        processed: number;
        total: number;
        errors: number;
    };
}

export const EmbeddingStatus: React.FC = () => {
    const plugin = usePlugin();
    const [stats, setStats] = useState<EmbeddingStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshStats = async () => {
        if (!plugin?.embeddingService) {
            setStats(null);
            setIsLoading(false);
            return;
        }

        try {
            const detailedStats = plugin.embeddingService.getDetailedStats();
            const progress = plugin.embeddingService.getProgress();

            setStats({
                ...detailedStats,
                isRunning: progress.isRunning,
                progress: progress.isRunning ? progress : undefined
            });
        } catch (error) {
            console.error('Error fetching embedding stats:', error);
            setStats(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshStats();

        // Rafraîchir les stats toutes les 3 secondes si une génération est en cours
        const interval = setInterval(() => {
            if (stats?.isRunning) {
                refreshStats();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [plugin, stats?.isRunning]);

    const handleRegenerateAll = async () => {
        if (!plugin?.embeddingService) return;

        try {
            setIsLoading(true);
            await plugin.embeddingService.regenerateAllEmbeddings();
            await refreshStats();
        } catch (error) {
            console.error('Error regenerating embeddings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshStats = () => {
        setIsLoading(true);
        refreshStats();
    };

    if (isLoading) {
        return (
            <div className={styles.embeddingStatus}>
                <div className={styles.loading}>Loading embedding stats...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className={styles.embeddingStatus}>
                <div className={styles.statusContent}>
                    <p>Embedding service is not initialized. Check your configuration.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.embeddingStatus}>
            <div className={styles.statusContent}>
                {stats.isRunning && stats.progress && (
                    <div className={styles.progressSection}>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{
                                    width: `${(stats.progress.processed / stats.progress.total) * 100}%`
                                }}
                            />
                        </div>
                        <div className={styles.progressText}>
                            <ObsidianIcon iconName="loader" />
                            Generating embeddings...
                            {stats.progress.errors > 0 && (
                                <span className={styles.progressErrors}>
                                    ({stats.progress.errors} errors)
                                </span>
                            )}
                        </div>
                    </div>
                )}

                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Files</span>
                        <span className={styles.statValue}>{stats.totalFiles}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Embeddings</span>
                        <span className={styles.statValue}>{stats.totalEmbeddings}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Avg Sections</span>
                        <span className={styles.statValue}>
                            {stats.averageSectionsPerFile.toFixed(1)}
                        </span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Dimensions</span>
                        <span className={styles.statValue}>{stats.embeddingDimensions}</span>
                    </div>
                    <div className={styles.statItem}>
                        <span className={styles.statLabel}>Memory</span>
                        <span className={styles.statValue}>{stats.diskUsageEstimate}</span>
                    </div>
                </div>

                <div className={styles.actionArea}>
                    {stats.isRunning && stats.progress && (
                        <div className={styles.progressInfo}>
                            {stats.progress.processed} / {stats.progress.total} files
                        </div>
                    )}
                    <div className={styles.actionButtons}>
                        <button
                            className={styles.actionButton}
                            onClick={handleRefreshStats}
                            disabled={stats.isRunning}
                        >
                            <ObsidianIcon iconName="refresh-cw" />
                            Refresh
                        </button>
                        <button
                            className={styles.actionButton}
                            onClick={handleRegenerateAll}
                            disabled={stats.isRunning}
                        >
                            <ObsidianIcon iconName="rotate-ccw" />
                            Regenerate All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
