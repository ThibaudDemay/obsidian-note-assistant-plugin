/*
 * File Name         : ChatMessage.tsx
 * Description       : Chat message component displaying user and assistant messages with markdown support.
 *                     Adding some context like consulted notes (Percentage of similarity, link to note, preview)
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:20:50
 */

import React, { useState } from 'react';
import MarkdownView from 'react-showdown';

import { SimilarNote } from '@/@types';
import { Message } from '@/@types/react/views/Chat';
import { ObsidianIcon } from '@/react/components/shared';
import { usePlugin } from '@/react/contexts';

import styles from './ChatMessage.module.css';

const roleConfig = {
    user: {
        className: styles.userMessage,
        icon: 'user',
        label: 'Vous'
    },
    assistant: {
        className: styles.assistantMessage,
        icon: 'bot',
        label: 'Assistant'
    },
    system: {
        className: styles.systemMessage,
        icon: 'settings',
        label: 'Système'
    }
};

export const ChatMessage: React.FC<{
    message: Message;
    showTimestamps: boolean;
    showNotesUsed: boolean;
}> = ({ message, showTimestamps, showNotesUsed }) => {
    const plugin = usePlugin();
    const [isNotesExpanded, setIsNotesExpanded] = useState(false);

    const handleNoteClick = (note: SimilarNote, e: React.MouseEvent) => {
        e.preventDefault();
        if (plugin?.app.workspace) {
            plugin?.app.workspace.openLinkText(note.key, '', false);
        }
    };

    const config = roleConfig[message.role] || roleConfig.assistant;
    const hasNotes = message.consultedNotes && message.consultedNotes.length > 0;

    return (
        <div className={`${styles.chatMessage} ${config.className}`}>
            <div className={styles.chatAvatar}>
                <ObsidianIcon iconName={config.icon} />
            </div>
            <div className={styles.chatMessageContent}>
                <div className={styles.chatMessageHeader}>
                    <span className={styles.chatRoleLabel}>{config.label}</span>
                    {showTimestamps && (
                        <span className={styles.chatTimestamp}>
                            {message.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    )}
                </div>

                <div className={styles.chatContent}>
                    <MarkdownView markdown={message.content} />
                </div>

                {/* Notes consultées - version simplifiée */}
                {showNotesUsed && hasNotes && (
                    <div className={styles.consultedNotesSection}>
                        <button
                            className={styles.notesToggleButton}
                            onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                        >
                            <ObsidianIcon iconName="file-text" />
                            <span className={styles.notesToggleText}>
                                {message.consultedNotes!.length} note{message.consultedNotes!.length > 1 ? 's' : ''}
                            </span>
                            <ObsidianIcon
                                iconName={isNotesExpanded ? 'chevron-up' : 'chevron-down'}
                            />
                        </button>

                        {isNotesExpanded && (
                            <div className={styles.notesList}>
                                {message.consultedNotes!.map((note, index) => (
                                    <div key={index} className={styles.noteItem}>
                                        <div className={styles.noteMetadata}>
                                            <button
                                                className={styles.noteLink}
                                                onClick={(e) => handleNoteClick(note, e)}
                                                title={`Ouvrir ${note.key}`}
                                            >
                                                <ObsidianIcon iconName="external-link" />
                                                <span className={styles.noteName}>{note.key}</span>
                                            </button>
                                            <span className={styles.noteSimilarity}>
                                                {Math.round(note.similarity * 100)}%
                                            </span>
                                        </div>
                                        <div className={styles.notePreview}>
                                            {note.content.substring(0, 120)}
                                            {note.content.length > 120 && '...'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
