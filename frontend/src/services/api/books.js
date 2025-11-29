/**
 * Books API Service
 * Handles book upload and processing status
 */

import { uploadFile, get } from './client';

/**
 * Upload a book for processing
 */
export async function uploadBook({ file, title, level, shouldAdapt = true, model = null, targetLanguage = 'German' }) {
    try {
        const response = await uploadFile('/books/upload', file, {
            title,
            level,
            should_adapt: shouldAdapt,
            model: model || '',
            target_language: targetLanguage,
        });
        return response;
    } catch (error) {
        console.error('Book upload failed:', error);
        throw error;
    }
}

/**
 * Get book processing status
 */
export async function getBookProcessingStatus(bookId) {
    try {
        const response = await get(`/books/${bookId}/status`);
        return response;
    } catch (error) {
        console.error('Failed to get book processing status:', error);
        throw error;
    }
}

/**
 * Cancel book processing
 */
export async function cancelBookProcessing(bookId) {
    try {
        const response = await post(`/books/${bookId}/cancel`);
        return response;
    } catch (error) {
        console.error('Failed to cancel book processing:', error);
        throw error;
    }
}

export default {
    uploadBook,
    getBookProcessingStatus,
    cancelBookProcessing,
};
