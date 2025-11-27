# Database Schema

This document defines the complete database schema for the Vibe Language Learning application using Firebase Firestore.

## Architecture Overview

The database is organized into **private** and **public** collections:

- **Private Collections**: User-specific data stored under `/users/{userId}/...`
- **Public Collections**: Community-shared data stored at root level

## Schema Diagram

<div class="mermaid-wrapper">
  --8<-- "docs/assets/schema.svg"
</div>
<div class="zoom-controls" style="margin-top: 10px; text-align: center;">
  <button class="md-button" id="zoom-in">Zoom In (+)</button>
  <button class="md-button" id="zoom-out">Zoom Out (-)</button>
  <button class="md-button" id="zoom-reset">Reset</button>
</div>

## Collection Structure

```
/users/{userId}/
├── profile (document)
├── stories/ (collection)
├── books/ (collection)
├── vocabulary/ (collection)
├── decks/ (collection)
├── progress/ (collection)
├── reading_sessions/ (collection)
├── chat_history/ (collection)
└── settings (document)

/public_stories/ (collection)
/public_books/ (collection)
/processing_queue/ (collection)
```

---

## User Profile

**Path**: `/users/{userId}/profile`

**Type**: Document

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `uid` | string | User ID (matches auth) |
| `email` | string | User email |
| `displayName` | string | User display name |
| `targetLanguage` | string | Primary learning language (e.g., "German") |
| `nativeLanguage` | string | User's native language (e.g., "English") |
| `createdAt` | timestamp | Account creation date |
| `lastActive` | timestamp | Last activity timestamp |
| `stats` | object | User statistics (see below) |

**Stats Object**:
```javascript
{
  totalWordsRead: number,
  totalTimeMinutes: number,
  currentStreak: number,
  longestStreak: number,
  level: number,
  xp: number,
  textsCompleted: number,
  booksCompleted: number
}
```

---

## Stories Collection (Private)

**Path**: `/users/{userId}/stories/{storyId}`

**Purpose**: User's private stories (generated or imported)

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Story ID |
| `title` | string | Story title |
| `content` | string | Full story text |
| `level` | string | CEFR level (A1, A2, B1, B2, C1, C2) |
| `targetLanguage` | string | Language of the story |
| `source` | string | "ai_generated", "imported", "news", "user_created" |
| `sourceModel` | string | AI model used (if generated) |
| `topic` | string | Story topic/theme |
| `wordCount` | number | Total word count |
| `isRead` | boolean | Whether user has read it |
| `readProgress` | number | Reading progress (0-100) |
| `createdAt` | timestamp | Creation date |
| `lastReadAt` | timestamp | Last read date |
| `isPublic` | boolean | Whether shared to public collection |
| `tags` | array | Custom tags |
| `metadata` | object | Additional metadata |

**Indexes**:
- `level` (for filtering)
- `isRead` (for filtering)
- `createdAt` (for sorting)

---

## Stories Collection (Public)

**Path**: `/public_stories/{storyId}`

**Purpose**: Community-shared stories

**Fields**: Same as private stories, plus:
| Field | Type | Description |
|-------|------|-------------|
| `authorId` | string | User ID of creator |
| `authorName` | string | Display name of creator |
| `views` | number | View count |
| `likes` | number | Like count |
| `publishedAt` | timestamp | Publication date |

**Indexes**:
- `level` (for filtering)
- `targetLanguage` (for filtering)
- `publishedAt` (for sorting)
- `views` (for sorting by popularity)

---

## Books Collection (Private)

**Path**: `/users/{userId}/books/{bookId}`

**Purpose**: User's imported books (PDFs/EPUBs)

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Book ID |
| `title` | string | Book title |
| `author` | string | Book author |
| `level` | string | CEFR level |
| `targetLanguage` | string | Language of the book |
| `originalFile` | string | Original filename |
| `fileType` | string | "pdf" or "epub" |
| `coverImage` | string | Cover image URL (optional) |
| `chapters` | array | Array of chapter objects (see below) |
| `totalChapters` | number | Total number of chapters |
| `currentChapter` | number | Last read chapter index |
| `isAdapted` | boolean | Whether AI adaptation was applied |
| `currentProcessingChapter` | number \| null | Chapter currently being processed (null if done) |
| `createdAt` | timestamp | Import date |
| `lastReadAt` | timestamp | Last read date |
| `isPublic` | boolean | Whether shared to public collection |
| `metadata` | object | Additional metadata |

