/*
 * File Name         : OllamaChatView.tsx
 * Description       : Ollama chat view component
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:21:53
 */

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
