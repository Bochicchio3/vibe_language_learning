# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Vibe Language Learning is a German language learning application built with React, Vite, Firebase, and Tailwind CSS. It provides interactive reading experiences with vocabulary management, flashcard-based spaced repetition system (SRS), and AI-generated content using Google Gemini.

## Development Commands

### Core Development
- `npm run dev` - Start the Vite development server with hot module replacement
- `npm run build` - Build the production bundle
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint on all JavaScript/JSX files

### Notes
- No test framework is currently configured in this project
- The app uses Firebase for authentication and data storage, requiring proper API keys to function

## Architecture Overview

### Application Structure

**Entry Point**: `src/main.jsx` renders the root `App` component into the DOM.

**Main App Component** (`src/App.jsx`): This is the primary orchestrator containing:
- All view logic (Library, Reader, Vocab, Flashcards, Books, Generator)
- State management for navigation between views (`library`, `reader`, `vocab`, `add`, `generator`, `books`, `book_detail`, `chapter_reader`, `flashcards`)
- Firebase sync logic for texts and vocabulary
- Vocabulary management with real-time translation

### Key Architectural Patterns

**View-Based Routing**: The app uses a state-based view system (`view` state variable) rather than React Router. Each view is a separate component/function rendered conditionally in the main content area.

**Firebase Integration**:
- User authentication handled by `AuthContext`
- Real-time Firestore sync with `onSnapshot` listeners for texts and vocabulary
- Data structure:
  - `/users/{uid}/texts` - User's reading texts
  - `/users/{uid}/vocab` - Saved vocabulary words with translations and SRS data
  - `/users/{uid}/bookProgress` - Reading progress for multi-chapter books
  - `/books` - Global shared book collection

**Text Processing**:
- German text tokenization preserves umlauts (ä, ö, ü, ß) using regex: `/([^\wäöüÄÖÜß]+)/`
- Words are clickable in the reader to save to vocabulary
- Context sentences extracted for each saved word

### Core Services (`src/services/`)

**translation.js**: Uses unofficial Google Translate API (`translate.googleapis.com/translate_a/single`) for free German-to-English translation. No API key required.

**gemini.js**: Integrates Google Gemini AI for generating German stories at different CEFR levels (A1-C1). Returns JSON with `{title, content}`. Uses API key stored directly in file.

**srs.js**: Implements simplified SM-2 algorithm for spaced repetition:
- Grades: 'again', 'hard', 'good', 'easy'
- Manages `interval`, `repetitions`, `easeFactor`, `nextReview`, `lastReviewed`
- `isDue()` checks if card needs review

### Authentication Flow

`src/contexts/AuthContext.jsx` provides:
- Email/password signup and login
- Google OAuth login
- Auth state persistence
- `currentUser` object throughout the app

The app renders `LoginView` if no user is authenticated, otherwise renders `AuthenticatedApp`.

### Component Organization

**Main Views** (in `src/App.jsx`):
- `LibraryView` - Grid of saved texts
- `ReaderView` - Interactive text reader with clickable vocabulary
- `VocabView` - Flashcard mode for all saved words (not SRS-based)
- `AddTextView` - Form to manually add German texts
- `GeneratorView` - AI story generation interface

**Standalone Components** (`src/components/`):
- `BooksView` - Displays multi-chapter book library from global `/books` collection
- `BookDetailView` - Chapter list and progress for a selected book
- `ChapterReader` - Similar to ReaderView but for book chapters with completion tracking
- `FlashcardView` - SRS-based review session using due cards
- `Flashcard` - Individual flashcard with grade buttons
- `LoginView` - Email/password and Google auth UI
- `FirestoreTest` - Debug component (likely for testing Firestore connection)

### Data Flow

1. User authenticates → `currentUser` set in `AuthContext`
2. Firebase listeners in `useEffect` sync texts and vocab to local state
3. User interactions (saving words, adding texts) write to Firestore
4. Optimistic UI updates happen immediately, with background Firestore writes
5. SRS state updates occur after flashcard grading, immediately advancing to next card

### Styling

- Tailwind CSS for all styling (configured in `tailwind.config.js`)
- Custom 3D flip animation for flashcards using inline CSS in `App.jsx`
- Responsive design with mobile-first bottom navigation and desktop sidebar

### Firebase Configuration

Firebase config is stored directly in `src/firebase.js` with **Long Polling** enabled (`experimentalForceLongPolling: true`) due to WebSocket issues. This is important to maintain for reliability.

### API Keys

Two API keys are hardcoded in the codebase:
- Firebase config in `src/firebase.js`
- Google Gemini API key in `src/services/gemini.js`

When working with this code, avoid exposing these keys in logs or external systems.

## Development Practices

### State Management
- Component state (`useState`) is used extensively in `App.jsx`
- No external state management library (Redux, Zustand, etc.)
- Firebase provides persistence layer

### Error Handling
- Most async operations have try-catch blocks with console.error logging
- User-facing errors shown via browser `alert()` (could be improved with toast notifications)

### Code Style
- ESLint configured for React with hooks rules
- Variables matching pattern `^[A-Z_]` (likely constants/mock data) are ignored in no-unused-vars rule

### Adding New Features

**New Views**: Add a new view state option and conditional render in the main `<main>` section of `App.jsx`. Add corresponding navigation button in the sidebar/bottom navigation.

**New Components**: Place in `src/components/` directory. Import and use in `App.jsx` or other components.

**New Firebase Collections**: Follow the pattern of `/users/{uid}/{collection}` for user-specific data or `/collection` for global shared data.

**Translation/AI Features**: Extend `src/services/` modules. Both services are async and return promises.
