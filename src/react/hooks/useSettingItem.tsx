/*
 * File Name         : useSettingItem.tsx
 * Description       : Setting item hook to create setting items actions easily
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:07:11
 */

import React from 'react';

import {
    DropdownAction,
    DropdownItem,
    ExtraButtonAction,
    NumberInputAction,
    SliderAction,
    TextAction,
    TextAreaAction,
    ToggleAction
} from '@/@types/react/components/settings';

export const useSettingItem = () => {
    const createTextAction = (
        placeholder?: string,
        value?: string,
        onChange?: (value: string) => void,
        fullWidth?: boolean
    ): TextAction => ({
        type: 'text',
        placeholder,
        value,
        onChange,
        fullWidth
    });

    const createNumberAction = (
        placeholder?: string,
        value?: number,
        onChange?: (value: number) => void,
        min?: number,
        max?: number,
        step?: number,
        disabled?: boolean,
        fullWidth?: boolean
    ): NumberInputAction => ({
        type: 'number',
        placeholder,
        value,
        onChange,
        min,
        max,
        step,
        disabled,
        fullWidth
    });

    const createDropdownAction = (
        options: Array<DropdownItem> | [Array<DropdownItem>, React.Dispatch<React.SetStateAction<Array<DropdownItem>>>],
        value?: string,
        onChange?: (value: string) => void,
        asyncOptions?: () => Promise<Array<DropdownItem>>,
        fullWidth?: boolean
    ): DropdownAction => {
        // Vérifier si options est un useState tuple
        if (Array.isArray(options) && options.length === 2 && typeof options[1] === 'function') {
            return {
                type: 'dropdown',
                // options[0] is the data
                options: options[0] as Array<DropdownItem>,
                optionsState: options as [Array<DropdownItem>, React.Dispatch<React.SetStateAction<Array<DropdownItem>>>],
                value,
                onChange,
                asyncOptions,
                fullWidth
            };
        }

        // Sinon, c'est un array normal
        return {
            type: 'dropdown',
            options: options as Array<DropdownItem>,
            value,
            onChange,
            asyncOptions,
            fullWidth
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
        // Note: Toggle n'a pas besoin de fullWidth car il reste toujours petit
    });

    const createTextAreaAction = (
        config: {
            placeholder?: string;
            value?: string;
            onChange?: (value: string) => void;
            rows?: number;
            cols?: number;
            maxLength?: number;
            disabled?: boolean;
            resize?: 'none' | 'both' | 'horizontal' | 'vertical';
            fullWidth?: boolean;
        } = {}
    ): TextAreaAction => ({
        type: 'textarea',
        placeholder: config.placeholder,
        value: config.value,
        onChange: config.onChange,
        rows: config.rows,
        cols: config.cols,
        maxLength: config.maxLength,
        disabled: config.disabled,
        resize: config.resize,
        fullWidth: config.fullWidth
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
        formatValue?: (value: number) => string,
        fullWidth?: boolean
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
        formatValue,
        fullWidth
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
