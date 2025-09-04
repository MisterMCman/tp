"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getTrainerData } from "@/lib/session";
import Link from "next/link";

interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  bio?: string;
  profilePicture?: string;
  dailyRate?: number;
  location?: {
    name: string;
    code: string;
  };
  topics: string[];
  isCompany: boolean;
  companyName?: string;
  status: string;
  userType: string;
}

interface PastBooking {
  id: number;
  title: string;
  date: string;
  status: string;
  topicName: string;
}

export default function TrainerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainerDetails = async () => {
      try {
        // Check if user is authenticated
        const currentUser = getTrainerData();
        if (!currentUser) {
          router.push('/');
          return;
        }

        // Fetch trainer details
        const response = await fetch(`/api/trainers/${trainerId}`);
        if (!response.ok) {
          throw new Error('Trainer nicht gefunden');
        }

        const trainerData = await response.json();
        setTrainer(trainerData.trainer);

        // Fetch past bookings between this trainer and the current company
        if (currentUser.userType === 'TRAINING_COMPANY') {
          const bookingsResponse = await fetch(`/api/bookings/past?trainerId=${trainerId}&companyId=${currentUser.id}`);
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json();
            setPastBookings(bookingsData.bookings);
          }
        }

      } catch (err) {
        console.error('Error fetching trainer details:', err);
        setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    };

    if (trainerId) {
      fetchTrainerDetails();
    }
  }, [trainerId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Laden...</div>
      </div>
    );
  }

  if (error || !trainer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Fehler</h2>
          <p className="text-gray-600 mb-4">{error || 'Trainer nicht gefunden'}</p>
          <Link href="/dashboard" className="ptw-button-primary">
            Zurück zur Suche
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/dashboard"
          className="text-sm hover:text-red-600 transition-colors"
          style={{ color: 'var(--ptw-accent-primary)' }}
        >
          ← Zurück zur Suche
        </Link>
      </div>

      {/* Trainer Profile Header */}
      <div className="ptw-dashboard-card mb-6">
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {trainer.profilePicture ? (
              <img
                src={trainer.profilePicture}
                alt={`${trainer.firstName} ${trainer.lastName}`}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-4 border-white shadow-lg">
                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Trainer Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
              {trainer.firstName} {trainer.lastName}
              {trainer.isCompany && trainer.companyName && (
                <span className="text-sm text-gray-500 ml-2">({trainer.companyName})</span>
              )}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">📧 {trainer.email}</p>
                <p className="text-sm text-gray-600 mb-1">📱 {trainer.phone}</p>
                {trainer.location && (
                  <p className="text-sm text-gray-600 mb-1">📍 {trainer.location.name}</p>
                )}
              </div>
              <div>
                {trainer.dailyRate && (
                  <p className="text-lg font-semibold mb-1" style={{ color: 'var(--ptw-accent-primary)' }}>
                    {trainer.dailyRate}€ pro Tag
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  Status: <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    trainer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trainer.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv'}
                  </span>
                </p>
              </div>
            </div>

            {/* Topics */}
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
                Fachgebiete:
              </h3>
              <div className="flex flex-wrap gap-2">
                {trainer.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="text-xs px-3 py-1 rounded-full font-semibold"
                    style={{ background: 'var(--ptw-accent-primary)', color: 'white' }}
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {trainer.bio && (
          <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--ptw-border-primary)' }}>
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
              Über mich:
            </h3>
            <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
              {trainer.bio}
            </p>
          </div>
        )}
      </div>

      {/* Past Bookings */}
      {pastBookings.length > 0 && (
        <div className="ptw-dashboard-card">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--ptw-text-primary)' }}>
            Vergangene Buchungen mit diesem Trainer
          </h3>

          <div className="space-y-4">
            {pastBookings.map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
              >
                <div>
                  <h4 className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>
                    {booking.title}
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                    Thema: {booking.topicName}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                    Datum: {new Date(booking.date).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  booking.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-800'
                    : booking.status === 'CANCELLED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {booking.status === 'COMPLETED' ? 'Abgeschlossen' :
                   booking.status === 'CANCELLED' ? 'Storniert' : 'Aktiv'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Button */}
      <div className="mt-6 text-center">
        <button className="ptw-button-primary">
          ANFRAGE SENDEN
        </button>
      </div>
    </div>
  );
}
