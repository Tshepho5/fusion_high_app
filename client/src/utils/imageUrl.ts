/**
 * Utility to resolve relative profile picture and media URLs across development and production environments.
 */
export const getProfilePictureUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  // If running on local server (Express port 4000 or Vite dev port 5173/3000), route locally
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    if (window.location.port === '5173' || window.location.port === '3000') {
      const hostname = window.location.hostname || 'localhost';
      return `http://${hostname}:4000${cleanPath}`;
    }
    return cleanPath;
  }
  
  // When running on Firebase Hosting or external domain, route relative upload paths to Render backend
  return `https://fusion-high-backend.onrender.com${cleanPath}`;
};
