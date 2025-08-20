import React from 'react';

import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import { Accordion } from './Accordion';
import { SettingItem } from './SettingItem';

export const ChatSettings: React.FC<SettingTabChildProps> =({
    settings,
    onUpdateSettings
}) => {
    const { createToggleAction } = useSettingItem();
    return (
        <Accordion title="Chat Settings" icon="message-square-more">
            <SettingItem
                name="Show notes used"
                description="Display which notes were used for context"
                actions={[
                    createToggleAction(
                        settings.showNotesUsed,
                        (value) => onUpdateSettings({showNotesUsed: value})
                    )
                ]}
            />
            <SettingItem
                name="Show timestamps"
                description="Display timestamps in chat messages"
                actions={[
                    createToggleAction(
                        settings.showTimestamps,
                        (value) => onUpdateSettings({showTimestamps: value})
                    )
                ]}
            />
        </Accordion>
    );
};
