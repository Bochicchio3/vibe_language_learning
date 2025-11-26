# Visual Behavior Tests

This document outlines the manual visual verification steps to ensure the core features of `vibe_language_learning` are working correctly.

## 1. Authentication & Onboarding
- [ ] **Login**: Verify the login screen appears. Enter credentials (if applicable) or use guest access.
- [ ] **Journey View**: Upon login, verify the "My Journey" dashboard loads with user stats (Level, XP, Streak).

## 2. Library & Reading
- [ ] **Library Navigation**: Click "Library" in the sidebar. Verify the list of texts loads.
- [ ] **Filtering**: Use the "Level" filter (e.g., A1, A2) and verify the list updates.
- [ ] **Opening a Text**: Click on a text card. Verify navigation to the `ReaderView` (`/read/:id`).
- [ ] **Reader Interface**:
    - [ ] Verify text content is displayed.
    - [ ] **Translation**: Click on a word. Verify a tooltip appears with the translation.
    - [ ] **TTS**:
        - [ ] Click the speaker icon. Verify the icon changes to a "Stop" or "Pause" state.
        - [ ] Verify no "TTS Worker Error" or "TTS not initialized" errors appear in the browser console.
        - [ ] Verify the sentence highlight moves as text is spoken (if applicable).
        - [ ] Click "Stop" or navigate away. Verify audio stops.
    - [ ] **AI Tools**: Click "Simplify" or "Explain". Verify the AI modal appears (requires backend).

## 3. Book Import & Reading
- [ ] **Books Library**: Navigate to "Books". Verify the list of books loads.
- [ ] **Import Flow**:
    - [ ] Click "Import Book".
    - [ ] Upload a PDF.
    - [ ] Verify the processing steps (Extracting -> Chunking) are displayed.
- [ ] **Book Detail**: Click on a book. Verify the chapter list is displayed.
- [ ] **Chapter Reader**: Click a chapter. Verify the `ChapterReader` loads with content.

## 4. Vocabulary & Flashcards
- [ ] **Vocab Dashboard**: Navigate to "Vocabulary". Verify the list of saved words is displayed.
- [ ] **Stats**: Verify the "Total Words", "Due", and "Mastered" counts are visible.
- [ ] **Flashcards**: Click "Practice Flashcards".
    - [ ] Verify a card is shown.
    - [ ] Click "Flip". Verify the definition is revealed.
    - [ ] Click a rating (Hard/Good/Easy). Verify the next card loads.

## 5. AI Generation
- [ ] **Generator View**: Navigate to "Generator".
- [ ] **Form**: Select a topic and level.
- [ ] **Generate**: Click "Generate Story". Verify the loading state and then the generated text (requires backend).

## 6. Layout & Responsiveness
- [ ] **Sidebar**: Verify the sidebar is collapsible (if implemented) or responsive on smaller screens.
- [ ] **Dark Mode**: Toggle the theme. Verify colors update correctly across the app.
