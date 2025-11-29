/**
 * Database service layer
 * Centralized exports for all database operations
 */

// Stories
export {
    getPrivateStories,
    getPrivateStory,
    savePrivateStory,
    updatePrivateStory,
    deletePrivateStory,
    toggleStoryReadStatus,
    getPublicStories,
    getPublicStory,
    publishStory,
    unpublishStory,
    incrementStoryViews
} from './stories';

// Books
export {
    getPrivateBooks,
    getPrivateBook,
    savePrivateBook,
    updatePrivateBook,
    updateBookChapter,
    getBookProcessingStatus,
    deletePrivateBook,
    updateCurrentChapter,
    getPublicBooks,
    getPublicBook,
    publishBook,
    unpublishBook,
    incrementBookDownloads
} from './books';

// Vocabulary
export {
    getAllVocabulary,
    getVocabularyByDeck,
    getDueVocabulary,
    getWord,
    findExistingWord,
    saveWord,
    updateWord,
    updateWordSRS,
    deleteWord,
    getAllDecks,
    getDeck,
    createDeck,
    updateDeckStats,
    deleteDeck
} from './vocabulary';

// Progress
export {
    getProgress,
    getAllProgress,
    saveProgress,
    markAsCompleted,
    saveReadingSession,
    getReadingSessions,
    getReadingSessionsByDateRange,
    getReadingHistory,
    getProgressStats
} from './progress';

// Chat
export {
    getAllConversations,
    getConversation,
    getChatMessages,
    saveChatMessage,
    createConversation,
    deleteConversation,
    clearAllChatHistory
} from './chat';
