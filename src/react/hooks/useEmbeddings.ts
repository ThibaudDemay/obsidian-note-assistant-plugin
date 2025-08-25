/*
 * File Name         : useEmbeddings.ts
 * Description       : Embeddings hook to manage embeddings state and actions
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:32:34
 */

// src/react/hooks/useEmbeddings.ts
import { EventRef } from 'obsidian';
import { useCallback, useEffect, useState,  } from 'react';

import { EmbeddingEventData } from '@/@types/events/EmbeddingEvents';
import { EmbeddingActions, EmbeddingState } from '@/@types/react/hooks/embedding';
import { EmbeddingEventManager } from '@/events/EmbeddingEventManager';
import { usePlugin } from '@/react/contexts';

export const useEmbeddings = (): [EmbeddingState, EmbeddingActions] => {
    const plugin = usePlugin();
    const eventManager = EmbeddingEventManager.getInstance();

    const [state, setState] = useState<EmbeddingState>({
        progress: { total: 0, processed: 0, errors: 0, isRunning: false },
        stats: null,
        isInitialized: false,
        isLoading: false, // Plus de loading manuel, géré par les événements
        lastUpdated: 0,
        error: null
    });

    // Actions simplifiées - tout passe par le service maintenant
    const actions: EmbeddingActions = {
        refreshStats: useCallback(() => {
            // Le service émettra automatiquement les stats à jour
            if (plugin?.embeddingService) {
                // Forcer une émission d'état actuel
                const progress = plugin.embeddingService.getProgress();
                const stats = plugin.embeddingService.getDetailedStats();

                setState(prev => ({
                    ...prev,
                    progress,
                    stats: {
                        totalEmbeddings: stats.totalEmbeddings,
                        totalFiles: stats.totalFiles,
                        averageSectionsPerFile: stats.averageSectionsPerFile,
                        embeddingDimensions: stats.embeddingDimensions,
                        diskUsageEstimate: stats.diskUsageEstimate,
                        cacheHitRate: stats.cacheHitRate
                    },
                    isInitialized: plugin.embeddingService.getIsInitialized(),
                    lastUpdated: Date.now()
                }));
            }
        }, [plugin]),

        regenerateAll: useCallback(async () => {
            if (!plugin?.embeddingService) return;

            try {
                // Le service gère automatiquement les événements de début/fin/erreur
                await plugin.embeddingService.regenerateAllEmbeddings();
            } catch (error) {
                setState(prev => ({ ...prev, error: error as Error }));
            }
        }, [plugin]),

        clearError: useCallback(() => {
            setState(prev => ({ ...prev, error: null }));
        }, [])
    };

    // Effet pour s'abonner aux événements - BEAUCOUP plus simple maintenant
    useEffect(() => {
        if (!plugin?.embeddingService) return;

        const eventRefs: EventRef[] = [];

        // Écouter TOUS les changements d'état via un seul événement
        eventRefs.push(
            eventManager.onStatsUpdate((data: EmbeddingEventData) => {
                setState(prev => ({
                    ...prev,
                    progress: data.progress,
                    stats: data.stats,
                    lastUpdated: data.timestamp,
                    isInitialized: !!plugin.embeddingService?.getIsInitialized()
                }));
            })
        );

        // Écouter les erreurs
        eventRefs.push(
            eventManager.onGenerationError((error: Error) => {
                setState(prev => ({ ...prev, error }));
            })
        );

        // Écouter l'initialisation
        eventRefs.push(
            eventManager.onServiceInitialized(() => {
                setState(prev => ({ ...prev, isInitialized: true }));
                // Charger les stats initiales
                actions.refreshStats();
            })
        );

        // Nettoyage
        return () => {
            eventRefs.forEach(ref => eventManager.offref(ref));
        };
    }, [plugin, eventManager, actions.refreshStats]);

    // Charger les stats initiales une seule fois
    useEffect(() => {
        if (plugin?.embeddingService && plugin.embeddingService.getIsInitialized()) {
            actions.refreshStats();
        }
    }, [plugin, actions.refreshStats]);

    return [state, actions];
};
