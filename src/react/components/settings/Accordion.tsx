/*
 * File Name         : Accordion.tsx
 * Description       : Accordion component for settings sections
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:52:44
 */

import React, { ReactNode, useState } from 'react';

import { ObsidianIcon } from '@/react/components/shared';

import styles from './Accordion.module.css';

interface AccordionProps {
    title: string;
    children: ReactNode;
    defaultOpen?: boolean;
    disabled?: boolean;
    className?: string;
    titleClassName?: string;
    contentClassName?: string;
    icon?: string; // Nom de l'icône Obsidian optionnelle
}

export const Accordion: React.FC<AccordionProps> = ({
    title,
    children,
    defaultOpen = false,
    disabled = false,
    className = '',
    titleClassName = '',
    contentClassName = '',
    icon
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const toggleAccordion = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div className={`${styles.accordion} ${className} ${disabled ? styles.disabled : ''}`}>
            {/* Header avec titre et icône de toggle */}
            <button
                className={`${styles.header} ${titleClassName} ${isOpen ? styles.open : ''}`}
                onClick={toggleAccordion}
                disabled={disabled}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            >
                <div className={styles.titleSection}>
                    {icon && (
                        <div className={styles.titleIcon}>
                            <ObsidianIcon iconName={icon} />
                        </div>
                    )}
                    <span className={styles.title}>{title}</span>
                </div>

                <div className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}>
                    <ObsidianIcon iconName="chevron-down" />
                </div>
            </button>

            {/* Contenu avec animation */}
            <div
                className={`${styles.content} ${isOpen ? styles.expanded : styles.collapsed}`}
                id={`accordion-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
                aria-hidden={!isOpen}
            >
                <div className={`${styles.contentInner} ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// Hook pour gérer plusieurs accordéons avec un seul ouvert à la fois
export const useAccordionGroup = (initialOpen?: string) => {
    const [openAccordion, setOpenAccordion] = useState<string | null>(initialOpen || null);

    const createAccordionProps = (id: string) => ({
        defaultOpen: openAccordion === id,
        onToggle: (isOpen: boolean) => {
            setOpenAccordion(isOpen ? id : null);
        }
    });

    return { openAccordion, setOpenAccordion, createAccordionProps };
};

// Version contrôlée pour les groupes d'accordéons
interface ControlledAccordionProps extends Omit<AccordionProps, 'defaultOpen'> {
    id: string;
    isOpen: boolean;
    onToggle: (id: string, isOpen: boolean) => void;
}

export const ControlledAccordion: React.FC<ControlledAccordionProps> = ({
    id,
    isOpen,
    onToggle,
    title,
    children,
    disabled = false,
    className = '',
    titleClassName = '',
    contentClassName = '',
    icon
}) => {
    const toggleAccordion = () => {
        if (!disabled) {
            onToggle(id, !isOpen);
        }
    };

    return (
        <div className={`${styles.accordion} ${className} ${disabled ? styles.disabled : ''}`}>
            <button
                className={`${styles.header} ${titleClassName} ${isOpen ? styles.open : ''}`}
                onClick={toggleAccordion}
                disabled={disabled}
                type="button"
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${id}`}
            >
                <div className={styles.titleSection}>
                    {icon && (
                        <div className={styles.titleIcon}>
                            <ObsidianIcon iconName={icon} />
                        </div>
                    )}
                    <span className={styles.title}>{title}</span>
                </div>

                <div className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`}>
                    <ObsidianIcon iconName="chevron-down" />
                </div>
            </button>

            <div
                className={`${styles.content} ${isOpen ? styles.expanded : styles.collapsed}`}
                id={`accordion-content-${id}`}
                aria-hidden={!isOpen}
            >
                <div className={`${styles.contentInner} ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
