/*
 * File Name         : useSettings.ts
 * Description       : Hook to manage global settings state and updates
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:10:29
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:07:40
 */

import { useEffect, useState } from 'react';

import { NoteAssistantPluginSettings } from '@/@types';
import { usePlugin } from '@/react/contexts';

// État global des settings
let globalSettings: NoteAssistantPluginSettings | null = null;
let listeners = new Set<(settings: NoteAssistantPluginSettings) => void>();

export const useSettings = () => {
    const plugin = usePlugin();

    // Initialiser globalSettings avec les settings du plugin si pas encore fait
    if (!globalSettings && plugin) {
        globalSettings = { ...plugin.settings };
    }

    const [settings, setStateSettings] = useState<NoteAssistantPluginSettings>(
        globalSettings || plugin?.settings || {} as NoteAssistantPluginSettings
    );

    useEffect(() => {
        const updateLocal = (newSettings: NoteAssistantPluginSettings) => {
            setStateSettings(newSettings);
        };

        listeners.add(updateLocal);
        return () => {
            listeners.delete(updateLocal);
        };
    }, []);

    const updateSettings = async (newSettings: Partial<NoteAssistantPluginSettings>) => {
        if (!plugin) return;

        // Mettre à jour l'état global
        globalSettings = { ...globalSettings!, ...newSettings };

        // Mettre à jour les settings du plugin
        plugin.settings = globalSettings;

        // Sauvegarder de manière asynchrone
        await plugin.saveSettings();

        // Notifier tous les listeners (tous les composants qui utilisent useSettings)
        listeners.forEach(listener => listener(globalSettings!));
    };

    return {
        settings,
        updateSettings
    };
};
