/*
 * File Name         : OllamaService.ts
 * Description       : Ollama service types
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 21:14:29
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:14:51
 */

export interface ProgressResponse {
    status: string;
    digest?: string;
    total?: number;
    completed?: number;
}

export interface OllamaModelResponse {
    name: string;
    model: string;
    modified_at: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
}
