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
    orderBy,
    limit,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Chat history database operations
 */

/**
 * Get all conversations for a user
 * @param {string} userId - User ID
 * @param {number} limitCount - Limit number of conversations
 * @returns {Promise<Array>} Array of conversations
 */
export const getAllConversations = async (userId, limitCount = 50) => {
    try {
        const chatRef = collection(db, 'users', userId, 'chat_history');
        const q = query(chatRef, orderBy('lastMessageAt', 'desc'), limit(limitCount));

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching conversations:', error);
        throw error;
    }
};

/**
 * Get a single conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<object|null>} Conversation object or null
 */
export const getConversation = async (userId, conversationId) => {
    try {
        const chatRef = doc(db, 'users', userId, 'chat_history', conversationId);
        const snapshot = await getDoc(chatRef);
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (error) {
        console.error('Error fetching conversation:', error);
        throw error;
    }
};

/**
 * Get chat messages for a conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<Array>} Array of messages
 */
export const getChatMessages = async (userId, conversationId) => {
    try {
        const conversation = await getConversation(userId, conversationId);
        return conversation ? conversation.messages || [] : [];
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        throw error;
    }
};

/**
 * Save a chat message to a conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @param {object} message - Message object {role, content}
 * @param {string} scenario - Chat scenario (optional, for new conversations)
 * @returns {Promise<void>}
 */
export const saveChatMessage = async (userId, conversationId, message, scenario = '') => {
    try {
        const chatRef = doc(db, 'users', userId, 'chat_history', conversationId);
        const existing = await getConversation(userId, conversationId);

        const messageWithTimestamp = {
            ...message,
            timestamp: serverTimestamp()
        };

        if (existing) {
            // Add message to existing conversation
            const messages = [...(existing.messages || []), messageWithTimestamp];
            await updateDoc(chatRef, {
                messages,
                lastMessageAt: serverTimestamp(),
                messageCount: messages.length
            });
        } else {
            // Create new conversation
            await setDoc(chatRef, {
                id: conversationId,
                scenario: scenario || 'general',
                messages: [messageWithTimestamp],
                createdAt: serverTimestamp(),
                lastMessageAt: serverTimestamp(),
                messageCount: 1
            });
        }
    } catch (error) {
        console.error('Error saving chat message:', error);
        throw error;
    }
};

/**
 * Create a new conversation
 * @param {string} userId - User ID
 * @param {string} scenario - Chat scenario
 * @param {string} conversationId - Optional conversation ID
 * @returns {Promise<object>} Created conversation with ID
 */
export const createConversation = async (userId, scenario, conversationId = null) => {
    try {
        const chatRef = collection(db, 'users', userId, 'chat_history');
        const newChatRef = conversationId ? doc(chatRef, conversationId) : doc(chatRef);

        const conversation = {
            id: newChatRef.id,
            scenario,
            messages: [],
            createdAt: serverTimestamp(),
            lastMessageAt: serverTimestamp(),
            messageCount: 0
        };

        await setDoc(newChatRef, conversation);
        return { id: newChatRef.id, ...conversation };
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }
};

/**
 * Delete a conversation
 * @param {string} userId - User ID
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<void>}
 */
export const deleteConversation = async (userId, conversationId) => {
    try {
        const chatRef = doc(db, 'users', userId, 'chat_history', conversationId);
        await deleteDoc(chatRef);
    } catch (error) {
        console.error('Error deleting conversation:', error);
        throw error;
    }
};

/**
 * Clear all chat history for a user
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export const clearAllChatHistory = async (userId) => {
    try {
        const conversations = await getAllConversations(userId, 1000);
        for (const conversation of conversations) {
            await deleteConversation(userId, conversation.id);
        }
    } catch (error) {
        console.error('Error clearing chat history:', error);
        throw error;
    }
};
