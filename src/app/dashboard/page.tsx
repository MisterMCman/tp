"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getTrainerData, saveTrainerData } from "@/lib/session";

interface Training {
  id: number;
  title: string;
  topicName: string;
  date: string;
  status: string;
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
  completedTrainings: number;
  isCompany: boolean;
  companyName?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [upcomingTrainings, setUpcomingTrainings] = useState<Training[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const hasProcessedAuth = useRef(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Search state for training companies
  const [searchResults, setSearchResults] = useState<TrainerSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    topic: '',
    location: '',
    minPrice: '',
    maxPrice: ''
  });

  // Topic suggestions state
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  const verifyTokenAndLogin = useCallback(async (token: string) => {
    console.log('Page: verifyTokenAndLogin called with token:', token.substring(0, 10) + '...');

    // Prevent multiple simultaneous token verifications
    if (hasProcessedAuth.current || authInProgress) {
      console.log('Page: Authentication already in progress, skipping...');
      return;
    }

    setAuthInProgress(true); // Set auth in progress flag
    hasProcessedAuth.current = true; // Mark as processed immediately

    console.log('Page: Starting token verification...');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-token',
          token: token
        }),
      });

      if (response.ok) {
        const data = await response.json();
        saveTrainerData(data.trainer);
        setUser(data.trainer);

        // Fetch dashboard data (this will set loading to false)
        await fetchDashboardData(data.trainer.id as number, data.trainer.userType);

        // Set initialized state AFTER everything is loaded
        setInitialized(true);

        // Clean URL by removing token parameter AFTER everything is set up
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());

        // Reset auth progress flag
        setAuthInProgress(false);

      } else {
        // Handle specific error cases
        const errorData = await response.json();
        console.error('Token verification failed:', errorData.message);

        if (response.status === 401) {
          // Show specific error message for expired/used tokens
          if (errorData.message.includes('abgelaufen')) {
            setErrorMessage('Dieser Login-Link ist abgelaufen. Bitte fordern Sie einen neuen an.');
          } else if (errorData.message.includes('bereits verwendet')) {
            setErrorMessage('Dieser Login-Link wurde bereits verwendet. Bitte fordern Sie einen neuen an.');
          } else {
            setErrorMessage('Ungültiger Login-Link. Bitte melden Sie sich erneut an.');
          }
        } else {
          setErrorMessage('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }

        hasProcessedAuth.current = false; // Reset if failed
        setAuthInProgress(false); // Reset auth progress flag
        setLoading(false); // Stop loading
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      setErrorMessage('Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      hasProcessedAuth.current = false; // Reset if failed
      setAuthInProgress(false); // Reset auth progress flag
      setLoading(false); // Stop loading
    }
  }, []); // Remove router dependency to prevent recreation

  useEffect(() => {
    // Don't run if already processed authentication or auth is in progress
    if (hasProcessedAuth.current || authInProgress) {
      console.log('Auth already processed or in progress, skipping useEffect');
      return;
    }

    const initAuth = async () => {
      try {
        // Check if we have a token in URL for login verification
        const token = searchParams.get('token');
        console.log('Page: Token in URL:', !!token, token?.substring(0, 10) + '...');

        if (token) {
          console.log('Page: Found token in URL, verifying...');
          // Verify token and create session
          await verifyTokenAndLogin(token);
        } else {
          console.log('Page: No token in URL, checking existing session...');
          // Check if we already have a valid session
          const trainerData = getTrainerData();
          if (trainerData) {
            console.log('Page: Found existing session, loading dashboard...');
            setUser(trainerData);
            await fetchDashboardData(trainerData.id as number, trainerData.userType);
            setInitialized(true);
            hasProcessedAuth.current = true;
          } else {
            console.log('Page: No session found, redirecting to login...');
            // No session, redirect to login
            router.push('/');
          }
        }
      } catch (error) {
        console.error('Page: Auth initialization error:', error);
        setErrorMessage('Ein Fehler ist bei der Anmeldung aufgetreten. Bitte versuchen Sie es erneut.');
        hasProcessedAuth.current = false;
        setAuthInProgress(false);
        setLoading(false);
      }
    };

    initAuth();
  }, [searchParams]); // Only depend on searchParams, not router or verifyTokenAndLogin

  const fetchDashboardData = async (userId: number, userType?: string) => {
    try {
      if (userType === 'TRAINER') {
        // Fetch training requests from new system
        try {
          const trainingRequestsResponse = await fetch(`/api/training-requests?trainerId=${userId}`);
          if (trainingRequestsResponse.ok) {
            const trainingRequests = await trainingRequestsResponse.json();
            const pendingRequests = trainingRequests.filter((request: any) => request.status === 'PENDING');
            setPendingRequests(pendingRequests.length);
          } else {
            console.error('Failed to fetch training requests, falling back to legacy system');
            // Fall back to legacy system
            const response = await fetch(`/api/dashboard?trainerId=${userId}`);
            if (response.ok) {
              const data = await response.json();
              setUpcomingTrainings(data.upcomingTrainings);
              setPendingRequests(data.pendingRequests);
            } else {
              console.error('Failed to fetch trainer dashboard data');
            }
          }
        } catch (error) {
          console.error('Error fetching training requests, falling back to legacy system:', error);
          // Fall back to legacy system
          const response = await fetch(`/api/dashboard?trainerId=${userId}`);
          if (response.ok) {
            const data = await response.json();
            setUpcomingTrainings(data.upcomingTrainings);
            setPendingRequests(data.pendingRequests);
          } else {
            console.error('Failed to fetch trainer dashboard data');
          }
        }
      }
      // For training companies, we don't need to fetch dashboard data yet
      // This will be implemented when we add the trainer search API
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setAuthInProgress(false); // Reset auth progress flag
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Fetch topic suggestions
  const fetchTopicSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setTopicSuggestions([]);
      setShowTopicSuggestions(false);
      return;
    }

    try {
      const response = await fetch('/api/trainers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json();
        const suggestions = data.topics.map((topic: any) => topic.name);
        setTopicSuggestions(suggestions);
        setShowTopicSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching topic suggestions:', error);
      setTopicSuggestions([]);
      setShowTopicSuggestions(false);
    }
  }, []);

  // Handle topic input change
  const handleTopicChange = (value: string) => {
    setSearchFilters({ ...searchFilters, topic: value });
    fetchTopicSuggestions(value);
  };

  // Handle topic selection from suggestions
  const handleTopicSelect = (topic: string) => {
    setSearchFilters({ ...searchFilters, topic });
    setShowTopicSuggestions(false);
    setTopicSuggestions([]);
  };

  const searchTrainers = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();

      if (searchFilters.topic) params.append('topic', searchFilters.topic);
      if (searchFilters.location) params.append('location', searchFilters.location);

      // Use new price range fields
      if (searchFilters.minPrice) params.append('minPrice', searchFilters.minPrice);
      if (searchFilters.maxPrice) params.append('maxPrice', searchFilters.maxPrice);

      const response = await fetch(`/api/trainers/search?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.trainers);
      } else {
        console.error('Failed to search trainers');
      }
    } catch (error) {
      console.error('Error searching trainers:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div>
      <div className="ptw-dashboard-header">
        <h1 className="text-2xl font-bold">
          {user?.userType === 'TRAINING_COMPANY' ? 'TRAINER SUCHEN' : 'DASHBOARD'}
        </h1>
        <Link
          href="/dashboard/profile"
          className="ptw-button-secondary text-sm"
        >
          PROFIL BEARBEITEN
        </Link>
      </div>

      {/* Error Message Display */}
      {errorMessage && (
        <div className="mb-6 ptw-dashboard-card border-red-200 bg-red-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Anmeldung fehlgeschlagen
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {errorMessage}
              </p>
              <div className="mt-3">
                <Link
                  href="/register?mode=login"
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Zur Anmeldung
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.userType === 'TRAINING_COMPANY' ? (
        // Training Company Dashboard - Trainer Search
        <div className="space-y-6">
          <div className="ptw-dashboard-card">
            <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--ptw-accent-primary)' }}>
              TRAINER FINDEN
            </h2>

            {/* Search Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Thema suchen..."
                  value={searchFilters.topic}
                  onChange={(e) => handleTopicChange(e.target.value)}
                  onFocus={() => searchFilters.topic.length >= 2 && setShowTopicSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 200)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Thema
                </label>

                {/* Topic Suggestions Dropdown */}
                {showTopicSuggestions && topicSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {topicSuggestions.map((topic, index) => (
                      <button
                        key={index}
                        onClick={() => handleTopicSelect(topic)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        style={{ color: 'var(--ptw-text-primary)' }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <select
                  value={searchFilters.location}
                  onChange={(e) => setSearchFilters({ ...searchFilters, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Alle Standorte</option>
                  <option value="de">Deutschland</option>
                  <option value="at">Österreich</option>
                  <option value="ch">Schweiz</option>
                </select>
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Standort
                </label>
              </div>

              <div className="relative">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500">
                    Preis pro Tag: {searchFilters.minPrice || '0'}€ - {searchFilters.maxPrice || '1000+'}€
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={searchFilters.minPrice}
                      onChange={(e) => setSearchFilters({ ...searchFilters, minPrice: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      min="0"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={searchFilters.maxPrice}
                      onChange={(e) => setSearchFilters({ ...searchFilters, maxPrice: e.target.value })}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      min="0"
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000"
                    step="50"
                    value={searchFilters.maxPrice || '1000'}
                    onChange={(e) => setSearchFilters({ ...searchFilters, maxPrice: e.target.value })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={searchTrainers}
              disabled={searchLoading}
              className="ptw-button-primary disabled:opacity-50"
            >
              {searchLoading ? 'SUCHE...' : 'TRAINER SUCHEN'}
            </button>
          </div>

          {/* Search Results */}
          <div className="ptw-dashboard-card">
            <h3 className="text-md font-semibold mb-4" style={{ color: 'var(--ptw-accent-primary)' }}>
              SUCHERGEBNISSE {searchResults.length > 0 && `(${searchResults.length} Trainer gefunden)`}
            </h3>

            {searchLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-20 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((trainer) => (
                  <div key={trainer.id} className="flex items-start p-4 rounded-lg border transition-all hover:scale-102" style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}>
                    <div className="flex-shrink-0 mr-4">
                      {trainer.profilePicture ? (
                        <img
                          src={trainer.profilePicture}
                          alt={`${trainer.firstName} ${trainer.lastName}`}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 text-lg font-semibold">
                            {trainer.firstName[0]}{trainer.lastName[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                            {trainer.firstName} {trainer.lastName}
                            {trainer.isCompany && trainer.companyName && (
                              <span className="text-xs text-gray-500 ml-2">({trainer.companyName})</span>
                            )}
                          </h4>
                          <p className="text-xs" style={{ color: 'var(--ptw-text-secondary)' }}>
                            {trainer.location?.name || 'Standort nicht angegeben'}
                          </p>
                        </div>
                        <div className="text-right">
                          {trainer.dailyRate && (
                            <p className="font-semibold text-sm" style={{ color: 'var(--ptw-accent-primary)' }}>
                              {trainer.dailyRate}€/Tag
                            </p>
                          )}
                          <p className="text-xs" style={{ color: 'var(--ptw-text-secondary)' }}>
                            {trainer.completedTrainings} abgeschlossene Trainings
                          </p>
                        </div>
                      </div>

                      {trainer.bio && (
                        <p className="text-sm mb-2" style={{ color: 'var(--ptw-text-secondary)' }}>
                          {trainer.bio.length > 100 ? `${trainer.bio.substring(0, 100)}...` : trainer.bio}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1 mb-3">
                        {trainer.topics.slice(0, 3).map((topic, index) => (
                          <span
                            key={index}
                            className="text-xs px-2 py-1 rounded-full font-semibold"
                            style={{ background: 'var(--ptw-accent-primary)', color: 'white' }}
                          >
                            {topic}
                          </span>
                        ))}
                        {trainer.topics.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-600">
                            +{trainer.topics.length - 3} mehr
                          </span>
                        )}
                      </div>

                      <div className="flex justify-between items-center">
                        <Link
                          href={`/dashboard/trainer/${trainer.id}`}
                          className="text-sm hover:text-red-600 transition-colors"
                          style={{ color: 'var(--ptw-accent-primary)' }}
                        >
                          PROFIL ANSEHEN →
                        </Link>
                        <button className="ptw-button-primary text-xs px-3 py-1">
                          ANFRAGE SENDEN
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                  Verwenden Sie die Suchfilter oben, um Trainer zu finden.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Trainer Dashboard - Original content
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Upcoming trainings card */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>ANSTEHENDE TRAININGS</h2>
              <Link
                href="/dashboard/trainings"
                className="text-sm hover:text-red-600 transition-colors"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                ALLE ANZEIGEN →
              </Link>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-12 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : upcomingTrainings.length > 0 ? (
              <div className="space-y-3">
                {upcomingTrainings.map((training) => (
                  <div key={training.id} className="flex justify-between items-center p-4 rounded-lg border transition-all hover:scale-105" style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}>
                    <div>
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>{training.title}</h3>
                      <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>{formatDate(training.date)}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'var(--ptw-accent-primary)', color: 'white' }}>
                      {training.topicName}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>KEINE ANSTEHENDEN TRAININGS</p>
              </div>
            )}
          </div>

          {/* Pending requests card */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>TRAININGSANFRAGEN</h2>
              <Link
                href="/dashboard/requests"
                className="text-sm hover:text-red-600 transition-colors"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                ALLE ANZEIGEN →
              </Link>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-12 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-12 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : pendingRequests > 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center text-2xl font-bold rounded-full h-16 w-16 mb-4"
                     style={{ background: 'var(--ptw-accent-primary)', color: 'white' }}>
                  {pendingRequests}
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ptw-text-secondary)' }}>
                  SIE HABEN <span className="font-bold" style={{ color: 'var(--ptw-accent-primary)' }}>{pendingRequests} NEUE</span> TRAININGSANFRAGEN
                </p>
                <Link
                  href="/dashboard/requests"
                  className="inline-block mt-3 ptw-button-primary text-sm"
                >
                  ANFRAGEN PRÜFEN
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                {user?.userType === 'TRAINING_COMPANY' ? (
                  <>
                    <div className="mb-4">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-sm mb-4" style={{ color: 'var(--ptw-text-secondary)' }}>
                      KEINE GEPLANTEN TRAININGS
                    </p>
                    <Link
                      href="/dashboard/trainings"
                      className="inline-block mt-3 ptw-button-primary text-sm"
                    >
                      TRAINING ERSTELLEN
                    </Link>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>KEINE NEUEN ANFRAGEN</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick links */}
      {user?.userType !== 'TRAINING_COMPANY' && (
        <div className="ptw-dashboard-card">
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--ptw-accent-primary)' }}>SCHNELLZUGRIFF</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/profile"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>PROFIL BEARBEITEN</span>
            </Link>
            <Link
              href="/dashboard/trainings"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>TRAININGSPLAN</span>
            </Link>
            <Link
              href="/dashboard/requests"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>ANFRAGEN PRÜFEN</span>
            </Link>
          </div>
        </div>
      )}

      {user?.userType === 'TRAINING_COMPANY' && (
        <div className="ptw-dashboard-card">
          <h2 className="text-lg font-semibold mb-6" style={{ color: 'var(--ptw-accent-primary)' }}>SCHNELLZUGRIFF</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/dashboard/profile"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>FIRMENPROFIL</span>
            </Link>
            <Link
              href="/dashboard/trainings"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>MEINE TRAINER</span>
            </Link>
            <Link
              href="/dashboard/requests"
              className="flex items-center p-5 rounded-lg border transition-all duration-200 hover:scale-105 group"
              style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-4 transition-colors group-hover:text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>ANFRAGEN VERWALTEN</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 