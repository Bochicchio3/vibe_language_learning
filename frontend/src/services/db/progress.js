import { db } from '../../firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Progress tracking database operations
 */

// ============= PROGRESS =============

/**
 * Get progress for a specific item
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID (story or chapter)
 * @returns {Promise<object|null>} Progress object or null
 */
export const getProgress = async (userId, itemId) => {
    try {
        const progressRef = doc(db, 'users', userId, 'progress', itemId);
        const snapshot = await getDoc(progressRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching progress:', error);
        throw error;
    }
};

/**
 * Get all progress items for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters
 * @returns {Promise<Array>} Array of progress items
 */
export const getAllProgress = async (userId, filters = {}) => {
    try {
        const progressRef = collection(db, 'users', userId, 'progress');
        let q = query(progressRef, orderBy('lastReadAt', 'desc'));

        if (filters.itemType) {
            q = query(q, where('itemType', '==', filters.itemType));
        }
        if (filters.isCompleted !== undefined) {
            q = query(q, where('isCompleted', '==', filters.isCompleted));
        }
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching all progress:', error);
        throw error;
    }
};

/**
 * Save or update reading progress
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @param {string} itemType - Item type (story, chapter)
 * @param {number} progress - Progress percentage (0-100)
 * @param {number} timeSpentMinutes - Time spent reading
 * @returns {Promise<void>}
 */
export const saveProgress = async (userId, itemId, itemType, progress, timeSpentMinutes = 0) => {
    try {
        const progressRef = doc(db, 'users', userId, 'progress', itemId);
        const existing = await getProgress(userId, itemId);

        const isCompleted = progress >= 100;
        const now = serverTimestamp();

        if (existing) {
            // Update existing progress
            await updateDoc(progressRef, {
                progress,
                isCompleted,
                lastReadAt: now,
                timeSpentMinutes: (existing.timeSpentMinutes || 0) + timeSpentMinutes,
                ...(isCompleted && !existing.isCompleted ? { completedAt: now } : {})
            });
        } else {
            // Create new progress
            await setDoc(progressRef, {
                id: itemId,
                itemType,
                itemId,
                progress,
                isCompleted,
                startedAt: now,
                completedAt: isCompleted ? now : null,
                lastReadAt: now,
                timeSpentMinutes
            });
        }
    } catch (error) {
        console.error('Error saving progress:', error);
        throw error;
    }
};

/**
 * Mark item as completed
 * @param {string} userId - User ID
 * @param {string} itemId - Item ID
 * @param {string} itemType - Item type
 * @returns {Promise<void>}
 */
export const markAsCompleted = async (userId, itemId, itemType) => {
    await saveProgress(userId, itemId, itemType, 100);
};

// ============= READING SESSIONS =============

/**
 * Save a reading session
 * @param {string} userId - User ID
 * @param {object} session - Session data
 * @returns {Promise<object>} Saved session with ID
 */
export const saveReadingSession = async (userId, session) => {
    try {
        const sessionsRef = collection(db, 'users', userId, 'reading_sessions');
        const newSessionRef = doc(sessionsRef);

        const sessionData = {
            id: newSessionRef.id,
            ...session,
            startTime: session.startTime || serverTimestamp(),
            endTime: session.endTime || serverTimestamp(),
            date: session.date || new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };

        await setDoc(newSessionRef, sessionData);
        return { id: newSessionRef.id, ...sessionData };
    } catch (error) {
        console.error('Error saving reading session:', error);
        throw error;
    }
};

/**
 * Get reading sessions for a user
 * @param {string} userId - User ID
 * @param {number} limitCount - Limit number of sessions
 * @returns {Promise<Array>} Array of sessions
 */
export const getReadingSessions = async (userId, limitCount = 50) => {
    try {
        const sessionsRef = collection(db, 'users', userId, 'reading_sessions');
        const q = query(sessionsRef, orderBy('startTime', 'desc'), limit(limitCount));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching reading sessions:', error);
        throw error;
    }
};

/**
 * Get reading sessions for a specific date range
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of sessions
 */
export const getReadingSessionsByDateRange = async (userId, startDate, endDate) => {
    try {
        const sessionsRef = collection(db, 'users', userId, 'reading_sessions');
        const q = query(
            sessionsRef,
            where('date', '>=', startDate),
            where('date', '<=', endDate),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching reading sessions by date range:', error);
        throw error;
    }
};

/**
 * Get reading history (recent items read)
 * @param {string} userId - User ID
 * @param {number} limitCount - Limit number of items
 * @returns {Promise<Array>} Array of recent items
 */
export const getReadingHistory = async (userId, limitCount = 10) => {
    try {
        const progressRef = collection(db, 'users', userId, 'progress');
        const q = query(progressRef, orderBy('lastReadAt', 'desc'), limit(limitCount));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching reading history:', error);
        throw error;
    }
};

/**
 * Get progress statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>} Progress statistics
 */
export const getProgressStats = async (userId) => {
    try {
        const [allProgress, sessions] = await Promise.all([
            getAllProgress(userId),
            getReadingSessions(userId, 100)
        ]);

        const completedItems = allProgress.filter(p => p.isCompleted);
        const inProgressItems = allProgress.filter(p => !p.isCompleted && p.progress > 0);

        const totalTimeMinutes = allProgress.reduce((sum, p) => sum + (p.timeSpentMinutes || 0), 0);
        const totalWordsRead = sessions.reduce((sum, s) => sum + (s.wordsRead || 0), 0);

        // Calculate streak
        const today = new Date().toISOString().split('T')[0];
        const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();

        let currentStreak = 0;
        let expectedDate = new Date();

        for (const date of dates) {
            const sessionDate = new Date(date);
            const diffDays = Math.floor((expectedDate - sessionDate) / (1000 * 60 * 60 * 24));

            if (diffDays === 0 || diffDays === 1) {
                currentStreak++;
                expectedDate = sessionDate;
            } else {
                break;
            }
        }

        return {
            totalItems: allProgress.length,
            completedItems: completedItems.length,
            inProgressItems: inProgressItems.length,
            totalTimeMinutes,
            totalWordsRead,
            currentStreak,
            averageSessionMinutes: sessions.length > 0
                ? sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / sessions.length
                : 0
        };
    } catch (error) {
        console.error('Error fetching progress stats:', error);
        throw error;
    }
};
