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

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [upcomingTrainings, setUpcomingTrainings] = useState<Training[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const hasProcessedAuth = useRef(false);

  const verifyTokenAndLogin = useCallback(async (token: string) => {
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

        // Fetch dashboard data first (this will set loading to false)
        await fetchDashboardData(data.trainer.id as number);

        // Clean URL by removing token parameter AFTER everything is set up
        const url = new URL(window.location.href);
        url.searchParams.delete('token');
        window.history.replaceState({}, '', url.toString());

        // Set initialized state and mark as processed
        setInitialized(true);
        hasProcessedAuth.current = true;
      } else {
        console.error('Token verification failed');
        router.push('/');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    // Don't run if already processed authentication
    if (hasProcessedAuth.current) {
      return;
    }

    // Check if we have a token in URL for login verification
    const token = searchParams.get('token');

    if (token) {
      // Verify token and create session
      verifyTokenAndLogin(token);
    } else {
      // Check if we already have a valid session
      const trainerData = getTrainerData();
      if (trainerData) {
        fetchDashboardData(trainerData.id as number);
        setInitialized(true);
        hasProcessedAuth.current = true;
      } else {
        // No session, redirect to login
        router.push('/');
      }
    }
  }, [searchParams, router, verifyTokenAndLogin]);

  const fetchDashboardData = async (trainerId: number) => {
    try {
      const response = await fetch(`/api/dashboard?trainerId=${trainerId}`);
      if (response.ok) {
        const data = await response.json();
        setUpcomingTrainings(data.upcomingTrainings);
        setPendingRequests(data.pendingRequests);
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold">DASHBOARD</h1>
        <Link
          href="/dashboard/profile"
          className="ptw-button-secondary text-sm"
        >
          PROFIL BEARBEITEN
        </Link>
      </div>

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
              <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>KEINE NEUEN ANFRAGEN</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
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
    </div>
  );
} 