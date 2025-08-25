/*
 * File Name         : OllamaService.ts
 * Description       : Ollama service to interact with Ollama server API
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:16:45
 */

import { Platform, requestUrl, RequestUrlParam } from 'obsidian';

import { OllamaModelResponse, ProgressResponse } from '@/@types/services/OllamaService';
import { NoteAssistantPluginSettings } from '@/@types/settings';

// Types pour les réponses API Ollama
interface OllamaChatResponse {
    message: {
        content: string;
    };
}

interface OllamaTagsResponse {
    models: OllamaModelResponse[];
}

interface OllamaEmbeddingResponse {
    embedding: number[];
}

interface OllamaVersionResponse {
    version: string;
}

interface OllamaModelInfo {
    size?: number;
    [key: string]: unknown;
}

interface RunningModel {
    name: string;
    loaded_at?: string;
    details?: {
        format?: string;
    };
}

interface OllamaRunningModelsResponse {
    models: RunningModel[];
}

// Types pour les requêtes streamables
interface StreamableRequest {
    endpoint: string;
    body: Record<string, unknown>;
    extractContent: (data: Record<string, unknown>) => string | null;
}

export class OllamaService {
    private settings: NoteAssistantPluginSettings;

    constructor(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    private isMobilePlatform(): boolean {
        return Platform.isMobileApp;
    }

    updateSettings(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    private getHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.settings.ollamaAuthText !== '') {
            headers['Authorization'] = `Bearer ${this.settings.ollamaAuthText}`;
        }

        return headers;
    }

