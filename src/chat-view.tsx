// chat-view.ts
import {ItemView, WorkspaceLeaf} from 'obsidian';
import {createRoot, Root} from 'react-dom/client';

import NoteAssistantPlugin from '@/main';
import {PluginContext} from '@/react/contexts';
import {Chat} from '@/react/views/Chat';


export const VIEW_TYPE_OLLAMA_CHAT = 'note-assistant-chat-view';

export class OllamaChatView extends ItemView {
    plugin: NoteAssistantPlugin;
    private reactRoot: Root;

    constructor(leaf: WorkspaceLeaf, plugin: NoteAssistantPlugin) {
        super(leaf);
        this.plugin = plugin;
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
