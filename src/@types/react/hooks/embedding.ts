/*
 * File Name         : embedding.ts
 * Description       : !! description !!
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 21:06:07
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:06:23
 */

import {
    EmbeddingProgress,
    EmbeddingStats
} from '@/@types/events/EmbeddingEvents';

export interface EmbeddingState {
    progress: EmbeddingProgress;
    stats: EmbeddingStats | null;
    isInitialized: boolean;
    isLoading: boolean;
    lastUpdated: number;
    error: Error | null;
}

export interface EmbeddingActions {
    refreshStats: () => void;
    regenerateAll: () => Promise<void>;
    clearError: () => void;
}
