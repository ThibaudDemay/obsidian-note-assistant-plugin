/*
 * File Name         : EmbeddingEvents.ts
 * Description       : Types for embedding events
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 19:10:56
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:11:12
 */

export interface EmbeddingProgress {
    total: number;
    processed: number;
    errors: number;
    isRunning: boolean;
}

export interface EmbeddingStats {
    totalEmbeddings: number;
    totalFiles: number;
    averageSectionsPerFile: number;
    embeddingDimensions: number;
    diskUsageEstimate: string;
    cacheHitRate: number;
}

export interface EmbeddingEventData {
    progress: EmbeddingProgress;
    stats: EmbeddingStats;
    timestamp: number;
}
