export function getApiUrl(path) {
  if (typeof window === 'undefined') {
    return path;
  }

  // Check if running inside native Capacitor (not local browser development pointing to dev server)
  const isNativeCapacitor = !!window.Capacitor && 
    (window.location.origin === 'https://localhost' || window.location.origin.startsWith('capacitor://'));

  if (isNativeCapacitor) {
    // Force production API server domain in native mobile environment
    return `https://tripmaker.tips${path}`;
  }

  // Use relative path for web and local Next.js development server
  return path;
}
