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
        this.embeddingService = new EmbeddingService(this);

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
            callback: () => this.regenerateAllEmbeddings()
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
        if (this.embeddingService.getIsInitialized()) return;

        try {
            // Vérifier si le modèle d'embedding est configuré
            if (!this.settings.embeddingModel) {
                new Notice('⚠️ No embedding model configured. Please configure in settings.', 5000);
                return;
            }

            // Vérifier la connexion Ollama
            const isConnected = await this.ollamaService.testConnection();
            if (!isConnected) {
                new Notice('⚠️ Cannot connect to Ollama. Embeddings will be disabled.', 5000);
                return;
            }

            console.log('🧠 Initializing embeddings...');
            await this.embeddingService.initialize();

            new Notice('✅ Embedding service initialized successfully', 3000);

        } catch (error) {
            console.error('❌ Failed to initialize embeddings:', error);
            new Notice(`❌ Failed to initialize embeddings: ${error.message}`, 5000);
        }
    }

    async regenerateAllEmbeddings() {
        if (!this.embeddingService.getIsInitialized()) {
            new Notice('❌ Embedding service not initialized', 3000);
            return;
        }

        try {
            new Notice('🔄 Starting full embedding regeneration...', 3000);
            await this.embeddingService.regenerateAllEmbeddings();
        } catch (error) {
            console.error('Error regenerating embeddings:', error);
            new Notice(`❌ Error regenerating embeddings: ${error.message}`, 5000);
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
        if (this.embeddingService) {
            this.embeddingService.cleanup();
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        if (this.ollamaService) {
            this.ollamaService.updateSettings(this.settings);
        }
        await this.embeddingService.checkUpdateModel(this.settings.embeddingModel);
    }

}
