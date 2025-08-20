import { debounce } from 'obsidian';
import React from 'react';

import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import { Accordion } from './Accordion';
import { SettingItem } from './SettingItem';

export const EmbeddingSettings: React.FC<SettingTabChildProps> =({
    settings,
    onUpdateSettings
}) => {
    const { createToggleAction, createTextAction, createTextAreaAction, createSliderAction } = useSettingItem();
    return (
        <Accordion title="Embedding Settings" icon="library-big">
            <SettingItem
                name="Filter embedding models"
                description="Only show models optimized for embeddings (BERT, sentence-transformers, etc.)"
                actions={[
                    createToggleAction(
                        settings.embeddingFilterModels,
                        debounce((value) => onUpdateSettings({embeddingFilterModels: value}))
                    )
                ]}
            />
            <SettingItem
                name="Keep Alive"
                description="Controls how long the model will stay loaded into memory following the request"
                actions={[
                    createTextAction(
                        '5m',
                        settings.embeddingModelKeepAlive,
                        debounce((value) => onUpdateSettings({embeddingModelKeepAlive: value}))
                    )
                ]}
            />
            <SettingItem
                name="Ignored folders"
                description="Folders to ignore when generating embeddings (separated by commas)"
                actions={[
                    createTextAreaAction(
                        '.obsidian, _templates',
                        settings.embeddingIgnoredFolders.join(', '),
                        debounce((value) => onUpdateSettings({embeddingIgnoredFolders: value.split(',').map(f => f.trim()).filter(f => f)}))
                    )
                ]}
            />
            <SettingItem
                name="Maximum number of relevant notes"
                description="Maximum number of notes to include in the context"
                actions={[
                    createSliderAction(
                        0, 20,
                        settings.embeddingMaxRelevantNotes,
                        debounce((value) => onUpdateSettings({embeddingMaxRelevantNotes: value}))
                    )
                ]}
            />
        </Accordion>
    );
};
