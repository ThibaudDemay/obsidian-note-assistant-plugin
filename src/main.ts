// main.ts
import { App, Plugin, TFile, Notice, WorkspaceLeaf } from 'obsidian';
import { OllamaChatView, VIEW_TYPE_OLLAMA_CHAT } from './chat-view';
import { EmbeddingService } from './embedding-service';
import { OllamaService } from './ollama-service';
import { NoteAssistantPluginSettings, NoteAssistantSettingTab, DEFAULT_SETTINGS } from './settings';
import { TemplateProcessor } from './template-processor';

export default class NoteAssistantPlugin extends Plugin {
    settings: NoteAssistantPluginSettings;
    embeddingService: EmbeddingService;
    ollamaService: OllamaService;

    async onload() {
        await this.loadSettings();

        TemplateProcessor.initialize(this.app);

        this.embeddingService = new EmbeddingService(this.settings, this.app);
        this.ollamaService = new OllamaService(this.settings);

        this.registerView(
            VIEW_TYPE_OLLAMA_CHAT,
            (leaf) => new OllamaChatView(leaf, this)
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

        // Onglet des paramètres
        this.addSettingTab(new NoteAssistantSettingTab(this.app, this));

        this.initializeEmbeddings();
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
            new Notice('🔄 Initializing embeddings...');
            await this.embeddingService.initialize();
            new Notice('✅ Embeddings successfully initialized');
        } catch (error) {
            console.error('❌ Error during embedding initialization:', error);
            new Notice(`❌ Embedding error`, 5000);

            // Le plugin continue de fonctionner sans embeddings
            console.log('ℹ️ Le plugin fonctionnera sans enrichissement contextuel');
        }
    }

    async regenerateEmbeddings() {
        try {
            new Notice('Regenerating embeddings...');
            await this.embeddingService.regenerateAllEmbeddings();
            new Notice('Embeddings successfully regenerated');
        } catch (error) {
            console.error('❌ Error during embedding regeneration:', error);
            new Notice('❌ Error during embedding regeneration');
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
