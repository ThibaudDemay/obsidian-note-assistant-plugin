// embedding-service.ts - Version Ollama
import { App, TFile, Notice } from 'obsidian';

import { EmbeddingData, ParsedNote, SimilarNote } from '@/@types/embedding';
import { NoteAssistantPluginSettings } from '@/@types/settings';
import { OllamaService } from '@/ollama-service';

export class EmbeddingService {
    private settings: NoteAssistantPluginSettings;
    private app: App;
    private embeddings: Map<string, EmbeddingData> = new Map();
    private ollamaService: OllamaService;
    private isInitialized = false;
    private isInitializing = false;

    constructor(settings: NoteAssistantPluginSettings, app: App, ollamaService: OllamaService) {
        this.settings = settings;
        this.app = app;
        this.ollamaService = ollamaService;
    }

    async initialize() {
        if (this.isInitialized || this.isInitializing) return;
        this.isInitializing = true;

        try {
            // Vérifier la connexion Ollama
            const isConnected = await this.ollamaService.testConnection();
            if (!isConnected) {
                throw new Error('Ollama server not accessible');
            }

            // Vérifier que le modèle d'embedding est disponible
            const availableModels = await this.ollamaService.getInstalledModels();
            const modelExists = availableModels.some(model => model.name === this.settings.embeddingModel);

            if (!modelExists) {
                throw new Error(`Embedding model '${this.settings.embeddingModel}' not found on Ollama server`);
            }

            // Tester la génération d'un embedding simple
            const testResult = await this.ollamaService.testEmbeddingModel(this.settings.embeddingModel);
            if (!testResult.success) {
                throw new Error(`Embedding test failed: ${testResult.error}`);
            }

            this.isInitialized = true;

            // Génération des embeddings en arrière-plan
            // setTimeout(() => this.generateEmbeddingsForAllNotes(), 1000);

        } catch (error) {
            console.error('❌ Embedding initialization error:', error);
            throw new Error(`Embedding init failed: ${error.message}`);
        } finally {
            this.isInitializing = false;
        }
    }

