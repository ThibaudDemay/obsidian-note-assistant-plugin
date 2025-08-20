
/**
<div class="vertical-tab-content">
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Ollama base URL</div>
      <div class="setting-item-description">The URL of your Ollama server</div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        spellcheck="false"
        placeholder="http://localhost:11434"
      />
    </div>
  </div>
  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Authentication Type</div>
      <div class="setting-item-description">
        Authentication method for Ollama
      </div>
    </div>
    <div class="setting-item-control">
      <select class="dropdown">
        <option value="none">None</option>
        <option value="basic">Basic Authentication</option>
        <option value="apiKey">API Key</option>
      </select>
    </div>
  </div>
</div>
*/
import { debounce, Notice, Platform } from 'obsidian';
import React, {useEffect, useState} from 'react';

import { useOllamaPullModal } from '@/react/components/settings/OllamaPullModal';
import { SettingItem } from '@/react/components/settings/SettingItem';
import { usePlugin } from '@/react/contexts/PluginContext';
import { useSettingItem } from '@/react/hooks';
import { SettingTabChildProps } from '@/react/views/SettingTab';

export const GeneralSettings: React.FC<SettingTabChildProps> = ({
    settings,
    onUpdateSettings
}) => {
    // Hooks
    const plugin = usePlugin();
    const { createTextAction, createDropdownAction, createExtraButtonAction, createToggleAction } = useSettingItem();
    const { openModal, OllamaPullModalComponent } = useOllamaPullModal();

    // State
    const [llmModelOptions, setLlmModelOptions] = useState([
        { value: '', label: 'Loading models...' }
    ]);
    const [embeddingModelOptions, setEmbeddingModelOptions] = useState([
        { value: '', label: 'Loading embedding models...' }
    ]);

    // Fonction async pour charger les modèles
    const loadLlmModels = async () => {
        const models = await plugin!.ollamaService.getLLMModels();
        if (models.length === 0) {
            setLlmModelOptions([{value:'', label: 'No LLM model found'}]);
            return;
        }
        setLlmModelOptions(
            models.map<{ value: string; label: string }>((model) => {
                return {value: model, label: model};
            }
            ));
    };

    const loadEmbeddingModels = async () => {
        let models: string[];
        if (settings.embeddingFilterModels) {
            models = await plugin!.ollamaService.getEmbeddingModels();
        } else {
            const allModels = await plugin!.ollamaService.getInstalledModels();
            models = allModels.map(m => m.name);
        }
        if (models.length === 0) {
            setEmbeddingModelOptions([{value:'', label: 'No embedding model found'}]);
            return;
        }
        setEmbeddingModelOptions(
            models.map<{ value: string; label: string }>((model) => {
                return {value: model, label: model};
            }
            ));
    };

    const onPullComplete = (modelName: string, modelType: 'llm'|'embedding') => {
        if (!modelName.contains(':'))
            modelName = modelName + ':latest';
        if (modelType === 'llm') {
            loadLlmModels();
            onUpdateSettings({llmModel: modelName});
        } else if (modelType === 'embedding') {
            loadEmbeddingModels();
            onUpdateSettings({embeddingModel: modelName});
        }
    };

    useEffect(() => {
        loadLlmModels();
        loadEmbeddingModels();
    }, []);

    return (
        <div>
            {/* Ollama General Settings */}
            <SettingItem
                name='Ollama base URL'
                description='The URL of your Ollama server'
                actions={[
                    createTextAction(
                        'http://localhost:11434',
                        settings.ollamaBaseUrl,
                        debounce((value) => onUpdateSettings({ollamaBaseUrl: value}), 5000, true)
                    )
                ]}
            />
            <SettingItem
                name='Authentication Type'
                description='Authentication method for Ollama'
                actions={[
                    createDropdownAction(
                        [
                            { value: 'none', label: 'None' },
                            { value: 'basic', label: 'Basic Authentication' },
                            { value: 'apiKey', label: 'API Key' }
                        ],
                        settings.ollamaAuthType,
                        debounce((value: 'none' | 'basic' | 'apiKey') => onUpdateSettings({ollamaAuthType: value}))
                    )
                ]}
            />
            {settings.ollamaAuthType !== 'none' &&
                <SettingItem
                    name={settings.ollamaAuthType === 'basic'
                        ? 'Credentials (username:password)'
                        : 'API Key'}
                    description='Enter your authentication credentials'
                    actions={[
                        createTextAction(
                            '',
                            settings.ollamaAuthText,
                            debounce((value) => onUpdateSettings({ollamaAuthText: value}))
                        )
                    ]}

                />
            }

            {/* LLM Model */}
            <SettingItem
                name='LLM Model'
                description='The model to use for conversations (LLM models only)'
                actions={[
                    createExtraButtonAction(
                        'memory-stick',
                        'Load the model into memory',
                        async () => {
                            if (!settings.llmModel) {
                                new Notice('No LLM model selected');
                                return;
                            }
                            try {
                                new Notice('Loading LLM model...');
                                await plugin!.ollamaService.loadModel(
                                    settings.llmModel,
                                    settings.llmModelKeepAlive
                                );
                                new Notice('✅ LLM model loaded');
                            } catch (error) {
                                new Notice(`❌ Error loading model: ${error.message}`);
                            }
                        }
                    ),
                    createExtraButtonAction(
                        'circle-plus',
                        'Download new model',
                        async () => {
                            openModal('llm');
                        }
                    ),
                    createExtraButtonAction(
                        'refresh-cw',
                        'Update the list of models',
                        async () => {
                            new Notice('Update the list of models');
                            loadLlmModels();
                        }
                    ),
                    createDropdownAction(
                        [llmModelOptions, setLlmModelOptions], // useState tuple
                        settings.llmModel,
                        debounce((value) => onUpdateSettings({llmModel: value}))
                    )
                ]}
            />


            {/* Embedding Model */}
            <SettingItem
                name='Embedding Model'
                description='Model for generating text embeddings'
                actions={[
                    createExtraButtonAction(
                        'memory-stick',
                        'Load the embedding model into memory',
                        async () => {
                            if (!settings.embeddingModel) {
                                new Notice('No embedding model selected');
                                return;
                            }
                            try {
                                new Notice('Loading embedding model...');
                                await plugin!.ollamaService.loadEmbeddingModel(
                                    settings.embeddingModel,
                                    settings.embeddingModelKeepAlive
                                );
                                new Notice('✅ LLM model loaded');
                            } catch (error) {
                                new Notice(`❌ Error loading model: ${error.message}`);
                            }
                        }
                    ),
                    createExtraButtonAction(
                        'circle-plus',
                        'Download new embedding model',
                        async () => {
                            openModal('embedding');
                        }
                    ),
                    createExtraButtonAction(
                        'refresh-cw',
                        'Update the list of embedding models',
                        async () => {
                            new Notice('Update the list of embedding models');
                            loadEmbeddingModels();
                        }
                    ),
                    createDropdownAction(
                        [embeddingModelOptions, setEmbeddingModelOptions], // useState tuple
                        settings.embeddingModel,
                        debounce((value) => onUpdateSettings({embeddingModel: value}))
                    )
                ]}
            />

            {/* ToggleAction not working */}
            <SettingItem
                name='Streaming mode'
                description='Receive responses in real-time (recommended)'
                actions={[
                    createToggleAction(
                        settings.llmStream,
                        (value) => onUpdateSettings({llmStream: value}),
                        Platform.isMobileApp
                    )
                ]}
            />

            {/* Modal Component to manage Pulling model */}
            <OllamaPullModalComponent onPullComplete={onPullComplete} />
        </div>
    );
};
