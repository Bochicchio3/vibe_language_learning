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
    serverTimestamp
} from 'firebase/firestore';

/**
 * Books database operations
 * Handles both private and public book collections
 */

// ============= PRIVATE BOOKS =============

/**
 * Get all private books for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of books
 */
export const getPrivateBooks = async (userId, filters = {}) => {
    try {
        const booksRef = collection(db, 'users', userId, 'books');
        let q = query(booksRef, orderBy('createdAt', 'desc'));

        if (filters.level) {
            q = query(q, where('level', '==', filters.level));
        }
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching private books:', error);
        throw error;
    }
};

/**
 * Get a single private book
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @returns {Promise<object|null>} Book object or null
 */
export const getPrivateBook = async (userId, bookId) => {
    try {
        const bookRef = doc(db, 'users', userId, 'books', bookId);
        const snapshot = await getDoc(bookRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching private book:', error);
        throw error;
    }
};

/**
 * Save a book to user's private collection
 * @param {string} userId - User ID
 * @param {object} book - Book object
 * @param {string} bookId - Optional book ID
 * @returns {Promise<object>} Saved book with ID
 */
export const savePrivateBook = async (userId, book, bookId = null) => {
    try {
        const booksRef = collection(db, 'users', userId, 'books');
        const newBookRef = bookId ? doc(booksRef, bookId) : doc(booksRef);

        const bookData = {
            ...book,
            id: newBookRef.id,
            createdAt: book.createdAt || serverTimestamp(),
            currentChapter: book.currentChapter || 0,
            isPublic: false,
        };

        await setDoc(newBookRef, bookData);
        return { id: newBookRef.id, ...bookData };
    } catch (error) {
        console.error('Error saving private book:', error);
        throw error;
    }
};

/**
 * Update a private book
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updatePrivateBook = async (userId, bookId, updates) => {
    try {
        const bookRef = doc(db, 'users', userId, 'books', bookId);
        await updateDoc(bookRef, updates);
    } catch (error) {
        console.error('Error updating private book:', error);
        throw error;
    }
};

/**
 * Update a specific chapter in a book
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @param {number} chapterIndex - Chapter index
 * @param {object} chapterData - Chapter data to update
 * @returns {Promise<void>}
 */
export const updateBookChapter = async (userId, bookId, chapterIndex, chapterData) => {
    try {
        const book = await getPrivateBook(userId, bookId);
        if (!book) throw new Error('Book not found');

        const chapters = [...book.chapters];
        chapters[chapterIndex] = {
            ...chapters[chapterIndex],
            ...chapterData
        };

        await updatePrivateBook(userId, bookId, { chapters });
    } catch (error) {
        console.error('Error updating book chapter:', error);
        throw error;
    }
};

/**
 * Get book processing status
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @returns {Promise<object>} Processing status
 */
export const getBookProcessingStatus = async (userId, bookId) => {
    try {
        const book = await getPrivateBook(userId, bookId);
        if (!book) return null;

        return {
            isProcessing: book.currentProcessingChapter !== null,
            currentChapter: book.currentProcessingChapter,
            totalChapters: book.totalChapters,
            progress: book.currentProcessingChapter
                ? (book.currentProcessingChapter / book.totalChapters) * 100
                : 100
        };
    } catch (error) {
        console.error('Error getting book processing status:', error);
        throw error;
    }
};

/**
 * Delete a private book
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @returns {Promise<void>}
 */
export const deletePrivateBook = async (userId, bookId) => {
    try {
        const bookRef = doc(db, 'users', userId, 'books', bookId);
        await deleteDoc(bookRef);
    } catch (error) {
        console.error('Error deleting private book:', error);
        throw error;
    }
};

/**
 * Update current chapter (reading progress)
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @param {number} chapterIndex - Chapter index
 * @returns {Promise<void>}
 */
export const updateCurrentChapter = async (userId, bookId, chapterIndex) => {
    try {
        await updatePrivateBook(userId, bookId, {
            currentChapter: chapterIndex,
            lastReadAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating current chapter:', error);
        throw error;
    }
};

// ============= PUBLIC BOOKS =============

/**
 * Get public books (community-shared)
 * @param {object} filters - Filters
 * @returns {Promise<Array>} Array of public books
 */
export const getPublicBooks = async (filters = {}) => {
    try {
        const booksRef = collection(db, 'public_books');
        let q = query(booksRef, orderBy('publishedAt', 'desc'));

        if (filters.level) {
            q = query(q, where('level', '==', filters.level));
        }
        if (filters.targetLanguage) {
            q = query(q, where('targetLanguage', '==', filters.targetLanguage));
        }
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching public books:', error);
        throw error;
    }
};

/**
 * Get a single public book
 * @param {string} bookId - Book ID
 * @returns {Promise<object|null>} Book object or null
 */
export const getPublicBook = async (bookId) => {
    try {
        const bookRef = doc(db, 'public_books', bookId);
        const snapshot = await getDoc(bookRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching public book:', error);
        throw error;
    }
};

/**
 * Publish a private book to public collection
 * @param {string} userId - User ID
 * @param {string} bookId - Book ID
 * @param {string} authorName - Author display name
 * @returns {Promise<object>} Published book
 */
export const publishBook = async (userId, bookId, authorName) => {
    try {
        const privateBook = await getPrivateBook(userId, bookId);
        if (!privateBook) throw new Error('Book not found');

        const publicBookRef = doc(collection(db, 'public_books'));
        const publicBook = {
            ...privateBook,
            id: publicBookRef.id,
            authorId: userId,
            authorName,
            downloads: 0,
            publishedAt: serverTimestamp()
        };

        await setDoc(publicBookRef, publicBook);

        // Update private book to mark as public
        await updatePrivateBook(userId, bookId, { isPublic: true });

        return publicBook;
    } catch (error) {
        console.error('Error publishing book:', error);
        throw error;
    }
};

/**
 * Unpublish a book (remove from public collection)
 * @param {string} userId - User ID
 * @param {string} publicBookId - Public book ID
 * @param {string} privateBookId - Private book ID
 * @returns {Promise<void>}
 */
export const unpublishBook = async (userId, publicBookId, privateBookId) => {
    try {
        const publicBookRef = doc(db, 'public_books', publicBookId);
        await deleteDoc(publicBookRef);

        // Update private book
        await updatePrivateBook(userId, privateBookId, { isPublic: false });
    } catch (error) {
        console.error('Error unpublishing book:', error);
        throw error;
    }
};

/**
 * Increment download count for a public book
 * @param {string} bookId - Public book ID
 * @returns {Promise<void>}
 */
export const incrementBookDownloads = async (bookId) => {
    try {
        const bookRef = doc(db, 'public_books', bookId);
        const book = await getDoc(bookRef);
        if (book.exists()) {
            await updateDoc(bookRef, {
                downloads: (book.data().downloads || 0) + 1
            });
        }
    } catch (error) {
        console.error('Error incrementing book downloads:', error);
        // Don't throw - this is non-critical
    }
};
