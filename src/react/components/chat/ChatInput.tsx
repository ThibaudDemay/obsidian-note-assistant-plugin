/*
 * File Name         : ChatInput.tsx
 * Description       : Chat input component with multiline, auto-resize and send button
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:11:15
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:19:10
 */

import React, { useEffect } from 'react';

import { ObsidianIcon } from '@/react/components/shared';

import styles from './ChatInput.module.css';

interface ChatInputProps {
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    placeholder?: string;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
    inputValue,
    isLoading,
    onInputChange,
    onSendMessage,
    inputRef,
    placeholder = 'Tapez votre message...',
    disabled = false
}) => {
    // Auto-resize textarea
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
        }
    }, [inputValue]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !isLoading && inputValue.trim()) {
                onSendMessage();
            }
        }
    };

    const handleSendClick = () => {
        if (!disabled && !isLoading && inputValue.trim()) {
            onSendMessage();
        }
    };

    const canSend = !disabled && !isLoading && inputValue.trim().length > 0;

    return (
        <div className={styles.chatInputContainer}>
            <div className={styles.inputWrapper}>
                <textarea
                    ref={inputRef}
                    className={`${styles.chatInput} ${disabled ? styles.disabled : ''}`}
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled || isLoading}
                    rows={1}
                />
                <button
                    className={`${styles.sendButton} ${canSend ? styles.sendButtonActive : styles.sendButtonDisabled}`}
                    onClick={handleSendClick}
                    disabled={!canSend}
                    title={disabled ? 'Créez une conversation pour envoyer un message' : 'Envoyer le message (Entrée)'}
                >
                    {isLoading ? (
                        <div className={styles.loadingSpinner}>
                            <ObsidianIcon iconName="loader-2" />
                        </div>
                    ) : (
                        <ObsidianIcon iconName="send" />
                    )}
                </button>
            </div>

            {disabled && (
                <div className={styles.disabledHint}>
                    <ObsidianIcon iconName="info" />
                    <span>Créez ou sélectionnez une conversation pour commencer à discuter</span>
                </div>
            )}
        </div>
    );
};
