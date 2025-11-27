# Visual Behavior Tests

This document outlines the manual visual verification steps to ensure the core features of `vibe_language_learning` are working correctly.

**Prerequisites**: 
- Frontend dev server running (`npm run dev`)
- Backend server running (`cd backend && python main.py`)
- Ollama running for AI features (`ollama serve`)

## 1. Authentication & Onboarding
- [ ] **Login**: Verify the login screen appears. Enter credentials (if applicable) or use guest access.


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
    - [ ] **AI Tools**: Click "Simplify" or "Explain". Verify the AI modal appears and processes via backend API.

## 3. Book Import & Reading
- [ ] **Books Library**: Navigate to "Books". Verify the list of books loads.
- [ ] **Import Flow** (Note: Backend queue not yet implemented):
    - [ ] Click "Import Book".
    - [ ] Upload a PDF.
    - [ ] Verify the processing steps are displayed.
    - [ ] ⚠️ Currently processes in frontend - will be moved to backend queue in future update.
- [ ] **Book Detail**: Click on a book. Verify the chapter list is displayed.
- [ ] **Chapter Reader**: Click a chapter. Verify the `ChapterReader` loads with content.

## 4. Vocabulary & Flashcards
- [ ] **Vocab Dashboard**: Navigate to "Vocabulary". Verify the list of saved words is displayed.
- [ ] **Stats**: Verify the "Total Words", "Due", and "Mastered" counts are visible.
- [ ] **Flashcards**: Click "Practice Flashcards".
    - [ ] Verify a card is shown.
    - [ ] Click "Flip". Verify the definition is revealed.
    - [ ] Click a rating (Hard/Good/Easy). Verify the next card loads.

## 5. AI Generation (Backend Required)
- [ ] **Generator View**: Navigate to "Generator".
- [ ] **Form**: Select a topic and level.
- [ ] **Generate**: Click "Generate Story". 
    - [ ] Verify loading state appears.
    - [ ] Verify story is generated via backend API.
    - [ ] Check browser console - should show API request to `/api/stories/generate`.
    - [ ] Verify generated text is displayed.

## 6. News (Backend Required)
- [ ] **News Modal**: Open news modal in Library view.
- [ ] **Categories**: Verify news categories load from backend.
- [ ] **Articles**: Select a category and verify articles load.
- [ ] **Adaptation**: Click "Adapt to Level" and verify article is processed via backend.

## 7. Chat (Backend Required)
- [ ] **Chat View**: Navigate to "Chat".
- [ ] **Send Message**: Type a message and send.
    - [ ] Verify message appears in chat history.
    - [ ] Verify AI response is generated via backend.
- [ ] **Hints**: Click "Get Hint" button.
    - [ ] Verify hints are generated via backend API.

## 8. Layout & Responsiveness
- [ ] **Sidebar**: Verify the sidebar is collapsible (if implemented) or responsive on smaller screens.
- [ ] **Dark Mode**: Toggle the theme. Verify colors update correctly across the app.

## 9. Backend Integration
- [ ] **API Health**: Visit http://localhost:8000/health and verify backend is running.
- [ ] **API Docs**: Visit http://localhost:8000/docs and verify Swagger UI loads.
- [ ] **Console Logs**: Check browser console for successful API calls (no CORS errors).
- [ ] **Network Tab**: Verify API requests go to `/api/*` and are proxied to backend.
