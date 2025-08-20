import { useCallback, useState } from 'react';

import { NoteAssistantPluginSettings } from '@/@types';
import { GeneralSettings } from '@/react/components/settings/GeneralSettings';
import { GlobalStatus } from '@/react/components/settings/GlobalStatus';
import { usePlugin } from '@/react/contexts';

import { ChatSettings } from '../components/settings/ChatSettings';
import { EmbeddingSettings } from '../components/settings/EmbeddingSettings';
import { LlmSettings } from '../components/settings/LlmSettings';
import { PromptingSettings } from '../components/settings/PromptingSettings';

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
            <PromptingSettings settings={settings} onUpdateSettings={updateSettings} />
            <ChatSettings settings={settings} onUpdateSettings={updateSettings} />
        </div>
    );
};
