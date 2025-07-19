import { App, PluginSettingTab, Setting, Notice, Modal, TFile } from 'obsidian';
import NoteAssistantPlugin from './main';
import { TemplateProcessor } from './template-processor';

export interface NoteAssistantPluginSettings {
    ollamaBaseUrl: string;
    ollamaModel: string;
    // LLM settings
    llmTemperature: number;
    llmTopP: number;
    llmRepeatPenalty: number;
    llmMaxTokens: number;
    llmTimeout: number;
    llmStream: boolean;
    // Embeddings settings
    embeddingsModel: string;
    embeddingsIgnoredFolders: string[];
    embeddingsMaxRelevantNotes: number;
    // General settings
    maxHistoryLength: number;
    showNotesUsed: boolean;
    showTimestamps: boolean;
    // Template settings avec choix source
    templateSource: 'settings' | 'file';
    promptTemplate: string;
    templateFilePath: string;
}

export const DEFAULT_SETTINGS: NoteAssistantPluginSettings = {
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama2',
    // LLM settings
    llmTemperature: 0.7,
    llmTopP: 0.9,
    llmRepeatPenalty: 1.1,
    llmMaxTokens: 2048,
    llmTimeout: 30000,
    llmStream: true,
    // Embeddings settings
    embeddingsModel: 'Xenova/all-MiniLM-L6-v2',
    embeddingsIgnoredFolders: ['templates', '.obsidian'],
    embeddingsMaxRelevantNotes: 5,
    // General settings
    maxHistoryLength: 50,
    showNotesUsed: true,
    showTimestamps: true,
    // Template avec choix source - VERSION MINIMALISTE
    templateSource: 'settings',
    templateFilePath: '',
    promptTemplate: `{notes_context}{conversation_context}

Q: {question}

A:`
};


export class NoteAssistantSettingTab extends PluginSettingTab {
    plugin: NoteAssistantPlugin;