**Chapter Object**:
```javascript
{
  title: string,           // Chapter title
  content: string,         // Chapter text
  wordCount: number,       // Word count
  isAdapted: boolean,      // Whether this chapter is adapted
  readProgress: number,    // 0-100
  isCompleted: boolean     // Whether user finished reading
}
```

**Indexes**:
- `level` (for filtering)
- `createdAt` (for sorting)
- `currentProcessingChapter` (for finding books in processing)

---

## Books Collection (Public)

**Path**: `/public_books/{bookId}`

**Purpose**: Community-shared books

**Fields**: Same as private books, plus:
| Field | Type | Description |
|-------|------|-------------|
| `authorId` | string | User ID of uploader |
| `authorName` | string | Display name of uploader |
| `downloads` | number | Download count |
| `publishedAt` | timestamp | Publication date |

---

## Vocabulary Collection

**Path**: `/users/{userId}/vocabulary/{wordId}`

**Purpose**: User's saved vocabulary words

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Word ID |
| `word` | string | The word/phrase (lowercase) |
| `definition` | string | Definition or translation |
| `context` | string | Example sentence |
| `targetLanguage` | string | Language of the word |
| `nativeLanguage` | string | Language of definition |
| `gender` | string \| null | Grammatical gender (if applicable) |
| `deckId` | string | Associated deck ID |
| `sourceType` | string | "story", "book", "manual", "news" |
| `sourceId` | string | ID of source (story/book/etc) |
| `srsData` | object | SRS algorithm data (see below) |
| `createdAt` | timestamp | Date word was saved |
| `lastReviewedAt` | timestamp | Last review date |
| `timesReviewed` | number | Review count |
| `isMastered` | boolean | Whether word is mastered |

**SRS Data Object**:
```javascript
{
  interval: number,        // Days until next review
  repetitions: number,     // Number of successful reviews
  easeFactor: number,      // Ease factor (SM-2 algorithm)
  nextReview: timestamp,   // Next review date
  lastRating: number       // Last rating (1-5)
}
```

**Indexes**:
- `deckId` (for filtering by deck)
- `nextReview` (for finding due cards)
- `isMastered` (for filtering)

---

## Decks Collection

**Path**: `/users/{userId}/decks/{deckId}`

**Purpose**: Vocabulary deck organization

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Deck ID |
| `name` | string | Deck name |
| `description` | string | Deck description |
| `sourceType` | string | "story", "book", "manual", "topic" |
| `sourceId` | string \| null | ID of source (if applicable) |
| `wordCount` | number | Total words in deck |
| `dueCount` | number | Words due for review |
| `masteredCount` | number | Mastered words |
| `createdAt` | timestamp | Creation date |
| `lastStudiedAt` | timestamp | Last study session |

**Indexes**:
- `sourceType` (for filtering)
- `lastStudiedAt` (for sorting)

---

---

## Grammar Lessons Collection (Private)

**Path**: `/users/{userId}/grammar_lessons/{lessonId}`

**Purpose**: Store generated lesson content (Concept + Context + Exercises)

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Lesson ID (e.g., "present_tense_a1") |
| `topic` | string | Grammar topic |
| `level` | string | CEFR level |
| `concept` | object | ConceptCard data |
| `context` | object | ContextCard data (optional) |
| `exercises` | array | Array of exercise objects |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update |

**Indexes**:
- `topic` (for filtering)
- `level` (for filtering)

---

## Grammar Progress Collection (Private)

**Path**: `/users/{userId}/grammar_progress/{lessonId}`

**Purpose**: Track user scores and completion status

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Lesson ID (matches grammar_lessons) |
| `isCompleted` | boolean | Whether lesson is completed |
| `score` | number | Best score (0-100) |
| `exercisesCompleted` | number | Number of exercises finished |
| `totalExercises` | number | Total exercises in pack |
| `lastAttemptAt` | timestamp | Last practice time |
| `history` | array | Array of past attempt scores |

**Indexes**:
- `isCompleted` (for filtering)
- `score` (for sorting)

---


**Path**: `/users/{userId}/progress/{itemId}`

