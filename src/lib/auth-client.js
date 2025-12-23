// Client-side authentication utilities
// Token-based authentication using localStorage and Authorization headers

const TOKEN_KEY = 'auth_token';

/**
 * Store authentication token in localStorage
 */
export function setAuthToken(token) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Failed to store auth token:', error);
      return false;
    }
  }
  return false;
}

/**
 * Get authentication token from localStorage
 */
export function getAuthToken() {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve auth token:', error);
      return null;
    }
  }
  return null;
}

/**
 * Remove authentication token from localStorage
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Failed to remove auth token:', error);
      return false;
    }
  }
  return false;
}

/**
 * Check if user is authenticated (has token)
 */
export function isAuthenticated() {
  return getAuthToken() !== null;
}

/**
 * Get Authorization header value for API requests
 */
export function getAuthHeader() {
  const token = getAuthToken();
  return token ? `Bearer ${token}` : null;
}

/**
 * Create headers object with Authorization header for API requests
 */
export function getAuthHeaders(additionalHeaders = {}) {
  const authHeader = getAuthHeader();
  const headers = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };
  
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  return headers;
}

/**
 * Fetch wrapper that automatically adds Authorization header
 */
export async function authenticatedFetch(url, options = {}) {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // If unauthorized, clear token and redirect to login
  if (response.status === 401) {
    removeAuthToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  
  return response;
}


