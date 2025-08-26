/*
 * File Name         : ChatMessages.tsx
 * Description       : Component to display a list of chat messages with loading indicator
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 26/08/2025 15:36:38
 */

import React from 'react';

import { Message } from '@/@types/react/views/Chat';
import { ChatMessage } from '@/react/components/chat';
import { ObsidianIcon } from '@/react/components/shared';

import stylesChatMessage from './ChatMessage.module.css';
import stylesChatMessages from './ChatMessages.module.css';

export const ChatMessages: React.FC<{
    messages: Message[];
    showTimestamps: boolean;
    showNotesUsed: boolean;
    isLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
}> = ({ messages, showTimestamps, showNotesUsed, isLoading, messagesEndRef }) => {
    return (
        <div className={stylesChatMessages.chatMessages}>
            {messages.map((message, index) => (
                <ChatMessage
                    key={index}
                    message={message}
                    showTimestamps={showTimestamps}
                    showNotesUsed={showNotesUsed}
                />
            ))}
            {isLoading && (
                <div className={`${stylesChatMessage.chatMessage} ${stylesChatMessage.assistantMessage} ${stylesChatMessage.loadingMessage}`}>
                    <div className={stylesChatMessage.chatAvatar}>
                        <ObsidianIcon iconName='bot' />
                    </div>
                    <div className={stylesChatMessage.chatMessageContent}>
                        <div className={`${stylesChatMessage.chatContent} ${stylesChatMessage.chatLoading} ${stylesChatMessage.messageSquareLarge}`}>
                            <div className={`${stylesChatMessage.messageSquareIconLarge} ${stylesChatMessage.accent}`}>
                                {/* SVG message-square de Lucide en 40px */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>
                                </svg>

                                <div className={stylesChatMessage.messageSquareDotsLarge}>
                                    <span></span>  {/* Bleu principal */}
                                    <span></span>  {/* Bleu clair */}
                                    <span></span>  {/* Vert */}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
