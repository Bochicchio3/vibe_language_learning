/**
 * Stories API Service
 * Handles story generation, simplification, and question generation
 */

import { post } from './client';

/**
 * Generate a story using AI
 */
export async function generateStory({ topic, level, length = 'Medium', theme = '', model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/stories/generate', {
            topic,
            level,
            length,
            theme,
            model,
            target_language: targetLanguage,
        });
        return response;
    } catch (error) {
        console.error('Story generation failed:', error);
        throw error;
    }
}

/**
 * Simplify a story to a target level
 */
export async function simplifyStory({ text, level, model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/stories/simplify', {
            text,
            level,
            model,
            target_language: targetLanguage,
        });
        return response.simplified_text;
    } catch (error) {
        console.error('Story simplification failed:', error);
        throw error;
    }
}

/**
 * Generate comprehension questions for a story
 */
export async function generateQuestions({ text, count = 3, model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/stories/questions', {
            text,
            count,
            model,
            target_language: targetLanguage,
        });
        return response.questions;
    } catch (error) {
        console.error('Question generation failed:', error);
        throw error;
    }
}

export default {
    generateStory,
    simplifyStory,
    generateQuestions,
};
