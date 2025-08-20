// chat-view.ts
import { ItemView, WorkspaceLeaf } from 'obsidian';
import { Root, createRoot } from 'react-dom/client';
import { Converter } from 'showdown';

import NoteAssistantPlugin from '@/main';
import { PluginContext } from '@/react/contexts';
import { Chat } from '@/react/views/Chat';


export const VIEW_TYPE_OLLAMA_CHAT = 'note-assistant-chat-view';

export class OllamaChatView extends ItemView {
    plugin: NoteAssistantPlugin;
    mdConverter: Converter;
    private reactRoot: Root;

    constructor(leaf: WorkspaceLeaf, plugin: NoteAssistantPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.mdConverter = new Converter();
        this.reactRoot = createRoot(this.containerEl);
    }

    getViewType() {
        return VIEW_TYPE_OLLAMA_CHAT;
    }

    getDisplayText() {
        return 'Note assistant';
    }

    getIcon() {
        return 'brain';
    }

    async onOpen() {
        this.reactRoot.render(
            <PluginContext.Provider value={this.plugin}>
                <Chat />
            </PluginContext.Provider>
        );
    }


    async onClose() {
    // Cleanup si nécessaire
    }
}
