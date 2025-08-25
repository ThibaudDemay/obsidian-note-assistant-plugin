/*
 * File Name         : StorageService.ts
 * Description       : Storage service for managing embeddings and conversations persistence
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:20:08
 */

// src/storage-service.ts
import { EmbeddingDataWithHash } from '@/@types';
import { Message } from '@/@types/react/views/Chat';
import { ConversationData, EmbeddingsCache, StorageConfig } from '@/@types/services/StorageService';
import NoteAssistantPlugin from '@/main';

export class StorageService {
    private plugin: NoteAssistantPlugin;
    private config: StorageConfig;
    private pluginDataDir: string;

    constructor(plugin: NoteAssistantPlugin) {
        this.plugin = plugin;
        this.pluginDataDir = `${plugin.app.vault.configDir}/plugins/obsidian-note-assistant`;
        this.config = {
            embeddingsFile: 'embeddings-cache.json',
            conversationsDir: 'conversations',
            maxConversations: 50
        };
    }

    async initialize(): Promise<void> {
        // Créer les dossiers nécessaires
        await this.ensureDirectoryExists(this.pluginDataDir);
        await this.ensureDirectoryExists(`${this.pluginDataDir}/${this.config.conversationsDir}`);
    }

    private async ensureDirectoryExists(path: string): Promise<void> {
        if (!(await this.plugin.app.vault.adapter.exists(path))) {
            await this.plugin.app.vault.adapter.mkdir(path);
        }
    }

    /* ===== GESTION DES EMBEDDINGS ===== */

    async saveEmbeddings(embeddings: Map<string, EmbeddingDataWithHash>): Promise<void> {
        try {
            const embeddingsPath = `${this.pluginDataDir}/${this.config.embeddingsFile}`;

            // Nettoyer les embeddings pour éviter les références circulaires
            const cleanedEmbeddings: Record<string, any> = {};

            for (const [key, embeddingData] of embeddings) {
                cleanedEmbeddings[key] = {
                    embedding: embeddingData.embedding,
                    content: embeddingData.content,
                    lastModified: embeddingData.lastModified,
                    contentHash: embeddingData.contentHash,
                    sectionName: embeddingData.sectionName,
                    // Nettoyer la référence au fichier
                    file: {
                        path: embeddingData.file.path,
                        name: embeddingData.file.name,
                        basename: embeddingData.file.basename,
                        stat: {
                            mtime: embeddingData.file.stat.mtime,
                            ctime: embeddingData.file.stat.ctime,
                            size: embeddingData.file.stat.size
                        }
                    }
                };
            }

            const cacheData: EmbeddingsCache = {
                version: '1.0',
                model: this.plugin.settings.embeddingModel,
                modelDimensions: embeddings.size > 0
                    ? Array.from(embeddings.values())[0].embedding.length
                    : 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                embeddings: cleanedEmbeddings
            };

            await this.plugin.app.vault.adapter.write(
                embeddingsPath,
                JSON.stringify(cacheData, null)
            );

            console.log(`💾 Saved ${embeddings.size} embeddings to cache`);
        } catch (error) {
            console.error('❌ Error saving embeddings:', error);
            throw error;
        }
    }

