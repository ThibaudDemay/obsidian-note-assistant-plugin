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
