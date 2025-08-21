import React from 'react';

import {
    ObsidianToggleGroup,
    ObsidianToggleWithLabel
} from '@/react/components/shared';

import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
    showTimestamps: boolean;
    onToggleShowTimestamps: () => void;
    showNotes: boolean;
    onToggleShowNotes: () => void;
}


export const ChatHeader: React.FC<ChatHeaderProps> = ({
    showTimestamps,
    onToggleShowTimestamps,
    showNotes,
    onToggleShowNotes
}) => {
    return (
        <div className={styles.chatHeader}>
            <div className={styles.chatTitleContainer}>
                <h3 className={styles.chatTitle}>Chat</h3>
            </div>
            <ObsidianToggleGroup>
                <ObsidianToggleWithLabel
                    label='Timestamp'
                    labelPosition='left'
                    checked={showTimestamps}
                    onChange={onToggleShowTimestamps}
                />
                <ObsidianToggleWithLabel
                    label='Notes'
                    labelPosition='left'
                    checked={showNotes}
                    onChange={onToggleShowNotes}
                />
            </ObsidianToggleGroup>
        </div>
    );
};
