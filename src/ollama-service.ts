import { NoteAssistantPluginSettings } from './settings';

export class OllamaService {
    private settings: NoteAssistantPluginSettings;

    constructor(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    updateSettings(settings: NoteAssistantPluginSettings) {
        this.settings = settings;
    }

    async chat(messages: Array<{role: string, content: string}>): Promise<string> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.llmTimeout);

        try {
            const response = await fetch(`${this.settings.ollamaBaseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: this.settings.ollamaModel,
                    messages: messages,
                    stream: false,
                    options: {
                        temperature: this.settings.llmTemperature,
                        top_p: this.settings.llmTopP,
                        repeat_penalty: this.settings.llmRepeatPenalty,
                        num_predict: this.settings.llmMaxTokens
                    }
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Erreur Ollama: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return data.message.content;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout after ${this.settings.llmTimeout}ms`);
            }
            throw error;
        }
    }

    // ✅ CHANGEMENT : Support du streaming (optionnel pour plus tard)
    async chatStream(
        messages: Array<{role: string, content: string}>,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        if (!this.settings.llmStream) {
            // Fallback to regular chat
            const response = await this.chat(messages);
            onChunk(response);
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.settings.llmTimeout);

        try {
            const response = await fetch(`${this.settings.ollamaBaseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    model: this.settings.ollamaModel,
                    messages: messages,
                    stream: true,
                    options: {
                        temperature: this.settings.llmTemperature,
                        top_p: this.settings.llmTopP,
                        repeat_penalty: this.settings.llmRepeatPenalty,
                        num_predict: this.settings.llmMaxTokens
                    }
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
            }

            const reader = response.body?.getReader();
            if (!reader) throw new Error('Unable to read the stream response');

            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.message?.content) {
                            onChunk(data.message.content);
                        }
                    } catch (e) {
                        // Ignorer les lignes malformées
                    }
                }
            }
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`Timeout after ${this.settings.llmTimeout}ms`);
            }
            throw error;
        }
    }

    // Reste identique...
    async testConnection(): Promise<boolean> {
        try {
            const response = await fetch(`${this.settings.ollamaBaseUrl}/api/tags`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getAvailableModels(): Promise<string[]> {
        try {
            const response = await fetch(`${this.settings.ollamaBaseUrl}/api/tags`);
            if (!response.ok) return [];

            const data = await response.json();
            return data.models?.map((model: any) => model.name) || [];
        } catch (error) {
            return [];
        }
    }
}
