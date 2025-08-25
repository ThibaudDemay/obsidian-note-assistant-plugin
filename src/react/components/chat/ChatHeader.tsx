/*
 * File Name         : ChatHeader.tsx
 * Description       : Chat header component with conversation management and some display controls
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:22:51
 */

import React from 'react';

import { ConversationData } from '@/@types/services/StorageService';
import { ConversationManager } from '@/react/components/chat/ConversationManager';
import { ObsidianToggleGroup, ObsidianToggleWithLabel } from '@/react/components/shared';

import styles from './ChatHeader.module.css';

interface ChatHeaderProps {
    showTimestamps: boolean;
    onToggleShowTimestamps: () => void;
    showNotes: boolean;
    onToggleShowNotes: () => void;
    // Nouvelles props pour la gestion des conversations
    conversations: ConversationData[];
    currentConversation: ConversationData | null;
    onNewConversation: () => void;
    onLoadConversation: (id: string) => void;
    onDeleteConversation: (id: string) => void;
    onRenameConversation?: (id: string, newTitle: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
    showTimestamps,
    onToggleShowTimestamps,
    showNotes,
    onToggleShowNotes,
    conversations,
    currentConversation,
    onNewConversation,
    onLoadConversation,
    onDeleteConversation,
    onRenameConversation
}) => {
    return (
        <div className={styles.chatHeader}>
            {/* Section gauche - Gestionnaire de conversations */}
            <div className={styles.headerLeft}>
                <ConversationManager
                    conversations={conversations}
                    currentConversation={currentConversation}
                    onNewConversation={onNewConversation}
                    onLoadConversation={onLoadConversation}
                    onDeleteConversation={onDeleteConversation}
                    onRenameConversation={onRenameConversation}
                />
            </div>

            {/* Section droite - Contrôles d'affichage */}
            <div className={styles.headerRight}>
                <div className={styles.headerControls}>
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

                {/* Indicateur de conversation actuelle (optionnel) */}
                {currentConversation && (
                    <div className={styles.conversationIndicator}>
                        <span className={styles.messageCount}>
                            {currentConversation.messages.length} messages
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
