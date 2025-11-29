import { db } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';

// Activity categories
export const CATEGORIES = {
    READING: 'reading',
    SPEAKING: 'speaking',
    CHAT: 'chat',
    VOCAB: 'vocab',
    GRAMMAR: 'grammar',
    LISTENING: 'listening'
};

// Category metadata
export const CATEGORY_META = {
    reading: { label: 'Reading', icon: '📖', color: 'indigo' },
    speaking: { label: 'Speaking', icon: '🗣️', color: 'blue' },
    chat: { label: 'Chat', icon: '💬', color: 'purple' },
    vocab: { label: 'Flashcards', icon: '🃏', color: 'emerald' },
    grammar: { label: 'Grammar', icon: '✍️', color: 'amber' },
    listening: { label: 'Listening', icon: '🎧', color: 'pink' }
};

// Default goals per category
export const DEFAULT_GOALS = {
    reading: { dailyMinutes: 30, weeklyMinutes: 210 },
    speaking: { dailyMinutes: 15, weeklyMinutes: 105 },
    chat: { weeklyMinutes: 60 },
    vocab: { dailySessions: 3, weeklySessions: 20 },
    grammar: { weeklyMinutes: 120 },
    listening: { dailyMinutes: 20, weeklyMinutes: 140 },
    streakMinimum: { totalMinutes: 15, categories: 2 }
};

/**
 * Record an activity session to Firestore
 * @param {string} userId - User ID
 * @param {string} category - Activity category
 * @param {number} durationSeconds - Duration in seconds
 * @param {string} referenceId - Optional reference ID (text ID, etc)
 * @param {string} referenceTitle - Optional reference title
 * @returns {Promise<void>}
 */
export async function recordActivitySession(userId, category, durationSeconds, referenceId = null, referenceTitle = null) {
    if (!userId || !category || durationSeconds < 10) return; // Ignore very short sessions

    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const sessionRef = doc(collection(db, 'users', userId, 'activitySessions'));

    await setDoc(sessionRef, {
        category,
        referenceId,
        referenceTitle,
        durationSeconds,
        date: dateString,
        createdAt: serverTimestamp()
    });
}

/**
 * Record a vocab/flashcard session (count-based instead of time-based)
 * @param {string} userId - User ID
 * @param {number} cardsReviewed - Number of cards reviewed
 * @returns {Promise<void>}
 */
export async function recordVocabSession(userId, cardsReviewed) {
    if (!userId || cardsReviewed < 1) return;

    const now = new Date();
    const dateString = now.toISOString().split('T')[0];

    const sessionRef = doc(collection(db, 'users', userId, 'activitySessions'));

    await setDoc(sessionRef, {
        category: CATEGORIES.VOCAB,
        durationSeconds: 0, // Vocab uses session count, not time
        cardsReviewed,
        date: dateString,
        createdAt: serverTimestamp()
    });
}

/**
 * Get or create user activity goals
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Goals object
 */
export async function getActivityGoals(userId) {
    const goalsRef = doc(db, 'users', userId, 'settings', 'activityGoals');
    const goalsDoc = await getDoc(goalsRef);

    if (goalsDoc.exists()) {
        return { ...DEFAULT_GOALS, ...goalsDoc.data() }; // Merge with defaults
    }

    await setDoc(goalsRef, DEFAULT_GOALS);
    return DEFAULT_GOALS;
}

/**
 * Update user activity goals
 * @param {string} userId - User ID
 * @param {Object} goals - Goals object (can be partial)
 * @returns {Promise<void>}
 */
export async function updateActivityGoals(userId, goals) {
    const goalsRef = doc(db, 'users', userId, 'settings', 'activityGoals');
    await updateDoc(goalsRef, goals);
}

/**
 * Get activity sessions for a specific date range
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} Array of sessions
 */
