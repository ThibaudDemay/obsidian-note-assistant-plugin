import React from 'react';

import { ObsidianIcon } from '../shared/ObsidianIcon';
import styles from './ChatHeader.module.css';

export const ChatHeader: React.FC<{
    showTimestamps: boolean;
    onToggleTimestamps: () => void;
}> = ({ showTimestamps, onToggleTimestamps }) => {
    return (
        <div className={styles.chatHeader}>
            <div className={styles.chatTitleContainer}>
                <h3 className={styles.chatTitle}>Chat</h3>
            </div>
            <button
                className={`${styles.chatTimestampToggle} ${showTimestamps ? 'active' : ''}`}
                onClick={onToggleTimestamps}
                title={showTimestamps ? 'Masquer les horodatages' : 'Afficher les horodatages'}
            >
                <ObsidianIcon iconName='clock' />
            </button>
        </div>
    );
};
