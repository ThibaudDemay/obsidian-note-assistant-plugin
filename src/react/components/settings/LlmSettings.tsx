import { debounce } from 'obsidian';
import React from 'react';

import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

import { Accordion } from './Accordion';
import { SettingItem } from './SettingItem';


export const LlmSettings: React.FC<SettingTabChildProps> = ({
    settings,
    onUpdateSettings
}) => {
    const { createTextAction, createSliderAction, createNumberAction } = useSettingItem();

    return (
        <Accordion title="LLM Settings" icon="bot">
            <SettingItem
                name='Temperature'
                description='Temperature is a hyperparameter that controls the randomness of language model output. (0.0 = deterministic, 1.0 = very random)'
                actions={[
                    createSliderAction(
                        0, 1,
                        settings.llmTemperature,
                        debounce((value) => onUpdateSettings({llmTemperature: value})),
                        0.1
                    )
                ]}
            />
            <SettingItem
                name='Top P'
                description='Nucleus sampling: limits token selection to top probability mass (0.0 to 1.0)'
                actions={[
                    createSliderAction(
                        0, 1,
                        settings.llmTopP,
                        debounce((value) => onUpdateSettings({llmTopP: value})),
                        0.1
                    )
                ]}
            />
            <SettingItem
                name='Repeat Penalty'
                description='Reduces repetition in responses (1.0 = no penalty, 2.0 = strong penalty)'
                actions={[
                    createSliderAction(
                        0, 2,
                        settings.llmRepeatPenalty,
                        debounce((value) => onUpdateSettings({llmRepeatPenalty: value})),
                        0.1
                    )
                ]}
            />
            <SettingItem
                name='Max tokens'
                description='Maximum number of tokens in the response'
                actions={[
                    createNumberAction(
                        '2048',
                        settings.llmMaxTokens,
                        debounce((value) => onUpdateSettings({llmMaxTokens: value})),
                        0
                    )
                ]}
            />
            <SettingItem
                name='Keep Alive'
                description='Controls how long the model will stay loaded into memory following the request'
                actions={[
                    createTextAction(
                        '5',
                        settings.llmModelKeepAlive,
                        debounce((value) => onUpdateSettings({llmModelKeepAlive: value})),
                    )
                ]}
            />
        </Accordion>
    );
};
