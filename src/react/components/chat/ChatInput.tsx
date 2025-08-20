import React, { useEffect } from 'react';

import styles from './ChatInput.module.css';

export const ChatInput: React.FC<{
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSendMessage: () => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
}> = ({ inputValue, isLoading, onInputChange, onSendMessage, inputRef }) => {

    // Fonction pour ajuster automatiquement la hauteur du textarea
    const adjustTextareaHeight = () => {
        if (inputRef.current) {
            // Reset la hauteur pour calculer la nouvelle hauteur nécessaire
            inputRef.current.style.height = 'auto';

            // Calcule la hauteur nécessaire en fonction du contenu
            const scrollHeight = inputRef.current.scrollHeight;
            const maxHeight = 120; // Hauteur maximale en pixels (environ 5 lignes)

            // Applique la nouvelle hauteur (limitée par maxHeight)
            inputRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';

            // Active le scroll vertical si le contenu dépasse maxHeight
            inputRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    };

    // Ajuste la hauteur quand la valeur change
    useEffect(() => {
        adjustTextareaHeight();
    }, [inputValue]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                // Shift+Enter : permet le saut de ligne (comportement par défaut)
                return;
            } else {
                // Enter seul : envoie le message
                e.preventDefault();
                onSendMessage();
            }
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onInputChange(e.target.value);
    };

    return (
        <div className={styles.chatInputContainer}>
            <textarea
                ref={inputRef}
                placeholder="Tapez votre message..."
                className={styles.chatInput}
                value={inputValue}
                onChange={handleInput}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                rows={1}
                style={{
                    resize: 'none',
                    minHeight: '40px',
                }}
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
