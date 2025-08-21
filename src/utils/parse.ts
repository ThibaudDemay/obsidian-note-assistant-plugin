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
