"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserData } from "@/lib/session";

interface TopicWithLevel {
  name: string;
  level: 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE';
}

interface TrainerSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio?: string;
  profilePicture?: string;
  dailyRate?: number;
  location?: {
    name: string;
    code: string;
  };
  topics: string[];
  topicsWithLevels?: TopicWithLevel[];
  completedTrainings: number;
  isCompany: boolean;
  companyName?: string;
  travelRadius?: number;
  distanceInfo?: {
    isWithinRadius: boolean;
    distance: number | null;
  } | null;
  onlineTrainingInfo?: {
    offersOnline: boolean;
  } | null;
}

export default function TrainerSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  
  // Search state
  const [searchResults, setSearchResults] = useState<TrainerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    topic: '',
    topicId: '', // Store selected topic ID for precise search
    location: '',
    maxPrice: '',
    expertiseLevel: 'all' // 'all', 'minimum_grundlage', 'minimum_fortgeschritten', 'minimum_experte'
  });
  
  // Ref to store latest filters to avoid stale closures in useCallback
  const searchFiltersRef = useRef(searchFilters);
  
  // Update ref whenever filters change
  useEffect(() => {
    searchFiltersRef.current = searchFilters;
    // Debug: log when topicId changes
    if (searchFilters.topicId) {
      console.log('topicId set to:', searchFilters.topicId, 'for topic:', searchFilters.topic);
    }
  }, [searchFilters]);
  
  // Store trainingId from URL if present (for direct request workflow)
  const [trainingIdFromUrl, setTrainingIdFromUrl] = useState<number | null>(null);
  
  // Track if we've already auto-searched to prevent duplicate searches
  const hasAutoSearchedRef = useRef(false);
  
  // Track if we're updating URL ourselves to prevent reload loop
  const isUpdatingURLRef = useRef(false);

  // Topic suggestions state (from database)
  const [topicSuggestions, setTopicSuggestions] = useState<{ id: number; name: string; short_title?: string }[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);
  const [topicSearchTerm, setTopicSearchTerm] = useState(''); // Separate state for search input

  useEffect(() => {
    // Check if user is logged in and is a company (works for both trainers and companies)
    const userData = getUserData();
    
    if (!userData) {
      // No user data at all - redirect to dashboard (will redirect to login)
      router.push('/dashboard');
      return;
    }
    
    // Check if user is a training company
    if (userData.userType !== 'TRAINING_COMPANY') {
      router.push('/dashboard');
      return;
    }
    
    setUser(userData);

    // Skip loading from URL if we're the ones updating it (prevent reload loop)
    if (isUpdatingURLRef.current) {
      return;
    }

    // Load filters from URL params
    const topicParam = searchParams.get('topic');
    const topicIdParam = searchParams.get('topicId');
    const locationParam = searchParams.get('location');
    const maxPriceParam = searchParams.get('maxPrice');
    const expertiseLevelParam = searchParams.get('expertiseLevel');
    const trainingIdParam = searchParams.get('trainingId');
    
    // Build filters from URL
    const urlFilters = {
      topic: topicParam ? decodeURIComponent(topicParam) : '',
      topicId: topicIdParam || '',
      location: locationParam || '',
      maxPrice: maxPriceParam || '',
      expertiseLevel: expertiseLevelParam || 'all'
    };
    
    // Update state from URL (only if URL has params to avoid overwriting user input)
    // Only update if the URL params are different from current state to prevent unnecessary updates
    if (topicParam || topicIdParam || locationParam || maxPriceParam || expertiseLevelParam) {
      const currentTopicId = searchFilters.topicId || '';
      const currentTopic = searchFilters.topic || '';
      
      // Only update if URL params are different from current state
      if (urlFilters.topicId !== currentTopicId || 
          urlFilters.topic !== currentTopic ||
          urlFilters.location !== searchFilters.location ||
          urlFilters.maxPrice !== searchFilters.maxPrice ||
          urlFilters.expertiseLevel !== searchFilters.expertiseLevel) {
        
        if (urlFilters.topicId) {
          // If topicId is in URL, we need to fetch the topic name
          // For now, just set the topicId and let the user see the search results
          setTopicSearchTerm(urlFilters.topic || '');
        } else if (urlFilters.topic) {
          setTopicSearchTerm(urlFilters.topic);
        }
        setSearchFilters(urlFilters);
        // Clear suggestions when loading from URL - don't show dropdown
        setShowTopicSuggestions(false);
        setTopicSuggestions([]);
        
        // If we have filters in URL, trigger a search to restore results
        // This restores search results when navigating back from trainer profile
        // We check if we have active filters and either haven't searched or results are empty
        const hasActiveFilters = urlFilters.topicId || urlFilters.topic || urlFilters.location || urlFilters.maxPrice || urlFilters.expertiseLevel !== 'all';
        if (hasActiveFilters && (!hasSearched || searchResults.length === 0)) {
          // Use a small delay to ensure state is updated
          setTimeout(() => {
            searchTrainers(urlFilters);
          }, 100);
        }
      }
    }
    
    // Store trainingId if present (for direct request workflow)
    if (trainingIdParam) {
      setTrainingIdFromUrl(parseInt(trainingIdParam));
    } else {
      setTrainingIdFromUrl(null);
      // Reset auto-search ref when trainingId is removed
      hasAutoSearchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]); // searchFilters intentionally excluded to prevent infinite loop
  
  // Auto-trigger search if coming from training overview (has trainingId param)
  useEffect(() => {
    const topicParam = searchParams.get('topic');
    const trainingIdParam = searchParams.get('trainingId');
    
    // Only auto-search if we have both trainingId and topic, haven't searched yet, and haven't auto-searched
    if (trainingIdParam && topicParam && !hasSearched && !hasAutoSearchedRef.current) {
      hasAutoSearchedRef.current = true;
      const decodedTopic = decodeURIComponent(topicParam);
      setTopicSearchTerm(decodedTopic);
      // Use the topic from URL directly for the search
      const filtersWithTopic = { ...searchFilters, topic: decodedTopic };
      
      // Small delay to ensure state is updated
      const timer = setTimeout(() => {
        searchTrainers(filtersWithTopic);
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch topic suggestions from database when topic input changes (after 3 characters)
  useEffect(() => {
    // Don't show suggestions if a topicId is already set (meaning a topic was selected)
    if (searchFilters.topicId && searchFilters.topicId.trim() !== '') {
      setTopicSuggestions([]);
      setShowTopicSuggestions(false);
      return;
    }
    
    if (topicSearchTerm.length >= 3) {
      const timeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/topics?search=${encodeURIComponent(topicSearchTerm)}`);
          if (response.ok) {
            const data = await response.json();
            // Map to include id and name
            const mappedSuggestions = data.map((topic: { 
              id: number; 
              name: string; 
              short_title?: string;
            }) => ({
              id: topic.id,
              name: topic.name,
              short_title: topic.short_title
            }));
            setTopicSuggestions(mappedSuggestions);
            // Automatically show suggestions when they're loaded
            // But only if no topicId is set (user is still searching)
            if (mappedSuggestions.length > 0 && !searchFilters.topicId) {
              setShowTopicSuggestions(true);
            }
          }
        } catch (error) {
          console.error('Error fetching topic suggestions:', error);
          setTopicSuggestions([]);
          setShowTopicSuggestions(false);
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setTopicSuggestions([]);
      setShowTopicSuggestions(false);
    }
  }, [topicSearchTerm, searchFilters.topicId]);

  const handleTopicChange = (value: string) => {
    setTopicSearchTerm(value);
    
    // Only clear topicId if the user is typing something different from the current topic
    // This prevents clearing topicId when the input value matches the selected topic name
    const shouldClearTopicId = value !== searchFilters.topic || value.trim() === '';
    
    const newFilters = { 
      ...searchFilters, 
      topic: value, 
      topicId: shouldClearTopicId ? '' : searchFilters.topicId 
    };
    setSearchFilters(newFilters);
    // Update URL when user types (debounced)
    updateURLParams(newFilters);
  };

  const handleTopicSelect = (topic: { id: number; name: string }) => {
    // Set both the display name and the ID for precise searching
    setTopicSearchTerm(topic.name);
    const newFilters = { 
      ...searchFilters, 
      topic: topic.name,
      topicId: topic.id.toString() // Use topicId for exact match
    };
    setSearchFilters(newFilters);
    // Immediately close suggestions and clear the suggestions list
    setShowTopicSuggestions(false);
    setTopicSuggestions([]);
    // Update URL with the selected topic
    updateURLParams(newFilters);
    // Don't auto-search - user needs to click search button
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchTrainers();
    }
  };

  // Function to update URL parameters based on current filters
  const updateURLParams = useCallback((filters: typeof searchFilters) => {
    const params = new URLSearchParams();
    
    // Add topicId if available, otherwise topic name
    if (filters.topicId && filters.topicId.trim() !== '') {
      params.set('topicId', filters.topicId);
    } else if (filters.topic && filters.topic.trim() !== '') {
      params.set('topic', filters.topic);
    }
    
    if (filters.location && filters.location.trim() !== '') {
      params.set('location', filters.location);
    }
    
    if (filters.maxPrice && filters.maxPrice.trim() !== '') {
      params.set('maxPrice', filters.maxPrice);
    }
    
    if (filters.expertiseLevel && filters.expertiseLevel !== 'all') {
      params.set('expertiseLevel', filters.expertiseLevel);
    }
    
    // Preserve trainingId if present
    if (trainingIdFromUrl) {
      params.set('trainingId', trainingIdFromUrl.toString());
    }
    
    // Mark that we're updating URL to prevent reload loop
    isUpdatingURLRef.current = true;
    
    // Update URL without page reload
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    router.replace(newUrl, { scroll: false });
    
    // Reset flag after a short delay
    setTimeout(() => {
      isUpdatingURLRef.current = false;
    }, 100);
  }, [router, trainingIdFromUrl]);

  const clearFilters = () => {
    setSearchFilters({
      topic: '',
      topicId: '',
      location: '',
      maxPrice: '',
      expertiseLevel: 'all'
    });
    setTopicSearchTerm('');
    setTopicSuggestions([]);
    setSearchResults([]);
    setHasSearched(false);
  };

  const hasActiveFilters = searchFilters.topic || searchFilters.location || searchFilters.maxPrice || searchFilters.expertiseLevel !== 'all';

  const searchTrainers = useCallback(async (filtersOverride?: typeof searchFilters) => {
    setSearchLoading(true);
    setHasSearched(true);

    try {
      // Use override if provided, otherwise use ref to get latest state (avoids stale closures)
      const filtersToUse = filtersOverride !== undefined ? filtersOverride : searchFiltersRef.current;
      const params = new URLSearchParams();
      
      // Use topicId if available (exact match), otherwise use topic name (partial match)
      // IMPORTANT: Only send one or the other, not both, to avoid conflicting filters
      if (filtersToUse.topicId && filtersToUse.topicId.trim() !== '') {
        params.append('topicId', filtersToUse.topicId);
        // Don't send topic name when topicId is set - the API will use exact match
      } else if (filtersToUse.topic && filtersToUse.topic.trim() !== '') {
        params.append('topic', filtersToUse.topic);
      }
      
      if (filtersToUse.location && filtersToUse.location.trim() !== '') {
        params.append('location', filtersToUse.location);
      }
      
      if (filtersToUse.maxPrice && filtersToUse.maxPrice.trim() !== '') {
        params.append('maxPrice', filtersToUse.maxPrice);
      }
      
      // Only send expertiseLevel if it's a valid value (not 'all' and not undefined)
      if (filtersToUse.expertiseLevel && filtersToUse.expertiseLevel !== 'all' && filtersToUse.expertiseLevel !== 'undefined') {
        params.append('expertiseLevel', filtersToUse.expertiseLevel);
      }
      
      // Include trainingId for distance calculation
      if (trainingIdFromUrl) {
        params.append('trainingId', trainingIdFromUrl.toString());
      }

      console.log('Searching with filters:', filtersToUse);
      console.log('Search URL params:', params.toString());

      // Update URL with current search filters
      updateURLParams(filtersToUse);

      const response = await fetch(`/api/trainers/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.trainers || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching trainers:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [trainingIdFromUrl, updateURLParams]); // Added updateURLParams to dependencies

  // Helper function to sort topics - prioritize searched topic
  const sortTopicsForDisplay = (topics: (string | TopicWithLevel)[], searchQuery: string): (string | TopicWithLevel)[] => {
    if (!searchQuery) return topics;
    
    const searchLower = searchQuery.toLowerCase();
    const sorted = [...topics].sort((a, b) => {
      const nameA = typeof a === 'string' ? a : a.name;
      const nameB = typeof b === 'string' ? b : b.name;
      
      const aMatches = nameA.toLowerCase().includes(searchLower);
      const bMatches = nameB.toLowerCase().includes(searchLower);
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
    
    return sorted;
  };

  if (!user || user.userType !== 'TRAINING_COMPANY') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="ptw-dashboard-header">
        <h1>TRAINER SUCHEN</h1>
      </div>

      <div className="ptw-dashboard-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-6">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>
            TRAINER FINDEN
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="whitespace-nowrap">Filter zurücksetzen</span>
            </button>
          )}
        </div>

        {/* Search Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Topic Input */}
          <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium" style={{ color: searchFilters.topic ? 'var(--ptw-accent-primary)' : '#6b7280' }}>
              Thema {searchFilters.topic && '•'}
            </label>
            <input
              type="text"
              placeholder="Thema suchen (min. 3 Zeichen)..."
              value={topicSearchTerm}
              onChange={(e) => handleTopicChange(e.target.value)}
              onFocus={() => {
                // Show suggestions if we have them and search term is long enough
                // But only if no topicId is set (user hasn't selected a topic yet)
                if (topicSearchTerm.length >= 3 && topicSuggestions.length > 0 && !searchFilters.topicId) {
                  setShowTopicSuggestions(true);
                }
              }}
              onBlur={(e) => {
                // Only hide suggestions if we're not clicking on a suggestion button
                // Check if the related target is not inside the suggestions dropdown
                const relatedTarget = e.relatedTarget as HTMLElement;
                if (!relatedTarget || !relatedTarget.closest('.topic-suggestions-dropdown')) {
                  setTimeout(() => setShowTopicSuggestions(false), 200);
                }
              }}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              style={{ borderColor: searchFilters.topic ? 'var(--ptw-accent-primary)' : undefined }}
            />

            {/* Topic Suggestions Dropdown */}
            {showTopicSuggestions && topicSuggestions.length > 0 && !searchFilters.topicId && (
              <div className="topic-suggestions-dropdown absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto mt-1">
                {topicSuggestions.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onMouseDown={(e) => {
                      // Prevent input blur from firing before click
                      e.preventDefault();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleTopicSelect(topic);
                      // Force close suggestions immediately
                      setShowTopicSuggestions(false);
                      setTopicSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    style={{ color: 'var(--ptw-text-primary)' }}
                  >
                    <div className="font-medium">{topic.name}</div>
                    {topic.short_title && topic.short_title !== topic.name && (
                      <div className="text-xs text-gray-500">{topic.short_title}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
            
            {/* Show message if less than 3 characters */}
            {topicSearchTerm.length > 0 && topicSearchTerm.length < 3 && (
              <p className="absolute top-full left-0 mt-1 text-xs text-gray-500 px-1">
                Bitte geben Sie mindestens 3 Zeichen ein
              </p>
            )}
          </div>

          {/* Location Select */}
          <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium" style={{ color: searchFilters.location ? 'var(--ptw-accent-primary)' : '#6b7280' }}>
              Standort {searchFilters.location && '•'}
            </label>
            <select
              value={searchFilters.location}
              onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all appearance-none bg-white"
              style={{ borderColor: searchFilters.location ? 'var(--ptw-accent-primary)' : undefined }}
            >
              <option value="">Alle Standorte</option>
              <option value="de">Deutschland</option>
              <option value="at">Österreich</option>
              <option value="ch">Schweiz</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Max Price - Simplified */}
          <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium" style={{ color: searchFilters.maxPrice ? 'var(--ptw-accent-primary)' : '#6b7280' }}>
              Max. Preis pro Tag {searchFilters.maxPrice && '•'}
            </label>
            <input
              type="number"
              placeholder="z.B. 1000"
              value={searchFilters.maxPrice}
              onChange={(e) => {
                const val = e.target.value;
                const newFilters = { ...searchFilters, maxPrice: val };
                setSearchFilters(newFilters);
                updateURLParams(newFilters);
              }}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              min="0"
              style={{ borderColor: searchFilters.maxPrice ? 'var(--ptw-accent-primary)' : undefined }}
            />
          </div>

          {/* Expertise Level */}
          <div className="relative">
            <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs font-medium" style={{ color: searchFilters.expertiseLevel !== 'all' ? 'var(--ptw-accent-primary)' : '#6b7280' }}>
              Expertise Level {searchFilters.expertiseLevel !== 'all' && '•'}
            </label>
            <select
              value={searchFilters.expertiseLevel || 'all'}
              onChange={(e) => {
                const value = e.target.value || 'all';
                const newFilters = { ...searchFilters, expertiseLevel: value };
                setSearchFilters(newFilters);
                updateURLParams(newFilters);
              }}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all appearance-none bg-white"
              style={{ borderColor: searchFilters.expertiseLevel !== 'all' ? 'var(--ptw-accent-primary)' : undefined }}
            >
              <option value="all">Alle Level</option>
              <option value="minimum_grundlage">Minimum Grundlage</option>
              <option value="minimum_fortgeschritten">Minimum Fortgeschritten</option>
              <option value="minimum_experte">Nur Experte</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              // Pass undefined to use current state from the component
              // The callback will read the latest searchFilters state
              searchTrainers(undefined);
            }}
            disabled={searchLoading}
            className="ptw-button-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] sm:min-w-[180px] justify-center w-full sm:w-auto"
          >
            {searchLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="hidden sm:inline">SUCHE...</span>
                <span className="sm:hidden">SUCHE</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className="hidden sm:inline">TRAINER SUCHEN</span>
                <span className="sm:hidden">SUCHEN</span>
              </>
            )}
          </button>
          {hasSearched && searchResults.length > 0 && (
            <span className="text-sm text-gray-600 w-full sm:w-auto text-center sm:text-left">
              {searchResults.length} {searchResults.length === 1 ? 'Trainer gefunden' : 'Trainer gefunden'}
            </span>
          )}
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="ptw-dashboard-card">
          <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--ptw-accent-primary)' }}>
            SUCHERGEBNISSE {searchResults.length > 0 && `(${searchResults.length} ${searchResults.length === 1 ? 'Trainer' : 'Trainer'})`}
          </h3>

          {searchLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4">
              {searchResults.map((trainer) => {
                // Get all topics with levels
                const allTopics = trainer.topicsWithLevels || trainer.topics.map((name: string) => ({ name, level: 'GRUNDLAGE' as const }));
                
                // Sort topics - searched topic first
                const sortedTopics = sortTopicsForDisplay(allTopics, searchFilters.topic);
                
                return (
                  <div key={trainer.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg border transition-all hover:shadow-md" style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}>
                    {/* Profile Picture */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      {trainer.profilePicture ? (
                        <img
                          src={trainer.profilePicture}
                          alt={`${trainer.firstName} ${trainer.lastName}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-lg sm:text-xl font-semibold">
                            {trainer.firstName[0]}{trainer.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 w-full min-w-0">
                      {/* Header with name and price */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-base sm:text-lg mb-1" style={{ color: 'var(--ptw-text-primary)' }}>
                            {trainer.firstName} {trainer.lastName}
                            {trainer.isCompany && trainer.companyName && (
                              <span className="text-xs sm:text-sm text-gray-500 ml-2">({trainer.companyName})</span>
                            )}
                          </h4>
                          <p className="text-xs sm:text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                            {trainer.location?.name || 'Standort nicht angegeben'}
                          </p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          {trainer.dailyRate && (
                            <p className="font-semibold text-base sm:text-lg mb-1" style={{ color: 'var(--ptw-accent-primary)' }}>
                              {trainer.dailyRate}€/Tag
                            </p>
                          )}
                          <p className="text-xs sm:text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                            {trainer.completedTrainings} abgeschlossene Trainings
                          </p>
                        </div>
                      </div>

                      {/* Bio */}
                      {trainer.bio && (
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: 'var(--ptw-text-secondary)' }}>
                          {trainer.bio.length > 150 ? `${trainer.bio.substring(0, 150)}...` : trainer.bio}
                        </p>
                      )}

                      {/* Topics - Searched topic first */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {/* Show more chips on larger screens: 3 on mobile, 5 on sm, 7 on md, 10 on lg, 15 on xl */}
                        {sortedTopics.map((topic: string | TopicWithLevel, index: number) => {
                          const topicName = typeof topic === 'string' ? topic : topic.name;
                          const topicLevel = typeof topic === 'string' ? 'GRUNDLAGE' : topic.level;
                          const isSearchedTopic = searchFilters.topic && topicName.toLowerCase().includes(searchFilters.topic.toLowerCase());
                          
                          const levelColors = {
                            'GRUNDLAGE': 'text-gray-800 border-gray-300',
                            'FORTGESCHRITTEN': 'text-white border-blue-500',
                            'EXPERTE': 'text-white border-gray-700'
                          };
                          
                          // Responsive visibility: show more on larger screens
                          // Mobile: first 3, sm: first 5, md: first 7, lg: first 10, xl: first 15
                          let visibilityClasses = '';
                          if (index < 3) {
                            // Always visible on mobile
                            visibilityClasses = '';
                          } else if (index < 5) {
                            // Visible from sm breakpoint
                            visibilityClasses = 'hidden sm:inline-block';
                          } else if (index < 7) {
                            // Visible from md breakpoint
                            visibilityClasses = 'hidden md:inline-block';
                          } else if (index < 10) {
                            // Visible from lg breakpoint
                            visibilityClasses = 'hidden lg:inline-block';
                          } else if (index < 15) {
                            // Visible from xl breakpoint
                            visibilityClasses = 'hidden xl:inline-block';
                          } else {
                            // Hidden on all screens (will show in "+X mehr")
                            return null;
                          }
                          
                          return (
                            <span
                              key={index}
                              className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-full font-semibold border transition-all ${visibilityClasses} ${
                                topicLevel === 'GRUNDLAGE' ? 'bg-[#E0E0E0]' :
                                topicLevel === 'FORTGESCHRITTEN' ? 'bg-[#2196F3]' :
                                'bg-[#212121]'
                              } ${levelColors[topicLevel]} ${isSearchedTopic ? 'ring-2 ring-offset-1 ring-red-500 scale-105' : ''}`}
                              title={`${topicName} - ${topicLevel === 'GRUNDLAGE' ? 'Grundlage' : topicLevel === 'FORTGESCHRITTEN' ? 'Fortgeschritten' : 'Experte'}`}
                            >
                              {topicName}
                            </span>
                          );
                        })}
                        {/* Show "+X mehr" indicator when there are more than 15 topics */}
                        {sortedTopics.length > 15 && (
                          <span className="text-xs sm:text-sm px-2.5 py-1.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                            +{sortedTopics.length - 15} mehr
                          </span>
                        )}
                      </div>

                      {/* Distance Warning */}
                      {trainer.distanceInfo && trainer.distanceInfo.distance !== null && !trainer.distanceInfo.isWithinRadius && (
                        <div className="mb-4 p-3 rounded-lg border-2 border-yellow-400 bg-yellow-50">
                          <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-800 mb-1">
                                Außerhalb des Reiseradius
                              </p>
                              <p className="text-xs text-yellow-700">
                                Der Trainer ist {trainer.distanceInfo.distance} km vom Schulungsort entfernt. 
                                Sein Reiseradius beträgt {trainer.travelRadius} km. 
                                Sie können dennoch eine Anfrage senden.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Distance Info (within radius) */}
                      {trainer.distanceInfo && trainer.distanceInfo.distance !== null && trainer.distanceInfo.isWithinRadius && (
                        <div className="mb-4 p-3 rounded-lg border border-green-300 bg-green-50">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-green-800">
                              Trainer ist {trainer.distanceInfo.distance} km entfernt (innerhalb des Reiseradius von {trainer.travelRadius} km)
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Online Training Warning */}
                      {trainer.onlineTrainingInfo && !trainer.onlineTrainingInfo.offersOnline && (
                        <div className="mb-4 p-3 rounded-lg border-2 border-yellow-400 bg-yellow-50">
                          <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-yellow-800 mb-1">
                                Bietet kein Online-Training an
                              </p>
                              <p className="text-xs text-yellow-700">
                                Dieser Trainer bietet keine Online-Trainings an. 
                                Sie können dennoch eine Anfrage senden.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Online Training Info (offers online) */}
                      {trainer.onlineTrainingInfo && trainer.onlineTrainingInfo.offersOnline && (
                        <div className="mb-4 p-3 rounded-lg border border-green-300 bg-green-50">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm text-green-800">
                              Trainer bietet Online-Trainings an
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                        <Link
                          href={(() => {
                            // Build URL with current search filters to preserve them when navigating back
                            const params = new URLSearchParams();
                            if (searchFilters.topicId) {
                              params.set('topicId', searchFilters.topicId);
                            } else if (searchFilters.topic) {
                              params.set('topic', searchFilters.topic);
                            }
                            if (searchFilters.location) params.set('location', searchFilters.location);
                            if (searchFilters.maxPrice) params.set('maxPrice', searchFilters.maxPrice);
                            if (searchFilters.expertiseLevel !== 'all') params.set('expertiseLevel', searchFilters.expertiseLevel);
                            if (trainingIdFromUrl) params.set('trainingId', trainingIdFromUrl.toString());
                            // Add returnTo parameter to indicate we came from search
                            params.set('returnTo', 'search');
                            const queryString = params.toString();
                            return `/dashboard/trainer/${trainer.id}${queryString ? `?${queryString}` : ''}`;
                          })()}
                          className="text-sm sm:text-base hover:text-red-600 transition-colors text-center sm:text-left flex-shrink-0"
                          style={{ color: 'var(--ptw-accent-primary)' }}
                        >
                          PROFIL ANSEHEN →
                        </Link>
                        {trainingIdFromUrl ? (
                          <button
                            onClick={async () => {
                              // Show confirmation if outside radius
                              if (trainer.distanceInfo && !trainer.distanceInfo.isWithinRadius && trainer.distanceInfo.distance !== null) {
                                const confirmed = confirm(
                                  `Der Trainer ist ${trainer.distanceInfo.distance} km entfernt (außerhalb seines Reiseradius von ${trainer.travelRadius} km). Möchten Sie dennoch eine Anfrage senden?`
                                );
                                if (!confirmed) return;
                              }

                              // Show confirmation if trainer doesn't offer online training
                              if (trainer.onlineTrainingInfo && !trainer.onlineTrainingInfo.offersOnline) {
                                const confirmed = confirm(
                                  `Dieser Trainer bietet keine Online-Trainings an. Möchten Sie dennoch eine Anfrage senden?`
                                );
                                if (!confirmed) return;
                              }

                              try {
                                const response = await fetch('/api/training-requests', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    trainingId: trainingIdFromUrl,
                                    trainerIds: [trainer.id]
                                  }),
                                });

                                if (response.ok) {
                                  const result = await response.json();
                                  if (result.duplicates && result.duplicates.length > 0) {
                                    if (result.newRequests && result.newRequests.length > 0) {
                                      alert(result.message || `${result.newRequests.length} neue Anfrage(n) gesendet. ${result.duplicates.length} Trainer wurde(n) bereits zuvor angefragt.`);
                                    } else {
                                      alert(result.message || `Dieser Trainer wurde bereits zuvor angefragt.`);
                                    }
                                  } else {
                                    alert(result.message || `Anfrage erfolgreich gesendet!`);
                                  }
                                  // Navigate back to trainings page
                                  router.push('/dashboard/trainings');
                                } else {
                                  const error = await response.json();
                                  alert(error.error || 'Fehler beim Senden der Anfrage');
                                }
                              } catch (error) {
                                console.error('Error sending request:', error);
                                alert('Fehler beim Senden der Anfrage');
                              }
                            }}
                            className="ptw-button-primary text-xs sm:text-sm px-4 py-2 w-full sm:w-auto text-center inline-block"
                          >
                            ANFRAGE SENDEN
                          </button>
                        ) : (
                          <Link
                            href={(() => {
                              // Build URL with current search filters to preserve them when navigating back
                              const params = new URLSearchParams();
                              if (searchFilters.topicId) {
                                params.set('topicId', searchFilters.topicId);
                              } else if (searchFilters.topic) {
                                params.set('topic', searchFilters.topic);
                              }
                              if (searchFilters.location) params.set('location', searchFilters.location);
                              if (searchFilters.maxPrice) params.set('maxPrice', searchFilters.maxPrice);
                              if (searchFilters.expertiseLevel !== 'all') params.set('expertiseLevel', searchFilters.expertiseLevel);
                              if (trainingIdFromUrl) params.set('trainingId', trainingIdFromUrl.toString());
                              // Add returnTo parameter to indicate we came from search
                              params.set('returnTo', 'search');
                              const queryString = params.toString();
                              return `/dashboard/trainer/${trainer.id}${queryString ? `?${queryString}` : ''}`;
                            })()}
                            className="ptw-button-primary text-xs sm:text-sm px-4 py-2 w-full sm:w-auto text-center inline-block"
                          >
                            ANFRAGE SENDEN
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-sm font-medium mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
                Keine Trainer gefunden
              </p>
              <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                Versuchen Sie andere Suchkriterien oder passen Sie die Filter an.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm hover:text-red-600 transition-colors"
                  style={{ color: 'var(--ptw-accent-primary)' }}
                >
                  Filter zurücksetzen
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

