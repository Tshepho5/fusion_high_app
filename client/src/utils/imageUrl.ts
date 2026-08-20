/**
 * Utility to resolve relative profile picture and media URLs across development and production environments.
 */
export const getProfilePictureUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // If running on Vite dev server (port 5173), prepend the Express backend host
  if (typeof window !== 'undefined' && (window.location.port === '5173' || window.location.port === '3000')) {
    const backendPort = '4000';
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:${backendPort}${cleanPath}`;
  }
  
  return cleanPath;
};
