/*
 * File Name         : EmbeddingEvents.ts
 * Description       : Event Manager for embedding-related events
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:15:31
 */

import { EventRef, Events } from 'obsidian';

import { EmbeddingEventData } from '@/@types/events/EmbeddingEvents';

// Types d'événements embedding
export const EMBEDDING_EVENTS = {
    PROGRESS_UPDATED: 'embedding:progress-updated',
    STATS_UPDATED: 'embedding:stats-updated',
    GENERATION_STARTED: 'embedding:generation-started',
    GENERATION_COMPLETED: 'embedding:generation-completed',
    GENERATION_ERROR: 'embedding:generation-error',
    SERVICE_INITIALIZED: 'embedding:service-initialized',
    FILE_PROCESSED: 'embedding:file-processed'
} as const;

// Singleton pour gérer les événements embeddings
export class EmbeddingEventManager extends Events {
    private static instance: EmbeddingEventManager;

    static getInstance(): EmbeddingEventManager {
        if (!EmbeddingEventManager.instance) {
            EmbeddingEventManager.instance = new EmbeddingEventManager();
        }
        return EmbeddingEventManager.instance;
    }

    // Méthodes typées pour émettre des événements
    emitProgressUpdate(data: EmbeddingEventData): void {
        this.trigger(EMBEDDING_EVENTS.PROGRESS_UPDATED, data);
    }

    emitStatsUpdate(data: EmbeddingEventData): void {
        this.trigger(EMBEDDING_EVENTS.STATS_UPDATED, data);
    }

    emitGenerationStarted(data: Partial<EmbeddingEventData>): void {
        this.trigger(EMBEDDING_EVENTS.GENERATION_STARTED, data);
    }

    emitGenerationCompleted(data: Partial<EmbeddingEventData>): void {
        this.trigger(EMBEDDING_EVENTS.GENERATION_COMPLETED, data);
    }

    emitGenerationError(error: Error): void {
        this.trigger(EMBEDDING_EVENTS.GENERATION_ERROR, error);
    }

    emitServiceInitialized(data: Partial<EmbeddingEventData>): void {
        this.trigger(EMBEDDING_EVENTS.SERVICE_INITIALIZED, data);
    }

    emitFileProcessed(filePath: string, success: boolean): void {
        this.trigger(EMBEDDING_EVENTS.FILE_PROCESSED, { filePath, success });
    }

    // Méthodes typées pour s'abonner aux événements
    onProgressUpdate(callback: (data: EmbeddingEventData) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.PROGRESS_UPDATED, callback);
    }

    onStatsUpdate(callback: (data: EmbeddingEventData) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.STATS_UPDATED, callback);
    }

    onGenerationStarted(callback: (data: Partial<EmbeddingEventData>) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.GENERATION_STARTED, callback);
    }

    onGenerationCompleted(callback: (data: Partial<EmbeddingEventData>) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.GENERATION_COMPLETED, callback);
    }

    onGenerationError(callback: (error: Error) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.GENERATION_ERROR, callback);
    }

    onServiceInitialized(callback: (data: Partial<EmbeddingEventData>) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.SERVICE_INITIALIZED, callback);
    }

    onFileProcessed(callback: (data: { filePath: string; success: boolean }) => void): EventRef {
        return this.on(EMBEDDING_EVENTS.FILE_PROCESSED, callback);
    }
}
