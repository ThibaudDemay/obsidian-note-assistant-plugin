// main.ts
import { Notice, Plugin, WorkspaceLeaf } from 'obsidian';

import {NoteAssistantPluginSettings} from '@/@types/settings';
import {OllamaChatView, VIEW_TYPE_OLLAMA_CHAT} from '@/chat-view';
import {EmbeddingService} from '@/embedding-service';
import {OllamaService} from '@/ollama-service';
import {OllamaRegistryScraper} from '@/scraper/ollama-registry';
import {DEFAULT_SETTINGS, NoteAssistantSettingTab} from '@/setting-tab';

export default class NoteAssistantPlugin extends Plugin {
    settings: NoteAssistantPluginSettings;
    embeddingService: EmbeddingService;
    ollamaService: OllamaService;
    ollamaScraper: OllamaRegistryScraper;

    async onload() {
        await this.loadSettings();

        // Initialiser d'abord le service Ollama
        this.ollamaService = new OllamaService(this.settings);
        this.ollamaScraper = new OllamaRegistryScraper();

        // Puis le service d'embeddings qui dépend d'Ollama
        this.embeddingService = new EmbeddingService(this.settings, this.app, this.ollamaService);

        this.registerView(
            VIEW_TYPE_OLLAMA_CHAT,
            (leaf: WorkspaceLeaf) => new OllamaChatView(leaf, this)
        );

        // Ajouter l'icône dans la sidebar
        this.addRibbonIcon('brain', 'Note Assistant', (evt: MouseEvent) => {
            this.activateView();
        });

        // Commandes
        this.addCommand({
            id: 'open-note-assistant-chat',
            name: 'Open note assistant',
            callback: () => this.activateView()
        });

        this.addCommand({
            id: 'regenerate-embeddings',
            name: 'Regenerate embeddings from notes',
            callback: () => this.regenerateEmbeddings()
        });

        this.addCommand({
            id: 'load-llm-model',
            name: 'Load LLM model into memory',
            callback: () => this.loadLLMModel()
        });

        this.addCommand({
            id: 'load-embedding-model',
            name: 'Load embedding model into memory',
            callback: () => this.loadEmbeddingModel()
        });

        this.addCommand({
            id: 'test-ollama-connection',
            name: 'Test Ollama connection',
            callback: () => this.testOllamaConnection()
        });

        // Onglet des paramètres
        this.addSettingTab(new NoteAssistantSettingTab(this.app, this));

        setTimeout(() => this.initializeEmbeddings(), 2000);
    }

    async activateView() {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(VIEW_TYPE_OLLAMA_CHAT);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            await leaf!.setViewState({ type: VIEW_TYPE_OLLAMA_CHAT, active: true });
        }

        workspace.revealLeaf(leaf!);
    }

    async initializeEmbeddings() {
        try {
            new Notice('🔄 Initializing embeddings with Ollama...');

            // Vérifier d'abord la connexion Ollama
            const isConnected = await this.ollamaService.testConnection();
            if (!isConnected) {
                new Notice('⚠️ Ollama server not accessible. Embeddings disabled.', 8000);
                console.warn('Ollama server not accessible - embeddings will be disabled');
                return;
            }

            // Vérifier que le modèle d'embedding est disponible
            const models = await this.ollamaService.getInstalledModels();
            const embeddingModelExists = models.some(model => model.name === this.settings.embeddingModel);

            if (!embeddingModelExists && this.settings.embeddingModel) {
                new Notice(`⚠️ Embedding model '${this.settings.embeddingModel}' not found. Check your settings.`, 8000);
                console.warn(`Embedding model '${this.settings.embeddingModel}' not found on Ollama server`);
                return;
            }

            await this.embeddingService.initialize();
            new Notice('✅ Embeddings successfully initialized with Ollama');

        } catch (error) {
            console.error('❌ Error during embedding initialization:', error);
            new Notice(`❌ Embedding initialization failed: ${error.message}`, 8000);
        }
    }

    async regenerateEmbeddings() {
        try {
            new Notice('🔄 Regenerating embeddings...');

            // Vérifier les prérequis
            const isConnected = await this.ollamaService.testConnection();
            if (!isConnected) {
                new Notice('❌ Ollama server not accessible');
                return;
            }

            if (!this.settings.embeddingModel) {
                new Notice('❌ No embedding model configured');
                return;
            }

            await this.embeddingService.regenerateAllEmbeddings();
            new Notice('✅ Embeddings successfully regenerated');

        } catch (error) {
            console.error('❌ Error during embedding regeneration:', error);
            new Notice(`❌ Error during embedding regeneration: ${error.message}`);
        }
    }

    async loadLLMModel() {
        try {
            if (!this.settings.llmModel) {
                new Notice('❌ No LLM model configured');
                return;
            }

            new Notice(`🔄 Loading LLM model: ${this.settings.llmModel}...`);
            await this.ollamaService.loadModel(this.settings.llmModel, this.settings.llmModelKeepAlive);
            new Notice(`✅ LLM model loaded: ${this.settings.llmModel}`);

        } catch (error) {
            console.error('❌ Error loading LLM model:', error);
            new Notice(`❌ Failed to load LLM model: ${error.message}`);
        }
    }

    async loadEmbeddingModel() {
        try {
            if (!this.settings.embeddingModel) {
                new Notice('❌ No embedding model configured');
                return;
            }

            new Notice(`🔄 Loading embedding model: ${this.settings.embeddingModel}...`);
            await this.embeddingService.loadEmbeddingModel();
            new Notice(`✅ Embedding model loaded: ${this.settings.embeddingModel}`);

        } catch (error) {
            console.error('❌ Error loading embedding model:', error);
            new Notice(`❌ Failed to load embedding model: ${error.message}`);
        }
    }

    async testOllamaConnection() {
        try {
            new Notice('🔄 Testing Ollama connection...');

            const isConnected = await this.ollamaService.testConnection();

            if (isConnected) {
                // Obtenir des informations supplémentaires
                const models = await this.ollamaService.getInstalledModels();
                new Notice(`✅ Ollama connected successfully! ${models.length} models available.`);

                // Tester les modèles configurés
                const llmExists = models.some(m => m.name === this.settings.llmModel);
                const embeddingExists = models.some(m => m.name === this.settings.embeddingModel);

                if (!llmExists && this.settings.llmModel) {
                    new Notice(`⚠️ LLM model '${this.settings.llmModel}' not found`, 5000);
                }

                if (!embeddingExists && this.settings.embeddingModel) {
                    new Notice(`⚠️ Embedding model '${this.settings.embeddingModel}' not found`, 5000);
                }

            } else {
                new Notice(`❌ Cannot connect to Ollama at ${this.settings.ollamaBaseUrl}`);
            }

        } catch (error) {
            console.error('❌ Error testing Ollama connection:', error);
            new Notice(`❌ Connection test failed: ${error.message}`);
        }
    }

    onunload() {
        this.embeddingService?.cleanup();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.embeddingService?.updateSettings(this.settings);
        this.ollamaService?.updateSettings(this.settings);
    }

}
