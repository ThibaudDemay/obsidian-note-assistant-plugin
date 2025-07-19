// chat-view.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import NoteAssistantPlugin from './main';
import { TemplateProcessor } from './template-processor';
import { SimilarNote } from './embedding-service';

export const VIEW_TYPE_OLLAMA_CHAT = 'note-assistant-chat-view';

export class OllamaChatView extends ItemView {
    plugin: NoteAssistantPlugin;
    chatContainer: HTMLElement;
    inputContainer: HTMLElement;
    messagesContainer: HTMLElement;
    inputField: HTMLTextAreaElement;
    sendButton: HTMLButtonElement;
    conversationHistory: Array<{role: string, content: string, timestamp?: number}> = [];

    constructor(leaf: WorkspaceLeaf, plugin: NoteAssistantPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() {
        return VIEW_TYPE_OLLAMA_CHAT;
    }

    getDisplayText() {
        return 'Note assistant';
    }

    async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl('h2', { text: 'Note assistant' });

        this.chatContainer = container.createDiv({ cls: 'note-assistant-chat-container' });

        this.messagesContainer = this.chatContainer.createDiv({ cls: 'note-assistant-messages' });
        this.inputContainer = this.chatContainer.createDiv({ cls: 'note-assistant-input-container' });

        this.inputField = this.inputContainer.createEl('textarea', {
            cls: 'note-assistant-input',
            attr: { placeholder: 'Ask your question...' }
        });

        this.sendButton = this.inputContainer.createEl('button', {
            cls: 'note-assistant-send-button',
            text: 'Ask'
        });

        this.inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.sendButton.addEventListener('click', () => this.sendMessage());

        // Les styles sont maintenant dans styles.css
    }

    async sendMessage() {
        const message = this.inputField.value.trim();
        if (!message) return;

        this.inputField.value = '';
        this.sendButton.disabled = true;
        this.sendButton.textContent = 'Sending...';

        const timestamp = Date.now();
        this.addMessage('user', message, timestamp);

        try {
            let contextNotes: SimilarNote[] = [];

            // Essayer de récupérer les notes similaires (peut échouer si embeddings non initialisés)
            try {
                contextNotes = await this.plugin.embeddingService.searchSimilarNotes(message);
            } catch (embeddingError) {
                console.warn('⚠️ Embeddings not available:', embeddingError.message);
                // Continuer sans contexte de notes
            }

            // Affichage conditionnel des notes utilisées
            if (contextNotes.length > 0 && this.plugin.settings.showNotesUsed) {
                const contextText = contextNotes.map((note, index) =>
                    `**${index + 1}. ${note.file.basename}** (${Math.round(note.similarity * 100)}%): ${note.content.substring(0, 150)}...`
                ).join('\n\n');
                this.addMessage('context', `📝 Notes used:\n${contextText}`, timestamp);
            }

            // Récupération du template sans annonce dans le chat
            const historyContext = this.getHistoryForContext();

            // Récupérer le template
            const templateResult = await TemplateProcessor.getTemplate(this.plugin.settings);

            if (templateResult.error) {
                this.addMessage('assistant', `❌ Template error: ${templateResult.error}`, Date.now());
                return;
            }

            // Formater les contextes
            const conversationContext = TemplateProcessor.formatConversationContext(historyContext);
            const notesContext = TemplateProcessor.formatNotesContext(contextNotes);

            // Appliquer le template
            const finalPrompt = TemplateProcessor.processTemplate(
                templateResult.template,
                conversationContext,
                notesContext,
                message
            );

            // Envoyer le prompt formaté (sans annoncer la source du template)
            const response = await this.plugin.ollamaService.chat([
                { role: 'user', content: finalPrompt }
            ]);

            this.addMessage('assistant', response, Date.now());

            // Ajouter à l'historique (gardé intégralement)
            this.addToHistory({ role: 'user', content: message, timestamp });
            this.addToHistory({ role: 'assistant', content: response, timestamp: Date.now() });

        } catch (error) {
            console.error('Error sending message:', error);
            this.addMessage('assistant', `❌ Error: ${error.message}`, Date.now());
        } finally {
            this.sendButton.disabled = false;
            this.sendButton.textContent = 'Ask';
        }
    }

    // Gestion de l'historique (gardé intégralement pour l'utilisateur)
    private addToHistory(message: {role: string, content: string, timestamp?: number}) {
        this.conversationHistory.push(message);
    }

    // Récupérer les messages récents pour le contexte du modèle
    private getHistoryForContext(): Array<{role: string, content: string}> {
        // Prendre les N derniers messages selon maxHistoryLength pour le contexte du modèle
        return this.conversationHistory
            .slice(-this.plugin.settings.maxHistoryLength)
            .map(msg => ({ role: msg.role, content: msg.content }));
    }

    // Support des timestamps
    addMessage(role: string, content: string, timestamp?: number) {
        const messageEl = this.messagesContainer.createDiv({ cls: `note-assistant-message ${role}` });

        // Ajouter timestamp si activé
        if (timestamp && this.plugin.settings.showTimestamps) {
            const timeStr = new Date(timestamp).toLocaleTimeString();
            messageEl.createDiv({ cls: 'note-assistant-timestamp', text: timeStr });
        }

        messageEl.createDiv({ text: content });
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async onClose() {
        // Cleanup
    }
}
