// API utility functions for EduLens frontend
import { API_BASE_URL } from './env.js';

const API_BASE = API_BASE_URL;

/**
 * Enhanced fetch with automatic API base URL and error handling
 * @param {string} endpoint - API endpoint (starting with /)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };
  
  try {
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      console.error(`[API] Error ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`[API] Network error:`, error);
    throw error;
  }
}

/**
 * GET request helper
 * @param {string} endpoint - API endpoint
 * @param {object} options - Additional fetch options
 * @returns {Promise<any>} - JSON response
 */
export async function apiGet(endpoint, options = {}) {
  const response = await apiFetch(endpoint, { ...options, method: 'GET' });
  return await response.json();
}

/**
 * POST request helper
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {object} options - Additional fetch options
 * @returns {Promise<any>} - JSON response
 */
export async function apiPost(endpoint, data, options = {}) {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * PUT request helper
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {object} options - Additional fetch options
 * @returns {Promise<any>} - JSON response
 */
export async function apiPut(endpoint, data, options = {}) {
  const response = await apiFetch(endpoint, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * DELETE request helper
 * @param {string} endpoint - API endpoint
 * @param {object} options - Additional fetch options
 * @returns {Promise<any>} - JSON response
 */
export async function apiDelete(endpoint, options = {}) {
  const response = await apiFetch(endpoint, { ...options, method: 'DELETE' });
  return await response.json();
}

/**
 * Check if API is available
 * @returns {Promise<boolean>} - True if API is available
 */
export async function checkApiHealth() {
  try {
    const response = await apiFetch('/health');
    return response.ok;
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return false;
  }
}

/**
 * Get API status information
 * @returns {Promise<object>} - API status object
 */
export async function getApiStatus() {
  try {
    return await apiGet('/health');
  } catch (error) {
    return {
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

export { API_BASE };