    constructor(app: App, plugin: NoteAssistantPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Note Assistant Settings' });

        // Configuration Ollama
        containerEl.createEl('h3', { text: 'Ollama Settings' });

        new Setting(containerEl)
            .setName('Ollama base URL')
            .setDesc('The URL of your Ollama server')
            .addText(text => text
                .setPlaceholder('http://localhost:11434')
                .setValue(this.plugin.settings.ollamaBaseUrl)
                .onChange(async (value) => {
                    this.plugin.settings.ollamaBaseUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Ollama Model')
            .setDesc('The model to use for conversations')
            .addDropdown(async (dropdown) => {
                // Ajouter une option par défaut
                dropdown.addOption('', 'Loading templates...');

                try {
                    // Récupérer les modèles disponibles
                    const models = await this.plugin.ollamaService.getAvailableModels();

                    // Mise à jours du dropdown
                    dropdown.selectEl.empty();
                    if (models.length === 0) {
                        dropdown.addOption('', 'No model found - Check Ollama');
                    } else {
                        models.forEach(model => {
                            dropdown.addOption(model, model);
                        });
                    }

                    // Sélectionner le modèle actuel
                    dropdown.setValue(this.plugin.settings.ollamaModel);

                } catch (error) {
                    console.error('Error retrieving templates:', error);
                    dropdown.selectEl.empty();
                    dropdown.addOption('', 'Error connecting to Ollama');
                }

                dropdown.onChange(async (value) => {
                    if (value && value !== '') {
                        this.plugin.settings.ollamaModel = value;
                        await this.plugin.saveSettings();
                        this.displayModelInfo(modelInfoContainer);
                    }
                });
            })
            .addExtraButton(button => button
                .setIcon('refresh-cw')
                .setTooltip('Update the list of models')
                .onClick(async () => {
                    new Notice('Updating models...');
                    // Forcer le rechargement de la page des paramètres
                    this.display();
                }));

        // Modèle infos
        const modelInfoContainer = containerEl.createDiv({ cls: 'note-assistant-model-info' });
        this.displayModelInfo(modelInfoContainer);

        // Paramètres LLM détaillés
        containerEl.createEl('h3', { text: 'LLM Settings' });

        new Setting(containerEl)
            .setName('Temperature')
            .setDesc('Temperature is a hyperparameter that controls the randomness of language model output. (0.0 à 1.0)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.llmTemperature)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.llmTemperature = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Top P')
            .setDesc('Top p, also known as nucleus sampling, is another hyperparameter that controls the randomness of language model output. (0.0 à 1.0)')
            .addSlider(slider => slider
                .setLimits(0, 1, 0.1)
                .setValue(this.plugin.settings.llmTopP)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.llmTopP = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Repeat Penalty')
            .setDesc('Avoid repetition (1.0 to 2.0)')
            .addSlider(slider => slider
                .setLimits(1, 2, 0.1)
                .setValue(this.plugin.settings.llmRepeatPenalty)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.llmRepeatPenalty = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Max tokens')
            .setDesc('This is the maximum number of tokens that the LLM generates. This can vary depending on the model.')
            .addText(text => text
                .setPlaceholder('2048')
                .setValue(this.plugin.settings.llmMaxTokens.toString())
                .onChange(async (value) => {
                    this.plugin.settings.llmMaxTokens = parseInt(value) || 2048;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Timeout (ms)')
            .setDesc('Maximum waiting time for a response')
            .addText(text => text
                .setPlaceholder('30000')
                .setValue(this.plugin.settings.llmTimeout.toString())
                .onChange(async (value) => {
                    this.plugin.settings.llmTimeout = parseInt(value) || 30000;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Streaming mode')
            .setDesc('Receive a response in real time')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.llmStream)
                .onChange(async (value) => {
                    this.plugin.settings.llmStream = value;
                    await this.plugin.saveSettings();
                }));

        // Configuration des embeddings
        containerEl.createEl('h3', { text: 'Embeddings Settings' });

        new Setting(containerEl)
            .setName('Embedding model')
            .setDesc('Converts text into numerical representations for semantic search and similarity matching.')
            .addText(text => text
                .setPlaceholder('paraphrase-multilingual-MiniLM-L12-v2')
                .setValue(this.plugin.settings.embeddingsModel)
                .onChange(async (value) => {
                    this.plugin.settings.embeddingsModel = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Ignored files')
            .setDesc('Files to ignore when generating embeddings (separated by commas)')
            .addTextArea(text => text
                .setPlaceholder('.obsidian, _templates')
                .setValue(this.plugin.settings.embeddingsIgnoredFolders.join(', '))
                .onChange(async (value) => {
                    this.plugin.settings.embeddingsIgnoredFolders = value.split(',').map(f => f.trim()).filter(f => f);
                    await this.plugin.saveSettings();
                }));

        // ✅ CHANGEMENT : embeddingsMaxRelevantNotes
        new Setting(containerEl)
            .setName('Maximum number of relevant notes')
            .setDesc('Maximum number of notes to include in the context')
            .addText(text => text
                .setPlaceholder('5')
                .setValue(this.plugin.settings.embeddingsMaxRelevantNotes.toString())
                .onChange(async (value) => {
                    this.plugin.settings.embeddingsMaxRelevantNotes = parseInt(value) || 5;
                    await this.plugin.saveSettings();
                }));

        // ✅ CHANGEMENT : Configuration du template avec choix source
        containerEl.createEl('h3', { text: 'Prompt template' });

        new Setting(containerEl)
            .setName('Template source')
            .setDesc('Select where to retrieve the prompt template')
            .addDropdown(dropdown => dropdown
                .addOption('settings', 'Template in settings')
                .addOption('file', 'Template in file (.md)')
                .setValue(this.plugin.settings.templateSource)
                .onChange(async (value: 'settings' | 'file') => {
                    this.plugin.settings.templateSource = value;
                    await this.plugin.saveSettings();
                    // Rafraîchir l'affichage
                    this.display();
				}));

		if (this.plugin.settings.templateSource === 'file') {
			new Setting(containerEl)
				.setName('Template file')
				.setDesc('Select an .md file containing the template')
				.addDropdown(async (dropdown) => {
					dropdown.addOption('', 'Select a file...');

					try {
						const templateFiles = await TemplateProcessor.getAvailableTemplateFiles();

						if (templateFiles.length === 0) {
							dropdown.addOption('', 'No template file found');
						} else {
							templateFiles.forEach(file => {
								dropdown.addOption(file.path, file.path);
							});
						}

						dropdown.setValue(this.plugin.settings.templateFilePath);

					} catch (error) {
						dropdown.addOption('', 'Error loading files');
					}

					dropdown.onChange(async (value) => {
						this.plugin.settings.templateFilePath = value;
						await this.plugin.saveSettings();
						// Mettre à jour l'affichage du statut
						this.updateTemplateStatus(templateStatusContainer);
					});
				})
				.addExtraButton(button => button
					.setIcon('refresh-cw')
					.setTooltip('Update the list of template files')
					.onClick(() => this.display()));

			const templateStatusContainer = containerEl.createDiv({ cls: 'template-status' });
			this.updateTemplateStatus(templateStatusContainer);


			new Setting(containerEl)
				.setName('Create a template file')
				.setDesc('Create a new template file with default content')
				.addButton(button => button
					.setButtonText('Create template file')
					.onClick(() => this.createTemplateFile()));

		} else {
			const templateSetting = new Setting(containerEl)
				.setName('Prompt template')
				.setDesc('Custom template with placeholders: {question} (required), {conversation_context} and {notes_context} (optional))')
				.addTextArea(text => {
					text.inputEl.style.minHeight = '200px';
					text.inputEl.style.width = '100%';
					text.inputEl.style.fontFamily = 'monospace';

					return text
						.setPlaceholder('Enter your template...')
						.setValue(this.plugin.settings.promptTemplate)
						.onChange(async (value) => {
							// Valider le template
							const validation = TemplateProcessor.validateTemplate(value);

							if (validation.isValid) {
								this.plugin.settings.promptTemplate = value;
								await this.plugin.saveSettings();
								// Supprimer les messages d'erreur précédents
								const errorEl = containerEl.querySelector('.template-error');
								if (errorEl) errorEl.remove();
							} else {
								// Afficher l'erreur
								let errorEl = containerEl.querySelector('.template-error') as HTMLElement;
								if (!errorEl) {
									errorEl = templateSetting.settingEl.createDiv({ cls: 'template-error' });
								}
								errorEl.textContent = `❌ ${validation.error}`;
								errorEl.style.color = 'var(--text-error)';
								errorEl.style.marginTop = '5px';
							}
						});
				});

			// Boutons d'aide pour le template
			new Setting(containerEl)
				.setName('Template actions')
				.setDesc('Manage your prompt template')
				.addButton(button => button
					.setButtonText('Reset to default')
					.setTooltip('Restore the default template')
					.onClick(async () => {
						this.plugin.settings.promptTemplate = TemplateProcessor.getDefaultTemplate();
						await this.plugin.saveSettings();
						new Notice('Template reset');
						this.display();
					}))
				.addButton(button => button
					.setButtonText('Preview')
					.setTooltip('See a preview of the template with sample data')
					.onClick(() => this.showTemplatePreview()));
		}

        // Aide sur les placeholders (toujours visible)
        const helpContainer = containerEl.createDiv({ cls: 'template-help' });
        helpContainer.createEl('h4', { text: 'Available placeholders:' });

        const placeholderList = helpContainer.createEl('ul');
        placeholderList.createEl('li').innerHTML = '<code>{question}</code> - The question asked by the user <strong>(required)</strong>';
        placeholderList.createEl('li').innerHTML = '<code>{conversation_context}</code> - Formatted conversation history <em>(required)</em>';
        placeholderList.createEl('li').innerHTML = '<code>{notes_context}</code> - Relevant notes found via embeddings <em>(required)</em>';

        containerEl.createEl('h3', { text: 'General settings' });

        new Setting(containerEl)
            .setName('Length of history for context')
            .setDesc('Number of history messages to include as context for the template')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(this.plugin.settings.maxHistoryLength.toString())
                .onChange(async (value) => {
                    this.plugin.settings.maxHistoryLength = parseInt(value) || 50;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show notes used')
            .setDesc('Show which notes were used for the context')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showNotesUsed)
                .onChange(async (value) => {
                    this.plugin.settings.showNotesUsed = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Display timestamps')
            .setDesc('Display message times')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showTimestamps)
                .onChange(async (value) => {
                    this.plugin.settings.showTimestamps = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'Actions' });

        new Setting(containerEl)
            .setName('Test the Ollama connection')
            .setDesc('Check if Ollama is accessible')
            .addButton(button => button
                .setButtonText('Test')
                .onClick(async () => {
                    const isConnected = await this.plugin.ollamaService.testConnection();
                    new Notice(isConnected ? 'Connection successful!' : 'Connection failed');
                }));

        new Setting(containerEl)
            .setName('Regenerate all embeddings')
            .setDesc('Regenerate embeddings for all notes')
            .addButton(button => button
                .setButtonText('Regenerate')
                .onClick(() => this.plugin.regenerateEmbeddings()));

        // ✅ NOUVEAU : Affichage des statistiques
        containerEl.createEl('h3', { text: 'Statistics' });

        const statsContainer = containerEl.createDiv();
        this.updateStats(statsContainer);

        new Setting(containerEl)
            .setName('Update statistics')
            .setDesc('Update usage information')
            .addButton(button => button
                .setButtonText('Refresh')
                .onClick(() => this.updateStats(statsContainer)));
    }

    private async displayModelInfo(container: HTMLElement) {
        container.empty();

        if (!this.plugin.settings.ollamaModel) {
            container.createEl('p', {
                text: '⚠️ No model selected',
                cls: 'note-assistant-model-status disconnected'
            });
            return;
        }

        try {
            const isConnected = await this.plugin.ollamaService.testConnection();
            if (!isConnected) {
                container.createEl('p', {
                    text: '❌ Ollama not accessible',
                    cls: 'note-assistant-model-status disconnected'
                });
                return;
            }

            const models = await this.plugin.ollamaService.getAvailableModels();
            const currentModel = this.plugin.settings.ollamaModel;

            if (models.includes(currentModel)) {
                container.createEl('p', {
                    text: `✅ Model “${currentModel}” available`,
                    cls: 'note-assistant-model-status connected'
                });

                // Informations supplémentaires sur le modèle
                const modelDetails = await this.getModelDetails(currentModel);
                if (modelDetails) {
                    const detailsEl = container.createDiv({ cls: 'note-assistant-model-details' });
                    detailsEl.createEl('small', { text: `Taille: ${modelDetails.size || 'Unknown'}` });
                    detailsEl.createEl('br');
                    detailsEl.createEl('small', { text: `Modified: ${modelDetails.modified || 'Unknown'}` });
                }
            } else {
                container.createEl('p', {
                    text: `⚠️ Model "${currentModel}" not found`,
                    cls: 'note-assistant-model-status disconnected'
                });

                if (models.length > 0) {
                    const suggestionEl = container.createDiv();
                    suggestionEl.createEl('small', { text: 'Available models: ' });
                    suggestionEl.createEl('small', {
                        text: models.slice(0, 3).join(', ') + (models.length > 3 ? '...' : ''),
                        cls: 'note-assistant-available-models'
                    });
                }
            }

        } catch (error) {
            container.createEl('p', {
                text: '❌ Error connecting to Ollama',
                cls: 'note-assistant-model-status disconnected'
            });
        }
    }

    // ✅ NOUVEAU : Récupérer les détails d'un modèle
    private async getModelDetails(modelName: string): Promise<any> {
        try {
            const response = await fetch(`${this.plugin.settings.ollamaBaseUrl}/api/tags`);
            if (!response.ok) return null;

            const data = await response.json();
            const model = data.models?.find((m: any) => m.name === modelName);

            if (model) {
                return {
                    size: this.formatBytes(model.size),
                    modified: new Date(model.modified_at).toLocaleDateString()
                };
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    // ✅ NOUVEAU : Formater la taille en bytes
    private formatBytes(bytes: number): string {
        if (!bytes) return 'Unknown';

        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));

        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Prévisualisation du template
    private showTemplatePreview() {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Template overview');

        const { contentEl } = modal;

        // Données d'exemple
        const exampleHistory = [
            { role: 'user', content: 'Peux-tu m\'aider à développer mon univers science-fiction ?' },
            { role: 'assistant', content: 'Of course! Let\'s talk about your world. What elements would you like to develop?' }
        ];

        const exampleNotes = [
            {
                file: { basename: 'Technologie-Futur' } as TFile,
                content: 'Nano-machines enable instant cell regeneration...',
                similarity: 0.89
            },
            {
                file: { basename: 'Societe-2157' } as TFile,
                content: 'Society is divided into three main castes based on access to technology...',
                similarity: 0.76
            }
        ];

        const exampleQuestion = 'How can I integrate nanotechnology into my political system?';

        // Générer l'aperçu
        const conversationContext = TemplateProcessor.formatConversationContext(exampleHistory);
        const notesContext = TemplateProcessor.formatNotesContext(exampleNotes);

        const preview = TemplateProcessor.processTemplate(
            this.plugin.settings.promptTemplate,
            conversationContext,
            notesContext,
            exampleQuestion
        );

        contentEl.createEl('h3', { text: 'Overview with sample data:' });

        const previewEl = contentEl.createEl('pre');
        previewEl.style.backgroundColor = 'var(--background-secondary)';
        previewEl.style.padding = '15px';
        previewEl.style.borderRadius = '5px';
        previewEl.style.maxHeight = '400px';
        previewEl.style.overflow = 'auto';
        previewEl.style.whiteSpace = 'pre-wrap';
        previewEl.style.fontSize = '12px';
        previewEl.textContent = preview;

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.marginTop = '15px';

        const closeButton = buttonContainer.createEl('button', { text: 'Close' });
        closeButton.style.padding = '8px 16px';
        closeButton.addEventListener('click', () => modal.close());

        modal.open();
    }

    // Mettre à jour le statut du fichier template
    private async updateTemplateStatus(container: HTMLElement) {
        container.empty();

        if (!this.plugin.settings.templateFilePath) {
            container.createEl('p', {
                text: '⚠️ No template file selected',
                cls: 'template-status-warning'
            });
            return;
        }

        try {
            const templateResult = await TemplateProcessor.getTemplate(this.plugin.settings);

            if (templateResult.error) {
                container.createEl('p', {
                    text: `❌ ${templateResult.error}`,
                    cls: 'template-status-error'
                });
            } else {
                container.createEl('p', {
                    text: `✅ Valid template: ${templateResult.source}`,
                    cls: 'template-status-success'
                });

                const preview = templateResult.template.substring(0, 100) + (templateResult.template.length > 100 ? '...' : '');
                const previewEl = container.createEl('div', { cls: 'template-preview' });
                previewEl.createEl('small', { text: 'Preview: ' });
                previewEl.createEl('code', { text: preview });
            }
        } catch (error) {
            container.createEl('p', {
                text: `❌ Error: ${error.message}`,
                cls: 'template-status-error'
            });
        }
    }

    // Créer un fichier template
    private async createTemplateFile() {
        const modal = new Modal(this.app);
        modal.titleEl.setText('Create a template file');

        const { contentEl } = modal;

        contentEl.createEl('p', { text: 'Template file name (without extension):' });

        const input = contentEl.createEl('input', { type: 'text', placeholder: 'my_prompt_template' });
        input.style.width = '100%';
        input.style.marginBottom = '15px';

        const buttonContainer = contentEl.createDiv();
        buttonContainer.style.textAlign = 'center';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';

        const createButton = buttonContainer.createEl('button', { text: 'Créer' });
        createButton.style.padding = '8px 16px';
        createButton.style.marginRight = '10px';

        const cancelButton = buttonContainer.createEl('button', { text: 'Annuler' });
        cancelButton.style.padding = '8px 16px';

        createButton.addEventListener('click', async () => {
            const fileName = input.value.trim();
            if (!fileName) {
                new Notice('Please enter a file name');
                return;
            }

            const filePath = `${fileName}.md`;

            try {
                const existingFile = this.app.vault.getAbstractFileByPath(filePath);
                if (existingFile) {
                    new Notice('A file with this name already exists.');
                    return;
                }

                const defaultTemplate = TemplateProcessor.getDefaultTemplate();
                await this.app.vault.create(filePath, defaultTemplate);

                this.plugin.settings.templateFilePath = filePath;
                this.plugin.settings.templateSource = 'file';
                await this.plugin.saveSettings();

                new Notice(`Template file created: ${filePath}`);
                modal.close();

                this.display();

            } catch (error) {
                new Notice(`Error during creation: ${error.message}`);
            }
        });

        cancelButton.addEventListener('click', () => modal.close());

        input.focus();

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                createButton.click();
            }
        });

        modal.open();
    }

    // Méthode pour afficher les statistiques
    private updateStats(container: HTMLElement) {
        container.empty();

        const embeddingService = this.plugin.embeddingService;
        if (!embeddingService) {
            container.createEl('p', { text: 'Embedding service not initialized' });
            return;
        }

        const embeddingsCount = (embeddingService as any).embeddings?.size || 0;
        // container.createEl('p', { text: `🤖 LLM model: ${this.plugin.settings.ollamaModel}` });
        // container.createEl('p', { text: `🔗 Model embeddings: ${this.plugin.settings.embeddingsModel}` });
        container.createEl('p', { text: `📊 Generated embeddings: ${embeddingsCount}` });
        // container.createEl('p', { text: `📝 Max notes context: ${this.plugin.settings.embeddingsMaxRelevantNotes}` });
        // container.createEl('p', { text: `💭 Historical context: ${this.plugin.settings.maxHistoryLength} messages` });

        // const ignoredFolders = this.plugin.settings.embeddingsIgnoredFolders.join(', ') || 'Aucun';
        // container.createEl('p', { text: `🚫 Ignored files: ${ignoredFolders}` });

        // Informations sur le template
        // const templateSource = this.plugin.settings.templateSource === 'file'
        //     ? `File: ${this.plugin.settings.templateFilePath}`
        //     : 'Settings';
        // container.createEl('p', { text: `📋 Template source: ${templateSource}` });
    }
}
