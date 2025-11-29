// Environment utilities that work in both test and production

export const getApiUrl = (): string => {
  // Handle test environment
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return process.env.VITE_API_URL || 'http://localhost:8000';
  }
  
  // In development, use the VITE_API_URL environment variable
  // Use optional chaining to handle Jest environment where import.meta might not be fully defined
  const viteApiUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL;
  if (viteApiUrl) {
    return viteApiUrl;
  }
  
  // In production/Docker, use relative path to go through nginx proxy
  // This ensures API calls go through the same origin
  return '';
};