/**
 * Stories API Service
 * Handles story generation, simplification, and question generation
 */

import api from './client';

const POLL_INTERVAL = 1000; // 1 second
const MAX_RETRIES = 300; // 300 seconds timeout (5 minutes)

const pollJob = async (jobId) => {
    for (let i = 0; i < MAX_RETRIES; i++) {
        const status = await api.get(`/stories/status/${jobId}`);

        if (status.status === 'SUCCESS') {
            return status.result;
        } else if (status.status === 'FAILURE') {
            throw new Error(status.result?.error || 'Job failed');
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
    throw new Error('Job timed out');
};

/**
 * Get available models
 */
export async function getModels() {
    try {
        return await api.get('/stories/models');
    } catch (error) {
        console.error('Failed to fetch models:', error);
        return [];
    }
}

/**
 * Generate a story using AI (Async)
 */
export async function generateStory({ topic, level, length = 'Medium', theme = '', model = null, targetLanguage = 'German' }) {
    try {
        const { job_id } = await api.post('/stories/generate_async', {
            topic,
            level,
            length,
            theme,
            model,
            target_language: targetLanguage,
        });
        return pollJob(job_id);
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
    getModels,
};
