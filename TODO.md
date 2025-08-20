# TODO

## Current

- [ ] ReWork SettingTab
  - [X] UI using react (9/9)
    - [X] SettingTab react view
    - [X] GlobalStatus component (Ollama connection, llm model, embedding model)
    - [X] GeneralSettings component with ollama settings + LLM model + embedding model
    - [X] LlmSettings accordion + settings
    - [X] EmbeddingSettings accordion + settings
    - [X] PromptingSettings accordion + settings
    - [X] ChatSettings accordion + settings
    - [X] Sub components (Accordion, SettingItem)
    - [X] Modal pull model on Ollama
  - [X] Update settings merge `Prompting settings` and `Chat settings`, remove template things
- [ ] ReWork Chat
  - [ ] UI using react (2/5)
    - [X] Chat react view
    - [ ] ChatHeader with some controls (Timestamp, Similar Notes)
    - [X] ChatMessages and ChatMessage, with message history
    - [ ] ChatControls with model choice, embedding regeneration, stream toggle
    - [ ] ChatInput with text and button

- [ ] Found way to make "State" of settings variable to sync SettingTab and Chat

## Backlog


  
## Done

- [X] Scraper for registry.ollama.ai
- [X] ObisidianIcon (shared React)
- [X] React Context (App, Plugin)
- [X] React Hooks (SettingItem)