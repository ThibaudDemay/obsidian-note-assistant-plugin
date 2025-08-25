/*
 * File Name         : EmbeddingService.ts
 * Description       : Embedding service to manage note embeddings using Ollama
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:12:45
 */

// embedding-service.ts - Version Ollama
import { createHash } from 'crypto';
import { debounce, Notice, TFile } from 'obsidian';

import { EmbeddingDataWithHash, ParsedNote, SimilarNote } from '@/@types/services/EmbeddingService';
import { EmbeddingEventManager } from '@/events/EmbeddingEventManager';
import NoteAssistantPlugin from '@/main';
import { StorageService } from '@/services/StorageService';
import { formatNumeric } from '@/utils/format';

interface EmbeddingProgress {
    total: number;
    processed: number;
    errors: number;
    isRunning: boolean;
}

export class EmbeddingService {
    private plugin: NoteAssistantPlugin;
    private eventManager: EmbeddingEventManager;
    private storageService: StorageService;
    private embeddings: Map<string, EmbeddingDataWithHash> = new Map();
    private isInitialized = false;
    private isInitializing = false;
    private progress: EmbeddingProgress = {
        total: 0,
        processed: 0,
        errors: 0,
        isRunning: false
    };
    private embeddingModel: string;

    // Debounced function pour éviter trop de régénérations
    private debouncedGenerateForFile: (file: TFile) => void;
    private hashCache = new Map<string, string>();

    private debouncedSave = debounce(() => {
        this.saveEmbeddingsToCache();
    }, 5000);

    constructor(plugin: NoteAssistantPlugin) {
        this.plugin = plugin;
        this.embeddingModel = plugin.settings.llmModel;
        this.eventManager = EmbeddingEventManager.getInstance();
        this.storageService = plugin.storageService;

        this.debouncedGenerateForFile = debounce(
            (file: TFile) => this.generateEmbeddingForFile(file),
            10000,
            true
        );

        this.setupFileWatchers();
    }

    /* Life Cycle */

    async initialize(): Promise<void> {
        if (this.isInitialized || this.isInitializing) return;

        this.isInitializing = true;
        console.log('🚀 Initializing EmbeddingService...');

        try {
            if (!this.plugin.settings.embeddingModel) {
                throw new Error('No embedding model configured');
            }

            const isConnected = await this.plugin.ollamaService.testConnection();
            if (!isConnected) {
                throw new Error('Cannot connect to Ollama server');
            }

            const cacheLoaded = await this.loadEmbeddingsFromCache();

            this.isInitialized = true;
            console.log('✅ EmbeddingService initialized successfully');

            // Émettre l'initialisation ET les stats actuelles
            this.eventManager.emitServiceInitialized({
                stats: this.getDetailedStats(),
                timestamp: Date.now()
            });
            this.emitCurrentState();

            if (cacheLoaded) {
                console.log('📂 Using cached embeddings');
                this.emitCurrentState();

                // Vérifier les mises à jour en arrière-plan
                // this.checkForUpdatesInBackground(); // commented out because obsidian events should handle it
            } else {
                console.log('🔄 No cache found, generating embeddings...');
                // Démarrer la génération automatique
                await this.generateEmbeddingsForAllNotes();
            }

        } catch (error) {
            console.error('❌ Failed to initialize EmbeddingService:', error);
            this.eventManager.emitGenerationError(error as Error);
            this.isInitializing = false;
            throw error;
        }

        this.isInitializing = false;
    }

    // private async checkForUpdatesInBackground(): Promise<void> {
    //     // Vérifier en arrière-plan si des fichiers ont été modifiés
    //     setTimeout(async () => {
    //         try {
    //             const files = this.plugin.app.vault.getMarkdownFiles()
    //                 .filter(f => !this.shouldIgnoreFile(f));

    //             let updatesNeeded = 0;
    //             for (const file of files) {
    //                 if (await this.fileHasChanges(file)) {
    //                     updatesNeeded++;
    //                 }
    //             }

