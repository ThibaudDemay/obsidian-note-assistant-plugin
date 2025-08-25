/*
 * File Name         : OllamaRegistryScraperService.ts
 * Description       : Types for Ollama scraper service
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 20/08/2025 21:59:37
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:08:17
 */

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
