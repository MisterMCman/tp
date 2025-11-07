"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getUserData, saveTrainerData, saveCompanyData, saveSession } from "@/lib/session";

interface Training {
  id: number;
  title: string;
  topicName: string;
  date: string;
  status: string;
}

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
        
        // Handle user response
        const userData = data.user;
        if (!userData) {
          console.error('No user data in response:', data);
          setErrorMessage('Login fehlgeschlagen. Bitte versuchen Sie es erneut.');
          setAuthInProgress(false);
          setLoading(false);
          return;
        }
        
        // Save to appropriate cookie based on user type
        if (userData.userType === 'TRAINER') {
          saveTrainerData(userData);
        } else if (userData.userType === 'TRAINING_COMPANY') {
          saveCompanyData(userData);
        }
        saveSession({ token: token, instructorId: userData.id });
        setUser(userData);

        // Fetch dashboard data (this will set loading to false)
        await fetchDashboardData(userData.id as number, userData.userType);

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
          // Check if we already have a valid session (works for both trainers and companies)
          const userData = getUserData();
          if (userData) {
            console.log('Page: Found existing session, loading dashboard...');
            setUser(userData);
            await fetchDashboardData(userData.id as number, userData.userType as string);
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
        // Fetch training requests and upcoming trainings in parallel
        try {
          const [trainingRequestsResponse, upcomingTrainingsResponse] = await Promise.all([
            fetch(`/api/training-requests?trainerId=${userId}`),
            fetch(`/api/trainings?trainerId=${userId}&type=upcoming`)
          ]);
          
          if (trainingRequestsResponse.ok) {
            const trainingRequests = await trainingRequestsResponse.json();
            const pendingRequests = trainingRequests.filter((request: any) => request.status === 'PENDING');
            setPendingRequests(pendingRequests.length);
          } else {
            console.error('Failed to fetch training requests');
          }
          
          if (upcomingTrainingsResponse.ok) {
            const upcomingData = await upcomingTrainingsResponse.json();
            // Limit to next 3 trainings for dashboard
            setUpcomingTrainings(upcomingData.slice(0, 3));
          } else {
            console.error('Failed to fetch upcoming trainings');
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      } else if (userType === 'TRAINING_COMPANY') {
        // Fetch requests that need company attention (counter offers or trainer acceptances)
        try {
          const trainingRequestsResponse = await fetch(`/api/training-requests?companyId=${userId}`);
          if (trainingRequestsResponse.ok) {
            const trainingRequests = await trainingRequestsResponse.json();
            // Count requests with counter offers or trainer acceptances waiting for company approval
            const pendingRequests = trainingRequests.filter((request: any) => 
              request.status === 'PENDING' && (request.counterPrice || request.trainerAccepted)
            );
            setPendingRequests(pendingRequests.length);
          } else {
            console.error('Failed to fetch training requests');
          }
        } catch (error) {
          console.error('Error fetching dashboard data:', error);
        }
      }
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


  return (
    <div>
      <div className="ptw-dashboard-header">
        <h1 className="text-2xl font-bold">
          DASHBOARD
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
        // Training Company Dashboard - Overview
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Quick Actions */}
          <div className="ptw-dashboard-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ptw-accent-primary)' }}>
              SCHNELLZUGRIFF
            </h2>
            <div className="space-y-3">
              <Link
                href="/dashboard/trainer"
                className="flex items-center p-4 rounded-lg border transition-all duration-200 hover:scale-105 group"
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
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>TRAINER SUCHEN</span>
              </Link>
              <Link
                href="/dashboard/trainings"
                className="flex items-center p-4 rounded-lg border transition-all duration-200 hover:scale-105 group"
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
                className="flex items-center p-4 rounded-lg border transition-all duration-200 hover:scale-105 group"
                style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
              >
                <svg
                  className="w-6 h-6 mr-4 transition-colors group-hover:text-red-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  style={{ color: 'var(--ptw-accent-primary)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.123.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h8.25a2.25 2.25 0 002.25-2.25V6.108a2.25 2.25 0 00-2.25-2.25H15c-1.012 0-1.867.668-2.15 1.586z"
                  />
                </svg>
                <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>TRAININGSANFRAGEN</span>
              </Link>
            </div>
          </div>

          {/* Info Card */}
          <div className="ptw-dashboard-card">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--ptw-accent-primary)' }}>
              WILLKOMMEN
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--ptw-text-secondary)' }}>
              Nutzen Sie das Dashboard, um schnell auf wichtige Funktionen zuzugreifen.
            </p>
            <div className="space-y-2 text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
              <p>• Trainer suchen und anfragen</p>
              <p>• Trainings planen und verwalten</p>
              <p>• Anfragen bearbeiten</p>
              <p>• Rechnungen einsehen</p>
            </div>
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
                    <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: '#fee2e1', color: 'var(--ptw-accent-primary)' }}>
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
                     style={{ background: '#fee2e1', color: 'var(--ptw-accent-primary)' }}>
                  {pendingRequests}
                </div>
                <p className="text-sm mb-4" style={{ color: 'var(--ptw-text-secondary)' }}>
                  SIE HABEN <span className="font-bold" style={{ color: 'var(--ptw-accent-primary)' }}>{pendingRequests} NEUE</span> TRAININGSANFRAGEN
                </p>
                <Link
                  href="/dashboard/requests?status=pending"
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
              href="/dashboard/requests?status=pending"
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