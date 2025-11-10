/**
 * Utility functions for consistent navigation with state preservation
 */

import { buildUrlWithNavigation, buildBackUrl as getBackUrlFromStack } from './navigationStack';

/**
 * Builds a URL with preserved state parameters and navigation tracking
 * @param basePath - The base path (e.g., '/dashboard/trainer/123')
 * @param state - Object containing state to preserve (filters, view mode, etc.)
 * @param returnTo - Optional identifier for where we're coming from (deprecated, use navigation stack)
 * @returns Complete URL with query parameters
 */
export function buildUrlWithState(
  basePath: string,
  state: Record<string, string | number | undefined | null> = {},
  returnTo?: string
): string {
  // Use navigation stack-aware URL building
  return buildUrlWithNavigation(basePath, state);
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
 * Builds a back URL using the navigation stack
 * If stack is empty, returns dashboard
 * @returns URL with preserved state from navigation stack or '/dashboard'
 */
export function buildBackUrl(): string {
  // Try to get back URL from navigation stack first
  const stackBackUrl = getBackUrlFromStack();
  if (stackBackUrl) {
    return stackBackUrl;
  }

  // If stack is empty, always go to dashboard
  return '/dashboard';
}

