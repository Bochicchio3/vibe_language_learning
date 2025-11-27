# Repository Organization & Component Goals

This document provides a detailed overview of the `vibe_language_learning` repository structure and the specific goal of each component.

## Architecture Overview

The application follows a **client-server architecture**:
- **Frontend**: React SPA with Vite, deployed separately
- **Backend**: Python FastAPI server for AI features and processing
- **Database**: Firebase Firestore (private and public collections)
- **Queue**: Redis + Celery for background jobs

## Root Directory
- **`vite.config.js`**: Configuration for Vite, including plugins (React) and server proxy settings (for backend API).
- **`package.json`**: Frontend dependencies and scripts.
- **`postcss.config.js`**: Configuration for PostCSS (used by Tailwind).
- **`eslint.config.js`**: Linting configuration.
- **`index.html`**: Entry point for the application.
- **`public/`**: Static assets served directly (e.g., WASM files, samples).
- **`backend/`**: Python FastAPI backend server.

## Source Directory (`src/`)

### Core
- **`main.jsx`**: Application entry point. Mounts the React app and wraps it in `BrowserRouter`.
- **`App.jsx`**: Root component. Wraps the application in global providers (`AuthProvider`, `ThemeProvider`) and renders `AppRouter`.
- **`AppRouter.jsx`**: Defines the client-side routing configuration using `react-router-dom`.
- **`firebase.js`**: Firebase configuration and initialization (Auth, Firestore).

### Contexts (`src/contexts/`)
- **`AuthContext.jsx`**: Manages user authentication state (login, logout, current user) and user statistics.
- **`ThemeContext.jsx`**: Manages application theme (light/dark mode).

### Hooks (`src/hooks/`)
- **`useLibrary.js`**: Manages user's text library (saving, deleting, toggling read status). Uses DB layer.
- **`useVocab.js`**: Manages vocabulary (saving words, updating definitions, deleting). Uses DB layer.
- **`useImporter.js`**: Handles book import initiation and status polling. Delegates processing to backend.
- **`useTTS.js`**: Manages Text-to-Speech functionality using local ONNX models (Sherpa-ONNX/Kokoro).
- **`useGamification.js`**: Calculates user level, XP, and progress based on stats.

### Services (`src/services/`)

#### Database Layer (`src/services/db/`)
- **`index.js`**: Main export for all database operations.
- **`stories.js`**: Stories CRUD operations (private and public).
- **`books.js`**: Books CRUD operations (private and public).
- **`vocabulary.js`**: Vocabulary and deck management with SRS.
- **`progress.js`**: Reading progress and session tracking.
- **`chat.js`**: Chat history management.

#### API Layer (`src/services/api/`)
- **`client.js`**: API client with authentication and error handling.
- **`stories.js`**: Story generation and simplification API calls.
- **`books.js`**: Book upload and processing status API calls.
- **`news.js`**: News fetching and adaptation API calls.
- **`chat.js`**: Chat and writing analysis API calls.

#### Legacy Services (to be migrated)
- **`activityTracker.js`**: Tracks user activity (reading sessions, time spent) for gamification.
- **`feedbackService.js`**: Handles user feedback submission.
- **`gemini.js`**: Interface for Google Gemini API (story generation, deep dives).
- **`grammarGenerator.js`**: Generates grammar exercises and explanations.
- **`news.js`**: ⚠️ DEPRECATED - Use backend API instead.
- **`ollama.js`**: ⚠️ DEPRECATED - Use backend API instead.
- **`pdfProcessor.js`**: ⚠️ DEPRECATED - Processing moved to backend.
- **`readingTracker.js`**: Tracks reading progress and speed.
- **`srs.js`**: Implements Spaced Repetition System (SRS) logic for vocabulary review.
- **`translation.js`**: Handles word translation (mock or API).

### Components (`src/components/`)

#### Layout Components (`src/components/layout/`)
- **`Layout.jsx`**: Main application layout containing the sidebar/navigation and `Outlet` for page content.
- **`ChatWidget.jsx`**: Floating chat interface for AI assistance.
- **`SettingsModal.jsx`**: User settings (profile, preferences).

#### View Components (`src/components/views/`)
- **`LibraryView.jsx`**: Displays user's text library and public texts. Allows filtering and searching.
- **`BooksView.jsx`**: Displays user's book library (PDFs/EPUBs). Handles book import initiation.
- **`BookDetailView.jsx`**: Shows details of a specific book, including chapters and progress.
- **`ReaderView.jsx`**: Main reading interface for single texts. Features click-to-translate, TTS, and AI tools.
- **`ChapterReader.jsx`**: Reading interface specifically for book chapters. Handles chapter navigation and progress tracking.
- **`GeneratorView.jsx`**: Interface for generating AI stories (backend API).
- **`ImportView.jsx`**: Interface for importing single texts or raw text.
- **`VocabDashboard.jsx`**: Dashboard for reviewing vocabulary, showing SRS status and deep dive options.
- **`FlashcardView.jsx`**: Flashcard interface for reviewing vocabulary.
- **`GrammarView.jsx`**: Dashboard for grammar lessons and exercises.
- **`ChatView.jsx`**: Full-screen chat interface for language practice.
- **`ProgressView.jsx`**: Detailed analytics of user progress.
- **`ImprovementsView.jsx`**: Shows areas for improvement based on user activity.
- **`LoginView.jsx`**: Authentication screen.
- **`SpeakingPractice.jsx`**: Interface for speech recognition practice.
- **`WritingPractice.jsx`**: Interface for writing exercises.

