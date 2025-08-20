import React from 'react';

export interface BaseAction {
  type: string;
}

export interface ExtraButtonAction extends BaseAction {
  type: 'extraButton';
  icon: string;
  tooltip?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export interface DropdownAction extends BaseAction {
  type: 'dropdown';
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  asyncOptions?: () => Promise<Array<{ value: string; label: string }>>;
  optionsState?: [Array<{ value: string; label: string }>, React.Dispatch<React.SetStateAction<Array<{ value: string; label: string }>>>];
  disabled?: boolean;
}

export interface NumberInputAction extends BaseAction {
  type: 'number';
  placeholder?: string;
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export interface SliderAction extends BaseAction {
  type: 'slider';
  min: number;
  max: number;
  step?: number;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string; // Ex: "px", "%", "ms", etc.
  formatValue?: (value: number) => string; // Fonction personnalisée pour formater l'affichage
}

export interface TextAction extends BaseAction {
  type: 'text';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export interface TextAreaAction extends BaseAction {
  type: 'textarea';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  cols?: number;
  maxLength?: number;
  disabled?: boolean;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export interface ToggleAction extends BaseAction {
  type: 'toggle';
  value?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export type SettingItemAction = ExtraButtonAction | DropdownAction | NumberInputAction | SliderAction | TextAction | TextAreaAction | ToggleAction

export interface SettingItemProps {
  name: string;
  description: string;
  actions: SettingItemAction[];
  className?: string;
}