    //             if (updatesNeeded > 0) {
    //                 console.log(`🔄 Found ${updatesNeeded} files needing updates`);
    //                 await this.syncEmbeddings();
    //             }
    //         } catch (error) {
    //             console.error('❌ Error checking for updates:', error);
    //         }
    //     }, 10000);
    // }

    cleanup(): void {
        this.saveEmbeddingsToCache();

        this.embeddings.clear();
        this.hashCache.clear();
        this.isInitialized = false;
        this.isInitializing = false;

        this.updateProgress({
            total: 0,
            processed: 0,
            errors: 0,
            isRunning: false
        });
    }

    /* GETTER */

    getIsInitialized(): boolean {
        return this.isInitialized;
    }

    getEmbeddingsCount(): number {
        return this.embeddings.size;
    }

    getEmbeddingsDimensions(): number {
        if (this.embeddings.size === 0) return 0;

        const firstEmbedding = Array.from(this.embeddings.values())[0];
        return firstEmbedding?.embedding?.length || 0;
    }

    // Méthode pour obtenir le statut de progression
    getProgress(): EmbeddingProgress {
        return { ...this.progress };
    }

    // Méthode pour obtenir des statistiques détaillées
    getDetailedStats(): {
        totalEmbeddings: number;
        totalFiles: number;
        averageSectionsPerFile: number;
        embeddingDimensions: number;
        cacheHitRate: number;
        diskUsageEstimate: string;
    } {
        const files = new Set<string>();
        let totalSections = 0;

        for (const key of this.embeddings.keys()) {
            const filePath = key.includes('#') ? key.split('#')[0] : key;
            files.add(filePath);
            totalSections++;
        }

        const embeddingDimensions = this.getEmbeddingsDimensions();
        const bytesPerEmbedding = embeddingDimensions * 4; // float32
        const totalBytes = this.embeddings.size * bytesPerEmbedding;

        return {
            totalEmbeddings: this.embeddings.size,
            totalFiles: files.size,
            averageSectionsPerFile: files.size > 0 ? totalSections / files.size : 0,
            embeddingDimensions,
            cacheHitRate: this.hashCache.size > 0 ? (this.embeddings.size / this.hashCache.size) * 100 : 0,
            diskUsageEstimate: formatNumeric(totalBytes, 'B')
        };
    }

    // // Diagnostic avancé du service d'embeddings
    // async getDiagnosticInfo(): Promise<{
    //     isInitialized: boolean;
    //     embeddingsCount: number;
    //     embeddingDimensions: number;
    //     modelStatus: any;
    //     lastError?: string;
    //     performance?: {
    //         avgEmbeddingTime?: number;
    //         totalProcessed?: number;
    //     };
    // }> {
    //     const modelStatus = await this.checkEmbeddingModelStatus();

    //     return {
    //         isInitialized: this.isInitialized,
    //         embeddingsCount: this.embeddings.size,
    //         embeddingDimensions: this.getEmbeddingsDimensions(),
    //         modelStatus,
    //         performance: {
    //             totalProcessed: this.embeddings.size
    //         }
    //     };
    // }

    /* Obsidian Event */

    private setupFileWatchers() {
        // Écouter les modifications de fichiers
        this.plugin.app.vault.on('modify', this.onFileModified.bind(this));
        this.plugin.app.vault.on('create', this.onFileCreated.bind(this));
        this.plugin.app.vault.on('delete', this.onFileDeleted.bind(this));
        this.plugin.app.vault.on('rename', this.onFileRenamed.bind(this));
    }

    private onFileModified(file: TFile) {
        if (this.shouldIgnoreFile(file)) return;
        if (!this.isInitialized) return;

        // console.log(`📝 File modified: ${file.path}`);
        this.debouncedGenerateForFile(file);
    }

