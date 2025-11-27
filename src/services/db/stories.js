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
 * Stories database operations
 * Handles both private and public story collections
 */

// ============= PRIVATE STORIES =============

/**
 * Get all private stories for a user
 * @param {string} userId - User ID
 * @param {object} filters - Optional filters (level, isRead, etc.)
 * @returns {Promise<Array>} Array of stories
 */
export const getPrivateStories = async (userId, filters = {}) => {
    try {
        const storiesRef = collection(db, 'users', userId, 'stories');
        let q = query(storiesRef, orderBy('createdAt', 'desc'));

        // Apply filters
        if (filters.level) {
            q = query(q, where('level', '==', filters.level));
        }
        if (filters.isRead !== undefined) {
            q = query(q, where('isRead', '==', filters.isRead));
        }
        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching private stories:', error);
        throw error;
    }
};

/**
 * Get a single private story
 * @param {string} userId - User ID
 * @param {string} storyId - Story ID
 * @returns {Promise<object|null>} Story object or null
 */
export const getPrivateStory = async (userId, storyId) => {
    try {
        const storyRef = doc(db, 'users', userId, 'stories', storyId);
        const snapshot = await getDoc(storyRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching private story:', error);
        throw error;
    }
};

/**
 * Save a story to user's private collection
 * @param {string} userId - User ID
 * @param {object} story - Story object
 * @param {string} storyId - Optional story ID (generates new if not provided)
 * @returns {Promise<object>} Saved story with ID
 */
export const savePrivateStory = async (userId, story, storyId = null) => {
    try {
        const storiesRef = collection(db, 'users', userId, 'stories');
        const newStoryRef = storyId ? doc(storiesRef, storyId) : doc(storiesRef);

        const storyData = {
            ...story,
            id: newStoryRef.id,
            createdAt: story.createdAt || serverTimestamp(),
            isRead: story.isRead || false,
            readProgress: story.readProgress || 0,
            isPublic: false,
        };

        await setDoc(newStoryRef, storyData);
        return { id: newStoryRef.id, ...storyData };
    } catch (error) {
        console.error('Error saving private story:', error);
        throw error;
    }
};

/**
 * Update a private story
 * @param {string} userId - User ID
 * @param {string} storyId - Story ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updatePrivateStory = async (userId, storyId, updates) => {
    try {
        const storyRef = doc(db, 'users', userId, 'stories', storyId);
        await updateDoc(storyRef, updates);
    } catch (error) {
        console.error('Error updating private story:', error);
        throw error;
    }
};

/**
 * Delete a private story
 * @param {string} userId - User ID
 * @param {string} storyId - Story ID
 * @returns {Promise<void>}
 */
export const deletePrivateStory = async (userId, storyId) => {
    try {
        const storyRef = doc(db, 'users', userId, 'stories', storyId);
        await deleteDoc(storyRef);
    } catch (error) {
        console.error('Error deleting private story:', error);
        throw error;
    }
};

/**
 * Toggle story read status
 * @param {string} userId - User ID
 * @param {string} storyId - Story ID
 * @returns {Promise<void>}
 */
export const toggleStoryReadStatus = async (userId, storyId) => {
    try {
        const story = await getPrivateStory(userId, storyId);
        if (story) {
            await updatePrivateStory(userId, storyId, {
                isRead: !story.isRead,
                lastReadAt: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error toggling story read status:', error);
        throw error;
    }
};

// ============= PUBLIC STORIES =============

/**
 * Get public stories (community-shared)
 * @param {object} filters - Filters (level, targetLanguage, limit, etc.)
 * @returns {Promise<Array>} Array of public stories
 */
export const getPublicStories = async (filters = {}) => {
    try {
        const storiesRef = collection(db, 'public_stories');
        let q = query(storiesRef, orderBy('publishedAt', 'desc'));

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
        console.error('Error fetching public stories:', error);
        throw error;
    }
};

/**
 * Get a single public story
 * @param {string} storyId - Story ID
 * @returns {Promise<object|null>} Story object or null
 */
export const getPublicStory = async (storyId) => {
    try {
        const storyRef = doc(db, 'public_stories', storyId);
        const snapshot = await getDoc(storyRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching public story:', error);
        throw error;
    }
};

/**
 * Publish a private story to public collection
 * @param {string} userId - User ID
 * @param {string} storyId - Story ID
 * @param {string} authorName - Author display name
 * @returns {Promise<object>} Published story
 */
export const publishStory = async (userId, storyId, authorName) => {
    try {
        const privateStory = await getPrivateStory(userId, storyId);
        if (!privateStory) throw new Error('Story not found');

        const publicStoryRef = doc(collection(db, 'public_stories'));
        const publicStory = {
            ...privateStory,
            id: publicStoryRef.id,
            authorId: userId,
            authorName,
            views: 0,
            likes: 0,
            publishedAt: serverTimestamp()
        };

        await setDoc(publicStoryRef, publicStory);

        // Update private story to mark as public
        await updatePrivateStory(userId, storyId, { isPublic: true });

        return publicStory;
    } catch (error) {
        console.error('Error publishing story:', error);
        throw error;
    }
};

/**
 * Unpublish a story (remove from public collection)
 * @param {string} userId - User ID
 * @param {string} publicStoryId - Public story ID
 * @param {string} privateStoryId - Private story ID
 * @returns {Promise<void>}
 */
export const unpublishStory = async (userId, publicStoryId, privateStoryId) => {
    try {
        const publicStoryRef = doc(db, 'public_stories', publicStoryId);
        await deleteDoc(publicStoryRef);

        // Update private story
        await updatePrivateStory(userId, privateStoryId, { isPublic: false });
    } catch (error) {
        console.error('Error unpublishing story:', error);
        throw error;
    }
};

/**
 * Increment view count for a public story
 * @param {string} storyId - Public story ID
 * @returns {Promise<void>}
 */
export const incrementStoryViews = async (storyId) => {
    try {
        const storyRef = doc(db, 'public_stories', storyId);
        const story = await getDoc(storyRef);
        if (story.exists()) {
            await updateDoc(storyRef, {
                views: (story.data().views || 0) + 1
            });
        }
    } catch (error) {
        console.error('Error incrementing story views:', error);
        // Don't throw - this is non-critical
    }
};
