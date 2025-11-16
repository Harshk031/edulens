/**
 * Environment configuration utility
 * Handles API base URL detection for both browser and Electron contexts
 */

/**
 * Detect if running in Electron
 */
export function isElectron() {
  return (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    window.process.type === 'renderer'
  ) || (
    typeof navigator !== 'undefined' &&
    navigator.userAgent.toLowerCase().includes('electron')
  );
}

/**
 * Get the correct API base URL based on environment
 * Priority:
 * 1. Electron: Always use http://localhost:5000 (no proxy available)
 * 2. Vite env: Use VITE_API_BASE if set
 * 3. Default: http://localhost:5000
 */
export function getApiBaseUrl() {
  // In Electron, we MUST use direct backend URL (no Vite proxy)
  if (isElectron()) {
    console.log('[ENV] Running in Electron - using direct backend URL');
    return 'http://localhost:5000';
  }
  
  // In browser with Vite, use env variable or default
  const viteBase = import.meta?.env?.VITE_API_BASE;
  
  if (viteBase) {
    console.log('[ENV] Using VITE_API_BASE:', viteBase);
    return viteBase;
  }
  
  // Default to localhost:5000
  console.log('[ENV] Using default API base: http://localhost:5000');
  return 'http://localhost:5000';
}

/**
 * Get the API base URL for use in components
 * This is the main export to use throughout the app
 */
export const API_BASE_URL = getApiBaseUrl();

console.log('[ENV] API Base URL configured:', API_BASE_URL);
console.log('[ENV] Running in Electron:', isElectron());
