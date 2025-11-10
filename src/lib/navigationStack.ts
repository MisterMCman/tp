/**
 * Navigation Stack Management
 * 
 * Maintains a navigation history stack in localStorage to enable proper back navigation
 * through deep navigation paths (e.g., requests -> trainer -> training details)
 */

export interface NavigationEntry {
  path: string;
  queryParams: Record<string, string>;
  timestamp: number;
  title?: string;
}

const STORAGE_KEY = 'tp_navigation_stack';
const MAX_STACK_SIZE = 50; // Maximum number of entries to keep

/**
 * Get the current navigation stack from localStorage
 */
export function getNavigationStack(): NavigationEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored) as NavigationEntry[];
  } catch (error) {
    console.error('Error reading navigation stack:', error);
    return [];
  }
}

/**
 * Save the navigation stack to localStorage
 */
function saveNavigationStack(stack: NavigationEntry[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Keep only the most recent entries
    const trimmedStack = stack.slice(-MAX_STACK_SIZE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedStack));
  } catch (error) {
    console.error('Error saving navigation stack:', error);
  }
}

/**
 * Add a new entry to the navigation stack
 * This should be called when navigating to a new page
 */
export function pushToNavigationStack(
  path: string,
  queryParams: Record<string, string> = {},
  title?: string
): void {
  const stack = getNavigationStack();
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : path;
  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
  
  // Parse current query params
  const currentParams: Record<string, string> = {};
  if (currentSearch) {
    const params = new URLSearchParams(currentSearch);
    params.forEach((value, key) => {
      currentParams[key] = value;
    });
  }

  // Don't add duplicate consecutive entries
  const lastEntry = stack[stack.length - 1];
  if (
    lastEntry &&
    lastEntry.path === currentPath &&
    JSON.stringify(lastEntry.queryParams) === JSON.stringify(currentParams)
  ) {
    return;
  }

  // Add current page to stack before navigating
  const currentEntry: NavigationEntry = {
    path: currentPath,
    queryParams: currentParams,
    timestamp: Date.now(),
    title: typeof document !== 'undefined' ? document.title : title
  };

  stack.push(currentEntry);
  saveNavigationStack(stack);
}

/**
 * Get the previous entry from the navigation stack
 * This is used for back navigation
 */
export function getPreviousEntry(): NavigationEntry | null {
  const stack = getNavigationStack();
  if (stack.length === 0) {
    return null;
  }

  // Get the last entry (current page) and the one before it
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const currentSearch = typeof window !== 'undefined' ? window.location.search : '';
  
  // Parse current query params
  const currentParams: Record<string, string> = {};
  if (currentSearch) {
    const params = new URLSearchParams(currentSearch);
    params.forEach((value, key) => {
      currentParams[key] = value;
    });
  }

  // Find the last entry that matches current page
  let lastMatchingIndex = -1;
  for (let i = stack.length - 1; i >= 0; i--) {
    if (
      stack[i].path === currentPath &&
      JSON.stringify(stack[i].queryParams) === JSON.stringify(currentParams)
    ) {
      lastMatchingIndex = i;
      break;
    }
  }

  // If we found a match and there's an entry before it, return that
  if (lastMatchingIndex > 0) {
    return stack[lastMatchingIndex - 1];
  }

  // Otherwise, return the second-to-last entry
  if (stack.length >= 2) {
    return stack[stack.length - 2];
  }

  return null;
}

/**
 * Build a back URL from the previous entry in the navigation stack
 * This also pops the current entry from the stack when called
 */
export function buildBackUrl(): string | null {
  const previous = getPreviousEntry();
  
  // Pop the current entry from the stack when going back
  popFromNavigationStack();
  
  if (!previous) {
    return null;
  }

  const params = new URLSearchParams();
  Object.entries(previous.queryParams).forEach(([key, value]) => {
    params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `${previous.path}?${queryString}` : previous.path;
}

/**
 * Pop the last entry from the navigation stack
 * This is called when navigating back
 */
export function popFromNavigationStack(): NavigationEntry | null {
  const stack = getNavigationStack();
  if (stack.length === 0) {
    return null;
  }

  const popped = stack.pop();
  saveNavigationStack(stack);
  return popped || null;
}

/**
 * Clear the navigation stack
 */
export function clearNavigationStack(): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Remove entries from the stack that match a specific path
 * Useful when navigating to a new section (e.g., going to dashboard clears deep navigation)
 */
export function removeEntriesForPath(path: string): void {
  const stack = getNavigationStack();
  const filtered = stack.filter(entry => !entry.path.startsWith(path));
  saveNavigationStack(filtered);
}

/**
 * Get the full navigation path as an array
 * Useful for breadcrumbs
 */
export function getNavigationPath(): NavigationEntry[] {
  return getNavigationStack();
}

/**
 * Initialize navigation tracking for the current page
 * Should be called on page load
 */
export function initializeNavigation(path: string, queryParams: Record<string, string> = {}): void {
  const stack = getNavigationStack();
  
  // Check if this is a direct navigation (not from back/forward)
  const isDirectNavigation = !stack.some(entry => 
    entry.path === path && 
    JSON.stringify(entry.queryParams) === JSON.stringify(queryParams)
  );

  if (isDirectNavigation) {
    pushToNavigationStack(path, queryParams);
  }
}

/**
 * Build a URL with navigation tracking
 * Use this instead of direct router.push() to maintain navigation stack
 * Note: This should be called BEFORE navigation, and the current page will be pushed to stack
 */
export function buildUrlWithNavigation(
  path: string,
  queryParams: Record<string, string | number | undefined | null> = {}
): string {
  // Only push to stack if we're in the browser
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    
    const currentParams: Record<string, string> = {};
    if (currentSearch) {
      const params = new URLSearchParams(currentSearch);
      params.forEach((value, key) => {
        currentParams[key] = value;
      });
    }

    // Only push if current path is different from target path
    if (currentPath !== path) {
      pushToNavigationStack(currentPath, currentParams);
    }
  }

  // Build new URL
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

