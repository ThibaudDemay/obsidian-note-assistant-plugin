/*
 * File Name         : settings.ts
 * Description       : Types for plugin settings
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 20/08/2025 21:59:38
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:10:16
 */

export interface NoteAssistantPluginSettings {

    // Ollama Settings
    ollamaBaseUrl: string;
    ollamaAuthType: 'none' | 'basic' | 'apiKey';
    ollamaAuthText: string; // For basic auth or API key

    // LLM settings
    llmModel: string;
    llmModelKeepAlive: string;
    llmTemperature: number;
    llmTopP: number;
    llmRepeatPenalty: number;
    llmMaxTokens: number;
    llmStream: boolean;

    // Embeddings settings
    embeddingModel: string;
    embeddingModelKeepAlive: string;
    embeddingIgnoredFolders: string[];
    embeddingMaxRelevantNotes: number;
    embeddingFilterModels: boolean; // filter on family to keep 'bert' families models

    // Chat settings
    chatSystemPrompt: string;
    chatPromptMaxHistoryLength: number; // only in generate prompting mode
    chatShowNotesUsed: boolean;
    chatShowTimestamps: boolean;
}
