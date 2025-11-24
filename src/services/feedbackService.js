import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Submit feedback to Firestore
 * @param {string} userId - User ID
 * @param {string} type - Feedback type (bug, suggestion, feature, other)
 * @param {string} description - Feedback description
 * @param {string} context - Current view/context
 * @returns {Promise<string>} Document ID
 */
export async function submitFeedback(userId, type, description, context) {
    try {
        const feedbackRef = collection(db, 'users', userId, 'feedback');
        const docRef = await addDoc(feedbackRef, {
            type,
            description,
            context,
            status: 'open',
            timestamp: serverTimestamp(),
        });
        return docRef.id;
    } catch (error) {
        console.error('Error submitting feedback:', error);
        throw error;
    }
}

/**
 * Subscribe to feedback updates
 * @param {string} userId - User ID
 * @param {function} callback - Callback function to receive feedback data
 * @returns {function} Unsubscribe function
 */
export function subscribeFeedback(userId, callback) {
    const feedbackRef = collection(db, 'users', userId, 'feedback');
    const q = query(feedbackRef, orderBy('timestamp', 'desc'));

    return onSnapshot(q, (snapshot) => {
        const feedbackItems = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        callback(feedbackItems);
    });
}

/**
 * Update feedback status
 * @param {string} userId - User ID
 * @param {string} feedbackId - Feedback document ID
 * @param {string} status - New status (open, in-progress, resolved)
 */
export async function updateFeedbackStatus(userId, feedbackId, status) {
    try {
        const feedbackRef = doc(db, 'users', userId, 'feedback', feedbackId);
        await updateDoc(feedbackRef, { status });
    } catch (error) {
        console.error('Error updating feedback status:', error);
        throw error;
    }
}

/**
 * Delete feedback item
 * @param {string} userId - User ID
 * @param {string} feedbackId - Feedback document ID
 */
export async function deleteFeedback(userId, feedbackId) {
    try {
        const feedbackRef = doc(db, 'users', userId, 'feedback', feedbackId);
        await deleteDoc(feedbackRef);
    } catch (error) {
        console.error('Error deleting feedback:', error);
        throw error;
    }
}

/**
 * Export feedback as agent-parseable markdown
 * @param {Array} feedbackItems - Array of feedback objects
 * @returns {string} Markdown formatted string
 */
export function exportFeedbackAsMarkdown(feedbackItems) {
    let markdown = '# Application Improvement Feedback\n\n';
    markdown += `Generated: ${new Date().toLocaleString()}\n\n`;
    markdown += `Total Items: ${feedbackItems.length}\n\n`;
    markdown += '---\n\n';

    // Group by type
    const types = ['bug', 'suggestion', 'feature', 'other'];
    types.forEach(type => {
        const items = feedbackItems.filter(item => item.type === type);
        if (items.length === 0) return;

        markdown += `## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${items.length})\n\n`;

        items.forEach((item, index) => {
            const timestamp = item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 'N/A';
            markdown += `### ${index + 1}. ${item.context || 'Unknown Context'}\n\n`;
            markdown += `- **Status**: ${item.status}\n`;
            markdown += `- **Reported**: ${timestamp}\n`;
            markdown += `- **Description**:\n\n`;
            markdown += `  ${item.description}\n\n`;
            markdown += '---\n\n';
        });
    });

    return markdown;
}
