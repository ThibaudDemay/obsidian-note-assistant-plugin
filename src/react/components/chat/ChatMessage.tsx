import React from 'react';
import MarkdownView from 'react-showdown';

import { SimilarNote } from '@/@types';
import { Message } from '@/@types/react/views/Chat';
import { usePlugin } from '@/react/contexts';

import { ObsidianIcon } from '../shared/ObsidianIcon';
import styles from './ChatMessage.module.css';

const roleClasses = {
    user: styles.userMessage,
    assistant: styles.assistantMessage,
    system: styles.systemMessage
};

export const ChatMessage: React.FC<{
    message: Message;
    showTimestamps: boolean;
    showNotesUsed: boolean;
}> = ({ message, showTimestamps, showNotesUsed }) => {
    const plugin = usePlugin();

    const handleNoteClick = (note: SimilarNote, e: React.MouseEvent) => {
        e.preventDefault();
        if (plugin?.app.workspace) {
            plugin?.app.workspace.openLinkText(note.key, '', false);
        }
    };

    return (
        <div className={`${styles.chatMessage} ${roleClasses[message.role] || ''}`}>
            <div className={styles.chatAvatar}>
                {
                    {
                        'user': <ObsidianIcon iconName='user' /> ,
                        'assistant': <ObsidianIcon iconName='bot' />,
                        'system': <ObsidianIcon iconName='laptop' />
                    }[message.role]
                }
            </div>
            <div className={styles.chatMessageContent}>
                <div className={styles.chatContent}>
                    <MarkdownView markdown={message.content} />
                </div>
                {/* Contexte des notes pour les messages de l'assistant */}
                {showNotesUsed && message.role === 'assistant' && message.consultedNotes && message.consultedNotes.length > 0 && (
                    <div className={styles.chatMessageContext}>
                        <span className={styles.chatContextIcon}><ObsidianIcon iconName='library-big' /></span>
                        <span className={styles.chatContextText}>Notes consultées : </span>
                        {message.consultedNotes.map((note, noteIndex) => (
                            <span
                                key={noteIndex}
                                className={styles.chatContextNote}
                                onClick={(e) => handleNoteClick(note, e)}
                                title={`Ouvrir ${note.key}`}
                            >
                                {note.key} [{Math.round(note.similarity*10000)/100}%]
                            </span>
                        ))}
                    </div>
                )}
                {showTimestamps && (
                    <div className={styles.chatTime}>
                        {message.timestamp.toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    );
};
