import { setIcon } from 'obsidian';
import React from 'react';
import { useEffect, useRef } from 'react';

interface ObsidianIconProps {
    iconName: string;
    size?: number;
    className?: string;
}

export const ObsidianIcon: React.FC<ObsidianIconProps> = ({
    iconName,
    size = 16,
    className = ''
}) => {
    const iconRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (iconRef.current) {
            // Nettoyer l'icône précédente
            iconRef.current.innerHTML = '';

            // Définir l'icône
            setIcon(iconRef.current, iconName);

            // Ajuster la taille si nécessaire
            if (size !== 16) {
                const svg = iconRef.current.querySelector('svg');
                if (svg) {
                    svg.setAttribute('width', size.toString());
                    svg.setAttribute('height', size.toString());
                }
            }
        }
    }, [iconName, size]);

    return (
        <span
            ref={iconRef}
            className={`obsidian-icon ${className}`}
            style={{ display: 'inline-flex', alignItems: 'center' }}
        />
    );
};
