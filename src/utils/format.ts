/*
 * File Name         : format.ts
 * Description       : Utility functions for formatting numbers and text
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:11:17
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:20:31
 */

export function formatNumeric(value: number, suffix: string = '', type: 'si'|'us' = 'si'): string {
    if (!value || value === 0)
        return suffix !== '' ? `0 ${suffix}`: '0';

    let sizes: string[] = [];
    if (type === 'si')
        sizes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
    else if (type === 'us')
        sizes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi'];
    const i = Math.floor(Math.log(value) / Math.log(1024));

    return Math.round(value / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
}

export function truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
