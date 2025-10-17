// API utility with automatic token expiration handling

// Get the base API URL from environment variables, with a dev fallback
const inferredDevBaseUrl = ((): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:8000`;
})();

export const API_BASE_URL = (import.meta.env.VITE_SERVER_URL as string | undefined)
  || (import.meta.env.DEV ? inferredDevBaseUrl : undefined);
//export const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'https://aicv.wittysea-f7fdfd12.eastus.azurecontainerapps.io';
// Debug logging to see what's happening
console.log('=== API Configuration Debug ===');
console.log('import.meta.env.VITE_SERVER_URL:', import.meta.env.VITE_SERVER_URL);
console.log('import.meta.env:', import.meta.env);
console.log('Final API_BASE_URL:', API_BASE_URL);
console.log('================================');

export interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

export class TokenExpiredError extends Error {
  constructor() {
    super('Token expired');
    this.name = 'TokenExpiredError';
  }
}

/**
 * Enhanced fetch with automatic token expiration handling
 * Automatically redirects to login on 401 responses
 */
export const apiRequest = async (url: string, options: ApiOptions = {}): Promise<Response> => {
  const { requireAuth = true, ...fetchOptions } = options;
  
  // Get token from localStorage
  const token = localStorage.getItem('auth_token');
  
  // Check if auth is required but no token available
  if (requireAuth && !token) {
    redirectToLogin();
    throw new TokenExpiredError();
  }
  
  // Setup headers
  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };
  
  // Only set Content-Type if it's not FormData (let browser set it for FormData)
  if (!(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add authorization header if token exists and auth is required
  if (requireAuth && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Construct full URL
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}/api/v1${url}`;
  
  // Make the request
  try {
    const response = await fetch(fullUrl, {
      ...fetchOptions,
      headers,
    });
    
    // Check for token expiration (401 Unauthorized) - but only for authenticated requests
    if (response.status === 401 && requireAuth) {
      handleTokenExpiration();
      throw new TokenExpiredError();
    }
    
    // For public requests (like login), don't throw on 401/403 - let the caller handle it
    
    return response;
  } catch (error) {
    // If it's a network error or other error, just throw it
    if (error instanceof TokenExpiredError) {
      throw error;
    }
    
    throw error;
  }
};

/**
 * Simplified API methods for common HTTP operations
 */
export const api = {
  get: (url: string, options: ApiOptions = {}) => 
    apiRequest(url, { ...options, method: 'GET' }),
    
  post: (url: string, data?: any, options: ApiOptions = {}) => 
    apiRequest(url, { 
      ...options, 
      method: 'POST', 
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined)
    }),
    
  put: (url: string, data?: any, options: ApiOptions = {}) => 
    apiRequest(url, { 
      ...options, 
      method: 'PUT', 
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined)
    }),
    
  delete: (url: string, options: ApiOptions = {}) => 
    apiRequest(url, { ...options, method: 'DELETE' }),
    
  patch: (url: string, data?: any, options: ApiOptions = {}) => 
    apiRequest(url, { 
      ...options, 
      method: 'PATCH', 
      body: data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined)
    }),
    
  // For requests that don't require authentication
  public: {
    get: (url: string, options: ApiOptions = {}) => 
      apiRequest(url, { ...options, method: 'GET', requireAuth: false }),
      
    post: (url: string, data?: any, options: ApiOptions = {}) => 
      apiRequest(url, { 
        ...options, 
        method: 'POST', 
        body: data ? JSON.stringify(data) : undefined,
        requireAuth: false 
      }),
  }
};

/**
 * Handle token expiration - clear stored data and redirect to login
 */
export const handleTokenExpiration = () => {
  // Clear all authentication-related data
  localStorage.removeItem('auth_token');
  sessionStorage.clear(); // Clear any session data like chatId
  
  // Trigger a custom event that the AuthContext can listen to
  window.dispatchEvent(new CustomEvent('token-expired'));
  
  // Redirect to login page
  redirectToLogin();
};

/**
 * Redirect to login page and preserve current location
 */
export const redirectToLogin = () => {
  const currentPath = window.location.pathname + window.location.search;
  
  // Only preserve path if it's not already the login page
  if (currentPath !== '/login') {
    sessionStorage.setItem('redirect_after_login', currentPath);
  }
  
  // Use window.location to ensure a full page navigation
  window.location.href = '/login';
};

/**
 * Check if a JWT token is expired (client-side check)
 * Note: This doesn't guarantee the token is valid on the server
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    
    const payload = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Check if token has expired (exp claim)
    if (payload.exp && payload.exp < currentTime) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Auth] Error checking token expiration:', error);
    return true; // Assume expired if we can't decode it
  }
};

/**
 * Validate token and handle expiration on app startup
 */
export const validateStoredToken = (): boolean => {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    handleTokenExpiration();
    return false;
  }
  
  return true;
};