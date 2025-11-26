# Repository Organization & Component Goals

This document provides a detailed overview of the `vibe_language_learning` repository structure and the specific goal of each component.

## Root Directory
- **`vite.config.js`**: Configuration for Vite, including plugins (React) and server proxy settings (for Ollama).
- **`package.json`**: Project metadata, dependencies, and scripts.
- **`postcss.config.js`**: Configuration for PostCSS (used by Tailwind).
- **`eslint.config.js`**: Linting configuration.
- **`index.html`**: Entry point for the application.
- **`public/`**: Static assets served directly (e.g., WASM files, samples).

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
- **`useLibrary.js`**: Manages user's text library (saving, deleting, toggling read status). Interacts with Firestore.
- **`useVocab.js`**: Manages vocabulary (saving words, updating definitions, deleting). Handles translation logic.
- **`useImporter.js`**: Handles the complex process of importing books (PDF/EPUB), including text extraction, chunking, and AI adaptation.
- **`useTTS.js`**: Manages Text-to-Speech functionality using local ONNX models (Sherpa-ONNX/Kokoro).
- **`useGamification.js`**: Calculates user level, XP, and progress based on stats.

### Services (`src/services/`)
- **`activityTracker.js`**: Tracks user activity (reading sessions, time spent) for gamification.
- **`feedbackService.js`**: Handles user feedback submission.
- **`gemini.js`**: Interface for Google Gemini API (story generation, deep dives).
- **`grammarGenerator.js`**: Generates grammar exercises and explanations.
- **`news.js`**: Fetches news articles for the library.
- **`ollama.js`**: Interface for local Ollama API (story generation, simplification, explanation).
- **`pdfProcessor.js`**: Utilities for extracting text from PDFs.
- **`readingTracker.js`**: Tracks reading progress and speed.
- **`srs.js`**: Implements Spaced Repetition System (SRS) logic for vocabulary review.
- **`translation.js`**: Handles word translation (mock or API).

### Components (`src/components/`)

#### Layout & Navigation
- **`Layout.jsx`**: Main application layout containing the sidebar/navigation and `Outlet` for page content.
- **`ChatWidget.jsx`**: Floating chat interface for AI assistance.
- **`SettingsModal.jsx`**: User settings (profile, preferences).

#### Views (Pages)

- **`LibraryView.jsx`**: Displays user's text library and public texts. Allows filtering and searching.
- **`BooksView.jsx`**: Displays user's book library (PDFs/EPUBs). Handles book import initiation.
- **`BookDetailView.jsx`**: Shows details of a specific book, including chapters and progress.
- **`ReaderView.jsx`**: Main reading interface for single texts. Features click-to-translate, TTS, and AI tools.
- **`ChapterReader.jsx`**: Reading interface specifically for book chapters. Handles chapter navigation and progress tracking.
- **`GeneratorView.jsx`**: Interface for generating AI stories (Gemini/Ollama).
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

#### Feature Components
- **`GamificationComponents.jsx`**: Reusable UI elements for gamification (badges, XP bars).
- **`GrammarTopicCard.jsx`**: Card displaying a grammar topic summary.
- **`GrammarLesson.jsx`**: Interactive grammar lesson component.
- **`GrammarExercise.jsx`**: Interactive grammar exercise component.
- **`GrammarLevelSelector.jsx`**: Component to select grammar difficulty.
- **`Flashcard.jsx`**: Single flashcard component with flip animation.
- **`FeedbackModal.jsx`**: Modal for submitting app feedback.

#### Library Components (`src/components/library/`)
- **`LibraryFilters.jsx`**: Filter controls for the library view.
- **`TextCard.jsx`**: Card component representing a single text item.
- **`NewsModal.jsx`**: Modal for displaying news articles.
- **`LibraryHero.jsx`**: Hero section for the library view.

#### Progress Components (`src/components/progress/`)
- **`ProgressCharts.jsx`**: Charts visualizing user stats.
- **`ReadingGoals.jsx`**: UI for setting and tracking reading goals.
- **`ReadingHeatmap.jsx`**: Heatmap of reading activity.
- **`ReadingHistory.jsx`**: List of recently read items.
- **`ReadingStats.jsx`**: Summary cards for reading statistics.
- **`StreakTracker.jsx`**: Visual indicator of daily streak.

### Utils (`src/utils/`)
- **`textUtils.js`**: Helper functions for text processing (tokenization, context extraction).

### Workers (`src/workers/`)
- **`sherpa.worker.js`**: Web Worker for running Sherpa-ONNX TTS models off the main thread.

## Tests Directory (`tests/`)
- **`unit/`**: Unit tests (e.g., `tts.test.js`).
- **`integration/`**: Integration and pipeline tests (`test_pipeline.js`, `verify_pipeline.py`, `setup.js`).
- **`tools/`**: Utility scripts for testing (`inspect_text.py`, `test_translation.js`).
- **`outputs/`**: Generated test output files (gitignored).
- **`test_runner.js`**: Main script to run all tests.

## Public Directory (`public/`)
- **`samples/`**: Contains seed data and test files (e.g., `ein_neues_leben.json`, `Vita_e_avventure_di_Robinson_Crusoè.pdf`).
- **`wasm/`**: Static WASM files for TTS.
