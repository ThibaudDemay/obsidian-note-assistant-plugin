import React from 'react';

import { TextAction, DropdownAction, ExtraButtonAction, NumberInputAction, ToggleAction, TextAreaAction, SliderAction } from '@/@types/react/components/settings/SettingItem';

export const useSettingItem = () => {
    const createTextAction = (
        placeholder?: string,
        value?: string,
        onChange?: (value: string) => void
    ): TextAction => ({
        type: 'text',
        placeholder,
        value,
        onChange
    });

    const createNumberAction = (
        placeholder?: string,
        value?: number,
        onChange?: (value: number) => void,
        min?: number,
        max?: number,
        step?: number,
        disabled?: boolean
    ): NumberInputAction => ({
        type: 'number',
        placeholder,
        value,
        onChange,
        min,
        max,
        step,
        disabled
    });

    const createDropdownAction = (
        options: Array<{ value: string; label: string }> | [Array<{ value: string; label: string }>, React.Dispatch<React.SetStateAction<Array<{ value: string; label: string }>>>],
        value?: string,
        onChange?: (value: string) => void,
        asyncOptions?: () => Promise<Array<{ value: string; label: string }>>
    ): DropdownAction => {
    // Vérifier si options est un useState tuple
        if (Array.isArray(options) && options.length === 2 && typeof options[1] === 'function') {
            return {
                type: 'dropdown',
                // options[0] is the data
                options: options[0] as Array<{value: string; label: string;}>,
                optionsState: options as [Array<{ value: string; label: string }>, React.Dispatch<React.SetStateAction<Array<{ value: string; label: string }>>>],
                value,
                onChange,
                asyncOptions
            };
        }

        // Sinon, c'est un array normal
        return {
            type: 'dropdown',
            options: options as Array<{ value: string; label: string }>,
            value,
            onChange,
            asyncOptions
        };
    };

    const createToggleAction = (
        value?: boolean,
        onChange?: (value: boolean) => void,
        disabled?: boolean
    ): ToggleAction => ({
        type: 'toggle',
        value,
        onChange,
        disabled
    });

    const createTextAreaAction = (
        placeholder?: string,
        value?: string,
        onChange?: (value: string) => void,
        rows?: number,
        cols?: number,
        maxLength?: number,
        disabled?: boolean,
        resize?: 'none' | 'both' | 'horizontal' | 'vertical'
    ): TextAreaAction => ({
        type: 'textarea',
        placeholder,
        value,
        onChange,
        rows,
        cols,
        maxLength,
        disabled,
        resize
    });

    const createSliderAction = (
        min: number,
        max: number,
        value?: number,
        onChange?: (value: number) => void,
        step?: number,
        disabled?: boolean,
        showValue?: boolean,
        unit?: string,
        formatValue?: (value: number) => string
    ): SliderAction => ({
        type: 'slider',
        min,
        max,
        step,
        value,
        onChange,
        disabled,
        showValue,
        unit,
        formatValue
    });

    const createExtraButtonAction = (
        icon: string,
        tooltip?: string,
        onClick?: () => void
    ): ExtraButtonAction => ({
        type: 'extraButton',
        icon,
        tooltip,
        onClick
    });

    return {
        createTextAction,
        createNumberAction,
        createDropdownAction,
        createToggleAction,
        createTextAreaAction,
        createSliderAction,
        createExtraButtonAction
    };
};
