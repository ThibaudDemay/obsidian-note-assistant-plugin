import { useState, useEffect } from 'react';

import { NoteAssistantPluginSettings } from '@/@types';

let globalSettings: NoteAssistantPluginSettings = {

    // Ollama Settings
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaAuthType: 'none',
    ollamaAuthText: '',

    // ...
    llmStream: true,

    // LLM settings
    llmModel: 'llama3.1',
    llmTemperature: 0.7,
    llmTopP: 0.9,
    llmRepeatPenalty: 1.1,
    llmMaxTokens: 2048,
    llmModelKeepAlive: '5m',

    // Embeddings settings
    embeddingModel: '',
    embeddingFilterModels: true, // Filtrage activé par défaut
    embeddingModelKeepAlive: '5m',
    embeddingIgnoredFolders: ['templates', '.obsidian'],
    embeddingMaxRelevantNotes: 5,

    // Prompting settings
    systemPromptTemplateSource: 'settings',
    systemPromptTemplate: '',
    systemPromptTemplateFilePath: '{notes_context} {conversation_context}',
    systemPromptMaxHistoryLength: 10,

    // Chat settings
    showNotesUsed: true,
    showTimestamps: true,
};

let listeners = new Set<(settings: NoteAssistantPluginSettings) => void>();

export const useSettings = () => {
    const [settings, setStateSettings] = useState<NoteAssistantPluginSettings>(globalSettings);

    useEffect(() => {
        const updateLocal = (newSettings: NoteAssistantPluginSettings) => {
            setStateSettings(newSettings);
        };

        listeners.add(updateLocal);
        return () => {
            listeners.delete(updateLocal);
        };
    }, []);

    const updateSettings = (newSettings: Partial<NoteAssistantPluginSettings>) => {
        globalSettings = { ...globalSettings, ...newSettings };
        listeners.forEach(listener => listener(globalSettings));
    };

    return {
        settings,
        updateSettings
    };
};