export async function getActivitySessions(userId, startDate, endDate, category = null) {
    const sessionsRef = collection(db, 'users', userId, 'activitySessions');

    let queries = [
        where('date', '>=', startDate),
        where('date', '<=', endDate)
    ];

    if (category) {
        queries.push(where('category', '==', category));
    }

    queries.push(orderBy('date', 'desc'));
    queries.push(orderBy('createdAt', 'desc'));

    const q = query(sessionsRef, ...queries);

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Get all activity sessions (limited)
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of sessions
 */
export async function getAllActivitySessions(userId, maxResults = 500) {
    const sessionsRef = collection(db, 'users', userId, 'activitySessions');
    const q = query(
        sessionsRef,
        orderBy('createdAt', 'desc'),
        limit(maxResults)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Calculate overall statistics
 * @param {Array} sessions - Array of activity sessions
 * @returns {Object} Statistics object
 */
export function calculateStatistics(sessions) {
    if (!sessions || sessions.length === 0) {
        return {
            totalMinutes: 0,
            totalSessions: 0,
            byCategory: {},
            averageSessionMinutes: 0
        };
    }

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    // Calculate per-category stats
    const byCategory = {};
    Object.keys(CATEGORY_META).forEach(cat => {
        const catSessions = sessions.filter(s => s.category === cat);
        const catSeconds = catSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        byCategory[cat] = {
            sessions: catSessions.length,
            minutes: Math.round(catSeconds / 60)
        };
    });

    return {
        totalMinutes: Math.round(totalSeconds / 60),
        totalSessions: sessions.length,
        averageSessionMinutes: Math.round(totalSeconds / 60 / sessions.length),
        byCategory
    };
}

/**
 * Calculate current activity streak
 * @param {Array} sessions - Array of activity sessions (ordered by date desc)
 * @param {Object} streakConfig - Streak configuration {totalMinutes, categories}
 * @returns {Object} Streak information
 */
export function calculateStreak(sessions, streakConfig = { totalMinutes: 15, categories: 2 }) {
    if (!sessions || sessions.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    // Group sessions by date
    const dailyActivity = {};
    sessions.forEach(session => {
        const date = session.date;
        if (!dailyActivity[date]) {
            dailyActivity[date] = {
                totalMinutes: 0,
                categories: new Set()
            };
        }
        dailyActivity[date].totalMinutes += (session.durationSeconds || 0) / 60;
        dailyActivity[date].categories.add(session.category);
    });

    // Get dates that meet streak requirements
    const validDates = Object.keys(dailyActivity)
        .filter(date => {
            const day = dailyActivity[date];
            return day.totalMinutes >= streakConfig.totalMinutes &&
                day.categories.size >= streakConfig.categories;
        })
        .sort()
        .reverse();

    if (validDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate current streak
    let currentStreak = 0;
    if (validDates[0] === today || validDates[0] === yesterday) {
        currentStreak = 1;
        let expectedDate = new Date(validDates[0]);

        for (let i = 1; i < validDates.length; i++) {
            expectedDate = new Date(expectedDate.getTime() - 86400000);
            const expectedDateStr = expectedDate.toISOString().split('T')[0];

            if (validDates[i] === expectedDateStr) {
                currentStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate longest streak
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < validDates.length; i++) {
        const currentDate = new Date(validDates[i]);
        const previousDate = new Date(validDates[i - 1]);
        const dayDiff = Math.round((previousDate - currentDate) / 86400000);

        if (dayDiff === 1) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    return {
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        lastActivityDate: validDates[0]
    };
}

/**
 * Get today's progress by category
 * @param {Array} sessions - Array of activity sessions
 * @returns {Object} Today's progress by category
 */
export function getTodayProgress(sessions) {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today);

    const byCategory = {};
    Object.keys(CATEGORY_META).forEach(cat => {
        const catSessions = todaySessions.filter(s => s.category === cat);
        const totalSeconds = catSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        byCategory[cat] = {
            minutes: Math.round(totalSeconds / 60),
            sessions: catSessions.length
        };
    });

    return {
        byCategory,
        totalMinutes: Math.round(todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60),
        totalSessions: todaySessions.length
    };
}

/**
 * Get this week's progress by category
 * @param {Array} sessions - Array of activity sessions
 * @returns {Object} This week's progress by category
 */
export function getWeekProgress(sessions) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekSessions = sessions.filter(s => s.date >= weekStartStr);

    const byCategory = {};
    Object.keys(CATEGORY_META).forEach(cat => {
        const catSessions = weekSessions.filter(s => s.category === cat);
        const totalSeconds = catSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
        byCategory[cat] = {
            minutes: Math.round(totalSeconds / 60),
            sessions: catSessions.length
        };
    });

    return {
        byCategory,
        totalMinutes: Math.round(weekSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0) / 60),
        totalSessions: weekSessions.length
    };
}

/**
 * Prepare heatmap data for calendar visualization
 * @param {Array} sessions - Array of activity sessions
 * @param {number} months - Number of months to show
 * @param {string} category - Optional category filter
 * @returns {Array} Heatmap data [{date, minutes, categoryCounts}]
 */
export function prepareHeatmapData(sessions, months = 6, category = null) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const filteredSessions = category
        ? sessions.filter(s => s.category === category)
        : sessions;

    const dailyData = {};
    filteredSessions.forEach(session => {
        const date = session.date;
        if (!dailyData[date]) {
            dailyData[date] = {
                minutes: 0,
                categoryCounts: {}
            };
        }
        dailyData[date].minutes += (session.durationSeconds || 0) / 60;
        dailyData[date].categoryCounts[session.category] =
            (dailyData[date].categoryCounts[session.category] || 0) + 1;
    });

    // Create array with all dates in range
    const heatmapData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        heatmapData.push({
            date: dateStr,
            minutes: Math.round(dailyData[dateStr]?.minutes || 0),
            categoryCounts: dailyData[dateStr]?.categoryCounts || {}
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return heatmapData;
}

// Backward compatibility aliases
export const recordReadingSession = (userId, textId, textTitle, durationSeconds) =>
    recordActivitySession(userId, CATEGORIES.READING, durationSeconds, textId, textTitle);

export const getReadingGoals = getActivityGoals;
export const updateReadingGoals = updateActivityGoals;
export const getReadingSessions = (userId, startDate, endDate) =>
    getActivitySessions(userId, startDate, endDate, CATEGORIES.READING);
export const getAllReadingSessions = getAllActivitySessions;
