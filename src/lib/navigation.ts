/**
 * Utility functions for consistent navigation with state preservation
 */

/**
 * Builds a URL with preserved state parameters
 * @param basePath - The base path (e.g., '/dashboard/trainer/123')
 * @param state - Object containing state to preserve (filters, view mode, etc.)
 * @param returnTo - Optional identifier for where we're coming from
 * @returns Complete URL with query parameters
 */
export function buildUrlWithState(
  basePath: string,
  state: Record<string, string | number | undefined | null> = {},
  returnTo?: string
): string {
  const params = new URLSearchParams();
  
  // Add state parameters (skip empty/null/undefined values)
  Object.entries(state).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  
  // Add returnTo if provided
  if (returnTo) {
    params.set('returnTo', returnTo);
  }
  
  const queryString = params.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

/**
 * Extracts state from URL search params
 * @param searchParams - URLSearchParams object
 * @param keys - Array of keys to extract
 * @returns Object with extracted state values
 */
export function extractStateFromUrl(
  searchParams: URLSearchParams,
  keys: string[]
): Record<string, string | null> {
  const state: Record<string, string | null> = {};
  keys.forEach(key => {
    const value = searchParams.get(key);
    if (value !== null) {
      state[key] = value;
    }
  });
  return state;
}

/**
 * Builds a back URL preserving all state from current URL
 * @param targetPath - The path to navigate back to
 * @param searchParams - Current URL search params
 * @param preserveKeys - Keys to preserve from current URL
 * @returns URL with preserved state
 */
export function buildBackUrl(
  targetPath: string,
  searchParams: URLSearchParams,
  preserveKeys: string[]
): string {
  const params = new URLSearchParams();
  
  preserveKeys.forEach(key => {
    const value = searchParams.get(key);
    if (value) {
      params.set(key, value);
    }
  });
  
  const queryString = params.toString();
  return queryString ? `${targetPath}?${queryString}` : targetPath;
}

