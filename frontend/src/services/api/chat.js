/**
 * Chat API Service
 * Handles chat messages, hints, and writing analysis
 */

import { post } from './client';

/**
 * Send a chat message and get response
 */
export async function sendChatMessage({ messages, scenario = 'general', model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/chat/message', {
            messages,
            scenario,
            model,
            target_language: targetLanguage,
        });
        return response.response;
    } catch (error) {
        console.error('Chat message failed:', error);
        throw error;
    }
}

/**
 * Get conversation hints
 */
export async function getChatHints({ messages, scenario, model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/chat/hint', {
            messages,
            scenario,
            model,
            target_language: targetLanguage,
        });
        return response.hints;
    } catch (error) {
        console.error('Hint generation failed:', error);
        throw error;
    }
}

/**
 * Analyze and correct writing
 */
export async function analyzeWriting({ text, model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/chat/analyze-writing', {
            text,
            model,
            target_language: targetLanguage,
        });
        return response;
    } catch (error) {
        console.error('Writing analysis failed:', error);
        throw error;
    }
}

export default {
    sendChatMessage,
    getChatHints,
    analyzeWriting,
};
