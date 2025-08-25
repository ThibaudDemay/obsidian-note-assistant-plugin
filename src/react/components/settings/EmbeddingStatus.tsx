/*
 * File Name         : EmbeddingStatus.tsx
 * Description       : Embedding status component for global status in settings view with embedding
 *                     statistics like number of files embedded, number of embeddings, size on disk
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 20:13:06
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 20:13:21
 */

import React from 'react';

import { ObsidianIcon } from '@/react/components/shared/ObsidianIcon';
import { useEmbeddings } from '@/react/hooks/useEmbeddings';

import styles from './EmbeddingStatus.module.css';

export const EmbeddingStatus: React.FC = () => {
    const [embeddingState, embeddingActions] = useEmbeddings();

    // État de chargement initial
    if (embeddingState.isLoading && !embeddingState.stats) {
        return (
            <div className={styles.embeddingStatus}>
                <div className={styles.loading}>Loading embedding stats...</div>
            </div>
        );
    }

    // Service non initialisé
    if (!embeddingState.isInitialized || !embeddingState.stats) {
        return (
            <div className={styles.embeddingStatus}>
                <div className={styles.statusContent}>
                    <p>Embedding service is not initialized. Check your configuration.</p>
                </div>
            </div>
        );
    }

    // Destructuring pour plus de lisibilité
    const { progress, stats, error } = embeddingState;

    return (
        <div className={styles.embeddingStatus}>
            <div className={styles.statusContent}>
                {/* Bannière d'erreur - apparaît automatiquement si error existe */}
                {error && (
                    <div className={styles.errorBanner}>
                        <span><ObsidianIcon iconName='triangle-alert'/> {error.message}</span>
                        <button
                            onClick={embeddingActions.clearError}
                            className={styles.clearErrorButton}
                        >
                            <ObsidianIcon iconName='x' />
                        </button>
                    </div>
                )}

                {/* Grille des statistiques - se met à jour automatiquement via les événements */}
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

                {/* Zone d'actions avec barre de progression intégrée */}
                <div className={styles.actionArea}>
                    <div className={styles.actionSection}>
                        {/* Bouton de régénération avec progress à côté */}
                        <button
                            className={styles.regenerateButton}
                            onClick={embeddingActions.regenerateAll}
                            disabled={progress.isRunning || embeddingState.isLoading}
                        >
                            {progress.isRunning ? (
                                <ObsidianIcon iconName="loader" />
                            ) : (
                                <ObsidianIcon iconName="rotate-ccw" />
                            )}
                            {progress.isRunning ? 'Generating...' : 'Regenerate All'}
                        </button>

                        {/* Barre de progression et compteur à côté du bouton */}
                        {progress.isRunning && (
                            <div className={styles.progressContainer}>
                                <div className={styles.progressBar}>
                                    <div
                                        className={styles.progressFill}
                                        style={{
                                            width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`
                                        }}
                                    />
                                </div>
                                <div className={styles.progressInfo}>
                                    {progress.processed} / {progress.total} files
                                    {progress.errors > 0 && (
                                        <span className={styles.progressErrors}>
                                            ({progress.errors} errors)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
