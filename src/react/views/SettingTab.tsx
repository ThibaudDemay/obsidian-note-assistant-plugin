import { NoteAssistantPluginSettings } from '@/@types';
import {
    ChatSettings,
    EmbeddingSettings,
    GeneralSettings,
    GlobalStatus,
    LlmSettings
} from '@/react/components/settings';
import { useSettings } from '@/react/hooks/useSettings';

export interface SettingTabChildProps {
    settings: NoteAssistantPluginSettings;
    onUpdateSettings: (updates: Partial<NoteAssistantPluginSettings>) => void;
    className?: string;
}

export const SettingTab = () => {
    const { settings, updateSettings } = useSettings();

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
