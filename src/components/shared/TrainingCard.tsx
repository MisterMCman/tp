"use client";

import { format } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface TrainingCardData {
  id: number;
  title: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  status: string;
  description?: string;
  companyName?: string;
  trainerName?: string;
  dailyRate?: number;
  requestCount?: number;
}

interface TrainingCardProps {
  training: TrainingCardData;
  userType: 'TRAINER' | 'TRAINING_COMPANY';
  showActions?: boolean;
  onDetailsClick?: () => void;
  onCalendarClick?: () => void;
  onContractClick?: () => void;
  className?: string;
}

export default function TrainingCard({
  training,
  userType,
  showActions = true,
  onDetailsClick,
  onCalendarClick,
  onContractClick,
  className = ""
}: TrainingCardProps) {
  const pathname = usePathname();
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Bestätigt";
      case "pending": return "Ausstehend";
      case "completed": return "Abgeschlossen";
      case "canceled": return "Storniert";
      default: return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "canceled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onDetailsClick) {
      onDetailsClick();
    }
  };

  const handleCalendarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onCalendarClick) {
      onCalendarClick();
    }
  };

  const handleContractClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContractClick) {
      onContractClick();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      <div className="p-5 border-b">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{training.title}</h3>
            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mb-2">
              {training.topicName}
            </span>

            {/* Show different info based on user type */}
            {userType === 'TRAINER' && training.companyName && (
              <p className="text-sm text-slate-600 mb-1">
                Firma: {training.companyName}
              </p>
            )}

            {userType === 'TRAINING_COMPANY' && training.requestCount !== undefined && (
              <p className="text-sm text-slate-600 mb-1">
                Anfragen: {training.requestCount}
              </p>
            )}
          </div>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(training.status)}`}>
            {getStatusLabel(training.status)}
          </span>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="block text-xs text-slate-500 font-medium mb-1">Datum</span>
            <span className="font-medium text-slate-800">{formatDate(training.date)}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 font-medium mb-1">Zeit</span>
            <span className="font-medium text-slate-800">
              {formatTime(training.date)} - {formatTime(training.endTime)}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 font-medium mb-1">Ort</span>
            <span className="font-medium text-slate-800">{training.location}</span>
          </div>
          <div>
            <span className="block text-xs text-slate-500 font-medium mb-1">Teilnehmer</span>
            <span className="font-medium text-slate-800">{training.participants}</span>
          </div>
        </div>

        {training.description && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <p className="text-sm text-slate-600 line-clamp-2">{training.description}</p>
          </div>
        )}
      </div>

      {showActions && (
        <div className="p-5 flex flex-wrap gap-3 justify-end">
          {/* Calendar button for upcoming trainings */}
          {(training.status === "confirmed" || training.status === "pending") && (
            <button
              onClick={handleCalendarClick}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center space-x-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Kalender</span>
            </button>
          )}

          {/* Contract button for confirmed/completed trainings */}
          {(training.status === "confirmed" || training.status === "completed") && (
            <button
              onClick={handleContractClick}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Vertrag</span>
            </button>
          )}

          {/* Details button */}
          <Link
            href={`/dashboard/training/${training.id}?from=${encodeURIComponent(pathname)}`}
            onClick={handleDetailsClick}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>Details</span>
          </Link>
        </div>
      )}
    </div>
  );
}