    private onFileCreated(file: TFile) {
        if (this.shouldIgnoreFile(file)) return;
        if (!this.isInitialized) return;

        // console.log(`📄 File created: ${file.path}`);
        this.debouncedGenerateForFile(file);
    }

    private onFileDeleted(file: TFile) {
        if (this.shouldIgnoreFile(file)) return;

        // console.log(`🗑️ File deleted: ${file.path}`);
        this.removeEmbeddingsForFile(file.path);
    }

    private onFileRenamed(file: TFile, oldPath: string) {
        if (this.shouldIgnoreFile(file)) return;

        // console.log(`📝 File renamed: ${oldPath} → ${file.path}`);
        this.removeEmbeddingsForFile(oldPath);
        if (this.isInitialized) {
            this.debouncedGenerateForFile(file);
        }
    }

    /* EmbeddingEventManagers helpers */

    // Méthode privée pour émettre les stats à chaque changement
    private emitCurrentState(): void {
        const stats = this.getDetailedStats();
        this.eventManager.emitStatsUpdate({
            progress: { ...this.progress },
            stats: {
                totalEmbeddings: stats.totalEmbeddings,
                totalFiles: stats.totalFiles,
                averageSectionsPerFile: stats.averageSectionsPerFile,
                embeddingDimensions: stats.embeddingDimensions,
                diskUsageEstimate: stats.diskUsageEstimate,
                cacheHitRate: stats.cacheHitRate
            },
            timestamp: Date.now()
        });
    }

    // private emitStatsUpdate(): void {
    //     try {
    //         const progress = this.getProgress();
    //         const stats = this.getDetailedStats();

    //         console.log('emitStatsUpdate, progress:', progress);

    //         this.eventManager.emitStatsUpdate({
    //             progress,
    //             stats: {
    //                 totalEmbeddings: stats.totalEmbeddings,
    //                 totalFiles: stats.totalFiles,
    //                 averageSectionsPerFile: stats.averageSectionsPerFile,
    //                 embeddingDimensions: stats.embeddingDimensions,
    //                 diskUsageEstimate: stats.diskUsageEstimate,
    //                 cacheHitRate: stats.cacheHitRate
    //             },
    //             timestamp: Date.now()
    //         });
    //     } catch (error) {
    //         console.error('Error emitting stats update:', error);
    //     }
    // }

    // Méthode privée pour mettre à jour le progress ET émettre l'événement
    private updateProgress(updates: Partial<EmbeddingProgress>): void {
        this.progress = { ...this.progress, ...updates };
        this.emitCurrentState();

        // Émettre des événements spécifiques selon le changement
        if (updates.isRunning === true) {
            this.eventManager.emitGenerationStarted({
                progress: this.progress,
                timestamp: Date.now()
            });
        } else if (updates.isRunning === false && this.progress.total > 0) {
            this.eventManager.emitGenerationCompleted({
                progress: this.progress,
                stats: this.getDetailedStats(),
                timestamp: Date.now()
            });
        }
    }

    /* UTILS */

