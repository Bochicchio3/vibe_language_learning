/**
 * News API Service
 * Handles news fetching and adaptation
 */

import { get, post } from './client';

/**
 * Get available news categories
 */
export async function getNewsCategories() {
    try {
        const response = await get('/news/categories');
        return response.categories;
    } catch (error) {
        console.error('Failed to fetch news categories:', error);
        throw error;
    }
}

/**
 * Get news articles for a category
 */
export async function getNewsByCategory(category, limit = 10) {
    try {
        const response = await get(`/news/${category}`, { limit });
        return response.articles;
    } catch (error) {
        console.error(`Failed to fetch news for category ${category}:`, error);
        throw error;
    }
}

/**
 * Adapt a news article to a target level
 */
export async function adaptNewsArticle({ content, level, model = null, targetLanguage = 'German' }) {
    try {
        const response = await post('/news/adapt', {
            content,
            level,
            model,
            target_language: targetLanguage,
        });
        return response;
    } catch (error) {
        console.error('News adaptation failed:', error);
        throw error;
    }
}

export default {
    getNewsCategories,
    getNewsByCategory,
    adaptNewsArticle,
};
