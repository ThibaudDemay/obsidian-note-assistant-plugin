/*
 * File Name         : SettingTab.tsx
 * Description       : Settings tab view component
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:10:29
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:11:41
 */

import {
    ChatSettings,
    EmbeddingSettings,
    GeneralSettings,
    GlobalStatus,
    LlmSettings
} from '@/react/components/settings';
import { useSettings } from '@/react/hooks/useSettings';

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
