import { createContext, useContext } from 'react';

import NoteAssistantPlugin from '@/main';

export const PluginContext = createContext<NoteAssistantPlugin | undefined>(undefined);

export const usePlugin = (): NoteAssistantPlugin | undefined => {
    return useContext(PluginContext);
};
