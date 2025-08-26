/*
 * File Name         : StorageService.ts
 * Description       : Storage service for managing embeddings and conversations persistence
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 26/08/2025 14:12:09
 */

import { TFile } from 'obsidian';

import { Message, StoredMessage } from '@/@types/react/views/Chat';
import { EmbeddingDataWithHash, SimilarNote } from '@/@types/services/EmbeddingService';
import {
    CompressedStoredEmbeddingData, ConversationData, StorageConfig, StoredConversationData, StoredEmbeddingsCache
} from '@/@types/services/StorageService';
import NoteAssistantPlugin from '@/main';
import { formatNumeric } from '@/utils';

export class StorageService {
    private plugin: NoteAssistantPlugin;
    private config: StorageConfig;
    private pluginDataDir: string;

    constructor(plugin: NoteAssistantPlugin) {
        this.plugin = plugin;
        this.pluginDataDir = `${plugin.app.vault.configDir}/note-assistant-data`;
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

    /* ===== COMPRESSION BASE64 ===== */

    private vectorToBase64(vector: number[]): string {
        const float32Array = new Float32Array(vector);
        const uint8Array = new Uint8Array(float32Array.buffer);

        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
        }

        return btoa(binary);
    }

    private base64ToVector(base64: string): number[] {
        const binary = atob(base64);
        const uint8Array = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            uint8Array[i] = binary.charCodeAt(i);
        }