**Purpose**: Reading progress tracking for stories/chapters

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Progress ID (matches story/chapter ID) |
| `itemType` | string | "story" or "chapter" |
| `itemId` | string | Story or chapter ID |
| `progress` | number | Progress percentage (0-100) |
| `isCompleted` | boolean | Whether item is completed |
| `startedAt` | timestamp | First read date |
| `completedAt` | timestamp \| null | Completion date |
| `lastReadAt` | timestamp | Last read date |
| `timeSpentMinutes` | number | Total time spent reading |

**Indexes**:
- `itemType` (for filtering)
- `isCompleted` (for filtering)
- `lastReadAt` (for sorting)

---

## Reading Sessions Collection

**Path**: `/users/{userId}/reading_sessions/{sessionId}`

**Purpose**: Detailed reading session tracking for analytics

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Session ID |
| `itemType` | string | "story", "chapter", "news" |
| `itemId` | string | Item ID |
| `itemTitle` | string | Item title (denormalized) |
| `startTime` | timestamp | Session start |
| `endTime` | timestamp | Session end |
| `durationMinutes` | number | Session duration |
| `wordsRead` | number | Estimated words read |
| `newWordsEncountered` | number | New vocabulary encountered |
| `date` | string | Date string (YYYY-MM-DD) for heatmap |

**Indexes**:
- `date` (for heatmap queries)
- `startTime` (for sorting)

---

## Chat History Collection

**Path**: `/users/{userId}/chat_history/{conversationId}`

**Purpose**: AI chat conversation history

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Conversation ID |
| `scenario` | string | Chat scenario (e.g., "restaurant", "doctor") |
| `messages` | array | Array of message objects (see below) |
| `createdAt` | timestamp | Conversation start |
| `lastMessageAt` | timestamp | Last message timestamp |
| `messageCount` | number | Total messages |

**Message Object**:
```javascript
{
  role: string,           // "user" or "assistant"
  content: string,        // Message text
  timestamp: timestamp    // Message timestamp
}
```

**Indexes**:
- `lastMessageAt` (for sorting)

---

## Processing Queue Collection

**Path**: `/processing_queue/{jobId}`

**Purpose**: Track background processing jobs (book imports, etc.)

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Job ID |
| `userId` | string | User ID |
| `jobType` | string | "book_import", "chapter_adaptation", "vocab_extraction" |
| `status` | string | "pending", "processing", "completed", "failed" |
| `targetId` | string | ID of target resource (book ID, etc.) |
| `progress` | number | Progress percentage (0-100) |
| `currentStep` | string | Current processing step description |
| `totalSteps` | number | Total steps in job |
| `completedSteps` | number | Completed steps |
| `error` | string \| null | Error message (if failed) |
| `createdAt` | timestamp | Job creation time |
| `startedAt` | timestamp \| null | Processing start time |
| `completedAt` | timestamp \| null | Completion time |
| `metadata` | object | Job-specific metadata |

**Indexes**:
- `userId` (for user's jobs)
- `status` (for finding pending jobs)
- `createdAt` (for sorting)

---

## User Settings

**Path**: `/users/{userId}/settings`

**Type**: Document

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `theme` | string | "light" or "dark" |
| `ttsEnabled` | boolean | TTS feature enabled |
| `ttsVoice` | string | Preferred TTS voice |
| `autoTranslate` | boolean | Auto-translate on click |
| `defaultLevel` | string | Default CEFR level for content |
| `dailyGoal` | number | Daily reading goal (minutes) |
| `notifications` | object | Notification preferences |

---

## Firebase Security Rules

### Private Collections

All collections under `/users/{userId}/` should have:

```javascript
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Public Collections

```javascript
match /public_stories/{storyId} {
  allow read: if true;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && 
    request.auth.uid == resource.data.authorId;
}

match /public_books/{bookId} {
  allow read: if true;
  allow create: if request.auth != null;
  allow update, delete: if request.auth != null && 
    request.auth.uid == resource.data.authorId;
}
```

### Processing Queue

```javascript
match /processing_queue/{jobId} {
  allow read: if request.auth != null && 
    request.auth.uid == resource.data.userId;
  allow create: if request.auth != null;
  // Backend service account can update
}
```

---

## Data Migration Notes

When implementing this schema:

1. **Existing Data**: Migrate existing stories/books to new structure
2. **Backward Compatibility**: Keep old fields during transition period
3. **Batch Operations**: Use batch writes for atomic updates
4. **Indexes**: Create indexes before querying to avoid performance issues
