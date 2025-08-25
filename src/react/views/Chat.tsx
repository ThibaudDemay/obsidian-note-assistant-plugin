/*
 * File Name         : Chat.tsx
 * Description       : Chat view component
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:09:38
 */

// src/react/views/Chat.tsx - Version corrigée
import { Notice } from 'obsidian';
import React, { useEffect, useRef, useState } from 'react';

import { SimilarNote } from '@/@types';
import { DropdownItem } from '@/@types/react/components/settings';
import { Message, SimplifiedMessage } from '@/@types/react/views/Chat';
import {
    ChatControls,
    ChatHeader,
    ChatInput,
    ChatMessages,
    NoConversationState,
} from '@/react/components/chat';
import { usePlugin } from '@/react/contexts';
import { useConversations } from '@/react/hooks/useConversations';
import { useSettings } from '@/react/hooks/useSettings';

import styles from './Chat.module.css';

export const Chat: React.FC = () => {
    const plugin = usePlugin();
    const { settings, updateSettings } = useSettings();

    // Utiliser le hook de conversations persistantes
    const [conversationState, conversationActions] = useConversations();

    // État "Pas de conversation" - messages par défaut
    const getDefaultMessages = (): Message[] => [
        {
            role: 'assistant',
            content: 'Bonjour ! Pour commencer, créez une nouvelle conversation ou chargez une conversation existante.',
            timestamp: new Date()
        }
    ];

    // Messages de début de conversation (avec prompt système si défini)
    const getInitialMessages = (): Message[] => {
        const messages: Message[] = [];

        // Ajouter le prompt système si défini et non vide
        if (settings.chatSystemPrompt && settings.chatSystemPrompt.trim() !== '') {
            messages.push({
                role: 'system',
                content: `**Prompt système configuré :**\n\n${settings.chatSystemPrompt}`,
                timestamp: new Date()
            });
        }

        // Ajouter le message d'accueil
        messages.push({
            role: 'assistant',
            content: 'Bonjour ! Comment puis-je vous aider ?',
            timestamp: new Date()
        });

        return messages;
    };

    const [messages, setMessages] = useState<Message[]>(getDefaultMessages());
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [llmModelOptions, setLlmModelOptions] = useState<DropdownItem[]>([
        { value: '', label: 'Loading models...' }
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const loadLlmModels = async () => {
        const models = await plugin!.ollamaService.getLLMModels();
        if (models.length === 0) {
            setLlmModelOptions([{ value: '', label: 'No LLM model found' }]);
        }
        setLlmModelOptions(
            models.map<DropdownItem>((model) => ({ value: model, label: model }))
        );
    };

    // Auto-scroll vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Charger la conversation courante ou afficher l'état par défaut
    useEffect(() => {
        if (conversationState.currentConversation) {
            setMessages(conversationState.currentConversation.messages);
        } else {
            setMessages(getDefaultMessages());
        }
    }, [conversationState.currentConversation]);

    // Sauvegarder automatiquement les messages quand ils changent (seulement si on a une conversation)
    useEffect(() => {
        // Éviter la sauvegarde si :
        // - Pas de conversation courante
        // - Messages par défaut (seulement le message d'accueil)
        // - Messages vides ou invalides
        if (!conversationState.currentConversation ||
            messages.length <= 1 ||
            !messages.some(m => m.role === 'user')) {
            return;
        }

        // Vérifier si les messages ont réellement changé par rapport à ceux sauvegardés
        const currentMessages = conversationState.currentConversation.messages;
        if (messages.length === currentMessages.length) {
            const hasChanges = messages.some((msg, index) => {
                const savedMsg = currentMessages[index];
                return !savedMsg ||
                       msg.content !== savedMsg.content ||
                       msg.role !== savedMsg.role;
            });

            if (!hasChanges) {
                return; // Pas de changement, ne pas sauvegarder
            }
        }

        // Débouncer pour éviter trop de sauvegardes
        const timeoutId = setTimeout(() => {
            console.log('🔄 Sauvegarde automatique de la conversation');
            conversationActions.saveCurrentConversation(messages);
        }, 3000); // Augmenté à 3 secondes pour réduire la fréquence

        return () => clearTimeout(timeoutId);
    }, [messages, conversationState.currentConversation, conversationActions]);

    const handleSendMessage = async () => {
        const message = inputValue.trim();
        if (!message || isLoading) return;

        // Créer une nouvelle conversation si nécessaire
        if (!conversationState.currentConversation) {
            await conversationActions.createNewConversation();
            // Attendre que la conversation soit créée avant de continuer
            return;
        }

        if (!(await plugin!.ollamaService.testConnection())) {
            const assistantMessage: Message = {
                role: 'system',
                content: '❌ Cannot connect to Ollama server. Please check your connection',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
            return;
        }

        // Rechercher les notes similaires
        let similarNotes: SimilarNote[] = [];
        try {
            if (plugin!.embeddingService) {
                similarNotes = await plugin!.embeddingService.searchSimilarNotes(message);
            }
        } catch (embeddingError) {
            console.warn('⚠️ Embedding not available:', embeddingError.message);
        }

        const historyContext: Message[] = messages.slice(-settings.chatPromptMaxHistoryLength);

        // Ajouter le message utilisateur
        const userMessage: Message = {
            role: 'user',
            content: message,
            timestamp: new Date(),
            consultedNotes: similarNotes
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        const similarNoteContext: string = similarNotes.map((note) => {
            return `NOTE '${note.key}' (${note.similarity * 100}% relevance) :\n${note.content}`;
        }).join('\n\n---\n\n');

        const simplifyMessage = (message: Message): SimplifiedMessage => ({
            role: message.role,
            content: message.content
        });

        try {
            const response = await plugin!.ollamaService.chat([
                { role: 'system', content: settings.chatSystemPrompt },
                { role: 'system', content: `CONTEXT OF THE OBSIDIAN NOTES: ${similarNoteContext}` },
                ...historyContext.map(message => simplifyMessage(message)),
                simplifyMessage(userMessage)
            ]);

            const responseAssistantMessage: Message = {
                role: 'assistant',
                content: response,
                timestamp: new Date(),
                consultedNotes: userMessage.consultedNotes
            };

            setMessages(prev => [...prev, responseAssistantMessage]);
        } catch (error) {
            new Notice('Error on Chat');
            console.error(error);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleNewConversation = async () => {
        // Créer les messages initiaux et la conversation
        const initialMessages = getInitialMessages();
        await conversationActions.createNewConversation(undefined, initialMessages);
    };

    const handleLoadConversation = async (conversationId: string) => {
        await conversationActions.loadConversation(conversationId);
    };

    const handleDeleteConversation = async (conversationId: string) => {
        await conversationActions.deleteConversation(conversationId);
        // Les messages seront automatiquement mis à jour par l'useEffect
        // qui détecte qu'il n'y a plus de conversation courante
    };

    const toggleShowTimestamps = () => {
        updateSettings({ chatShowTimestamps: !settings.chatShowTimestamps });
    };

    const toggleShowNotes = () => {
        updateSettings({ chatShowNotesUsed: !settings.chatShowNotesUsed });
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);
    };

    const handleModelChange = (model: string) => {
        updateSettings({ llmModel: model });
    };

    const handleStreamToggle = () => {
        updateSettings({ llmStream: !settings.llmStream });
    };

    const handleRefreshContext = async () => {
        setIsRefreshing(true);

        await plugin!.embeddingService.generateEmbeddingsForAllNotes();
        const refreshMessage: Message = {
            role: 'system',
            content: 'Contexte actualisé ! Les nouvelles notes ont été indexées.',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, refreshMessage]);
        setIsRefreshing(false);
    };

    // Charger les modèles au montage
    useEffect(() => {
        loadLlmModels();
    }, []);

    return (
        <div className={styles.chatViewContainer}>
            <ChatHeader
                showTimestamps={settings.chatShowTimestamps}
                onToggleShowTimestamps={toggleShowTimestamps}
                showNotes={settings.chatShowNotesUsed}
                onToggleShowNotes={toggleShowNotes}
                conversations={conversationState.conversations}
                currentConversation={conversationState.currentConversation}
                onNewConversation={handleNewConversation}
                onLoadConversation={handleLoadConversation}
                onDeleteConversation={handleDeleteConversation}
                onRenameConversation={conversationActions.updateConversationTitle}
            />

            {/* État "Pas de conversation" */}
            {!conversationState.currentConversation ? (
                <NoConversationState
                    conversations={conversationState.conversations}
                    onNewConversation={handleNewConversation}
                    onLoadConversation={handleLoadConversation}
                />
            ) : (
                <>
                    <ChatMessages
                        messages={messages}
                        showTimestamps={settings.chatShowTimestamps}
                        showNotesUsed={settings.chatShowNotesUsed}
                        isLoading={isLoading}
                        messagesEndRef={messagesEndRef}
                    />

                    <ChatControls
                        selectedModel={settings.llmModel}
                        availableModels={llmModelOptions}
                        streamEnabled={settings.llmStream}
                        isRefreshing={isRefreshing}
                        onModelChange={handleModelChange}
                        onStreamToggle={handleStreamToggle}
                        onRefreshContext={handleRefreshContext}
                    />

                    <ChatInput
                        inputValue={inputValue}
                        isLoading={isLoading}
                        onInputChange={handleInputChange}
                        onSendMessage={handleSendMessage}
                        inputRef={inputRef}
                        placeholder={conversationState.currentConversation ?
                            'Tapez votre message...' :
                            'Créez d\'abord une conversation pour commencer à discuter'
                        }
                        disabled={!conversationState.currentConversation}
                    />
                </>
            )}

            {conversationState.error && (
                <div className={styles.errorMessage}>
                    <span>⚠️ {conversationState.error.message}</span>
                    <button onClick={conversationActions.clearError}>✕</button>
                </div>
            )}
        </div>
    );
};
