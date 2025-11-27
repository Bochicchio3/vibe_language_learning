# Vibe Language Learning - Backend Architecture Summary

## Overview
The backend is a **Python FastAPI** application serving as the intelligence and processing layer for the Vibe Language Learning platform. It handles heavy-lifting tasks like AI generation, document processing, and background jobs, allowing the frontend to remain lightweight.

## Core Architecture
- **Framework**: FastAPI (Python 3.10+)
- **AI Engine**: `LiteLLM` providing a unified interface across providers (Ollama, OpenAI, Anthropic, Gemini).
- **Task Queue**: **Celery + Redis** for background processing (e.g., parsing large books).
- **Document Processing**: **Docling** for robust PDF/EPUB text extraction.
- **Database**: Interacts with **Firebase Firestore** (via `firebase-admin`) to update user data from background tasks.

## Key Components & Roles

| Component | Role | Status |
| :--- | :--- | :--- |
| **`services/llm.py`** | **The Brain**. Handles all AI logic: generating stories, simplifying text, explaining grammar, role-play chat, and writing analysis. | ✅ Implemented |
| **`services/document_processor.py`** | **The Reader**. Parses uploaded PDFs/EPUBs, extracts text/metadata, and chunks content for the library. | ✅ Implemented |
| **`services/queue.py`** | **The Worker**. Celery tasks that run in the background to process book uploads, adapt chapters, and generate grammar content without blocking the API. | ✅ Implemented |
| **`celery_worker.py`** | **The Entrypoint**. Starts the Celery worker process and registers all tasks. | ✅ Implemented |
| **`services/news_parser.py`** | **The Reporter**. Fetches and parses RSS feeds to provide current news articles for learning. | ✅ Implemented |
| **`routes/`** | **The Interface**. REST endpoints (`/api/stories`, `/api/chat`, etc.) that the React frontend calls. | ✅ Implemented |

## Current Capabilities
1.  **AI Content Generation**: Generates stories, simplifies existing text to specific CEFR levels, and creates comprehension questions.
2.  **Interactive Learning**: Supports role-play chat scenarios and provides real-time writing analysis/correction.
3.  **Book Import**: Processes raw files (PDF/EPUB) in the background, chunking them into chapters and optionally adapting them to the user's level.
4.  **News**: Aggregates real-world news content for learning materials.

## Next Steps
- **Frontend Integration**: Migrate React app to use these endpoints instead of legacy JS services.
- **Prompt Tuning**: Refine prompts in `llm.py` for better pedagogical results.
- **Feature Expansion**: Implement `extract_vocabulary` task and specific grammar exercises.
