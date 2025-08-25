/*
 * File Name         : ObsidianToggle.tsx
 * Description       : Obsidian styled toggle component
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:01:14
 */

import React, { useState } from 'react';

import styles from './ObsidianToggle.module.css';

// Interface pour les props du toggle
interface ObsidianToggleProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    variant?: 'checkbox' | 'switch';
    className?: string;
    id?: string;
    'aria-label'?: string;
}

// Interface pour les props du setting
interface ObsidianSettingProps {
    name: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

// Composant Toggle principal
export const ObsidianToggle: React.FC<ObsidianToggleProps> = ({
    checked = false,
    onChange,
    disabled = false,
    size = 'medium',
    variant = 'switch',
    className = '',
    id,
    'aria-label': ariaLabel,
    ...props
}) => {
    const [internalChecked, setInternalChecked] = useState(checked);

    // Utilise l'état interne si pas de onChange fourni
    const isChecked = onChange ? checked : internalChecked;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newChecked = event.target.checked;

        if (onChange) {
            onChange(newChecked);
        } else {
            setInternalChecked(newChecked);
        }
    };

    // Construction des classes avec CSS Modules
    const toggleClasses = [
        styles.toggle,
        styles[variant],
        styles[size],
        className
    ].filter(Boolean).join(' ');

    const wrapperClasses = [
        styles.wrapper,
        disabled && styles.disabled
    ].filter(Boolean).join(' ');

    return (
        <div className={wrapperClasses}>
            <input
                type="checkbox"
                className={toggleClasses}
                checked={isChecked}
                onChange={handleChange}
                disabled={disabled}
                id={id}
                aria-label={ariaLabel}
                {...props}
            />
            {variant === 'switch' && <span className={styles.slider} />}
        </div>
    );
};

// Composant Setting avec toggle intégré (comme dans Obsidian)
export const ObsidianSetting: React.FC<ObsidianSettingProps> = ({
    name,
    description,
    children,
    className = ''
}) => {
    const settingClasses = [styles.settingItem, className].filter(Boolean).join(' ');

    return (
        <div className={settingClasses}>
            <div className={styles.settingInfo}>
                <div className={styles.settingName}>{name}</div>
                {description && (
                    <div className={styles.settingDescription}>{description}</div>
                )}
            </div>
            <div className={styles.settingControl}>
                {children}
            </div>
        </div>
    );
};

// Hook personnalisé pour gérer les toggles
export const useObsidianToggle = (initialValue: boolean = false) => {
    const [checked, setChecked] = useState(initialValue);

    const toggle = () => setChecked(!checked);
    const setValue = (value: boolean) => setChecked(value);

    return {
        checked,
        setChecked: setValue,
        toggle,
        onChange: setChecked
    };
};

// Composant de groupe pour plusieurs toggles
export const ObsidianToggleGroup: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => {
    const groupClasses = [styles.toggleGroup, className].filter(Boolean).join(' ');

    return (
        <div className={groupClasses}>
            {children}
        </div>
    );
};

// Composant avec label intégré
export const ObsidianToggleWithLabel: React.FC<ObsidianToggleProps & {
    label: string;
    labelPosition?: 'left' | 'right';
}> = ({ label, labelPosition = 'right', id, ...toggleProps }) => {
    const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

    const labelClasses = [
        styles.toggleLabel,
        labelPosition === 'left' && styles.labelLeft
    ].filter(Boolean).join(' ');

    return (
        <div className={styles.toggleWithLabel}>
            {labelPosition === 'left' && (
                <label htmlFor={toggleId} className={labelClasses}>
                    {label}
                </label>
            )}
            <ObsidianToggle
                {...toggleProps}
                id={toggleId}
                aria-label={toggleProps['aria-label'] || label}
            />
            {labelPosition === 'right' && (
                <label htmlFor={toggleId} className={labelClasses}>
                    {label}
                </label>
            )}
        </div>
    );
};
