import { db } from '../../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';

/**
 * Vocabulary database operations
 */

// ============= VOCABULARY =============

/**
 * Get all vocabulary for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of words
 */
export const getAllVocabulary = async (userId, filters = {}) => {
    try {
        const vocabRef = collection(db, 'users', userId, 'vocabulary');
        let q = query(vocabRef, orderBy('createdAt', 'desc'));

        if (filters.deckId) {
            q = query(q, where('deckId', '==', filters.deckId));
        }
        if (filters.isMastered !== undefined) {
            q = query(q, where('isMastered', '==', filters.isMastered));
        }
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching vocabulary:', error);
        throw error;
    }
};

/**
 * Get vocabulary for a specific deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<Array>} Array of words
 */
export const getVocabularyByDeck = async (userId, deckId) => {
    return getAllVocabulary(userId, { deckId });
};

/**
 * Get due vocabulary (for SRS review)
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of due words
 */
export const getDueVocabulary = async (userId) => {
    try {
        const vocabRef = collection(db, 'users', userId, 'vocabulary');
        const now = Timestamp.now();

        const q = query(
            vocabRef,
            where('srsData.nextReview', '<=', now),
            where('isMastered', '==', false),
            orderBy('srsData.nextReview', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching due vocabulary:', error);
        throw error;
    }
};

/**
 * Get a single word
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID
 * @returns {Promise<object|null>} Word object or null
 */
export const getWord = async (userId, wordId) => {
    try {
        const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
        const snapshot = await getDoc(wordRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching word:', error);
        throw error;
    }
};

/**
 * Check if a word already exists
 * @param {string} userId - User ID
 * @param {string} word - Word to check (lowercase)
 * @param {string} deckId - Deck ID
 * @returns {Promise<object|null>} Existing word or null
 */
export const findExistingWord = async (userId, word, deckId) => {
    try {
        const vocabRef = collection(db, 'users', userId, 'vocabulary');
        const q = query(
            vocabRef,
            where('word', '==', word.toLowerCase()),
            where('deckId', '==', deckId),
            limit(1)
        );

        const snapshot = await getDocs(q);
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
        console.error('Error finding existing word:', error);
        throw error;
    }
};

/**
 * Save a word to vocabulary
 * @param {string} userId - User ID
 * @param {object} wordData - Word data
 * @param {string} deckId - Deck ID
 * @returns {Promise<object>} Saved word with ID
 */
export const saveWord = async (userId, wordData, deckId) => {
    try {
        // Check if word already exists in this deck
        const existing = await findExistingWord(userId, wordData.word, deckId);
        if (existing) {
            return existing; // Return existing word instead of creating duplicate
        }

        const vocabRef = collection(db, 'users', userId, 'vocabulary');
        const newWordRef = doc(vocabRef);

        const word = {
            ...wordData,
            id: newWordRef.id,
            word: wordData.word.toLowerCase(), // Normalize
            deckId,
            createdAt: serverTimestamp(),
            lastReviewedAt: null,
            timesReviewed: 0,
            isMastered: false,
            srsData: {
                interval: 1,
                repetitions: 0,
                easeFactor: 2.5,
                nextReview: Timestamp.now(), // Due immediately
                lastRating: null
            }
        };

        await setDoc(newWordRef, word);
        return { id: newWordRef.id, ...word };
    } catch (error) {
        console.error('Error saving word:', error);
        throw error;
    }
};

/**
 * Update a word
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateWord = async (userId, wordId, updates) => {
    try {
        const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
        await updateDoc(wordRef, updates);
    } catch (error) {
        console.error('Error updating word:', error);
        throw error;
    }
};

/**
 * Update word after SRS review
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID
 * @param {number} rating - Rating (1-5)
 * @returns {Promise<void>}
 */
export const updateWordSRS = async (userId, wordId, rating) => {
    try {
        const word = await getWord(userId, wordId);
        if (!word) throw new Error('Word not found');

        const { srsData } = word;

        // SM-2 algorithm
        let { interval, repetitions, easeFactor } = srsData;

        if (rating >= 3) {
            // Correct response
            if (repetitions === 0) {
                interval = 1;
            } else if (repetitions === 1) {
                interval = 6;
            } else {
                interval = Math.round(interval * easeFactor);
            }
            repetitions += 1;
        } else {
            // Incorrect response
            repetitions = 0;
            interval = 1;
        }

        // Update ease factor
        easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
        easeFactor = Math.max(1.3, easeFactor); // Minimum ease factor

        // Calculate next review date
        const nextReview = Timestamp.fromDate(
            new Date(Date.now() + interval * 24 * 60 * 60 * 1000)
        );

        // Check if mastered (interval > 21 days)
        const isMastered = interval > 21;

        await updateWord(userId, wordId, {
            srsData: {
                interval,
                repetitions,
                easeFactor,
                nextReview,
                lastRating: rating
            },
            lastReviewedAt: serverTimestamp(),
            timesReviewed: (word.timesReviewed || 0) + 1,
            isMastered
        });
    } catch (error) {
        console.error('Error updating word SRS:', error);
        throw error;
    }
};

/**
 * Delete a word
 * @param {string} userId - User ID
 * @param {string} wordId - Word ID
 * @returns {Promise<void>}
 */
export const deleteWord = async (userId, wordId) => {
    try {
        const wordRef = doc(db, 'users', userId, 'vocabulary', wordId);
        await deleteDoc(wordRef);
    } catch (error) {
        console.error('Error deleting word:', error);
        throw error;
    }
};

// ============= DECKS =============

/**
 * Get all decks for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of decks
 */
export const getAllDecks = async (userId) => {
    try {
        const decksRef = collection(db, 'users', userId, 'decks');
        const q = query(decksRef, orderBy('lastStudiedAt', 'desc'));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching decks:', error);
        throw error;
    }
};

/**
 * Get a single deck
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<object|null>} Deck object or null
 */
export const getDeck = async (userId, deckId) => {
    try {
        const deckRef = doc(db, 'users', userId, 'decks', deckId);
        const snapshot = await getDoc(deckRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching deck:', error);
        throw error;
    }
};

/**
 * Create a new deck
 * @param {string} userId - User ID
 * @param {string} deckName - Deck name
 * @param {string} sourceType - Source type (story, book, manual, topic)
 * @param {string} sourceId - Source ID (if applicable)
 * @returns {Promise<object>} Created deck with ID
 */
export const createDeck = async (userId, deckName, sourceType = 'manual', sourceId = null) => {
    try {
        const decksRef = collection(db, 'users', userId, 'decks');
        const newDeckRef = doc(decksRef);

        const deck = {
            id: newDeckRef.id,
            name: deckName,
            description: '',
            sourceType,
            sourceId,
            wordCount: 0,
            dueCount: 0,
            masteredCount: 0,
            createdAt: serverTimestamp(),
            lastStudiedAt: null
        };

        await setDoc(newDeckRef, deck);
        return { id: newDeckRef.id, ...deck };
    } catch (error) {
        console.error('Error creating deck:', error);
        throw error;
    }
};

/**
 * Update deck statistics
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @returns {Promise<void>}
 */
export const updateDeckStats = async (userId, deckId) => {
    try {
        const words = await getVocabularyByDeck(userId, deckId);
        const now = Timestamp.now();

        const stats = {
            wordCount: words.length,
            dueCount: words.filter(w =>
                !w.isMastered &&
                w.srsData?.nextReview &&
                w.srsData.nextReview.toMillis() <= now.toMillis()
            ).length,
            masteredCount: words.filter(w => w.isMastered).length,
            lastStudiedAt: serverTimestamp()
        };

        await updateDoc(doc(db, 'users', userId, 'decks', deckId), stats);
    } catch (error) {
        console.error('Error updating deck stats:', error);
        throw error;
    }
};

/**
 * Delete a deck (and optionally its words)
 * @param {string} userId - User ID
 * @param {string} deckId - Deck ID
 * @param {boolean} deleteWords - Whether to delete associated words
 * @returns {Promise<void>}
 */
export const deleteDeck = async (userId, deckId, deleteWords = false) => {
    try {
        if (deleteWords) {
            const words = await getVocabularyByDeck(userId, deckId);
            for (const word of words) {
                await deleteWord(userId, word.id);
            }
        }

        const deckRef = doc(db, 'users', userId, 'decks', deckId);
        await deleteDoc(deckRef);
    } catch (error) {
        console.error('Error deleting deck:', error);
        throw error;
    }
};
