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
  topicsWithLevels?: Array<{ name: string; level: 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE' }>;
  offeredTrainingTypes?: string[];
  travelRadius?: number;
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

interface AvailableTraining {
  id: number;
  title: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  dailyRate: number;
  description?: string;
  company: {
    id: number;
    companyName: string;
    firstName: string;
    lastName: string;
  };
  requestCount: number;
}

export default function TrainerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const trainerId = params.id as string;

  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [pastBookings, setPastBookings] = useState<PastBooking[]>([]);
  const [availableTrainings, setAvailableTrainings] = useState<AvailableTraining[]>([]);
  const [selectedTrainings, setSelectedTrainings] = useState<Set<number>>(new Set());
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [sendingRequests, setSendingRequests] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleOpenRequestModal = async () => {
    try {
      const response = await fetch('/api/trainings?type=available');
      if (!response.ok) {
        throw new Error('Fehler beim Laden der verfügbaren Schulungen');
      }
      const trainings = await response.json();
      setAvailableTrainings(trainings);
      setSelectedTrainings(new Set());
      setShowRequestModal(true);
    } catch (err) {
      console.error('Error fetching available trainings:', err);
      alert('Fehler beim Laden der verfügbaren Schulungen');
    }
  };

  const handleTrainingSelection = (trainingId: number) => {
    const newSelected = new Set(selectedTrainings);
    if (newSelected.has(trainingId)) {
      newSelected.delete(trainingId);
    } else {
      newSelected.add(trainingId);
    }
    setSelectedTrainings(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTrainings.size === availableTrainings.length) {
      setSelectedTrainings(new Set());
    } else {
      setSelectedTrainings(new Set(availableTrainings.map(t => t.id)));
    }
  };

  const handleSendRequests = async () => {
    if (selectedTrainings.size === 0) {
      alert('Bitte wählen Sie mindestens eine Schulung aus');
      return;
    }

    setSendingRequests(true);
    try {
      const selectedIds = Array.from(selectedTrainings);
      const response = await fetch('/api/training-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trainingIds: selectedIds,
          trainerId: parseInt(trainerId)
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden der Anfragen');
      }

      const result = await response.json();
      alert(`Anfragen erfolgreich gesendet! ${selectedIds.length} Schulung(en) wurden angefragt.`);

      setShowRequestModal(false);
      setSelectedTrainings(new Set());
    } catch (err) {
      console.error('Error sending requests:', err);
      alert('Fehler beim Senden der Anfragen');
    } finally {
      setSendingRequests(false);
    }
  };

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
          href="/dashboard/trainer"
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
                {(trainer.topicsWithLevels || trainer.topics.map((name: string) => ({ name, level: 'GRUNDLAGE' as const }))).map((topic: string | { name: string; level: 'GRUNDLAGE' | 'FORTGESCHRITTEN' | 'EXPERTE' }, index: number) => {
                  const topicName = typeof topic === 'string' ? topic : topic.name;
                  const topicLevel = typeof topic === 'string' ? 'GRUNDLAGE' : topic.level;
                  const levelColors = {
                    'GRUNDLAGE': 'bg-blue-100 text-blue-800 border border-blue-300',
                    'FORTGESCHRITTEN': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
                    'EXPERTE': 'bg-green-100 text-green-800 border border-green-300'
                  };
                  const levelLabels = {
                    'GRUNDLAGE': 'Grundlage',
                    'FORTGESCHRITTEN': 'Fortgeschritten',
                    'EXPERTE': 'Experte'
                  };
                  return (
                    <span
                      key={index}
                      className={`text-xs px-3 py-1 rounded-full font-semibold ${levelColors[topicLevel]}`}
                    >
                      {topicName} <span className="text-xs opacity-75">({levelLabels[topicLevel]})</span>
                    </span>
                  );
                })}
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
        <button
          onClick={handleOpenRequestModal}
          className="ptw-button-primary"
          disabled={!trainer}
        >
          ANFRAGE SENDEN
        </button>
      </div>

      {/* Training Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  Schulungen für {trainer?.firstName} {trainer?.lastName} anfragen
                </h3>
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              {availableTrainings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Keine verfügbaren Schulungen gefunden.</p>
                </div>
              ) : (
                <>
                  {/* Select All Checkbox */}
                  <div className="mb-4 flex items-center">
                    <input
                      type="checkbox"
                      id="selectAll"
                      checked={selectedTrainings.size === availableTrainings.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="selectAll" className="ml-2 text-sm font-medium text-gray-700">
                      Alle auswählen ({availableTrainings.length})
                    </label>
                  </div>

                  {/* Training List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableTrainings.map((training) => (
                      <div
                        key={training.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedTrainings.has(training.id)
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleTrainingSelection(training.id)}
                      >
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            checked={selectedTrainings.has(training.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleTrainingSelection(training.id);
                            }}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-semibold text-gray-900">{training.title}</h4>
                                <p className="text-sm text-gray-600">{training.topicName}</p>
                                <p className="text-sm text-gray-500">{training.company.companyName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">
                                  {formatDate(training.date)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {training.participants} Teilnehmer
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                              <span>{training.location}</span>
                              <span>€{training.dailyRate}/Tag</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowRequestModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSendRequests}
                      disabled={selectedTrainings.size === 0 || sendingRequests}
                      className="px-4 py-2 bg-primary-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingRequests ? 'Wird gesendet...' : `Anfragen senden (${selectedTrainings.size})`}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
