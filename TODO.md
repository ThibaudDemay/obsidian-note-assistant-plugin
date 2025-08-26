# TODO

## Current

## Backlog

### Features
- [ ] Add ability to choose message to pass in context, currently only X messages is passed based on settings.
- [ ] Add ability to choose file to pass in context, currently similar notes are passed using embeddings.
- [ ] Enhancement of embeddings
  - [X] Better format to store embeddings (currently just JSON), maybe use a binary format for vector inside json ? or fully binary format ?
  - [ ] Change hashing maybe to faster and smaller hash then sha256 implementation by AI ? (benchmark needed and compatibility with Obsidian mobile)
  - [ ] Add ability to choose to process sections or full note for embeddings, currently only sections are processed.
  - [ ] Enhance embedding generation of section to be smarter, with including at least title of note, and maybe some metadata.
- [ ] Obisidian mobile support
  - [ ] Test if embeddings can be stored and used from Obsidian mobile (probably yes, but need to test performance and storage space)
  - [ ] Test if UI is usable on mobile (probably not, need to adapt UI for mobile)
    - [ ] Chat view adaptation for mobile (need to be redesigned for small screen)
    - [ ] SettingTab view horizontal scroll on small screen
- [ ] Ability to export/import conversations (MD format ?) inside Obsidian vault
- [ ] Ability to edit vault files from chat (with confirmation)
- [ ] Make ContextManager ? to manage context messages and files to pass to LLM, to extract from ChatView
- [ ] Add ability to counter token usage (ContextManager) and retrieve cost of each model (LLM and embedding) using Ollama API
- [ ] Extract logic from react components to hooks or services to make components more focused on UI
- [ ] Enhance linked notes in chat messages, UI is too big.
- [ ] Re-Check for dead code and remove it
- [ ] i18n support

### Bugs
- [ ] Bug: When ollama base url is changed, the models (LLM or embedding) are not re-fetched
- [ ] Bug: When we send a message, the loading 3 dots are not shown anymore

### Chores
- [ ] github actions for CI/CD to release on Obsidian community plugins ?

## Done

- [X] Scraper for registry.ollama.ai
- [X] ObisidianIcon (shared React)
- [X] React Context (App, Plugin)
- [X] React Hooks (SettingItem)
- [X] ReWork SettingTab
  - [X] UI using react
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
- [X] ReWork Chat
  - [X] UI using react
    - [X] Chat react view
    - [X] ChatHeader with some controls (Timestamp, Similar Notes)
    - [X] ChatMessages and ChatMessage, with message history
    - [X] ChatControls with model choice, embedding regeneration, stream toggle
    - [X] ChatInput with text and buttons
    - [X] Chat Conversation management (new, delete, rename)
    - [X] Chat state "No Conversation" to list or create conversation
- [X] Found way to make "State" of settings variable to sync SettingTab and Chat