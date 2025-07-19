// embedding-service.ts - Version @huggingface/transformers CORRIGÉE
import { App, TFile, Notice } from 'obsidian';
import { NoteAssistantPluginSettings } from './settings';
import { pipeline, env } from "@huggingface/transformers";
import * as ort from 'onnxruntime-web';
import { Worker } from 'worker_threads';

interface EmbeddingData {
    file: TFile;
    content: string;
    embedding: number[];
    lastModified: number;
}

export interface SimilarNote {
    file: TFile;
    content: string;
    similarity: number;
}
export class EmbeddingService {
    private settings: NoteAssistantPluginSettings;
    private app: App;
    private embeddings: Map<string, EmbeddingData> = new Map();
    private executor: any = null;
    private isInitialized = false;
    private isInitializing = false;

    constructor(settings: NoteAssistantPluginSettings, app: App) {
        this.settings = settings;
        this.app = app;
    }

    async initialize() {
        if (this.isInitialized || this.isInitializing) return;
        this.isInitializing = true;

		// env.backends.onnx = ort.env;
        // console.log("init", env, ort)
        // env.backends.onnx.wasm!.numThreads = 1;
        // env.backends.onnx.wasm!.simd = false;
        // env.backends.onnx.wasm!.proxy = false;
        // env.backends.onnx.wasm!.wasmPaths = `app://obsidian/${this.app.vault.configDir}/plugins/note-assistant/wasm/`

		console.log("EmbeddingService initialize");
        console.log("this.app", this.app);
        console.log("env", env);
        console.log("pipeline", pipeline);

		try {
            console.log('🔄 Initialisation des embeddings avec @huggingface/transformers...');

            // Chargement du pipeline d'embeddings
            await this.loadPipeline();

            console.log('✅ Embedding pipeline successfully loaded');
            this.isInitialized = true;

            // Génération des embeddings en arrière-plan
            // setTimeout(() => this.generateEmbeddingsForAllNotes(), 1000);

        } catch (error) {
            console.error('❌ Embedding initialization error:', error);
            throw new Error(`Embeddings init failed: ${error.message}`);
        } finally {
            this.isInitializing = false;
        }
    }

    private async loadPipeline() {
        const modelName = this.getOptimalModelName();
        console.log('🎯 Pipeline loading:', modelName);

        try {
            console.log('📥 Creation of the feature extraction pipeline...');

            this.executor = await pipeline('feature-extraction', modelName, {
                device: "wasm"
            });

			console.log("Pipeline executor : ", this.executor);

            console.log('✅ Pipeline successfully created');

        } catch (pipelineError) {
            console.error('❌ Pipeline creation error:', pipelineError);

            // Fallback vers un modèle plus simple
            // console.log('🔄 Fallback vers modèle simple...');
            // try {
            //     const fallbackModel = 'Xenova/all-MiniLM-L6-v2';
            //     console.log('🔄 Tentative avec:', fallbackModel);

            //     this.executor = await pipeline('feature-extraction', fallbackModel, {
            //         device: 'wasm' // CPU plus compatible
            //     });
            //     console.log('✅ Pipeline fallback créé');
            // } catch (fallbackError) {
            //     console.error('❌ Erreur fallback:', fallbackError);
            //     throw new Error(`Pipeline creation failed: ${fallbackError.message}`);
            // }
        }
    }

    private getOptimalModelName(): string {
        // Modèles disponibles sur Hugging Face Hub
        const modelMap: {[key: string]: string} = {
            'paraphrase-multilingual-MiniLM-L12-v2': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
            'all-MiniLM-L6-v2': 'Xenova/all-MiniLM-L6-v2',
            'all-mpnet-base-v2': 'sentence-transformers/all-mpnet-base-v2',
            'multilingual-e5-small': 'intfloat/multilingual-e5-small'
        };

        const configModel = this.settings.embeddingsModel;

        // Si le modèle contient déjà un namespace, l'utiliser tel quel
        if (configModel.includes('/')) {
            return configModel;
        }

        return modelMap[configModel] || 'Xenova/all-MiniLM-L6-v2';
    }

    updateSettings(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    private shouldIgnoreFile(file: TFile): boolean {
        for (const folder of this.settings.embeddingsIgnoredFolders) {
            if (file.path.startsWith(folder)) {
                return true;
            }
        }
        return false;
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (!this.executor || !this.isInitialized) {
            throw new Error('Pipeline not initialized');
        }

        try {
            // Limiter la taille du texte
            const maxLength = 512;
            const truncatedText = text.length > maxLength ? text.substring(0, maxLength) : text;

            const result = await this.executor(truncatedText, {
                pooling: 'mean',
                normalize: true
            });

            // Conversion en array de nombres
            let embedding: number[];

            if (Array.isArray(result)) {
                // Si c'est déjà un array
                embedding = result.flat();
            } else if (result && result.data) {
                // Si c'est un tensor avec propriété data
                embedding = Array.from(result.data);
            } else if (result && typeof result === 'object') {
                // Si c'est un objet tensor-like
                embedding = Object.values(result).flat() as number[];
            } else {
                throw new Error('Unexpected pipeline result formatUnexpected pipeline result format');
            }

            console.log(`📊 Embedding generated: ${embedding.length} dimensions`);
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
            console.warn('Generation postponed - pipeline not initialized');
            return;
        }

        const files = this.app.vault.getMarkdownFiles();
        const validFiles = files.filter(f => !this.shouldIgnoreFile(f));
        let processed = 0;

        console.log(`📊 Generating embeddings for ${validFiles.length} notes`);

        for (const file of validFiles) {
            try {
                await this.generateEmbeddingForFile(file);
                processed++;

                if (processed % 3 === 0) {
                    new Notice(`Embeddings: ${processed}/${validFiles.length}`, 2000);
                }

                // Pause pour éviter de surcharger
                if (processed % 5 === 0) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

            } catch (error) {
                console.error(`Error for ${file.path}:`, error);
            }
        }

        console.log(`✅ ${this.embeddings.size} generated embeddings`);
        new Notice(`✅ Embeddings completed: ${this.embeddings.size} notes`);
    }

    async generateEmbeddingForFile(file: TFile) {
        try {
            const content = await this.app.vault.read(file);
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length < 20) return;

            const embedding = await this.generateEmbedding(cleanContent);

            this.embeddings.set(file.path, {
                file,
                content: cleanContent,
                embedding,
                lastModified: file.stat.mtime
            });

        } catch (error) {
            throw error;
        }
    }

    async searchSimilarNotes(query: string): Promise<SimilarNote[]> {
        if (!this.isInitialized || this.embeddings.size === 0) {
            return [];
        }

        try {
            const queryEmbedding = await this.generateEmbedding(query);
            const similarities: SimilarNote[] = [];

            for (const [path, embeddingData] of this.embeddings) {
                const similarity = this.cosineSimilarity(queryEmbedding, embeddingData.embedding);

                if (similarity > 0.1) {
                    similarities.push({
                        file: embeddingData.file,
                        content: embeddingData.content.substring(0, 500),
                        similarity
                    });
                }
            }

            return similarities
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, this.settings.embeddingsMaxRelevantNotes);

        } catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }

    async regenerateAllEmbeddings() {
        this.embeddings.clear();
        await this.generateEmbeddingsForAllNotes();
    }

    cleanup() {
        this.embeddings.clear();
        this.executor = null;
        this.isInitialized = false;
        this.isInitializing = false;
    }
}
