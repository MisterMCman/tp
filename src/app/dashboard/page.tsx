"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { getUserData, saveTrainerData, saveCompanyData, saveSession } from "@/lib/session";
import { TopicSelector, ExpertiseLevel, type TopicWithLevel } from "@/components/TopicSelector";
import { initializeNavigation, buildUrlWithNavigation } from "@/lib/navigationStack";

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
  topicsWithLevels?: TopicWithLevel[];
  completedTrainings: number;
  isCompany: boolean;
  companyName?: string;
}

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Initialize navigation tracking for this page
  useEffect(() => {
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    initializeNavigation(pathname, queryParams);
  }, [pathname, searchParams]);
  
  const [upcomingTrainings, setUpcomingTrainings] = useState<Training[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Company dashboard data
  const [companyDashboardData, setCompanyDashboardData] = useState<{
    trainingsWithoutTrainer: any[];
    latestInvoices: any[];
    latestMessages: any[];
    nextTrainings: any[];
  } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [user, setUser] = useState<any>(null);
  const hasProcessedAuth = useRef(false);
  const [authInProgress, setAuthInProgress] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    phone: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    countryId: null as number | null,
    bio: '',
    isCompany: false,
    companyName: '',
    dailyRate: '',
    offeredTrainingTypes: [] as string[],
  });
  const [profileTopicsWithLevels, setProfileTopicsWithLevels] = useState<TopicWithLevel[]>([]);
  const [profileTopicSuggestionsList, setProfileTopicSuggestionsList] = useState<string[]>([]);
  const [profileTopicSearch, setProfileTopicSearch] = useState('');
  const [profileTopicSuggestions, setProfileTopicSuggestions] = useState<{ id: number; name: string; type?: 'existing' | 'suggestion'; status?: string }[]>([]);
  const [profileCountries, setProfileCountries] = useState<{id: number, name: string, code: string}[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

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

        // Check if trainer profile is incomplete (status is INACTIVE) - show modal
        if (userData.userType === 'TRAINER' && userData.status === 'INACTIVE') {
          setShowProfileModal(true);
          loadProfileForCompletion();
        }

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
            
            // Check if trainer profile is incomplete (status is INACTIVE) - show modal
            if (userData.userType === 'TRAINER' && userData.status === 'INACTIVE') {
              setShowProfileModal(true);
              loadProfileForCompletion();
            }
            
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
        // Fetch company dashboard data
        try {
          const dashboardResponse = await fetch('/api/dashboard/company');
          if (dashboardResponse.ok) {
            const dashboardData = await dashboardResponse.json();
            setCompanyDashboardData(dashboardData);
          } else {
            console.error('Failed to fetch company dashboard data');
          }
        } catch (error) {
          console.error('Error fetching company dashboard data:', error);
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

  const loadProfileForCompletion = async () => {
    try {
      const response = await fetch('/api/trainer/profile');
      if (response.ok) {
        const data = await response.json();
        const trainer = data.trainer;
        setProfileFormData({
          phone: trainer.phone === '000000000' ? '' : (trainer.phone || ''),
          street: trainer.street || '',
          houseNumber: trainer.houseNumber || '',
          zipCode: trainer.zipCode || '',
          city: trainer.city || '',
          countryId: trainer.country?.id || null,
          bio: trainer.bio || '',
          isCompany: trainer.isCompany || false,
          companyName: trainer.companyName || '',
          dailyRate: trainer.dailyRate?.toString() || '',
          offeredTrainingTypes: trainer.offeredTrainingTypes || [],
        });
        setProfileTopicsWithLevels(trainer.topics?.map((t: {name: string, level: string}) => ({ name: t.name, level: t.level as ExpertiseLevel })) || []);
        setProfileTopicSuggestionsList(trainer.pendingSuggestions || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }

    // Load countries
    try {
      const response = await fetch('/api/countries');
      if (response.ok) {
        const data = await response.json();
        setProfileCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const handleProfileInputChange = (name: string, value: any) => {
    setProfileFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileTopicSelect = (topicName: string, level: ExpertiseLevel, isSuggestion?: boolean) => {
    if (isSuggestion) {
      if (!profileTopicSuggestionsList.includes(topicName)) {
        setProfileTopicSuggestionsList(prev => [...prev, topicName]);
      }
    } else {
      if (!profileTopicsWithLevels.some(t => t.name === topicName)) {
        setProfileTopicsWithLevels(prev => [...prev, { name: topicName, level }]);
      }
    }
  };

  const handleProfileTopicRemove = (topicName: string, isSuggestion?: boolean) => {
    if (isSuggestion) {
      setProfileTopicSuggestionsList(prev => prev.filter(t => t !== topicName));
    } else {
      setProfileTopicsWithLevels(prev => prev.filter(t => t.name !== topicName));
    }
  };

  const handleProfileTopicSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setProfileTopicSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/topics?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        const mappedSuggestions = data.map((topic: { id: number; name: string; short_title?: string; displayName?: string }) => ({
          id: topic.id,
          name: topic.name,
          short_title: topic.short_title,
          displayName: topic.displayName,
          type: 'existing' as const,
          status: 'online'
        }));
        setProfileTopicSuggestions(mappedSuggestions);
      }
    } catch (error) {
      console.error('Error searching topics:', error);
      setProfileTopicSuggestions([]);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setSavingProfile(true);

    try {
      // Validate required fields
      if (!profileFormData.phone || !profileFormData.street || !profileFormData.zipCode || !profileFormData.city || !profileFormData.countryId || !profileFormData.bio) {
        setProfileError('Bitte füllen Sie alle Pflichtfelder aus.');
        setSavingProfile(false);
        return;
      }

      if (profileTopicsWithLevels.length === 0) {
        setProfileError('Bitte wählen Sie mindestens ein Fachgebiet aus.');
        setSavingProfile(false);
        return;
      }

      if (profileFormData.offeredTrainingTypes.length === 0) {
        setProfileError('Bitte wählen Sie mindestens einen Trainingstyp aus.');
        setSavingProfile(false);
        return;
      }

      const response = await fetch('/api/trainer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: profileFormData.phone,
          street: profileFormData.street,
          houseNumber: profileFormData.houseNumber,
          zipCode: profileFormData.zipCode,
          city: profileFormData.city,
          countryId: profileFormData.countryId,
          bio: profileFormData.bio,
          isCompany: profileFormData.isCompany,
          companyName: profileFormData.companyName || null,
          dailyRate: profileFormData.dailyRate ? parseFloat(profileFormData.dailyRate) : null,
          topicsWithLevels: profileTopicsWithLevels,
          topicSuggestions: profileTopicSuggestionsList,
          offeredTrainingTypes: profileFormData.offeredTrainingTypes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      const data = await response.json();
      
      // Save trainer data to session
      saveTrainerData(data.trainer);
      setUser(data.trainer);

      // Close modal
      setShowProfileModal(false);
      
      // Refresh dashboard data without full page reload
      if (data.trainer.id) {
        await fetchDashboardData(data.trainer.id as number, 'TRAINER');
      }
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      setProfileError((err as Error)?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setSavingProfile(false);
    }
  };


  return (
    <>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4 flex justify-between items-start" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            {user?.userType === 'TRAINER' 
              ? 'Übersicht über Ihre anstehenden Trainings und Anfragen'
              : 'Übersicht über Ihre Trainings und Trainer'}
          </p>
        </div>
      </div>
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">

      {/* Profile Completion Banner - Shows for trainers with INACTIVE status */}
      {user?.userType === 'TRAINER' && user?.status === 'INACTIVE' && !showProfileModal && (
        <div className="mb-6 ptw-dashboard-card border-yellow-300 bg-yellow-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-yellow-600"
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
                <h3 className="text-lg font-semibold text-yellow-800 mb-1">
                  Profil vervollständigen erforderlich
                </h3>
                <p className="text-sm text-yellow-700 mb-3">
                  Vervollständigen Sie Ihr Profil, damit Unternehmen Sie finden und anfragen können. Solange Ihr Profil unvollständig ist, werden Sie nicht in der Trainersuche angezeigt.
                </p>
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    loadProfileForCompletion();
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 font-medium"
                >
                  Jetzt Profil vervollständigen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        // Training Company Dashboard - Activity Overview
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Trainings without assigned trainer */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>
                Trainings ohne Trainer
              </h2>
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
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : companyDashboardData?.trainingsWithoutTrainer && companyDashboardData.trainingsWithoutTrainer.length > 0 ? (
              <div className="space-y-3">
                {companyDashboardData.trainingsWithoutTrainer.slice(0, 5).map((training: any) => (
                  <Link
                    key={training.id}
                    href={buildUrlWithNavigation(`/dashboard/training/${training.id}`)}
                    className="flex justify-between items-center p-4 rounded-lg border transition-all hover:scale-105 cursor-pointer"
                    style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                        {training.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {formatDate(training.date)} • {training.topicName}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold bg-yellow-100 text-yellow-800 ml-2">
                      Kein Trainer
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                  Alle Trainings haben einen zugewiesenen Trainer
                </p>
              </div>
            )}
          </div>

          {/* Latest Invoices */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>
                Letzte Rechnungen
              </h2>
              <Link
                href="/dashboard/invoices"
                className="text-sm hover:text-red-600 transition-colors"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                ALLE ANZEIGEN →
              </Link>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : companyDashboardData?.latestInvoices && companyDashboardData.latestInvoices.length > 0 ? (
              <div className="space-y-3">
                {companyDashboardData.latestInvoices.map((invoice: any) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices`}
                    className="flex justify-between items-center p-4 rounded-lg border transition-all hover:scale-105 cursor-pointer"
                    style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                        {invoice.invoiceNumber}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {invoice.trainingTitle} • {invoice.trainerName || 'Unbekannt'}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                        €{invoice.amount.toFixed(2)}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status === 'PAID' ? 'Bezahlt' : invoice.status === 'SUBMITTED' ? 'Offen' : 'Ausstehend'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                  Keine Rechnungen vorhanden
                </p>
              </div>
            )}
          </div>

          {/* Latest Messages */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>
                Letzte Nachrichten
              </h2>
              <Link
                href="/dashboard/messages"
                className="text-sm hover:text-red-600 transition-colors"
                style={{ color: 'var(--ptw-accent-primary)' }}
              >
                ALLE ANZEIGEN →
              </Link>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : companyDashboardData?.latestMessages && companyDashboardData.latestMessages.length > 0 ? (
              <div className="space-y-3">
                {companyDashboardData.latestMessages.map((message: any) => (
                  <Link
                    key={message.id}
                    href={`/dashboard/messages${message.trainingRequestId ? `?trainingRequestId=${message.trainingRequestId}` : ''}`}
                    className="flex items-start p-4 rounded-lg border transition-all hover:scale-105 cursor-pointer"
                    style={{ background: message.isRead ? 'var(--ptw-bg-secondary)' : 'var(--ptw-bg-primary)', borderColor: 'var(--ptw-border-primary)' }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold text-sm ${!message.isRead ? 'font-bold' : ''}`} style={{ color: 'var(--ptw-text-primary)' }}>
                          {message.subject}
                        </h3>
                        {!message.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                      </div>
                      <p className="text-xs line-clamp-2" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {message.message}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {message.trainingTitle} • {message.trainerName || 'Unbekannt'} • {formatDate(message.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                  Keine Nachrichten vorhanden
                </p>
              </div>
            )}
          </div>

          {/* Next Trainings */}
          <div className="ptw-dashboard-card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--ptw-accent-primary)' }}>
                Nächste Trainings
              </h2>
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
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
                <div className="h-16 rounded" style={{ background: 'var(--ptw-bg-tertiary)' }}></div>
              </div>
            ) : companyDashboardData?.nextTrainings && companyDashboardData.nextTrainings.length > 0 ? (
              <div className="space-y-3">
                {companyDashboardData.nextTrainings.map((training: any) => (
                  <Link
                    key={training.id}
                    href={buildUrlWithNavigation(`/dashboard/training/${training.id}`)}
                    className="flex justify-between items-center p-4 rounded-lg border transition-all hover:scale-105 cursor-pointer"
                    style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm" style={{ color: 'var(--ptw-text-primary)' }}>
                        {training.title}
                      </h3>
                      <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                        {formatDate(training.date)} • {training.topicName}
                      </p>
                      {training.trainerName && (
                        <p className="text-xs mt-1" style={{ color: 'var(--ptw-text-secondary)' }}>
                          Trainer: {training.trainerName}
                        </p>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: '#fee2e1', color: 'var(--ptw-accent-primary)' }}>
                      {training.status}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                  Keine anstehenden Trainings
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


      {/* Profile Completion Modal - Shows for trainers with INACTIVE status */}
      {showProfileModal && user?.userType === 'TRAINER' && user?.status === 'INACTIVE' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-yellow-50 border-b border-yellow-200 p-6 z-10">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
                    Profil vervollständigen
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                    Vervollständigen Sie Ihr Profil, damit Unternehmen Sie finden und anfragen können. Sie können dieses Fenster schließen und später zurückkehren, aber es wird bei jedem Login erneut angezeigt, bis Ihr Profil vollständig ist.
                  </p>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="ml-4 text-gray-400 hover:text-gray-500"
                  title="Schließen (wird beim nächsten Login erneut angezeigt)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="p-6 space-y-6">
              {profileError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">{profileError}</p>
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Persönliche Informationen</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon *
                    </label>
                    <input
                      type="tel"
                      value={profileFormData.phone}
                      onChange={(e) => handleProfileInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Adresse</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Straße *
                    </label>
                    <input
                      type="text"
                      value={profileFormData.street}
                      onChange={(e) => handleProfileInputChange('street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hausnummer
                    </label>
                    <input
                      type="text"
                      value={profileFormData.houseNumber}
                      onChange={(e) => handleProfileInputChange('houseNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PLZ *
                    </label>
                    <input
                      type="text"
                      value={profileFormData.zipCode}
                      onChange={(e) => handleProfileInputChange('zipCode', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stadt *
                    </label>
                    <input
                      type="text"
                      value={profileFormData.city}
                      onChange={(e) => handleProfileInputChange('city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Land *
                    </label>
                    <select
                      value={profileFormData.countryId || ''}
                      onChange={(e) => handleProfileInputChange('countryId', parseInt(e.target.value) || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="">Land auswählen</option>
                      {profileCountries.map((country) => (
                        <option key={country.id} value={country.id}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Professionelle Informationen</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profilbeschreibung *
                    </label>
                    <textarea
                      value={profileFormData.bio}
                      onChange={(e) => handleProfileInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                      placeholder="Beschreiben Sie Ihre Expertise und Erfahrung"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tagessatz (€)
                    </label>
                    <input
                      type="number"
                      value={profileFormData.dailyRate}
                      onChange={(e) => handleProfileInputChange('dailyRate', e.target.value)}
                      min="0"
                      step="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="z.B. 500"
                    />
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={profileFormData.isCompany}
                        onChange={(e) => handleProfileInputChange('isCompany', e.target.checked)}
                        className="mr-2"
                      />
                      Ich bin als Unternehmen/Firma tätig
                    </label>
                  </div>

                  {profileFormData.isCompany && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Firmenname
                      </label>
                      <input
                        type="text"
                        value={profileFormData.companyName}
                        onChange={(e) => handleProfileInputChange('companyName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Angebotene Trainingstypen *
                    </label>
                    <div className="space-y-2">
                      {['ONLINE', 'HYBRID', 'VOR_ORT'].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={profileFormData.offeredTrainingTypes.includes(type)}
                            onChange={(e) => {
                              const current = profileFormData.offeredTrainingTypes;
                              if (e.target.checked) {
                                handleProfileInputChange('offeredTrainingTypes', [...current, type]);
                              } else {
                                handleProfileInputChange('offeredTrainingTypes', current.filter(t => t !== type));
                              }
                            }}
                            className="mr-2"
                          />
                          {type === 'ONLINE' ? 'Online' : type === 'HYBRID' ? 'Hybrid' : 'Vor Ort'}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fachgebiete *
                    </label>
                    <TopicSelector
                      topics={profileTopicsWithLevels}
                      topicSuggestions={profileTopicSuggestionsList}
                      onAddTopic={handleProfileTopicSelect}
                      onRemoveTopic={handleProfileTopicRemove}
                      searchTerm={profileTopicSearch}
                      onSearchChange={setProfileTopicSearch}
                      onSearch={handleProfileTopicSearch}
                      suggestions={profileTopicSuggestions}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Später vervollständigen
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingProfile ? 'Speichern...' : 'Profil vervollständigen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </>
  );
} 