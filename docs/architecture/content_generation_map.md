# Content Generation Request Map

This document maps all AI content generation requests triggered by the frontend views. It serves as a reference for understanding which features rely on AI and what specific operations are performed.

## Overview

The application uses AI for various tasks ranging from generating entire stories to providing granular explanations of grammar. These requests are currently handled by a mix of legacy direct service calls (`services/ollama.js`, `services/gemini.js`) and the new backend API.

## Request Map by View

### 1. Generator View & Story Generator Modal
**Files**: `src/components/views/GeneratorView.jsx`, `src/components/library/StoryGeneratorModal.jsx`

| Feature | Function | Service | Description |
| :--- | :--- | :--- | :--- |
| **Story Generation** | `generateStory` | `gemini.js` / `ollama.js` | Generates a full story based on topic, level, and length. |

### 2. Reader View & Chapter Reader
**Files**: `src/components/views/ReaderView.jsx`, `src/components/views/ChapterReader.jsx`

| Feature | Function | Service | Description |
| :--- | :--- | :--- | :--- |
| **Simplify Text** | `simplifyStory` | `ollama.js` | Rewrites the current text to a lower CEFR level (e.g., "A1"). |
| **Explain Grammar** | `explainText` | `ollama.js` | Explains the grammar of the selected text. Template: `'grammar'`. |
| **Explain Sentence** | `explainText` | `ollama.js` | Explains the meaning and structure of the selected sentence. Template: `'sentence'`. |
| **Explain Word** | `explainText` | `ollama.js` | Defines the selected word/phrase in context. Template: `'word'`. |
| **Quiz Generation** | `generateComprehensionQuestions` | `ollama.js` | Generates multiple-choice questions based on the text. |

### 3. Writing Practice
**File**: `src/components/views/WritingPractice.jsx`

| Feature | Function | Service | Description |
| :--- | :--- | :--- | :--- |
| **Writing Analysis** | `analyzeWriting` | `gemini.js` / `ollama.js` | Analyzes user input for grammar, vocabulary, and style errors, providing corrections. |

### 4. Speaking Practice (Role Play)
**File**: `src/components/views/SpeakingPractice.jsx`

| Feature | Function | Service | Description |
| :--- | :--- | :--- | :--- |
| **Role Play Response** | `generateRolePlayResponse` | `ollama.js` | Generates the AI character's response in a role-play scenario. |
| **Generate Hint** | `generateHint` | `ollama.js` | Suggests possible responses for the user in the current conversation context. |

### 5. Chat View
**File**: `src/components/views/ChatView.jsx`

| Feature | Function | Service | Description |
| :--- | :--- | :--- | :--- |
| **General Chat** | `POST /api/chat` | `api/client.js` | Sends user message history and receives a general AI response. |

## Service Layer Status

Currently, the application is in a transition phase:

*   **Legacy**: `src/services/ollama.js` and `src/services/gemini.js` make direct calls or ad-hoc requests.
*   **Target**: All requests should eventually move to `src/services/api/client.js` calling the Python backend endpoints defined in `backend/routes/`.

### Migration Targets

*   `generateStory` -> `POST /api/stories/generate`
*   `simplifyStory` -> `POST /api/stories/simplify` (or similar)
*   `explainText` -> `POST /api/grammar/explain`
*   `analyzeWriting` -> `POST /api/grammar/analyze`
*   `generateRolePlayResponse` -> `POST /api/chat/roleplay` (to be created)
