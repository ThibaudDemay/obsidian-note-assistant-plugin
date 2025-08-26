/*
 * File Name         : StorageService.ts
 * Description       : !! description !!
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 21:17:24
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 26/08/2025 14:07:09
 */

import { Message, StoredMessage } from '@/@types/react/views';
import { EmbeddingDataWithHash } from '@/@types/services/EmbeddingService';

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

// Nouveau type pour le format compressé
export interface CompressedStoredEmbeddingData {
    vector: string; // Base64 encoded Float32Array
    content: string;
    lastModified: number;
    contentHash: string;
    sectionName?: string;
    file: {
        path: string;
        name: string;
        basename: string;
        stat: {
            mtime: number;
            ctime: number;
            size: number;
        };
    };
}

export interface StoredEmbeddingsCache {
    version: string;
    model: string;
    modelDimensions: number;
    createdAt: number;
    updatedAt: number;
    embeddings: Record<string, CompressedStoredEmbeddingData>; // Utilise le format compressé
}

export interface EmbeddingsCache {
    version: string;
    model: string;
    modelDimensions: number;
    createdAt: number;
    updatedAt: number;
    embeddings: Record<string, EmbeddingDataWithHash>;
}
