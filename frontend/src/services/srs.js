/**
 * Calculates the next review schedule for a flashcard based on the user's grade.
 * Uses a simplified version of the SM-2 algorithm as per the project plan.
 * 
 * @param {Object} currentSrsData - The current SRS state of the card (or null/undefined for new cards).
 * @param {string} grade - The user's grade: 'again', 'hard', 'good', 'easy'.
 * @returns {Object} - The updated SRS state { interval, repetitions, easeFactor, nextReview, lastReviewed }.
 */
export const calculateNextReview = (currentSrsData, grade) => {
    // Default values for new cards
    const srs = currentSrsData || {
        interval: 0,
        repetitions: 0,
        easeFactor: 2.5,
    };

    let { interval, repetitions, easeFactor } = srs;

    // If it's a new card (interval 0), set a base interval to work with
    if (interval === 0) interval = 1;

    if (grade === 'again') {
        repetitions = 0;
        interval = 0; // Reset to 0 (Review today/immediately)
    } else {
        repetitions += 1;

        switch (grade) {
            case 'hard':
                // Interval grows slowly (x1.2)
                interval = Math.max(1, Math.round(interval * 1.2));
                easeFactor = Math.max(1.3, easeFactor - 0.15);
                break;
            case 'good':
                // Standard growth (x2.5)
                interval = Math.max(1, Math.round(interval * 2.5));
                // Ease factor stays the same
                break;
            case 'easy':
                // Fast growth (x3.5)
                interval = Math.max(1, Math.round(interval * 3.5));
                easeFactor += 0.15;
                break;
            default:
                console.warn("Unknown grade:", grade);
                break;
        }
    }

    // Calculate next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    // If interval is 0 (Again), strictly it means "today", but for sorting purposes 
    // we might want it to be "now". Firestore timestamp is fine.

    return {
        interval,
        repetitions,
        easeFactor,
        nextReview, // Date object (will be converted to Timestamp by Firestore)
        lastReviewed: new Date()
    };
};

/**
 * Helper to check if a card is due for review.
 * @param {Object} srsData 
 * @returns {boolean}
 */
export const isDue = (srsData) => {
    if (!srsData || !srsData.nextReview) return true; // New cards are due

    const now = new Date();
    // Handle Firestore Timestamp conversion if needed
    const reviewDate = srsData.nextReview.toDate ? srsData.nextReview.toDate() : new Date(srsData.nextReview);

    return reviewDate <= now;
};
