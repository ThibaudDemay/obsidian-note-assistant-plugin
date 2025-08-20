export function formatNumeric(bytes: number, type: 'si'|'us' = 'si', suffix: string = ''): string {
    if (!bytes || bytes === 0)
        return suffix !== '' ? `0 ${suffix}`: '0';

    let sizes: string[] = [];
    if (type === 'si')
        sizes = ['', 'k', 'M', 'G', 'T', 'P', 'E'];
    else if (type === 'us')
        sizes = ['', 'K', 'M', 'B', 'T', 'Q', 'Qi'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
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
