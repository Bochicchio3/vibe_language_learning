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

/**
 * Record a reading session to Firestore
 * @param {string} userId - User ID
 * @param {string} textId - Text or chapter ID
 * @param {string} textTitle - Title of the text (denormalized)
 * @param {number} durationSeconds - Duration in seconds
 * @returns {Promise<void>}
 */
export async function recordReadingSession(userId, textId, textTitle, durationSeconds) {
    if (!userId || !textId || durationSeconds < 10) return; // Ignore very short sessions

    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const sessionRef = doc(collection(db, 'users', userId, 'readingSessions'));

    await setDoc(sessionRef, {
        textId,
        textTitle,
        startTime: serverTimestamp(),
        durationSeconds,
        date: dateString,
        createdAt: serverTimestamp()
    });
}

/**
 * Get or create user reading goals
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Goals object
 */
export async function getReadingGoals(userId) {
    const goalsRef = doc(db, 'users', userId, 'settings', 'readingGoals');
    const goalsDoc = await getDoc(goalsRef);

    if (goalsDoc.exists()) {
        return goalsDoc.data();
    }

    // Default goals
    const defaultGoals = {
        dailyMinutes: 30,
        weeklyMinutes: 210,
        dailySessions: 1,
        streakMinimum: 5 // Minimum minutes to count toward streak
    };

    await setDoc(goalsRef, defaultGoals);
    return defaultGoals;
}

/**
 * Update user reading goals
 * @param {string} userId - User ID
 * @param {Object} goals - Goals object
 * @returns {Promise<void>}
 */
export async function updateReadingGoals(userId, goals) {
    const goalsRef = doc(db, 'users', userId, 'settings', 'readingGoals');
    await updateDoc(goalsRef, goals);
}

/**
 * Get reading sessions for a specific date range
 * @param {string} userId - User ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of sessions
 */
export async function getReadingSessions(userId, startDate, endDate) {
    const sessionsRef = collection(db, 'users', userId, 'readingSessions');
    const q = query(
        sessionsRef,
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc'),
        orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

/**
 * Get all reading sessions (limited)
 * @param {string} userId - User ID
 * @param {number} maxResults - Maximum number of results
 * @returns {Promise<Array>} Array of sessions
 */
export async function getAllReadingSessions(userId, maxResults = 100) {
    const sessionsRef = collection(db, 'users', userId, 'readingSessions');
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
 * Calculate reading statistics
 * @param {Array} sessions - Array of reading sessions
 * @returns {Object} Statistics object
 */
export function calculateStatistics(sessions) {
    if (!sessions || sessions.length === 0) {
        return {
            totalMinutes: 0,
            totalSessions: 0,
            averageSessionMinutes: 0,
            totalTexts: 0,
            longestSessionMinutes: 0
        };
    }

    const totalSeconds = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
    const uniqueTexts = new Set(sessions.map(s => s.textId));
    const longestSession = Math.max(...sessions.map(s => s.durationSeconds || 0));

    return {
        totalMinutes: Math.round(totalSeconds / 60),
        totalSessions: sessions.length,
        averageSessionMinutes: Math.round(totalSeconds / 60 / sessions.length),
        totalTexts: uniqueTexts.size,
        longestSessionMinutes: Math.round(longestSession / 60)
    };
}

/**
 * Calculate current reading streak
 * @param {Array} sessions - Array of reading sessions (must be ordered by date desc)
 * @param {number} minimumMinutes - Minimum minutes to count as a day
 * @returns {Object} Streak information
 */
export function calculateStreak(sessions, minimumMinutes = 5) {
    if (!sessions || sessions.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastReadDate: null };
    }

    // Group sessions by date and sum minutes
    const dailyMinutes = {};
    sessions.forEach(session => {
        const date = session.date;
        if (!dailyMinutes[date]) {
            dailyMinutes[date] = 0;
        }
        dailyMinutes[date] += (session.durationSeconds || 0) / 60;
    });

    // Get dates that meet minimum requirement
    const validDates = Object.keys(dailyMinutes)
        .filter(date => dailyMinutes[date] >= minimumMinutes)
        .sort()
        .reverse();

    if (validDates.length === 0) {
        return { currentStreak: 0, longestStreak: 0, lastReadDate: null };
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
        lastReadDate: validDates[0]
    };
}

/**
 * Get today's reading progress
 * @param {Array} sessions - Array of reading sessions
 * @returns {Object} Today's progress
 */
export function getTodayProgress(sessions) {
    const today = new Date().toISOString().split('T')[0];
    const todaySessions = sessions.filter(s => s.date === today);

    const totalSeconds = todaySessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    return {
        minutes: Math.round(totalSeconds / 60),
        sessionCount: todaySessions.length
    };
}

/**
 * Get this week's reading progress
 * @param {Array} sessions - Array of reading sessions
 * @returns {Object} This week's progress
 */
export function getWeekProgress(sessions) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weekSessions = sessions.filter(s => s.date >= weekStartStr);
    const totalSeconds = weekSessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);

    return {
        minutes: Math.round(totalSeconds / 60),
        sessionCount: weekSessions.length
    };
}

/**
 * Prepare heatmap data for calendar visualization
 * @param {Array} sessions - Array of reading sessions
 * @param {number} months - Number of months to show
 * @returns {Array} Heatmap data [{date: 'YYYY-MM-DD', minutes: number}]
 */
export function prepareHeatmapData(sessions, months = 6) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(endDate.getMonth() - months);

    const dailyMinutes = {};
    sessions.forEach(session => {
        const date = session.date;
        if (!dailyMinutes[date]) {
            dailyMinutes[date] = 0;
        }
        dailyMinutes[date] += (session.durationSeconds || 0) / 60;
    });

    // Create array with all dates in range
    const heatmapData = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        heatmapData.push({
            date: dateStr,
            minutes: Math.round(dailyMinutes[dateStr] || 0)
        });
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return heatmapData;
}