#### Library Components (`src/components/library/`)
- **`LibraryFilters.jsx`**: Filter controls for the library view.
- **`TextCard.jsx`**: Card component representing a single text item.
- **`NewsModal.jsx`**: Modal for displaying news articles.
- **`LibraryHero.jsx`**: Hero section for the library view.
- **`StoryGeneratorModal.jsx`**: Modal for story generation.

#### Progress Components (`src/components/progress/`)
- **`ProgressCharts.jsx`**: Charts visualizing user stats.
- **`ReadingGoals.jsx`**: UI for setting and tracking reading goals.
- **`ReadingHeatmap.jsx`**: Heatmap of reading activity.
- **`ReadingHistory.jsx`**: List of recently read items.
- **`ReadingStats.jsx`**: Summary cards for reading statistics.
- **`StreakTracker.jsx`**: Visual indicator of daily streak.

#### Grammar Components (`src/components/grammar/`)
- **`GrammarTopicCard.jsx`**: Card displaying a grammar topic summary.
- **`GrammarLesson.jsx`**: Interactive grammar lesson container with tabs (Concept, Context, Exercises).
- **`GrammarExercise.jsx`**: Interactive grammar exercise manager.
- **`ConceptCard.jsx`**: Displays grammar theory and examples.
- **`ContextCard.jsx`**: Displays grammar in context (story) with highlights.
- **`GrammarLevelSelector.jsx`**: Component to select grammar difficulty.
- **`exercises/`**: Directory for specific exercise types:
    - **`ExerciseRenderer.jsx`**: Polymorphic renderer for exercises.
    - **`MultipleChoice.jsx`**: Multiple choice question component.
    - **`GapFill.jsx`**: Gap fill exercise component.
    - **`Reorder.jsx`**: Sentence reordering component.

#### Vocabulary Components (`src/components/vocabulary/`)
- **`Flashcard.jsx`**: Single flashcard component with flip animation.

#### Shared Components (`src/components/shared/`)
- **`ConfirmationModal.jsx`**: Reusable confirmation dialog.
- **`FeedbackModal.jsx`**: Modal for submitting app feedback.
- **`GamificationComponents.jsx`**: Reusable UI elements for gamification (badges, XP bars).

### Utils (`src/utils/`)
- **`textUtils.js`**: Helper functions for text processing (tokenization, context extraction).

### Workers (`src/workers/`)
- **`sherpa.worker.js`**: Web Worker for running Sherpa-ONNX TTS models off the main thread.

## Backend Directory (`backend/`)

### Core
- **`main.py`**: FastAPI application entry point with route registration.
- **`config.py`**: Configuration management with environment variables.
- **`.env.example`**: Environment variable template.
- **`requirements.txt`**: Python dependencies.
- **`README.md`**: Backend setup and deployment instructions.

### Services (`backend/services/`)
- **`llm.py`**: LLM service using LiteLLM for unified interface (Ollama, OpenAI, Anthropic, Gemini).
- **`document_processor.py`**: PDF/EPUB processing with Docling.
- **`news_parser.py`**: RSS feed fetching and article content extraction.
- **`firebase_service.py`**: Firebase Admin SDK integration (TODO).
- **`queue.py`**: Celery task queue for background processing (TODO).

### Routes (`backend/routes/`)
- **`stories.py`**: Story generation, simplification, and question generation endpoints.
- **`news.py`**: News fetching and adaptation endpoints.
- **`chat.py`**: Chat, hints, and writing analysis endpoints.
- **`books.py`**: Book upload and processing endpoints (TODO).
- **`grammar.py`**: Grammar explanation, exercise generation, and context card endpoints.

### Models (`backend/models/`)
- **`grammar.py`**: Pydantic models for grammar concepts, exercises, and context cards.

### Tests (`backend/tests/`)
- **`unit/`**: Unit tests for backend services.
- **`integration/`**: Integration tests (e.g., `test_docling_real.py`).

## Tests Directory (`tests/`)
- **`unit/`**: Unit tests (e.g., `tts.test.js`).
- **`integration/`**: Integration and pipeline tests (`test_pipeline.js`, `verify_pipeline.py`, `setup.js`).
- **`tools/`**: Utility scripts for testing (`inspect_text.py`, `test_translation.js`).
- **`outputs/`**: Generated test output files (gitignored).
- **`test_runner.js`**: Main script to run all tests.

## Public Directory (`public/`)
- **`samples/`**: Contains seed data and test files (e.g., `ein_neues_leben.json`, `Vita_e_avventure_di_Robinson_Crusoè.pdf`).
- **`wasm/`**: Static WASM files for TTS.

## Documentation Directory (`docs/`)
- **`repository_structure.md`**: This file - repository organization.
- **`database_schema.md`**: Complete database schema documentation.
- **`visual_behavior_tests.md`**: Manual visual verification tests.

## Scripts Directory (`scripts/`)
- **`update_imports.sh`**: Script to batch update import paths after reorganization.

