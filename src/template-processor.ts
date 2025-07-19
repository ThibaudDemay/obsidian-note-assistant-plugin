import { App, TFile } from 'obsidian';
import { NoteAssistantPluginSettings } from './settings';

export class TemplateProcessor {
    private static app: App;

    static initialize(app: App) {
        this.app = app;
    }

    static async getTemplate(settings: NoteAssistantPluginSettings): Promise<{template: string, source: string, error?: string}> {
        if (settings.templateSource === 'file' && settings.templateFilePath) {
            try {
                const file = this.app.vault.getAbstractFileByPath(settings.templateFilePath);
                if (!file || !(file instanceof TFile)) {
                    return {
                        template: '',
                        source: 'file',
                        error: `Template file not found: ${settings.templateFilePath}`
                    };
                }

                const content = await this.app.vault.read(file);
                const validation = this.validateTemplate(content);

                if (!validation.isValid) {
                    return {
                        template: '',
                        source: 'file',
                        error: `Invalid template in ${settings.templateFilePath}: ${validation.error}`
                    };
                }

                return {
                    template: content,
                    source: `file: ${settings.templateFilePath}`
                };
            } catch (error) {
                return {
                    template: '',
                    source: 'file',
                    error: `Error reading template file: ${error.message}`
                };
            }
        } else {
            // Utiliser le template des settings
            const validation = this.validateTemplate(settings.promptTemplate);
            if (!validation.isValid) {
                return {
                    template: '',
                    source: 'settings',
                    error: `Invalid template in settings: ${validation.error}`
                };
            }

            return {
                template: settings.promptTemplate,
                source: 'settings'
            };
        }
    }

    static processTemplate(
        template: string,
        conversationContext: string,
        notesContext: string,
        question: string
    ): string {
        return template
            .replace(/{conversation_context}/g, conversationContext)
            .replace(/{notes_context}/g, notesContext)
            .replace(/{question}/g, question);
    }

    static formatConversationContext(messages: Array<{role: string, content: string}>): string {
        if (messages.length === 0) return '';

        const formatted = messages.map(msg => {
            const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
            return `${role}: ${msg.content}`;
        }).join('\n\n');

        return `CONVERSATION HISTORY:\n${formatted}\n\n`;
    }

    static formatNotesContext(notes: Array<{file: TFile, content: string, similarity: number}>): string {
        if (notes.length === 0) return '';

        const formatted = notes.map((note, index) => {
            const similarity = Math.round(note.similarity * 100);
            return `NOTE ${index + 1} - ${note.file.basename} (${similarity}% pertinence):\n${note.content}`;
        }).join('\n\n---\n\n');

        return `CONTEXT OF THE OBSIDIAN NOTES:\n${formatted}\n\n`;
    }

    static getDefaultTemplate(): string {
        return `{notes_context}{conversation_context}

Q: {question}

A:`;
    }

    static validateTemplate(template: string): { isValid: boolean; error?: string } {
        const requiredPlaceholders = ['{question}'];
        const optionalPlaceholders = ['{conversation_context}', '{notes_context}'];
        const allPlaceholders = [...requiredPlaceholders, ...optionalPlaceholders];

        // Vérifier que le placeholder obligatoire {question} est présent
        if (!template.includes('{question}')) {
            return {
                isValid: false,
                error: 'The placeholder {question} is required.'
            };
        }

        // Vérifier qu'il n'y a pas de placeholders inconnus
        const templatePlaceholders = template.match(/{[^}]+}/g) || [];
        for (const placeholder of templatePlaceholders) {
            if (!allPlaceholders.includes(placeholder)) {
                return {
                    isValid: false,
                    error: `Unknown placeholder: ${placeholder}. Availables placeholders: {question}, {conversation_context}, {notes_context}`
                };
            }
        }

        return { isValid: true };
    }

    static async getAvailableTemplateFiles(): Promise<TFile[]> {
        if (!this.app) return [];

        const markdownFiles = this.app.vault.getMarkdownFiles();
        const templateFiles: TFile[] = [];

        for (const file of markdownFiles) {
            try {
                const content = await this.app.vault.read(file);
                // Vérifier si le fichier contient des placeholders de template
                if (content.includes('{question}')) {
                    templateFiles.push(file);
                }
            } catch (error) {
                // Ignorer les fichiers non lisibles
            }
        }

        return templateFiles;
    }
}
