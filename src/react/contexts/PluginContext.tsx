/*
 * File Name         : PluginContext.tsx
 * Description       : Plugin context to provide Obsidian plugin instance in React components
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 20/08/2025 21:59:38
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:02:22
 */

import { createContext, useContext } from 'react';

import NoteAssistantPlugin from '@/main';

export const PluginContext = createContext<NoteAssistantPlugin | undefined>(undefined);

export const usePlugin = (): NoteAssistantPlugin | undefined => {
    return useContext(PluginContext);
};
