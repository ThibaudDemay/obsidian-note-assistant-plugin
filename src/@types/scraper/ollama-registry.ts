export interface OllamaModel {
    url: string;
    name: string;
    description: string;
    capabilities: string[];
    sizes: string[];
    pullCount: number;
    tagCount: number;
    lastUpdated: Date | null;
    lastUpdatedStr: string; // Human-readable format
    lastestDetails: OllamaModelDetails[];
}

export interface OllamaModelDetails {
    name: string;
    description: OllamaModelDetailDescription;
    size: string;
}

export interface OllamaModelDetailDescription {
    value: string;
    [key: string]: string; // Additional key-value pairs
}
