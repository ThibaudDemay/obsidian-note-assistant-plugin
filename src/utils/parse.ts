/*
 * File Name         : parse.ts
 * Description       : Utility functions for parsing and formatting numbers and text
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:21:05
 */

export function parseMetricString(text: string): number {
    text = text.toString().trim().toUpperCase();

    if (!text.includes('K') && !text.includes('M')) {
        return parseFloat(text);
    }

    const match = text.match(/^([0-9.,]+)([KM])$/);

    if (!match) {
        return parseFloat(text); // Retourner le nombre tel quel si pas de match
    }

    const number = parseFloat(match[1].replace(',', '.'));
    const suffix = match[2];

    switch (suffix) {
        case 'K':
            return number * 1000;
        case 'M':
            return number * 1000000;
        default:
            return number;
    }
}
