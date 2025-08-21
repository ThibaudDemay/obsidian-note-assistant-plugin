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
                <div className={`${stylesChatMessage.chatMessage} ${stylesChatMessage.chatMessageAssistant}`}>
                    <div className={stylesChatMessage.chatAvatar}><ObsidianIcon iconName='bot' /></div>
                    <div className={stylesChatMessage.chatMessageContent}>
                        <div className={`${stylesChatMessage.chatContent} ${stylesChatMessage.chatLoading}`}>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>
    );
};
