import { useCallback, useState } from 'react';

import { NoteAssistantPluginSettings } from '@/@types';
import {
    ChatSettings,
    EmbeddingSettings,
    GeneralSettings,
    GlobalStatus,
    LlmSettings
} from '@/react/components/settings';
import { usePlugin } from '@/react/contexts';

export interface SettingTabChildProps {
    settings: NoteAssistantPluginSettings;
    onUpdateSettings: (updates: Partial<NoteAssistantPluginSettings>) => void;
    className?: string;
}

export const SettingTab = () => {
    const plugin = usePlugin();

    const [settings, setSettings] = useState(plugin!.settings);

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

    return (
        <div>
            <h2>Note Assistant Settings</h2>
            <GlobalStatus settings={settings} onUpdateSettings={updateSettings} />
            <GeneralSettings settings={settings} onUpdateSettings={updateSettings} />
            <LlmSettings settings={settings} onUpdateSettings={updateSettings} />
            <EmbeddingSettings settings={settings} onUpdateSettings={updateSettings} />
            <ChatSettings settings={settings} onUpdateSettings={updateSettings} />
        </div>
    );
};
