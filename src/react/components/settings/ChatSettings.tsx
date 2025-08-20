import { debounce } from 'obsidian';
import React from 'react';

import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import { Accordion } from './Accordion';
import { SettingItem } from './SettingItem';

export const ChatSettings: React.FC<SettingTabChildProps> =({
    settings,
    onUpdateSettings
}) => {
    const { createToggleAction, createTextAreaAction, createSliderAction } = useSettingItem();
    return (
        <Accordion title="Chat Settings" icon="message-square-more">
            <SettingItem
                name="Prompt template"
                description="Template with placeholders: {conversation_context}, {notes_context}"
                actions={[
                    createTextAreaAction(
                        'Template for system prompt message',
                        settings.chatSystemPrompt,
                        debounce((value) => onUpdateSettings({chatSystemPrompt: value}))
                    )
                ]}
            />
            <SettingItem
                name="Max history length"
                description=""
                actions={[
                    createSliderAction(
                        10, 100,
                        settings.chatPromptMaxHistoryLength,
                        debounce((value) => onUpdateSettings({chatPromptMaxHistoryLength: value}))
                    )
                ]}
            />
            <SettingItem
                name="Show notes used"
                description="Display which notes were used for context"
                actions={[
                    createToggleAction(
                        settings.chatShowNotesUsed,
                        (value) => onUpdateSettings({chatShowNotesUsed: value})
                    )
                ]}
            />
            <SettingItem
                name="Show timestamps"
                description="Display timestamps in chat messages"
                actions={[
                    createToggleAction(
                        settings.chatShowTimestamps,
                        (value) => onUpdateSettings({chatShowTimestamps: value})
                    )
                ]}
            />
        </Accordion>
    );
};
