/*
 * File Name         : EmbeddingService.ts
 * Description       : Embedding service types
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:14:49
 */

import { TFile } from 'obsidian';

export interface ParsedNoteProperties {
    type: string,
    tags: string[],
}

export interface ParsedNote {
    name: string,
    path: string,
    title: string,
    type: string,
    tags: string[],
    content: string,
    sections: Record<string, string>
}

export interface EmbeddingData {
    file: TFile;
    content: string;
    embedding: number[];
    lastModified: number;
}

export interface SimilarNote {
    file: TFile;
    key: string;
    content: string;
    similarity: number;
}

export interface EmbeddingDataWithHash extends EmbeddingData {
    contentHash: string; // Hash du contenu pour détecter les changements
    sectionName?: string; // Nom de la section si applicable
}
