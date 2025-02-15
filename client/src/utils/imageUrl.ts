// Base URL for the server without /api prefix since static files are served from root
const API_BASE_URL = 'http://localhost:5000';

export const getImageUrl = (url: string | undefined): string => {
  if (!url) {
    // Return full URL to placeholder image
    return `${API_BASE_URL}/api/placeholder-product.jpg`;
  }
  
  // If the URL is already absolute (starts with http), use it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // For URLs starting with /uploads, ensure it has /api prefix
  if (url.startsWith('/uploads/')) {
    return `${API_BASE_URL}/api${url}`;
  }
  
  // For URLs without leading slash, ensure they start with /api/uploads/
  if (!url.startsWith('uploads/')) {
    return `${API_BASE_URL}/api/uploads/${url}`;
  }
  
  // For URLs that already have the correct format (uploads/filename)
  return `${API_BASE_URL}/api/${url}`;
}; 