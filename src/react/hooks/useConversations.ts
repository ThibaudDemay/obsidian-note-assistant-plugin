/*
 * File Name         : useConversations.ts
 * Description       : Conversations hook to manage conversations state and actions
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:23:59
 */

import { useCallback, useEffect, useState } from 'react';

import { Message } from '@/@types/react/views/Chat';
import { ConversationData } from '@/@types/services/StorageService';
import { usePlugin } from '@/react/contexts';

interface ConversationState {
    conversations: ConversationData[];
    currentConversation: ConversationData | null;
    isLoading: boolean;
    error: Error | null;
}

interface ConversationActions {
    loadConversations: () => Promise<void>;
    createNewConversation: (title?: string, initialMessages?: Message[]) => Promise<string>;
    loadConversation: (id: string) => Promise<void>;
    saveCurrentConversation: (messages: Message[]) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    updateConversationTitle: (id: string, title: string) => Promise<void>;
    clearError: () => void;
}

export const useConversations = (): [ConversationState, ConversationActions] => {
    const plugin = usePlugin();

    const [state, setState] = useState<ConversationState>({
        conversations: [],
        currentConversation: null,
        isLoading: false,
        error: null
    });

    // Générer un ID unique
    const generateConversationId = (): string => {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const actions: ConversationActions = {
        loadConversations: useCallback(async () => {
            if (!plugin?.storageService) return;

            setState(prev => ({ ...prev, isLoading: true, error: null }));

            try {
                const conversations = await plugin.storageService.listConversations();
                setState(prev => ({
                    ...prev,
                    conversations,
                    isLoading: false
                }));
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    error: error as Error,
                    isLoading: false
                }));
            }
        }, [plugin]),

        createNewConversation: useCallback(async (title?: string, initialMessages?: Message[]): Promise<string> => {
            if (!plugin?.storageService) return '';

            const id = generateConversationId();
            const newConversation: ConversationData = {
                id,
                title: title || 'Nouvelle conversation',
                messages: initialMessages || [], // Utiliser les messages initiaux si fournis
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            try {
                await plugin.storageService.saveConversation(newConversation);

                setState(prev => ({
                    ...prev,
                    currentConversation: newConversation,
                    conversations: [newConversation, ...prev.conversations]
                }));

                return id;
            } catch (error) {
                setState(prev => ({ ...prev, error: error as Error }));
                return '';
            }
        }, [plugin]),

        loadConversation: useCallback(async (id: string) => {
            if (!plugin?.storageService) return;

            setState(prev => ({ ...prev, isLoading: true, error: null }));

            try {
                const conversation = await plugin.storageService.loadConversation(id);

                if (conversation) {
                    setState(prev => ({
                        ...prev,
                        currentConversation: conversation,
                        isLoading: false
                    }));
                } else {
                    throw new Error('Conversation not found');
                }
            } catch (error) {
                setState(prev => ({
                    ...prev,
                    error: error as Error,
                    isLoading: false
                }));
            }
        }, [plugin]),

        saveCurrentConversation: useCallback(async (messages: Message[]) => {
            if (!plugin?.storageService || !state.currentConversation) return;

            try {
                // Vérifier si les messages ont réellement changé
                const currentMessages = state.currentConversation.messages;
                if (messages.length === currentMessages.length) {
                    const hasChanges = messages.some((msg, index) => {
                        const savedMsg = currentMessages[index];
                        return !savedMsg ||
                               msg.content !== savedMsg.content ||
                               msg.role !== savedMsg.role ||
                               msg.timestamp.getTime() !== new Date(savedMsg.timestamp).getTime();
                    });

                    if (!hasChanges) {
                        console.log('📝 Sauvegarde ignorée - aucun changement détecté');
                        return; // Pas de changement, ne pas sauvegarder
                    }
                }

                // Mettre à jour la conversation avec les nouveaux messages
                const updatedConversation: ConversationData = {
                    ...state.currentConversation,
                    messages,
                    updatedAt: Date.now()
                };

                // Générer un titre automatique si c'est la première fois
                if (updatedConversation.title === 'Nouvelle conversation' && messages.length > 0) {
                    const firstUserMessage = messages.find(m => m.role === 'user');
                    if (firstUserMessage) {
                        const content = firstUserMessage.content.trim();
                        updatedConversation.title = content.length > 50
                            ? content.substring(0, 47) + '...'
                            : content;
                    }
                }

                await plugin.storageService.saveConversation(updatedConversation);
                console.log('💾 Conversation sauvegardée:', updatedConversation.title);

                setState(prev => ({
                    ...prev,
                    currentConversation: updatedConversation,
                    conversations: prev.conversations.map(conv =>
                        conv.id === updatedConversation.id ? updatedConversation : conv
                    )
                }));
            } catch (error) {
                console.error('❌ Erreur lors de la sauvegarde:', error);
                setState(prev => ({ ...prev, error: error as Error }));
            }
        }, [plugin, state.currentConversation]),

        deleteConversation: useCallback(async (id: string) => {
            if (!plugin?.storageService) return;

            try {
                await plugin.storageService.deleteConversation(id);

                setState(prev => {
                    const newConversations = prev.conversations.filter(conv => conv.id !== id);
                    const newCurrentConversation = prev.currentConversation?.id === id
                        ? null
                        : prev.currentConversation;

                    return {
                        ...prev,
                        conversations: newConversations,
                        currentConversation: newCurrentConversation
                    };
                });
            } catch (error) {
                setState(prev => ({ ...prev, error: error as Error }));
            }
        }, [plugin]),

        updateConversationTitle: useCallback(async (id: string, title: string) => {
            if (!plugin?.storageService) return;

            try {
                const conversation = await plugin.storageService.loadConversation(id);
                if (!conversation) return;

                const updatedConversation: ConversationData = {
                    ...conversation,
                    title,
                    updatedAt: Date.now()
                };

                await plugin.storageService.saveConversation(updatedConversation);

                setState(prev => ({
                    ...prev,
                    conversations: prev.conversations.map(conv =>
                        conv.id === id ? updatedConversation : conv
                    ),
                    currentConversation: prev.currentConversation?.id === id
                        ? updatedConversation
                        : prev.currentConversation
                }));
            } catch (error) {
                setState(prev => ({ ...prev, error: error as Error }));
            }
        }, [plugin]),

        clearError: useCallback(() => {
            setState(prev => ({ ...prev, error: null }));
        }, [])
    };

    // Charger les conversations au montage
    useEffect(() => {
        actions.loadConversations();
    }, [actions.loadConversations]);

    return [state, actions];
};