        const float32Array = new Float32Array(uint8Array.buffer);
        return Array.from(float32Array);
    }

    /* ===== GESTION DES EMBEDDINGS ===== */

    async saveEmbeddings(embeddings: Map<string, EmbeddingDataWithHash>): Promise<void> {
        try {
            const embeddingsPath = `${this.pluginDataDir}/${this.config.embeddingsFile}`;

            // Convertir vers le format de stockage compressé
            const storedEmbeddings = this.convertToStoredEmbeddings(embeddings);

            const cacheData: StoredEmbeddingsCache = {
                version: '1.0',
                model: this.plugin.settings.embeddingModel,
                modelDimensions: embeddings.size > 0 ? Array.from(embeddings.values())[0].embedding.length : 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                embeddings: storedEmbeddings
            };

            await this.plugin.app.vault.adapter.write(
                embeddingsPath,
                JSON.stringify(cacheData, null)
            );

            console.log(`💾 Saved ${embeddings.size} embeddings to cache (compressed)`);

        } catch (error) {
            console.error('❌ Error saving embeddings:', error);
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
            const parsed: StoredEmbeddingsCache = JSON.parse(cachedData);

            // Vérification de compatibilité
            if (parsed.model !== this.plugin.settings.embeddingModel) {
                console.log(`🔄 Model changed from ${parsed.model} to ${this.plugin.settings.embeddingModel}, cache invalidated`);
                return null;
            }

            if (parsed.version !== '1.0') {
                console.log('🔄 Cache version incompatible, invalidating');
                return null;
            }

            // Convertir vers le format runtime
            const embeddings = this.convertFromStoredEmbeddings(parsed.embeddings);

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

    /* ===== UTILITAIRES EMBEDDINGS ===== */

    private convertToStoredEmbeddings(embeddings: Map<string, EmbeddingDataWithHash>): Record<string, CompressedStoredEmbeddingData> {
        const stored: Record<string, CompressedStoredEmbeddingData> = {};

        for (const [key, embeddingData] of embeddings) {
            stored[key] = {
                vector: this.vectorToBase64(embeddingData.embedding), // 🎯 Compression Base64
                content: embeddingData.content,
                lastModified: embeddingData.lastModified,
                contentHash: embeddingData.contentHash,
                sectionName: embeddingData.sectionName,
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

        return stored;
    }

    private convertFromStoredEmbeddings(storedEmbeddings: Record<string, CompressedStoredEmbeddingData>): Map<string, EmbeddingDataWithHash> {
        const embeddings = new Map<string, EmbeddingDataWithHash>();

        for (const [key, embeddingData] of Object.entries(storedEmbeddings)) {
            // Essayer de retrouver le vrai fichier TFile depuis le vault
            const realFile = this.plugin.app.vault.getAbstractFileByPath(embeddingData.file.path);

            const restoredEmbedding: EmbeddingDataWithHash = {
                embedding: this.base64ToVector(embeddingData.vector), // 🎯 Décompression Base64
                content: embeddingData.content,
                lastModified: embeddingData.lastModified,
                contentHash: embeddingData.contentHash,
                sectionName: embeddingData.sectionName,
                // Utiliser le vrai fichier si disponible, sinon créer un mock TFile complet
                file: (realFile instanceof TFile) ? realFile : {
                    path: embeddingData.file.path,
                    name: embeddingData.file.name,
                    basename: embeddingData.file.basename,
                    extension: embeddingData.file.path.split('.').pop() || '',
                    stat: embeddingData.file.stat || { mtime: 0, ctime: 0, size: 0 },
                    vault: this.plugin.app.vault,
                    parent: null
                } as TFile
            };

            embeddings.set(key, restoredEmbedding);
        }

        return embeddings;
    }

    /* ===== GESTION DES CONVERSATIONS ===== */

    async saveConversation(conversation: ConversationData): Promise<void> {
        try {
            const conversationPath = `${this.pluginDataDir}/${this.config.conversationsDir}/${conversation.id}.json`;

            // Convertir vers le format de stockage
            const storedConversation: StoredConversationData = {
                id: conversation.id,
                title: conversation.title,
                messages: this.convertToStoredMessages(conversation.messages),
                createdAt: conversation.createdAt,
                updatedAt: Date.now()
            };

            await this.plugin.app.vault.adapter.write(
                conversationPath,
                JSON.stringify(storedConversation, null)
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
            const parsed: StoredConversationData = JSON.parse(data);

            return {
                id: parsed.id,
                title: parsed.title,
                messages: this.convertFromStoredMessages(parsed.messages),
                createdAt: parsed.createdAt,
                updatedAt: parsed.updatedAt
            };

        } catch (error) {
            console.error('❌ Error loading conversation:', error);
            return null;
        }
    }

    async listConversations(): Promise<ConversationData[]> {
        try {
            const conversationsDir = `${this.pluginDataDir}/${this.config.conversationsDir}`;

            if (!(await this.plugin.app.vault.adapter.exists(conversationsDir))) {
                return [];
            }

            const files = await this.plugin.app.vault.adapter.list(conversationsDir);
            const conversations: ConversationData[] = [];

            for (const file of files.files) {
                if (file.endsWith('.json')) {
                    const conversationId = file.replace('.json', '').split('/').pop();
                    if (conversationId) {
                        const conversation = await this.loadConversation(conversationId);
                        if (conversation) {
                            conversations.push(conversation);
                        }
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

    /* ===== UTILITAIRES CONVERSATION ===== */

    private convertToStoredMessages(messages: Message[]): StoredMessage[] {
        return messages.map(message => ({
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            consultedNotes: message.consultedNotes?.map(note => ({
                key: note.key,
                content: note.content,
                similarity: note.similarity,
                file: {
                    path: note.file.path,
                    name: note.file.name,
                    basename: note.file.basename
                }
            }))
        }));
    }

    private convertFromStoredMessages(storedMessages: StoredMessage[]): Message[] {
        return storedMessages.map(message => ({
            role: message.role,
            content: message.content,
            timestamp: new Date(message.timestamp), // S'assurer que c'est une Date
            consultedNotes: message.consultedNotes?.map(note => {
                // Essayer de retrouver le vrai fichier TFile depuis le vault
                const realFile = this.plugin.app.vault.getAbstractFileByPath(note.file.path);

                return {
                    key: note.key,
                    content: note.content,
                    similarity: note.similarity,
                    // Utiliser le vrai fichier si disponible, sinon créer un mock TFile complet
                    file: (realFile instanceof TFile) ? realFile : {
                        path: note.file.path,
                        name: note.file.name,
                        basename: note.file.basename,
                        extension: note.file.path.split('.').pop() || '',
                        stat: { mtime: 0, ctime: 0, size: 0 },
                        vault: this.plugin.app.vault,
                        parent: null
                    } as TFile
                } as SimilarNote;
            })
        }));
    }

    /* ===== UTILITAIRES ===== */

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
                totalSize: formatNumeric(totalSize, 'B')
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
