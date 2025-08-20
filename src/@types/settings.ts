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
