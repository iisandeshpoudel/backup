const API_BASE_URL = "http://localhost:5000";

export const getImageUrl = (url: string | undefined): string => {
  if (!url) {
    // Return full URL to placeholder image
    return `${API_BASE_URL}/api/placeholder-product.jpg`;
  }

  // Remove any duplicate /api/ prefixes
  const cleanUrl = url.replace(/\/api\/api\//, "/api/");

  // If the URL already includes our API base URL and has /api/, return it as is
  if (cleanUrl.startsWith(API_BASE_URL) && cleanUrl.includes("/api/")) {
    return cleanUrl;
  }

  // If the URL includes API_BASE_URL but doesn't have /api/, insert it
  if (cleanUrl.startsWith(API_BASE_URL)) {
    return cleanUrl.replace(API_BASE_URL, `${API_BASE_URL}/api`);
  }

  // For URLs starting with /uploads, ensure it has /api prefix
  if (cleanUrl.startsWith("/uploads/")) {
    return `${API_BASE_URL}/api${cleanUrl}`;
  }

  // For uploads/filename format
  if (cleanUrl.startsWith("uploads/")) {
    return `${API_BASE_URL}/api/${cleanUrl}`;
  }

  // For any other URL format, assume it needs to be under /api/uploads/
  return `${API_BASE_URL}/api/uploads/${cleanUrl}`;
};
