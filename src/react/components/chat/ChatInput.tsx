import React from 'react';

import styles from './ChatInput.module.css';

export const ChatInput: React.FC<{
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
}> = ({ inputValue, isLoading, onInputChange, onSendMessage, inputRef }) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onSendMessage();
        }
    };

    return (
        <div className={styles.chatInputContainer}>
            <input
                ref={inputRef}
                type="text"
                placeholder="Tapez votre message..."
                className={styles.chatInput}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
            />
            <button
                className={styles.chatSendButton}
                onClick={onSendMessage}
                disabled={isLoading || !inputValue.trim()}
            >
                {isLoading ? 'Envoi...' : 'Envoyer'}
            </button>
        </div>
    );
};
