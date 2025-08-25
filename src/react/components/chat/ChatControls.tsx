/*
 * File Name         : ChatControls.tsx
 * Description       : Chat controls component for model selection, stream toggle, and context
 *                     refresh.
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:17:09
 */


import React from 'react';

import { DropdownItem } from '@/@types/react/components/settings';
import { ObsidianIcon, ObsidianToggleWithLabel } from '@/react/components/shared';

import styles from './ChatControls.module.css';

export const ChatControls: React.FC<{
    selectedModel: string;
    availableModels: DropdownItem[];
    streamEnabled: boolean;
    onModelChange: (model: string) => void;
    onStreamToggle: () => void;
    onRefreshContext: () => void;
    isRefreshing?: boolean;
}> = ({selectedModel, availableModels, streamEnabled, onModelChange, onStreamToggle, onRefreshContext, isRefreshing = false}) => {
    return (
        <div className={styles.chatControls}>
            <div className={styles.chatControlsLeft}>
                <div className={styles.modelSelector}>
                    <label className={styles.modelLabel}>Modèle :</label>
                    <select
                        className={styles.modelDropdown}
                        value={selectedModel}
                        onChange={(e) => onModelChange(e.target.value)}
                    >
                        {availableModels.map((model) => (
                            <option key={model.value} value={model.value}>
                                {model.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="chat-controls-center">
                <button
                    className={`refresh-button ${isRefreshing ? 'refreshing' : ''}`}
                    onClick={onRefreshContext}
                    disabled={isRefreshing}
                    title="Actualiser le contexte"
                >
                    <span className="refresh-icon"><ObsidianIcon iconName='refresh-cw' /></span>
                    <span className="refresh-text">Refresh context</span>
                </button>
            </div>

            <div className={styles.chatControlsRight}>
                <div className={styles.streamToggle}>
                    <label className={styles.streamLabel}>
                        <ObsidianToggleWithLabel
                            label='Stream'
                            labelPosition='left'
                            checked={streamEnabled}
                            onChange={onStreamToggle}
                        />
                    </label>
                </div>
            </div>
        </div>
    );

};