    private calculateContentHash(content: string): string {
        return createHash('md5').update(content.trim()).digest('hex');
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

    private shouldIgnoreFile(file: TFile): boolean {
        if (!file.path.endsWith('.md')) return true;

        return this.plugin.settings.embeddingIgnoredFolders.some(folder =>
            file.path.startsWith(folder + '/')
        );
    }

    private async fileHasChanges(file: TFile): Promise<boolean> {
        const parsedNote = await this.parseMarkdownNote(file);

        // Si le fichier n'a pas de sections, vérifier le contenu global
        if (Object.keys(parsedNote.sections).length === 0) {
            const cleanContent = this.cleanContent(parsedNote.content);
            const currentHash = this.calculateContentHash(cleanContent);
            const existingEmbedding = this.embeddings.get(file.path);

            return !existingEmbedding ||
                   existingEmbedding.contentHash !== currentHash ||
                   existingEmbedding.lastModified < file.stat.mtime;
        }

        // Vérifier chaque section
        for (const sectionName of Object.keys(parsedNote.sections)) {
            const sectionKey = `${file.path}#${sectionName}`;
            const cleanContent = this.cleanContent(parsedNote.sections[sectionName]);
            const currentHash = this.calculateContentHash(cleanContent);
            const existingEmbedding = this.embeddings.get(sectionKey);

            if (!existingEmbedding ||
                existingEmbedding.contentHash !== currentHash ||
                existingEmbedding.lastModified < file.stat.mtime) {
                return true;
            }
        }

        return false;
    }

    /***
     * Re-implemented python server functionnality
     */

    async parseMarkdownNote(file: TFile): Promise<ParsedNote> {
        const content = await this.plugin.app.vault.read(file);
        const metadata = await this.plugin.app.metadataCache.getFileCache(file);

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

    /* Public Methods (other than embeddings generation) */

    async checkUpdateModel(settingsModel: string) {
        if (!this.isInitialized) return;

        if (this.embeddingModel !== settingsModel) {
            this.cleanup();
            this.embeddingModel = settingsModel;
            this.initialize();
        }
    }

    // async checkEmbeddingModelStatus(): Promise<{
    //     exists: boolean;
    //     loaded: boolean;
    //     performance?: any;
    //     testResult?: any;
    // }> {
    //     try {
    //         const models = await this.plugin.ollamaService.getInstalledModels();
    //         const exists = models.some(model => model.name === this.plugin.settings.embeddingModel);

    //         if (!exists) {
    //             return { exists: false, loaded: false };
    //         }

    //         const loaded = await this.plugin.ollamaService.isModelLoaded(this.plugin.settings.embeddingModel);
    //         const performance = await this.plugin.ollamaService.getModelPerformanceInfo(this.plugin.settings.embeddingModel);
    //         console.log('EmbeddingService.checkEmbeddingModelStatus, performance:', performance);
    //         const testResult = await this.plugin.ollamaService.testEmbeddingModel(this.plugin.settings.embeddingModel);
    //         console.log('EmbeddingService.checkEmbeddingModelStatus, testResult:', testResult);

    //         return { exists: true, loaded, performance, testResult };
    //     } catch (error) {
    //         console.error('EmbeddingService.checkEmbeddingModelStatus', error);
    //         return { exists: false, loaded: false };
    //     }
    // }

    async loadEmbeddingModel(): Promise<void> {
        if (!this.plugin.settings.embeddingModel) {
            throw new Error('No embedding model configured');
        }

        try {
            await this.plugin.ollamaService.loadEmbeddingModel(this.plugin.settings.embeddingModel, this.plugin.settings.embeddingModelKeepAlive);
        } catch (error) {
            throw new Error(`Failed to load embedding model: ${error.message}`);
        }
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

        const files = this.plugin.app.vault.getMarkdownFiles().filter(f => !this.shouldIgnoreFile(f));
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

        await this.saveEmbeddingsToCache();

        const result = { updated, added, removed };
        console.log('🔄 Sync completed:', result);

        return result;
    }

    // Recherche avancée avec filtres
    // async searchSimilarNotesAdvanced(
    //     query: string,
    //     options: {
    //         minSimilarity?: number;
    //         maxResults?: number;
    //         includeContent?: boolean;
    //         contentLength?: number;
    //     } = {}
    // ): Promise<SimilarNote[]> {
    //     const {
    //         minSimilarity = 0.1,
    //         maxResults = this.plugin.settings.embeddingMaxRelevantNotes,
    //         includeContent = true,
    //         contentLength = 500
    //     } = options;

    //     if (!this.isInitialized || this.embeddings.size === 0) {
    //         return [];
    //     }

    //     try {
    //         const queryEmbedding = await this.generateEmbedding(query);
    //         const similarities: SimilarNote[] = [];

    //         for (const [key, embeddingData] of this.embeddings) {
    //             const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.embedding);

    //             if (similarity > minSimilarity) {
    //                 similarities.push({
    //                     file: embeddingData.file,
    //                     key: key,
    //                     content: includeContent ?
    //                         embeddingData.content.substring(0, contentLength) :
    //                         '',
    //                     similarity
    //                 });
    //             }
    //         }

    //         return similarities
    //             .sort((a, b) => b.similarity - a.similarity)
    //             .slice(0, maxResults);

    //     } catch (error) {
    //         console.error('Advanced search error:', error);
    //         return [];
    //     }
    // }


    // Exporter les embeddings (pour backup ou debug)
    // exportEmbeddings(): any {
    //     const exported: any = {};

    //     for (const [path, data] of this.embeddings) {
    //         exported[path] = {
    //             lastModified: data.lastModified,
    //             contentPreview: data.content.substring(0, 100),
    //             embeddingDimensions: data.embedding.length
    //         };
    //     }

    //     return {
    //         count: this.embeddings.size,
    //         dimensions: this.getEmbeddingsDimensions(),
    //         model: this.plugin.settings.embeddingModel,
    //         exportedAt: new Date().toISOString(),
    //         data: exported
    //     };
    // }

    /* Embedding Engine Functions */

    async generateEmbeddingsForAllNotes(): Promise<void> {
        if (!this.isInitialized) {
            console.warn('Generation postponed - service not initialized');
            return;
        }

        const files = this.plugin.app.vault.getMarkdownFiles().filter(f => !this.shouldIgnoreFile(f));

        // Mettre à jour le progress et émettre automatiquement
        this.updateProgress({
            total: files.length,
            processed: 0,
            errors: 0,
            isRunning: true
        });

        new Notice(`🧠 Starting embeddings generation for ${files.length} notes...`, 3000);

        for (const file of files) {
            try {
                const hasChanges = await this.fileHasChanges(file);

                if (hasChanges) {
                    await this.generateEmbeddingForFile(file);
                    this.eventManager.emitFileProcessed(file.path, true);
                } else {
                    console.log(`⏭️ Skipped (no changes): ${file.path}`);
                }

                // Mettre à jour le progress et émettre automatiquement
                this.updateProgress({
                    processed: this.progress.processed + 1
                });

                // Notification tous les 5 fichiers
                if (this.progress.processed % 5 === 0) {
                    new Notice(
                        `🧠 Embeddings: ${this.progress.processed}/${this.progress.total}`,
                        2000
                    );
                }

                // Pause pour éviter de surcharger Ollama
                if (this.progress.processed % 3 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

            } catch (error) {
                console.error(`❌ Error processing ${file.path}:`, error);
                this.eventManager.emitFileProcessed(file.path, false);

                // Mettre à jour les erreurs et émettre automatiquement
                this.updateProgress({
                    errors: this.progress.errors + 1,
                    processed: this.progress.processed + 1
                });

                // Arrêter si trop d'erreurs
                if (this.progress.errors > 10) {
                    new Notice('❌ Too many errors, stopping embedding generation.', 5000);
                    this.eventManager.emitGenerationError(new Error('Too many errors during generation'));
                    break;
                }
            }
        }

        // Terminer la génération
        this.updateProgress({ isRunning: false });

        const successRate = Math.round((this.progress.processed / this.progress.total) * 100);

        if (this.progress.errors > 0) {
            new Notice(
                `⚠️ Embeddings completed: ${this.embeddings.size} notes (${this.progress.errors} errors, ${successRate}% success)`,
                5000
            );
        } else {
            new Notice(
                `✅ Embeddings completed: ${this.embeddings.size} notes (100% success)`,
                3000
            );
        }
    }

    async generateEmbeddingForFile(file: TFile): Promise<void> {
        const parsedNote = await this.parseMarkdownNote(file);

        // Supprimer les anciens embeddings pour ce fichier
        this.removeEmbeddingsForFile(file.path);

        if (Object.keys(parsedNote.sections).length === 0) {
            const cleanContent = this.cleanContent(parsedNote.content);
            if (cleanContent.length > 0) {
                await this.generateEmbeddingForText(file.path, file, cleanContent);
            }
        } else {
            for (const sectionName of Object.keys(parsedNote.sections)) {
                const content = parsedNote.sections[sectionName];
                const cleanContent = this.cleanContent(content);

                if (cleanContent.length > 0) {
                    await this.generateEmbeddingForText(
                        `${file.path}#${sectionName}`,
                        file,
                        cleanContent,
                        sectionName
                    );
                }
            }
        }
        this.debouncedSave();
    }

    async generateEmbeddingForText(
        key: string,
        file: TFile,
        content: string,
        sectionName?: string
    ): Promise<void> {
        if (content.length === 0) {
            throw new Error('Content empty for embedding generation');
        }

        const contentHash = this.calculateContentHash(content);
        const existing = this.embeddings.get(key);
        if (existing && existing.contentHash === contentHash) {
            return;
        }

        const embedding = await this.generateEmbedding(content);

        this.embeddings.set(key, {
            file,
            content,
            embedding,
            lastModified: file.stat.mtime,
            contentHash,
            sectionName
        });

        this.hashCache.set(key, contentHash);

        // Émettre les stats UNIQUEMENT si on n'est pas en génération batch
        if (!this.progress.isRunning) {
            this.emitCurrentState();
        }

        console.log(`💾 Stored embedding for: ${key} (${embedding.length}D)`);
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.isInitialized) {
            throw new Error('Embedding service not initialized');
        }

        try {
            // Limiter la taille du texte
            const maxLength = 512;
            const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

            const embedding = await this.plugin.ollamaService.generateEmbeddings(truncatedText, this.plugin.settings.embeddingModel);

            if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
                throw new Error('Invalid embedding response');
            }

            return embedding;

        } catch (error) {
            console.error('Embedding generation error:', error);
            throw error;
        }
    }

    private removeEmbeddingsForFile(filePath: string) {
        const keysToRemove: string[] = [];

        for (const key of this.embeddings.keys()) {
            if (key.startsWith(filePath)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            this.embeddings.delete(key);
            this.hashCache.delete(key);
        });

        if (keysToRemove.length > 0) {
            // console.log(`🧹 Removed ${keysToRemove.length} embeddings for ${filePath}`);
        }
    }

    // Méthode pour forcer la régénération d'un fichier
    async forceRegenerateFile(file: TFile): Promise<void> {
        // console.log(`🔄 Force regenerating embeddings for: ${file.path}`);
        this.removeEmbeddingsForFile(file.path);
        await this.generateEmbeddingForFile(file);
    }

    async regenerateAllEmbeddings(): Promise<void> {
        this.embeddings.clear();
        this.hashCache.clear();

        await this.storageService.clearEmbeddingsCache();

        // Émettre le changement d'état immédiatement
        this.emitCurrentState();

        await this.generateEmbeddingsForAllNotes();
    }


    /* SIMILARITY */

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
                .slice(0, this.plugin.settings.embeddingMaxRelevantNotes);

        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    /* MÉTHODES DE PERSISTANCE */

    private async saveEmbeddingsToCache(): Promise<void> {
        if (this.embeddings.size === 0) return;

        try {
            await this.storageService.saveEmbeddings(this.embeddings);
        } catch (error) {
            console.error('❌ Failed to save embeddings to cache:', error);
        }
    }

    private async loadEmbeddingsFromCache(): Promise<boolean> {
        try {
            const cachedEmbeddings = await this.storageService.loadEmbeddings();

            if (cachedEmbeddings) {
                this.embeddings = cachedEmbeddings;
                console.log(`📂 Restored ${this.embeddings.size} embeddings from cache`);

                // Émettre les stats après chargement
                this.emitCurrentState();
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Failed to load embeddings from cache:', error);
            return false;
        }
    }

}
