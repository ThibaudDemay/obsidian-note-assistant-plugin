import { debounce } from 'obsidian';
import React from 'react';

import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import { Accordion } from './Accordion';
import { SettingItem } from './SettingItem';

export const PromptingSettings: React.FC<SettingTabChildProps> = ({
    settings,
    onUpdateSettings
}) => {
    const { createDropdownAction, createTextAction, createTextAreaAction, createSliderAction } = useSettingItem();
    return (
        <Accordion title="Prompting Settings" icon="notebook-pen">
            <SettingItem
                name="Template source"
                description="Choose where to store your prompt template"
                actions={[
                    createDropdownAction(
                        [
                            {value: 'settings', label: 'Store in settings'},
                            {value: 'file', label: 'Use file in vault'}
                        ],
                        settings.systemPromptTemplateSource,
                        debounce((value: 'settings'|'file') => onUpdateSettings({systemPromptTemplateSource: value}))
                    )
                ]}
            />
            {settings.systemPromptTemplateSource === 'settings' &&
                <SettingItem
                    name="Prompt template"
                    description="Template with placeholders: {conversation_context}, {notes_context}"
                    actions={[
                        createTextAreaAction(
                            'Template for system prompt message',
                            settings.systemPromptTemplate,
                            debounce((value) => onUpdateSettings({systemPromptTemplate: value}))
                        )
                    ]}
                />
            }
            {settings.systemPromptTemplateSource === 'file' &&
                <SettingItem
                    name="Prompt template file path"
                    description="File path to template with placeholders: {conversation_context}, {notes_context}"
                    actions={[
                        createTextAction(
                            'Template file path',
                            settings.systemPromptTemplateFilePath,
                            debounce((value) => onUpdateSettings({systemPromptTemplateFilePath: value}))
                        )
                    ]}
                />
            }
            <SettingItem
                name="Max history length"
                description=""
                actions={[
                    createSliderAction(
                        10, 100,
                        settings.systemPromptMaxHistoryLength,
                        debounce((value) => onUpdateSettings({systemPromptMaxHistoryLength: value}))
                    )
                ]}
            />
        </Accordion>
    );
};
