// API URL resolver utility for Capacitor and Web environments

export function getApiUrl(path) {
  // Check if running inside Capacitor (native mobile WebView)
  const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.webkit?.messageHandlers?.cordova);
  
  if (isCapacitor) {
    // Force production API server domain in native mobile environment
    return `https://mytrip2.pro${path}`;
  }
  
  // Use relative path for web and local Next.js development server
  return path;
}
