/*
 * File Name         : StorageService.ts
 * Description       : !! description !!
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 21:17:24
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 22:08:55
 */

import { Message, StoredMessage } from '@/@types/react/views';
import { EmbeddingDataWithHash, StoredEmbeddingData } from '@/@types/services/EmbeddingService';

export interface StorageConfig {
    embeddingsFile: string;
    conversationsDir: string;
    maxConversations: number;
}

export interface StoredConversationData {
    id: string;
    title: string;
    messages: StoredMessage[];
    createdAt: number;
    updatedAt: number;
}

export interface ConversationData {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

export interface StoredEmbeddingsCache {
    version: string;
    model: string;
    modelDimensions: number;
    createdAt: number;
    updatedAt: number;
    embeddings: Record<string, StoredEmbeddingData>;
}

export interface EmbeddingsCache {
    version: string;
    model: string;
    modelDimensions: number;
    createdAt: number;
    updatedAt: number;
    embeddings: Record<string, EmbeddingDataWithHash>;
}
