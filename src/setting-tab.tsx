import { App, PluginSettingTab } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';

import { NoteAssistantPluginSettings } from '@/@types/settings';
import NoteAssistantPlugin from '@/main';
import { PluginContext } from '@/react/contexts';
import { SettingTab } from '@/react/views/SettingTab';

export const DEFAULT_SETTINGS: NoteAssistantPluginSettings = {

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

export class NoteAssistantSettingTab extends PluginSettingTab {
    public plugin: NoteAssistantPlugin;
    private reactRoot: Root;

    constructor(app: App, plugin: NoteAssistantPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        this.reactRoot = createRoot(this.containerEl);
    }

    display(): void {
        this.reactRoot.render(
            <PluginContext.Provider value={this.plugin}>
                <SettingTab />
            </PluginContext.Provider>
        );
    }
}
