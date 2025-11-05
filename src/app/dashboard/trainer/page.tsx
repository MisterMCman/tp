"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCompanyData, getTrainerData } from "@/lib/session";

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
    location: '',
    maxPrice: '',
    expertiseLevel: 'all' // 'all', 'minimum_grundlage', 'minimum_fortgeschritten', 'minimum_experte'
  });

  // Topic suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  useEffect(() => {
    // Check if user is logged in and is a company
    // Try both getCompanyData and getTrainerData (legacy support - companies might be stored as trainer_data)
    const companyData = getCompanyData();
    const trainerData = getTrainerData();
    
    // Use company data if available, otherwise fall back to trainer data
    const userData = companyData || trainerData;
    
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

    // Check for topic in URL params (from training details page)
    const topicParam = searchParams.get('topic');
    if (topicParam) {
      setSearchFilters(prev => ({ ...prev, topic: decodeURIComponent(topicParam) }));
      // Don't auto-search - user needs to click search button
    }
  }, [searchParams, router]);

  // Fetch topic suggestions when topic input changes
  useEffect(() => {
    if (searchFilters.topic.length >= 2) {
      const timeout = setTimeout(async () => {
        try {
          const response = await fetch(`/api/trainers/search?topic=${encodeURIComponent(searchFilters.topic)}&suggestions=true`);
          if (response.ok) {
            const data = await response.json();
            setTopicSuggestions(data.suggestions || []);
          }
        } catch (error) {
          console.error('Error fetching topic suggestions:', error);
        }
      }, 300);
      return () => clearTimeout(timeout);
    } else {
      setTopicSuggestions([]);
    }
  }, [searchFilters.topic]);

  const handleTopicChange = (value: string) => {
    setSearchFilters({ ...searchFilters, topic: value });
  };

  const handleTopicSelect = (topic: string) => {
    setSearchFilters({ ...searchFilters, topic });
    setShowTopicSuggestions(false);
    // Don't auto-search - user needs to click search button
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchTrainers();
    }
  };

  const clearFilters = () => {
    setSearchFilters({
      topic: '',
      location: '',
      maxPrice: '',
      expertiseLevel: 'all'
    });
    setSearchResults([]);
    setHasSearched(false);
  };

  const hasActiveFilters = searchFilters.topic || searchFilters.location || searchFilters.maxPrice || searchFilters.expertiseLevel !== 'all';

  const searchTrainers = useCallback(async () => {
    setSearchLoading(true);
    setHasSearched(true);

    try {
      const params = new URLSearchParams();
      if (searchFilters.topic) params.append('topic', searchFilters.topic);
      if (searchFilters.location) params.append('location', searchFilters.location);
      if (searchFilters.maxPrice) params.append('maxPrice', searchFilters.maxPrice);
      if (searchFilters.expertiseLevel !== 'all') params.append('expertiseLevel', searchFilters.expertiseLevel);

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
  }, [searchFilters]);

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
              placeholder="Thema suchen..."
              value={searchFilters.topic}
              onChange={(e) => handleTopicChange(e.target.value)}
              onFocus={() => searchFilters.topic.length >= 2 && setShowTopicSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 200)}
              onKeyPress={handleKeyPress}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              style={{ borderColor: searchFilters.topic ? 'var(--ptw-accent-primary)' : undefined }}
            />

            {/* Topic Suggestions Dropdown */}
            {showTopicSuggestions && topicSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto mt-1">
                {topicSuggestions.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicSelect(topic)}
                    className="w-full text-left px-3 py-2 hover:bg-red-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    style={{ color: 'var(--ptw-text-primary)' }}
                  >
                    {topic}
                  </button>
                ))}
              </div>
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
                setSearchFilters({ ...searchFilters, maxPrice: val });
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
              value={searchFilters.expertiseLevel}
              onChange={(e) => setSearchFilters({ ...searchFilters, expertiseLevel: e.target.value })}
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
            onClick={searchTrainers}
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
                        {sortedTopics.slice(0, 5).map((topic: string | TopicWithLevel, index: number) => {
                          const topicName = typeof topic === 'string' ? topic : topic.name;
                          const topicLevel = typeof topic === 'string' ? 'GRUNDLAGE' : topic.level;
                          const isSearchedTopic = searchFilters.topic && topicName.toLowerCase().includes(searchFilters.topic.toLowerCase());
                          
                          const levelColors = {
                            'GRUNDLAGE': 'bg-blue-100 text-blue-800 border-blue-300',
                            'FORTGESCHRITTEN': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                            'EXPERTE': 'bg-green-100 text-green-800 border-green-300'
                          };
                          const levelLabels = {
                            'GRUNDLAGE': 'G',
                            'FORTGESCHRITTEN': 'F',
                            'EXPERTE': 'E'
                          };
                          
                          return (
                            <span
                              key={index}
                              className={`text-xs sm:text-sm px-2.5 py-1.5 rounded-full font-semibold border transition-all ${
                                levelColors[topicLevel]
                              } ${isSearchedTopic ? 'ring-2 ring-offset-1 ring-red-500 scale-105' : ''}`}
                              title={`${topicName} - ${topicLevel === 'GRUNDLAGE' ? 'Grundlage' : topicLevel === 'FORTGESCHRITTEN' ? 'Fortgeschritten' : 'Experte'}`}
                            >
                              {topicName} <span className="font-bold">{levelLabels[topicLevel]}</span>
                            </span>
                          );
                        })}
                        {sortedTopics.length > 5 && (
                          <span className="text-xs sm:text-sm px-2.5 py-1.5 rounded-full bg-gray-200 text-gray-600 font-medium">
                            +{sortedTopics.length - 5} mehr
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-4">
                        <Link
                          href={`/dashboard/trainer/${trainer.id}`}
                          className="text-sm sm:text-base hover:text-red-600 transition-colors text-center sm:text-left flex-shrink-0"
                          style={{ color: 'var(--ptw-accent-primary)' }}
                        >
                          PROFIL ANSEHEN →
                        </Link>
                        <Link
                          href={`/dashboard/trainer/${trainer.id}`}
                          className="ptw-button-primary text-xs sm:text-sm px-4 py-2 w-full sm:w-auto text-center inline-block"
                        >
                          ANFRAGE SENDEN
                        </Link>
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

