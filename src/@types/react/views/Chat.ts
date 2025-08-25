/*
 * File Name         : Chat.ts
 * Description       : Types for chat view
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:09:18
 */

import { SimilarNote } from '@/@types/services/EmbeddingService';

export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    consultedNotes?: SimilarNote[]; // Notes
}

export interface SimplifiedMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
