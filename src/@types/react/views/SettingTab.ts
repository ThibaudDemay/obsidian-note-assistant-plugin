/*
 * File Name         : SettingTab.ts
 * Description       : Props for setting tab components for settings items
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 21:10:22
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:11:05
 */

import { NoteAssistantPluginSettings } from '@/@types/settings';

export interface SettingTabChildProps {
    settings: NoteAssistantPluginSettings;
    onUpdateSettings: (updates: Partial<NoteAssistantPluginSettings>) => void;
    className?: string;
}
