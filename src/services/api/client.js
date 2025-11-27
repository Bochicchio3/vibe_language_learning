/**
 * API Client
 * Handles HTTP requests to the backend API with authentication and error handling
 */

import { auth } from '../../firebase';

// API base URL - configured via Vite proxy in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Get authentication token from Firebase
 */
async function getAuthToken() {
    const user = auth.currentUser;
    if (user) {
        try {
            return await user.getIdToken();
        } catch (error) {
            console.error('Error getting auth token:', error);
            return null;
        }
    }
    return null;
}

/**
 * Make an authenticated API request
 */
async function apiRequest(endpoint, options = {}) {
    const token = await getAuthToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `API Error: ${response.status}`);
        }

        // Handle empty responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * GET request
 */
export async function get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;

    return apiRequest(url, {
        method: 'GET',
    });
}

/**
 * POST request
 */
export async function post(endpoint, data = {}) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * PUT request
 */
export async function put(endpoint, data = {}) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

/**
 * DELETE request
 */
export async function del(endpoint) {
    return apiRequest(endpoint, {
        method: 'DELETE',
    });
}

/**
 * Upload file
 */
export async function uploadFile(endpoint, file, additionalData = {}) {
    const token = await getAuthToken();

    const formData = new FormData();
    formData.append('file', file);

    // Add additional data
    Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
    });

    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `Upload failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`File upload failed: ${endpoint}`, error);
        throw error;
    }
}

export default {
    get,
    post,
    put,
    delete: del,
    uploadFile,
};
