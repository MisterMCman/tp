"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Training {
  id: number;
  title: string;
  topicName: string;
  date: string;
  status: string;
}

export default function Dashboard() {
  const [upcomingTrainings, setUpcomingTrainings] = useState<Training[]>([]);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch actual dashboard data from API
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/dashboard?trainerId=1');
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

    fetchDashboardData();
  }, []);

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <Link
          href="/dashboard/profile"
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          Profil bearbeiten
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Upcoming trainings card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Anstehende Trainings</h2>
            <Link
              href="/dashboard/trainings"
              className="text-primary-500 hover:text-primary-700 text-sm"
            >
              Alle anzeigen
            </Link>
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : upcomingTrainings.length > 0 ? (
            <div className="space-y-3">
              {upcomingTrainings.map((training) => (
                <div key={training.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <h3 className="font-medium">{training.title}</h3>
                    <p className="text-sm text-gray-500">{formatDate(training.date)}</p>
                  </div>
                  <span className="text-sm font-medium px-2 py-1 bg-green-100 text-green-800 rounded">
                    {training.topicName}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Keine anstehenden Trainings</p>
            </div>
          )}
        </div>

        {/* Pending requests card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Trainingsanfragen</h2>
            <Link
              href="/dashboard/requests"
              className="text-primary-500 hover:text-primary-700 text-sm"
            >
              Alle anzeigen
            </Link>
          </div>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : pendingRequests > 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center bg-yellow-100 text-yellow-800 text-2xl font-bold rounded-full h-16 w-16 mb-4">
                {pendingRequests}
              </div>
              <p className="text-gray-700">
                Sie haben <span className="font-semibold">{pendingRequests} neue</span> Trainingsanfragen
              </p>
              <Link
                href="/dashboard/requests"
                className="inline-block mt-3 px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
              >
                Anfragen prüfen
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500">Keine neuen Anfragen</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Schnellzugriff</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-3 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span>Profil bearbeiten</span>
          </Link>
          <Link
            href="/dashboard/trainings"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-3 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Trainingsplan</span>
          </Link>
          <Link
            href="/dashboard/requests"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-3 text-primary-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>Anfragen prüfen</span>
          </Link>
        </div>
      </div>
    </div>
  );
} 