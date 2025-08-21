import * as cheerio from 'cheerio';
import { requestUrl } from 'obsidian';

import {
    OllamaModel,
    OllamaModelDetailDescription,
    OllamaModelDetails
} from '@/@types/scraper/ollama-registry';
import { parseMetricString } from '@/utils';

export class OllamaRegistryScraper {
    private baseUrl: string;
    private models: OllamaModel[] = [];
    private lastScrapeDate: Date | null = null;

    constructor(baseUrl: string = 'https://registry.ollama.ai') {
        this.baseUrl = baseUrl;
    }

    async scrape(): Promise<OllamaModel[]> {
        const searchUrl = `${this.baseUrl}/search?o=newest`;

        try {
            // Fetch Last Updated Models
            const lastUpdatedModel = await this.scrapeLastUpdated();

            // If we have a last scrape date and the last updated model is not newer, return cached models
            if (this.lastScrapeDate && lastUpdatedModel && lastUpdatedModel.lastUpdated && this.lastScrapeDate > lastUpdatedModel.lastUpdated) {
                return this.models;
            }

            const response = await requestUrl(searchUrl);
            if (response.status !== 200) {
                console.error('Failed to fetch Ollama registry');
                return [];
            }

            const selector = cheerio.load(response.text);
            const models: OllamaModel[] = [];

            await selector('li[x-test-model]').each((index, element) => {
                // @ts-expect-error
                this.extractModel(selector, element).then(model => {
                    if (model) {
                        models.push(model);
                    }
                });

            });

            this.models = models;
            this.lastScrapeDate = new Date(); // Update last scrape date

            return this.models;

        } catch (error) {
            console.error('Error scraping Ollama registry:', error);
            return [];
        }
    }

    async scrapeLastUpdated(): Promise<OllamaModel | null> {
        const searchUrl = `${this.baseUrl}/search?o=newest`;

        try {
            const response = await requestUrl(searchUrl);

            if (response.status !== 200) {
                console.error('Failed to fetch Ollama registry for last updated model');
                return null;
            }

            const selector = cheerio.load(response.text);
            const lastModelElement = selector('li[x-test-model]').first();

            if (!lastModelElement.length) {
                console.warn('No models found in Ollama registry');
                return null;
            }

            // @ts-expect-error
            return this.extractModel(selector, lastModelElement);
        } catch (error) {
            console.error('Error scraping last updated model from Ollama registry:', error);
            return null;
        }
    }

    async extractModel(selector: cheerio.CheerioAPI, element: cheerio.Cheerio<Element>): Promise<OllamaModel | null> {
    // @ts-expect-error
        const modelElement = selector(element);
        const url = modelElement.find('a').attr('href') || '';

        if (url) {
            const modelDetails: OllamaModelDetails[]  = [];
            this.extractModelDetails(this.baseUrl + url).then(details => {
                modelDetails.push(...details);
            }).catch(error => {
                console.error('Error fetching model details:', error, 'for URL:', this.baseUrl + url);
            });

            const el1 = modelElement.find('a > div:first-of-type').first();
            const name = el1.find('h2 > span').text().trim();
            const description = el1.find('p').text().trim();


            const el2 = modelElement.find('a > div:last-of-type').first();
            const capabilities = el2.find('div > span[x-test-capability]').map(
                (i, el) => selector(el).text().trim()
            ).get();

            const sizes = el2.find('div > span[x-test-size]').map(
                (i, el) => selector(el).text().trim()
            ).get();
            // Need to convert because string ending with 'K' or 'M' is not a number
            const pullCountText = modelElement.find('p > span > span[x-test-pull-count]').text().trim();
            const pullCont = parseMetricString(pullCountText);

            const tagCountText = modelElement.find('p > span > span[x-test-tag-count]').text().trim();
            const tagCount = parseInt(tagCountText);

            const lastUpdatedDateStr = modelElement.find('p > span:has(span[x-test-updated])').attr('title');
            const lastUpdatedDate = lastUpdatedDateStr ? new Date(lastUpdatedDateStr) : null;
            const lastUpdatedStr = modelElement.find('p > span > span[x-test-updated]').text().trim();

            return {
                url: this.baseUrl + url,
                name: name,
                description: description,
                capabilities: capabilities,
                sizes: sizes,
                pullCount: pullCont || 0,
                tagCount: tagCount || 0,
                lastUpdated: lastUpdatedDate || null,
                lastUpdatedStr: lastUpdatedStr || '',
                lastestDetails: modelDetails,
            };
        }
        return null;
    }

    async extractModelDetails(modelUrl: string): Promise<OllamaModelDetails[]> {
        try {
            const latestModelUrl = `${modelUrl}:latest`;
            const response = await requestUrl(latestModelUrl);

            const selector = cheerio.load(response.text);

            const fileExplorerEl = selector('div[id=file-explorer]');
            const filesListEl = fileExplorerEl.find('div[id=file-explorer] > div > div > div:not(:first-child)');
            const files: OllamaModelDetails[] = [];
            filesListEl.each((index, element) => {
                const fileElement = selector(element);
                const fileName = fileElement.find('div:nth-child(1) > a').text().trim();
                const fileDescription: OllamaModelDetailDescription = {'value': fileElement.find('div:nth-child(2)').text().trim()};
                if (fileName === 'model') {
                    fileElement.find('div:nth-child(2) > div.flex > div.flex').each((i, descEl) => {
                        const descElement = selector(descEl);
                        const key = descElement.find('span').first().text().trim();
                        const value = descElement.find('span').last().text().trim();
                        fileDescription[key] = value;
                    });
                }
                const fileSize = fileElement.find('div:nth-child(3)').last().text().trim();

                files.push({
                    name: fileName,
                    description: fileDescription,
                    size: fileSize
                });
            });

            return files;

        } catch (error) {
            console.error('Error fetching model details:', error, 'for URL:', modelUrl);
            return [];
        }

    }

    get modelsList(): OllamaModel[] {
        return this.models;
    }
}
