import React from 'react';

import { ObsidianIcon } from '../shared/ObsidianIcon';
import styles from './ChatControls.module.css';

export const ChatControls: React.FC<{
    selectedModel: string;
    availableModels: {value: string, label: string}[];
    streamEnabled: boolean;
    onModelChange: (model: string) => void;
    onStreamToggle: () => void;
    onRefreshContext: () => void;
    isRefreshing?: boolean;
}> = ({ selectedModel, availableModels, streamEnabled, onModelChange, onStreamToggle, onRefreshContext, isRefreshing = false }) => {
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
                        <input
                            type="checkbox"
                            checked={streamEnabled}
                            onChange={onStreamToggle}
                            className={styles.streamCheckbox}
                        />
                        <span className={styles.streamText}>Stream</span>
                    </label>
                </div>
            </div>
        </div>
    );

};