    // Méthode pour requêtes simples (non-stream)
    private async makeRequest<T>(endpoint: string, body: Record<string, unknown>, method: string = 'POST'): Promise<T> {
        const url = `${this.settings.ollamaBaseUrl}${endpoint}`;
        const headers = this.getHeaders();

        if (!this.isMobilePlatform()) {
            // Utiliser fetch natif sur desktop
            const response = await fetch(url, {
                method,
                headers,
                body: method !== 'GET' ? JSON.stringify(body) : undefined
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
            }

            return await response.json() as T;
        } else {
            // Utiliser requestUrl sur mobile
            const requestParam: RequestUrlParam = {
                url,
                method,
                headers,
                body: method !== 'GET' ? JSON.stringify(body) : undefined
            };

            const response = await requestUrl(requestParam);

            if (response.status >= 400) {
                throw new Error(`Ollama API error: ${response.status} ${response.text}`);
            }

            return response.json as T;
        }
    }

    // Méthode pour les requêtes streaming (desktop uniquement)
    private async makeStreamRequest(endpoint: string, body: Record<string, unknown>): Promise<ReadableStream<Uint8Array>> {
        if (this.isMobilePlatform()) {
            throw new Error('Streaming not supported on mobile platform');
        }

        const url = `${this.settings.ollamaBaseUrl}${endpoint}`;
        const headers = this.getHeaders();

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...body, stream: true })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
        }

        return response.body!;
    }

    private async processStream(stream: ReadableStream<Uint8Array>, onChunk: (data: Record<string, unknown>) => void): Promise<void> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line) as Record<string, unknown>;
                        onChunk(data);
                    } catch {
                        // Ignorer les lignes malformées
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    // Fonction générique pour gérer streaming/non-streaming selon la plateforme
    private async handleStreamableRequest(
        request: StreamableRequest,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const canStream = this.isStreamingAvailable();

        if (!canStream) {
            // Mode non-streaming : faire une requête classique et envoyer tout d'un coup
            const response = await this.makeRequest<Record<string, unknown>>(
                request.endpoint,
                { ...request.body, stream: false }
            );

            const content = request.extractContent(response);
            if (content) {
                onChunk(content);
            }
            return;
        }

        // Mode streaming : vraie diffusion chunk par chunk
        const stream = await this.makeStreamRequest(request.endpoint, request.body);

        await this.processStream(stream, (data) => {
            const content = request.extractContent(data);
            if (content) {
                onChunk(content);
            }
        });
    }

    // Méthode unifiée pour chat (gère automatiquement streaming/non-streaming)
    async chat(
        messages: Array<{role: string, content: string}>,
        onChunk?: (chunk: string) => void
    ): Promise<string> {
        const request: StreamableRequest = {
            endpoint: '/api/chat',
            body: {
                model: this.settings.llmModel,
                messages: messages,
                keep_alive: this.settings.llmModelKeepAlive,
                options: {
                    temperature: this.settings.llmTemperature,
                    top_p: this.settings.llmTopP,
                    repeat_penalty: this.settings.llmRepeatPenalty,
                    num_predict: this.settings.llmMaxTokens
                }
            },
            extractContent: (data) => (data.message as { content?: string })?.content || null
        };

        if (onChunk) {
            // Mode streaming
            await this.handleStreamableRequest(request, onChunk);
            return ''; // En mode streaming, le contenu est envoyé via onChunk
        } else {
            // Mode non-streaming : retourner le contenu complet
            const response = await this.makeRequest<OllamaChatResponse>(
                request.endpoint,
                { ...request.body, stream: false }
            );
            return response.message.content;
        }
    }

    async loadModel(modelName: string, keepAlive: string): Promise<void> {
        await this.makeRequest('/api/generate', {
            model: modelName,
            keep_alive: keepAlive
        });
    }

    async loadEmbeddingModel(modelName: string, keepAlive: string): Promise<void> {
        try {
            await this.makeRequest('/api/embeddings', {
                model: modelName,
                keep_alive: keepAlive
            });
        } catch (error) {
            throw new Error(`Erreur lors du chargement du modèle d'embedding: ${(error as Error).message}`);
        }
    }

    async pullModel(modelName: string, onProgress?: (progress: ProgressResponse) => void): Promise<void> {
        if (!onProgress) {
            // Si pas de callback de progrès, requête simple
            await this.makeRequest('/api/pull', {
                model: modelName,
                stream: false
            });
            return;
        }

        if (this.isStreamingAvailable()) {
            // Desktop avec streaming : utiliser la fonction générique
            const request: StreamableRequest = {
                endpoint: '/api/pull',
                body: {
                    model: modelName
                },
                extractContent: () => null // Le pull ne retourne pas de contenu textuel, juste du progrès
            };

            const stream = await this.makeStreamRequest(request.endpoint, request.body);
            await this.processStream(stream, (data) => {
                // Validation des données avant conversion en ProgressResponse
                const progressData: ProgressResponse = {
                    status: (data.status as string) || 'unknown',
                    digest: data.digest as string | undefined,
                    total: data.total as number | undefined,
                    completed: data.completed as number | undefined
                };
                onProgress(progressData);
            });
        } else {
            // Mobile : polling du progrès
            await this.pullModelWithPolling(modelName, onProgress);
        }
    }

    private async pullModelWithPolling(modelName: string, onProgress: (progress: ProgressResponse) => void): Promise<void> {
    // Démarrer le pull en mode non-stream
        const pullPromise = this.makeRequest('/api/pull', {
            model: modelName,
            stream: false
        });

        // Polling pour suivre le progrès
        await this.pollPullProgress(modelName, onProgress);

        // Attendre que le pull soit terminé
        await pullPromise;

        onProgress({
            status: 'success'
        });
    }

    private async pollPullProgress(modelName: string, onProgress: (progress: ProgressResponse) => void): Promise<void> {
        let isCompleted = false;
        let lastStatus = '';

        while (!isCompleted) {
            try {
                const models = await this.getInstalledModels();
                const modelExists = models.some(m => m.name === modelName);

                if (modelExists) {
                    isCompleted = true;
                    onProgress({
                        status: 'success'
                    });
                } else {
                    const currentStatus = 'pulling';
                    if (currentStatus !== lastStatus) {
                        onProgress({
                            status: currentStatus
                        });
                        lastStatus = currentStatus;
                    }
                }

                if (!isCompleted) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    async deleteModel(modelName: string): Promise<void> {
        try {
            await this.makeRequest('/api/delete', {
                name: modelName
            }, 'DELETE');
        } catch (error) {
            throw new Error(`Model deletion error: ${(error as Error).message}`);
        }
    }

    async getInstalledModels(): Promise<OllamaModelResponse[]> {
        try {
            const response = await this.makeRequest<OllamaTagsResponse>('/api/tags', {}, 'GET');
            return response.models || [];
        } catch {
            return [];
        }
    }

    async getModelInfo(modelName: string): Promise<OllamaModelInfo | null> {
        try {
            const response = await this.makeRequest<OllamaModelInfo>('/api/show', {
                name: modelName
            });
            return response;
        } catch (error) {
            console.error('error getting model info:', error);
            return null;
        }
    }

    async generateEmbeddings(text: string, model?: string): Promise<number[]> {
        const embeddingModel = model || this.settings.embeddingModel;

        try {
            const response = await this.makeRequest<OllamaEmbeddingResponse>('/api/embeddings', {
                model: embeddingModel,
                prompt: text
            });

            return response.embedding;
        } catch (error) {
            throw new Error(`Embedding generation error: ${(error as Error).message}`);
        }
    }

    async getRunningModels(): Promise<RunningModel[]> {
        try {
            const response = await this.makeRequest<OllamaRunningModelsResponse>('/api/ps', {}, 'GET');
            return response.models || [];
        } catch (error) {
            console.error('Error getting running models:', error);
            return [];
        }
    }

    async abort(): Promise<void> {
    // Limitation: pas d'endpoint abort direct dans l'API Ollama
        console.warn('Abort not implemented');
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.getInstalledModels();
            return true;
        } catch {
            return false;
        }
    }

    async getLLMModels(): Promise<string[]> {
        const models = await this.getInstalledModels();
        return models
            .filter(model => !this.isEmbeddingModel(model))
            .map(model => model.name);
    }

    async getEmbeddingModels(): Promise<string[]> {
        const models = await this.getInstalledModels();
        return models
            .filter(model => this.isEmbeddingModel(model))
            .map(model => model.name);
    }

    private isEmbeddingModel(model: OllamaModelResponse): boolean {
        const family = model.details.family.toLowerCase();
        const embeddingFamilyKeywords = ['bert'];
        return embeddingFamilyKeywords.some(keyword => family.includes(keyword));
    }

    async isModelLoaded(modelName: string): Promise<boolean> {
        try {
            const models = await this.getRunningModels();
            return models.some((model: RunningModel) => model.name === modelName);
        } catch (error) {
            console.warn('Could not check loaded models:', error);
            return false;
        }
    }

    async getModelPerformanceInfo(modelName: string): Promise<{
        isLoaded: boolean;
        loadedAt?: string;
        size?: number;
        processor?: string;
    }> {
        try {
            const runningModels = await this.getRunningModels();
            const modelInfo = await this.getModelInfo(modelName);
            const isLoaded = runningModels.some(m => m.name === modelName);

            const loadedModel = runningModels.find(m => m.name === modelName);

            return {
                isLoaded,
                loadedAt: loadedModel?.loaded_at,
                size: modelInfo?.size,
                processor: loadedModel?.details?.format
            };
        } catch {
            return { isLoaded: false };
        }
    }

    async testEmbeddingModel(modelName: string): Promise<{
        success: boolean;
        dimensions: number;
        error?: string;
    }> {
        try {
            const testEmbedding = await this.generateEmbeddings('test', modelName);

            return {
                success: true,
                dimensions: testEmbedding.length
            };
        } catch (error) {
            return {
                success: false,
                dimensions: 0,
                error: (error as Error).message
            };
        }
    }

    async testLLMModel(modelName: string): Promise<{
        success: boolean;
        responseTime: number;
        error?: string;
    }> {
        const startTime = Date.now();

        try {
            await this.makeRequest('/api/chat', {
                model: modelName,
                messages: [{ role: 'user', content: 'Hi' }],
                stream: false,
                options: {
                    num_predict: 5
                }
            });

            const responseTime = Date.now() - startTime;

            return {
                success: true,
                responseTime
            };
        } catch (error) {
            return {
                success: false,
                responseTime: 0,
                error: (error as Error).message
            };
        }
    }

    async getOllamaVersion(): Promise<string | null> {
        try {
            const response = await this.makeRequest<OllamaVersionResponse>('/api/version', {}, 'GET');
            return response.version;
        } catch (error) {
            console.warn('Could not get Ollama version:', error);
        }
        return null;
    }

    // Méthode utilitaire pour connaître le mode actuel
    getExecutionMode(): 'desktop' | 'mobile' {
        return this.isMobilePlatform() ? 'mobile' : 'desktop';
    }

    // Méthode pour vérifier si le streaming est disponible
    isStreamingAvailable(): boolean {
        return !this.isMobilePlatform() && this.settings.llmStream;
    }
}