    async loadEmbeddings(): Promise<Map<string, EmbeddingDataWithHash> | null> {
        try {
            const embeddingsPath = `${this.pluginDataDir}/${this.config.embeddingsFile}`;

            if (!(await this.plugin.app.vault.adapter.exists(embeddingsPath))) {
                console.log('📭 No embeddings cache found');
                return null;
            }

            const cachedData = await this.plugin.app.vault.adapter.read(embeddingsPath);
            const parsed: EmbeddingsCache = JSON.parse(cachedData);

            // Vérification de compatibilité
            if (parsed.model !== this.plugin.settings.embeddingModel) {
                console.log(`🔄 Model changed from ${parsed.model} to ${this.plugin.settings.embeddingModel}, cache invalidated`);
                return null;
            }

            if (parsed.version !== '1.0') {
                console.log('🔄 Cache version incompatible, invalidating');
                return null;
            }

            // Restaurer les embeddings avec reconstruction des objets TFile
            const embeddings = new Map<string, EmbeddingDataWithHash>();

            for (const [key, embeddingData] of Object.entries(parsed.embeddings)) {
                // Reconstituer l'objet avec une référence de fichier minimale
                const restoredEmbedding: EmbeddingDataWithHash = {
                    embedding: embeddingData.embedding,
                    content: embeddingData.content,
                    lastModified: embeddingData.lastModified,
                    contentHash: embeddingData.contentHash,
                    sectionName: embeddingData.sectionName,
                    // Créer une référence de fichier minimale mais fonctionnelle
                    file: {
                        path: embeddingData.file.path,
                        name: embeddingData.file.name,
                        basename: embeddingData.file.basename,
                        stat: {
                            mtime: embeddingData.file.stat.mtime,
                            ctime: embeddingData.file.stat.ctime,
                            size: embeddingData.file.stat.size
                        }
                    } as any // Cast pour éviter les erreurs de type avec TFile
                };

                embeddings.set(key, restoredEmbedding);
            }

            console.log(`📂 Loaded ${embeddings.size} embeddings from cache`);
            return embeddings;

        } catch (error) {
            console.error('❌ Error loading embeddings:', error);
            return null;
        }
    }

    async clearEmbeddingsCache(): Promise<void> {
        const embeddingsPath = `${this.pluginDataDir}/${this.config.embeddingsFile}`;
        if (await this.plugin.app.vault.adapter.exists(embeddingsPath)) {
            await this.plugin.app.vault.adapter.remove(embeddingsPath);
            console.log('🗑️ Embeddings cache cleared');
        }
    }

    /* ===== GESTION DES CONVERSATIONS ===== */

    async saveConversation(conversation: ConversationData): Promise<void> {
        try {
            const conversationPath = `${this.pluginDataDir}/${this.config.conversationsDir}/${conversation.id}.json`;

            // Nettoyer les données pour éviter les références circulaires
            const cleanedMessages = this.sanitizeMessages(conversation.messages);

            const dataToSave = {
                ...conversation,
                messages: cleanedMessages,
                updatedAt: Date.now()
            };

            await this.plugin.app.vault.adapter.write(
                conversationPath,
                JSON.stringify(dataToSave, null)
            );

            console.log(`💾 Saved conversation: ${conversation.title}`);

            // Nettoyer les anciennes conversations si trop nombreuses
            await this.cleanupOldConversations();

        } catch (error) {
            console.error('❌ Error saving conversation:', error);
        }
    }

    async loadConversation(conversationId: string): Promise<ConversationData | null> {
        try {
            const conversationPath = `${this.pluginDataDir}/${this.config.conversationsDir}/${conversationId}.json`;

            if (!(await this.plugin.app.vault.adapter.exists(conversationPath))) {
                return null;
            }

            const data = await this.plugin.app.vault.adapter.read(conversationPath);
            const parsed = JSON.parse(data);

            // Restaurer les messages avec les bonnes dates
            return {
                ...parsed,
                messages: this.restoreMessages(parsed.messages || [])
            } as ConversationData;

        } catch (error) {
            console.error('❌ Error loading conversation:', error);
            return null;
        }
    }

    async listConversations(): Promise<ConversationData[]> {
        try {
            const conversationsDir = `${this.pluginDataDir}/${this.config.conversationsDir}`;
            const files = await this.plugin.app.vault.adapter.list(conversationsDir);

            const conversations: ConversationData[] = [];

            for (const file of files.files) {
                if (file.endsWith('.json')) {
                    try {
                        const data = await this.plugin.app.vault.adapter.read(file);
                        const parsed = JSON.parse(data);
                        const conversation: ConversationData = {
                            ...parsed,
                            messages: this.restoreMessages(parsed.messages || [])
                        };
                        conversations.push(conversation);
                    } catch (error) {
                        console.error(`❌ Error loading conversation ${file}:`, error);
                    }
                }
            }

            // Trier par date de mise à jour (plus récent en premier)
            return conversations.sort((a, b) => b.updatedAt - a.updatedAt);

        } catch (error) {
            console.error('❌ Error listing conversations:', error);
            return [];
        }
    }

