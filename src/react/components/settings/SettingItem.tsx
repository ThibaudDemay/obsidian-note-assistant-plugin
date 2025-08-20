import React, { useEffect, useState } from 'react';

import { TextAction, DropdownAction, ExtraButtonAction, SettingItemAction,  SettingItemProps, NumberInputAction, ToggleAction, TextAreaAction, SliderAction } from '@/@types/react/components/settings/SettingItem';
import { ObsidianIcon } from '@/react/components/shared/ObsidianIcon';

/*
** This files use styles from obsidian :
** clickable-icon, dropdown, extra-setting-button, setting-item,
** setting-item-control, setting-item-description, setting-item-info,
** setting-item-name, setting-text-input
*/

const ExtraButton: React.FC<{ action: ExtraButtonAction }> = ({ action }) => {
    return (
        <button
            className="clickable-icon extra-setting-button"
            aria-label={action.tooltip}
            title={action.tooltip}
            onClick={action.onClick}
            disabled={action.disabled}
        >
            <ObsidianIcon iconName={action.icon} />
        </button>
    );
};

const TextInput: React.FC<{ action: TextAction }> = ({ action }) => {
    const [value, setValue] = useState(action.value || '');

    useEffect(() => {
        setValue(action.value || '');
    }, [action.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (action.onChange) {
            action.onChange(newValue);
        }
    };

    return (
        <input
            type="text"
            placeholder={action.placeholder}
            value={value}
            onChange={handleChange}
            className="setting-text-input"
        />
    );
};

const NumberInput: React.FC<{ action: NumberInputAction }> = ({ action }) => {
    const [value, setValue] = useState(action.value || 0);

    useEffect(() => {
        setValue(action.value || 0);
    }, [action.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value) || 0;
        setValue(newValue);
        if (action.onChange) {
            action.onChange(newValue);
        }
    };

    return (
        <input
            type="number"
            placeholder={action.placeholder}
            value={value}
            onChange={handleChange}
            min={action.min}
            max={action.max}
            step={action.step}
            className="setting-text-input"
            disabled={action.disabled}
        />
    );
};

const Dropdown: React.FC<{ action: DropdownAction }> = ({ action }) => {
    // Utiliser optionsState si fourni, sinon fallback sur useState local
    const [localOptions, setLocalOptions] = useState(action.options || []);
    const [options, setOptions] = action.optionsState || [localOptions, setLocalOptions];

    const [value, setValue] = useState(action.value || '');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (action.asyncOptions && !action.optionsState) {
            setLoading(true);
            setOptions([{ value: '', label: 'Loading...' }]);

            action.asyncOptions().then(asyncOptions => {
                setOptions(asyncOptions);
                setLoading(false);
            }).catch(error => {
                console.error('Error loading dropdown options:', error);
                setOptions([{ value: '', label: 'Error loading options' }]);
                setLoading(false);
            });
        }
    }, [action.asyncOptions, action.optionsState]);

    useEffect(() => {
        setValue(action.value || '');
    }, [action.value]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (action.onChange && !loading) {
            action.onChange(newValue);
        }
    };

    return (
        <select
            value={value}
            onChange={handleChange}
            className="dropdown"
            disabled={loading}
        >
            {options.map((option, index) => (
                <option key={index} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
};

const Toggle: React.FC<{ action: ToggleAction }> = ({ action }) => {
    const [checked, setChecked] = useState(action.value || false);

    useEffect(() => {
        setChecked(action.value || false);
    }, [action.value]);

    const handleChange = (e: React.MouseEvent<HTMLDivElement>) => {
        const newValue = !checked;
        setChecked(newValue);
        if (action.onChange) {
            action.onChange(newValue);
        }
    };

    return (
        <div className={`checkbox-container ${checked ? 'is-enabled': ''}`} onClick={handleChange}>
            <input
                type="checkbox"
                disabled={action.disabled}
            />
        </div>
    );
};

const TextArea: React.FC<{ action: TextAreaAction }> = ({ action }) => {
    const [value, setValue] = useState(action.value || '');

    useEffect(() => {
        setValue(action.value || '');
    }, [action.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        if (action.onChange) {
            action.onChange(newValue);
        }
    };

    const textAreaStyle: React.CSSProperties = {
        resize: action.resize || 'vertical',
        fontFamily: 'inherit',
        fontSize: 'inherit'
    };

    return (
        <textarea
            placeholder={action.placeholder}
            value={value}
            onChange={handleChange}
            rows={action.rows || 3}
            cols={action.cols}
            maxLength={action.maxLength}
            disabled={action.disabled}
            className="setting-text-input"
            style={textAreaStyle}
        />
    );
};

const Slider: React.FC<{ action: SliderAction }> = ({ action }) => {
    const [value, setValue] = useState(action.value || action.min);

    useEffect(() => {
        setValue(action.value || action.min);
    }, [action.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = parseFloat(e.target.value);
        setValue(newValue);
        if (action.onChange) {
            action.onChange(newValue);
        }
    };

    const formatDisplayValue = (val: number): string => {
        if (action.formatValue) {
            return action.formatValue(val);
        }
        return `${val}${action.unit || ''}`;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
            <input
                type="range"
                min={action.min}
                max={action.max}
                step={action.step || 1}
                value={value}
                onChange={handleChange}
                disabled={action.disabled}
                className="slider"
                style={{ flex: 1 }}
            />
            {action.showValue !== false && (
                <span
                    style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        minWidth: '40px',
                        textAlign: 'right',
                        fontFamily: 'monospace'
                    }}
                >
                    {formatDisplayValue(value)}
                </span>
            )}
        </div>
    );
};

export const SettingItem: React.FC<SettingItemProps> = ({
    name,
    description,
    actions,
    className = ''
}) => {
    // Séparer les boutons extra des autres actions
    const extraButtons = actions.filter(action => action.type === 'extraButton') as ExtraButtonAction[];
    const otherActions = actions.filter(action => action.type !== 'extraButton');

    const renderAction = (action: SettingItemAction, index: number) => {
        switch (action.type) {
        case 'text':
            return <TextInput key={index} action={action as TextAction} />;
        case 'number':
            return <NumberInput key={index} action={action as NumberInputAction} />;
        case 'dropdown':
            return <Dropdown key={index} action={action as DropdownAction} />;
        case 'toggle':
            return <Toggle key={index} action={action as ToggleAction} />;
        case 'textarea':
            return <TextArea key={index} action={action as TextAreaAction} />;
        case 'slider':
            return <Slider key={index} action={action as SliderAction} />;
        default:
            return null;
        }
    };

    return (
        <div className={`setting-item ${className}`}>
            <div className="setting-item-info">
                <div className="setting-item-name">{name}</div>
                <div className="setting-item-description">{description}</div>
            </div>

            <div className="setting-item-control">
                {/* Boutons extra à gauche */}
                {extraButtons.length > 0 &&
            extraButtons.map((button, index) => (
                <ExtraButton key={index} action={button} />
            ))
                }

                {/* Autres actions (text, dropdown) */}
                {otherActions.map((action, index) => renderAction(action, index))}
            </div>
        </div>
    );
};
