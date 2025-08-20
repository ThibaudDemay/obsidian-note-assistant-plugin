import { Notice } from 'obsidian';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { NoteAssistantPluginSettings, SimilarNote } from '@/@types';
import { Message, SimplifiedMessage } from '@/@types/react/views/Chat';
import { ChatControls } from '@/react/components/chat/ChatControls';
import { ChatHeader } from '@/react/components/chat/ChatHeader';
import { ChatInput } from '@/react/components/chat/ChatInput';
import { ChatMessages } from '@/react/components/chat/ChatMessages';
import { usePlugin } from '@/react/contexts';

import styles from './Chat.module.css';

export const Chat: React.FC = () => {
    const plugin = usePlugin();

    const [settings, setSettings] = useState(plugin!.settings);

    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: 'Bonjour ! Comment puis-je vous aider ?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const [llmModelOptions, setLlmModelOptions] = useState([
        { value: '', label: 'Loading models...' }
    ]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const updateSettings = useCallback((updates: Partial<NoteAssistantPluginSettings>) => {
        if (plugin === undefined)
            return;
        setSettings(prevSettings => {
            const newSettings = {
                ...prevSettings,
                ...updates
            };
            plugin.settings = newSettings;
            plugin.saveSettings();
            return newSettings;
        });
    }, [plugin]);

    const loadLlmModels = async () => {
        const models = await plugin!.ollamaService.getLLMModels();
        if (models.length === 0) {
            setLlmModelOptions([{value: '', label: 'No LLM model found'}]);
        }
        setLlmModelOptions(
            models.map<{ value: string; label: string }>((model) => ({ value: model, label: model }))
        );
    };

    // Auto-scroll vers le bas
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        const message = inputValue.trim();
        if (!message || isLoading) return;

        if (!(await plugin!.ollamaService.testConnection())) {
            const assistantMessage: Message = {
                role: 'system',
                content: '❌ Cannot connect to Ollama server. Please check your connection',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
        }

        // CHECK LLM MODEL ?

        // Contexts
        let similarNotes: SimilarNote[] = [];

        try {
            if (plugin!.embeddingService) {
                similarNotes = await plugin!.embeddingService.searchSimilarNotes(message);
            }
        } catch (embeddingError) {
            console.warn('⚠️ Embedding not available:', embeddingError.message);
        }

        const historyContext: Message[] = messages.slice(-settings.systemPromptMaxHistoryLength);

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

        const similarNoteContext: string = similarNotes.map((note, index) => {
            return `NOTE ${index + 1} = ${note.file.basename} (${note.similarity}% perticence) :\n${note.content}`;
        }).join('\n\n---\n\n');

        const simplifyMessage = (message: Message): SimplifiedMessage => ({role: message.role, content: message.content});

        try {
            const response = await plugin!.ollamaService.chat([
                { role: 'system', content: settings.systemPromptTemplate},
                { role: 'system', content: `CONTEXT OF THE OBSIDIAN NOTES: ${similarNoteContext}`},
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
        } catch(error) {
            new Notice('Error on Chat');
            console.error(error);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const toggleTimestamps = () => {
        updateSettings({showTimestamps: !settings.showTimestamps});
    };

    const handleInputChange = (value: string) => {
        setInputValue(value);
    };

    const handleModelChange = (model: string) => {
        updateSettings({llmModel: model});
    };

    const handleStreamToggle = () => {
        updateSettings({llmStream: !settings.llmStream});
    };

    const handleRefreshContext = async () => {
        setIsRefreshing(true);

        plugin!.embeddingService.generateEmbeddingsForAllNotes();
        const refreshMessage: Message = {
            role: 'system',
            content: 'Contexte actualisé ! Les nouvelles notes ont été indexées.',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, refreshMessage]);
        setIsRefreshing(false);
    };

    useEffect(() => {
        loadLlmModels();
    }, []);

    return (
        <div className={styles.chatViewContainer}>
            <ChatHeader
                showTimestamps={settings.showTimestamps}
                onToggleTimestamps={toggleTimestamps}
            />

            <ChatMessages
                messages={messages}
                showTimestamps={settings.showTimestamps}
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
            />
        </div>
    );
};