    async deleteConversation(conversationId: string): Promise<void> {
        try {
            const conversationPath = `${this.pluginDataDir}/${this.config.conversationsDir}/${conversationId}.json`;

            if (await this.plugin.app.vault.adapter.exists(conversationPath)) {
                await this.plugin.app.vault.adapter.remove(conversationPath);
                console.log(`🗑️ Deleted conversation: ${conversationId}`);
            }
        } catch (error) {
            console.error('❌ Error deleting conversation:', error);
        }
    }

    private async cleanupOldConversations(): Promise<void> {
        const conversations = await this.listConversations();

        if (conversations.length > this.config.maxConversations) {
            const toDelete = conversations.slice(this.config.maxConversations);

            for (const conversation of toDelete) {
                await this.deleteConversation(conversation.id);
            }

            console.log(`🧹 Cleaned up ${toDelete.length} old conversations`);
        }
    }

    /* ===== UTILITAIRES ===== */

    // Nettoyer les messages pour la sérialisation JSON
    private sanitizeMessages(messages: Message[]): Message[] {
        return messages.map(message => ({
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            // Nettoyer consultedNotes pour éviter les références circulaires
            consultedNotes: message.consultedNotes?.map(note => ({
                key: note.key,
                content: note.content,
                similarity: note.similarity,
                // Sérialiser seulement les propriétés essentielles du fichier
                file: {
                    path: note.file.path,
                    name: note.file.name,
                    basename: note.file.basename
                }
            }))
        }));
    }

    // Restaurer les messages après désérialisation
    private restoreMessages(messages: any[]): Message[] {
        return messages.map(message => ({
            role: message.role,
            content: message.content,
            timestamp: new Date(message.timestamp),
            consultedNotes: message.consultedNotes?.map((note: any) => ({
                key: note.key,
                content: note.content,
                similarity: note.similarity,
                // Recréer une référence minimale au fichier
                file: {
                    path: note.file.path,
                    name: note.file.name,
                    basename: note.file.basename
                } as any
            }))
        }));
    }

    async getStorageStats(): Promise<{
        embeddingsSize: number;
        conversationsCount: number;
        totalSize: string;
    }> {
        try {
            let embeddingsSize = 0;
            let totalSize = 0;

            // Taille du cache embeddings
            const embeddingsPath = `${this.pluginDataDir}/${this.config.embeddingsFile}`;
            if (await this.plugin.app.vault.adapter.exists(embeddingsPath)) {
                const stat = await this.plugin.app.vault.adapter.stat(embeddingsPath);
                embeddingsSize = stat?.size || 0;
                totalSize += embeddingsSize;
            }

            // Nombre et taille des conversations
            const conversations = await this.listConversations();
            for (const conversation of conversations) {
                const conversationPath = `${this.pluginDataDir}/${this.config.conversationsDir}/${conversation.id}.json`;
                const stat = await this.plugin.app.vault.adapter.stat(conversationPath);
                totalSize += stat?.size || 0;
            }

            return {
                embeddingsSize,
                conversationsCount: conversations.length,
                totalSize: this.formatBytes(totalSize)
            };

        } catch (error) {
            console.error('❌ Error getting storage stats:', error);
            return {
                embeddingsSize: 0,
                conversationsCount: 0,
                totalSize: '0 B'
            };
        }
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    async clearAllData(): Promise<void> {
        // Supprimer le cache des embeddings
        await this.clearEmbeddingsCache();

        // Supprimer toutes les conversations
        const conversations = await this.listConversations();
        for (const conversation of conversations) {
            await this.deleteConversation(conversation.id);
        }

        console.log('🧹 All plugin data cleared');
    }
}