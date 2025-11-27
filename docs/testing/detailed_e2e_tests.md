# Detailed End-to-End (E2E) Test Scenarios

This document outlines comprehensive test scenarios for the `vibe_language_learning` application. These tests are designed to be run manually or automated via E2E testing tools (e.g., Cypress, Playwright).

## 1. Authentication & User Management

### 1.1 Guest Access
**Goal**: Verify that a user can access the app without logging in.
1.  **Pre-condition**: User is logged out.
2.  **Action**: Navigate to the root URL (`/`).
3.  **Expected Result**: User is redirected to `/login` or sees a "Continue as Guest" option.
4.  **Action**: Click "Continue as Guest".
5.  **Expected Result**: User is redirected to `/library`. Sidebar shows "Guest" or similar indicator.

### 1.2 User Login (Firebase)
**Goal**: Verify successful login with existing credentials.
1.  **Action**: Navigate to `/login`.
2.  **Action**: Enter valid email and password.
3.  **Action**: Click "Login".
4.  **Expected Result**: User is redirected to `/library`. User profile data is loaded.

## 2. Library Management

### 2.1 View Library
**Goal**: Verify the library displays available texts.
1.  **Action**: Navigate to `/library`.
2.  **Expected Result**:
    -   A grid of text cards is displayed.
    -   Each card shows Title, Level (A1-C1), Word Count, and Read Time.
    -   "Add Text" button is visible.

### 2.2 Filtering & Search
**Goal**: Verify filtering by level and searching by title.
1.  **Action**: Click on "A1" filter.
2.  **Expected Result**: Only texts marked as "A1" are shown.
3.  **Action**: Type a known title in the search bar.
4.  **Expected Result**: The list filters to show only matching texts.

### 2.3 Add New Text (Manual)
**Goal**: Verify adding a new text manually.
1.  **Action**: Click "Add Text".
2.  **Action**: Fill in Title, Content, and select Level.
3.  **Action**: Click "Save".
4.  **Expected Result**: The new text appears in the library list.

## 3. Reader Experience

### 3.1 Text Navigation
**Goal**: Verify opening a text.
1.  **Action**: Click on a text card in the library.
2.  **Expected Result**: URL changes to `/read/:id`. Text content is displayed.

### 3.2 Instant Translation
**Goal**: Verify word translation on click.
1.  **Action**: Click on any word in the text.
2.  **Expected Result**: A tooltip appears above/below the word showing the translation in the target language.

### 3.3 Text-to-Speech (TTS)
**Goal**: Verify audio playback and highlighting.
1.  **Action**: Click the "Play" (Speaker) icon.
2.  **Expected Result**:
    -   Audio starts playing.
    -   The current sentence is highlighted.
    -   Icon changes to "Pause" or "Stop".
3.  **Action**: Click "Stop".
4.  **Expected Result**: Audio stops, highlighting is removed.

### 3.4 AI Tools (Requires Backend)
**Goal**: Verify AI assistance features.
1.  **Action**: Click "Simplify Text" (if available).
2.  **Expected Result**: A modal opens with a simplified version of the text.
3.  **Action**: Click "Explain Grammar" on a selected sentence.
4.  **Expected Result**: A modal explains the grammar structure.

## 4. Books & Import (Beta)
> **Note**: This feature is currently experiencing stability issues (Blank Page).

### 4.1 View Books Library
**Goal**: Verify books collection.
1.  **Action**: Navigate to `/books`.
2.  **Expected Result**: List of imported books is displayed.

### 4.2 Import PDF
**Goal**: Verify PDF import and chunking.
1.  **Action**: Click "Import Book".
2.  **Action**: Upload a valid PDF.
3.  **Expected Result**:
    -   Processing indicator shows "Extracting" -> "Chunking".
    -   Preview of text is shown.
4.  **Action**: Confirm Import.
5.  **Expected Result**: Book is added to the library.

## 5. Vocabulary & Flashcards

### 5.1 Dashboard Stats
**Goal**: Verify vocabulary statistics.
1.  **Action**: Navigate to `/vocab`.
2.  **Expected Result**: "Total Words", "Due for Review", and "Mastered" counts match the database state.

### 5.2 Flashcard Review
**Goal**: Verify the spaced repetition flow.
1.  **Action**: Click "Practice Flashcards".
2.  **Expected Result**: A flashcard is shown with the front side (Word).
3.  **Action**: Click "Flip".
4.  **Expected Result**: Back side (Definition/Translation) is revealed.
5.  **Action**: Click "Hard", "Good", or "Easy".
6.  **Expected Result**: The card is saved with updated interval, and the next card appears.