    updateSettings(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    private shouldIgnoreFile(file: TFile): boolean {
        for (const folder of this.settings.embeddingIgnoredFolders) {
            if (file.path.startsWith(folder)) {
                return true;
            }
        }
        return false;
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized) {
            throw new Error('Embedding service not initialized');
        }

        try {
            // Limiter la taille du texte
            const maxLength = 512;
            const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

            const embedding = await this.ollamaService.generateEmbeddings(truncatedText, this.settings.embeddingModel);

            if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                throw new Error('Invalid embedding response');
            }

            return embedding;

        } catch (error) {
            console.error('Embedding generation error:', error);
            throw error;
        }
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const norm = Math.sqrt(normA) * Math.sqrt(normB);
        return norm === 0 ? 0 : dotProduct / norm;
    }

    private cleanContent(content: string): string {
        return content
            .replace(/```[\s\S]*?```/g, '') // Code blocks
            .replace(/!\[.*?\]\(.*?\)/g, '') // Images
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
            .replace(/[#*_`]/g, '') // Formatting
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();
    }

    async generateEmbeddingsForAllNotes() {
        if (!this.isInitialized) {
            console.warn('Generation postponed - service not initialized');
            return;
        }

        const files = this.app.vault.getMarkdownFiles();
        const validFiles = files.filter(f => !this.shouldIgnoreFile(f));
        let processed = 0;
        let errors = 0;

        for (const file of validFiles) {
            try {
                await this.generateEmbeddingForFile(file);
                processed++;

                if (processed % 3 === 0) {
                    new Notice(`Embeddings: ${processed}/${validFiles.length}`, 2000);
                }

                // Pause pour éviter de surcharger Ollama
                if (processed % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

            } catch (error) {
                console.error(`Error for ${file.path}:`, error);
                errors++;

                // Si trop d'erreurs, arrêter le processus
                if (errors > 5) {
                    console.error('Too many embedding errors, stopping generation');
                    new Notice('❌ Too many errors generating embeddings. Check your embedding model.', 8000);
                    break;
                }
            }
        }

        const successRate = Math.round((processed / validFiles.length) * 100);

        if (errors > 0) {
            new Notice(`⚠️ Embeddings completed: ${this.embeddings.size} notes (${errors} errors)`, 5000);
        } else {
            new Notice(`✅ Embeddings completed: ${this.embeddings.size} notes`, 3000);
        }
    }

    async generateEmbeddingForFile(file: TFile) {
        const parsedNote = await this.parseMarkdownNote(file);

        if (Object.keys(parsedNote.sections).length === 0) {
            const cleanContent = this.cleanContent(parsedNote.content);
            await this.generateEmbeddingForText(file.path, file, cleanContent);
        } else {
            for (let sectionName in parsedNote.sections) {
                try {
                    const content = parsedNote.sections[sectionName];
                    const cleanContent = this.cleanContent(content);
                    await this.generateEmbeddingForText(`${file.path}#${sectionName}`, file, cleanContent);
                } catch (error) {
                    // new Notice(`Error on ${file.path}: section ${sectionName} empty`);
                    console.error(error);
                }
            }
        }
    }

    async generateEmbeddingForText(key: string, file: TFile, content: string) {
        if (content.length === 0)
            throw new Error('content empty on generate embedding');
        const embedding = await this.generateEmbedding(content);
        this.embeddings.set(key, {
            file,
            content,
            embedding,
            lastModified: file.stat.mtime
        });
    }

    async searchSimilarNotes(query: string): Promise<SimilarNote[]> {
        if (!this.isInitialized || this.embeddings.size === 0) {
            return [];
        }

        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const similarities: SimilarNote[] = [];

            for (const [key, embeddingData] of this.embeddings) {
                const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.embedding);

                if (similarity > 0.1) {
                    similarities.push({
                        file: embeddingData.file,
                        key: key,
                        content: embeddingData.content.substring(0, 500),
                        similarity
                    });
                }
            }

            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, this.settings.embeddingMaxRelevantNotes);

        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    async regenerateAllEmbeddings() {
        this.embeddings.clear();
        await this.generateEmbeddingsForAllNotes();
    }

    async checkEmbeddingModelStatus(): Promise<{
    exists: boolean;
    loaded: boolean;
    performance?: any;
    testResult?: any;
  }> {
        try {
            const models = await this.ollamaService.getInstalledModels();
            const exists = models.some(model => model.name === this.settings.embeddingModel);

            if (!exists) {
                return { exists: false, loaded: false };
            }

            const loaded = await this.ollamaService.isModelLoaded(this.settings.embeddingModel);
            const performance = await this.ollamaService.getModelPerformanceInfo(this.settings.embeddingModel);
            const testResult = await this.ollamaService.testEmbeddingModel(this.settings.embeddingModel);

            return { exists: true, loaded, performance, testResult };
        } catch (error) {
            console.error('EmbeddingService.checkEmbeddingModelStatus', error);
            return { exists: false, loaded: false };
        }
    }

    async loadEmbeddingModel(): Promise<void> {
        if (!this.settings.embeddingModel) {
            throw new Error('No embedding model configured');
        }

        try {
            await this.ollamaService.loadEmbeddingModel(this.settings.embeddingModel, this.settings.embeddingModelKeepAlive);
        } catch (error) {
            throw new Error(`Failed to load embedding model: ${error.message}`);
        }
    }

    // Diagnostic avancé du service d'embeddings
    async getDiagnosticInfo(): Promise<{
    isInitialized: boolean;
    embeddingsCount: number;
    embeddingDimensions: number;
    modelStatus: any;
    lastError?: string;
    performance?: {
      avgEmbeddingTime?: number;
      totalProcessed?: number;
    };
  }> {
        const modelStatus = await this.checkEmbeddingModelStatus();

        return {
            isInitialized: this.isInitialized,
            embeddingsCount: this.embeddings.size,
            embeddingDimensions: this.getEmbeddingsDimensions(),
            modelStatus,
            performance: {
                totalProcessed: this.embeddings.size
            }
        };
    }

    // Méthode pour forcer la synchronisation des embeddings
    async syncEmbeddings(): Promise<{
    updated: number;
    added: number;
    removed: number;
  }> {
        if (!this.isInitialized) {
            throw new Error('Embedding service not initialized');
        }

        const files = this.app.vault.getMarkdownFiles().filter(f => !this.shouldIgnoreFile(f));
        const currentPaths = new Set(files.map(f => f.path));
        const embeddedPaths = new Set(this.embeddings.keys());

        let updated = 0;
        let added = 0;
        let removed = 0;

        // Supprimer les embeddings pour les fichiers supprimés
        for (const path of embeddedPaths) {
            if (!currentPaths.has(path)) {
                this.embeddings.delete(path);
                removed++;
            }
        }

        // Mettre à jour ou ajouter des embeddings
        for (const file of files) {
            const existing = this.embeddings.get(file.path);

            if (!existing || existing.lastModified < file.stat.mtime) {
                try {
                    await this.generateEmbeddingForFile(file);
                    if (existing) {
                        updated++;
                    } else {
                        added++;
                    }
                } catch (error) {
                    console.error(`Error syncing ${file.path}:`, error);
                }
            }
        }

        return { updated, added, removed };
    }

    // Recherche avancée avec filtres
    async searchSimilarNotesAdvanced(
        query: string,
        options: {
      minSimilarity?: number;
      maxResults?: number;
      includeContent?: boolean;
      contentLength?: number;
    } = {}
    ): Promise<SimilarNote[]> {
        const {
            minSimilarity = 0.1,
            maxResults = this.settings.embeddingMaxRelevantNotes,
            includeContent = true,
            contentLength = 500
        } = options;

        if (!this.isInitialized || this.embeddings.size === 0) {
            return [];
        }

        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const similarities: SimilarNote[] = [];

            for (const [key, embeddingData] of this.embeddings) {
                const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.embedding);

                if (similarity > minSimilarity) {
                    similarities.push({
                        file: embeddingData.file,
                        key: key,
                        content: includeContent ?
                            embeddingData.content.substring(0, contentLength) :
                            '',
                        similarity
                    });
                }
            }

            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, maxResults);

        } catch (error) {
            console.error('Advanced search error:', error);
            return [];
        }
    }

    cleanup() {
        this.embeddings.clear();
        this.isInitialized = false;
        this.isInitializing = false;
    }

    // Statistiques
    getEmbeddingsCount(): number {
        return this.embeddings.size;
    }

    getEmbeddingsDimensions(): number {
        if (this.embeddings.size === 0) return 0;

        const firstEmbedding = Array.from(this.embeddings.values())[0];
        return firstEmbedding?.embedding?.length || 0;
    }

    // Exporter les embeddings (pour backup ou debug)
    exportEmbeddings(): any {
        const exported: any = {};

        for (const [path, data] of this.embeddings) {
            exported[path] = {
                lastModified: data.lastModified,
                contentPreview: data.content.substring(0, 100),
                embeddingDimensions: data.embedding.length
            };
        }

        return {
            count: this.embeddings.size,
            dimensions: this.getEmbeddingsDimensions(),
            model: this.settings.embeddingModel,
            exportedAt: new Date().toISOString(),
            data: exported
        };
    }

    /***
  * Re-implemented python server functionnality
  */

    async parseMarkdownNote(file: TFile): Promise<ParsedNote> {
        const content = await this.app.vault.read(file);
        const metadata = await this.app.metadataCache.getFileCache(file);

        // process sections
        const sections: Record<string, string> = {};
        if (metadata?.headings) {
            metadata.headings.forEach((heading, index) => {
                const nextHeading = metadata.headings?.at(index + 1);
                const startPos = heading.position.end.offset;
                const endPos = nextHeading ? nextHeading.position.start.offset : content.length;
                sections[heading.heading] = content.slice(startPos, endPos).trim();
            });
        }

        return {
            name: file.name,
            path: file.path,
            title: file.basename,
            type: metadata?.frontmatter?.type ? metadata.frontmatter.type : 'unknown',
            tags: metadata?.frontmatter?.tags ? metadata.frontmatter.tags : [],
            content: content.slice(metadata?.frontmatterPosition?.end?.offset, content.length).trim(),
            sections: sections
        };
    }

}
