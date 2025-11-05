"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import jsPDF from 'jspdf';
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";

export interface TrainingData {
  id: number;
  title: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  status: string;
  description?: string;
  trainerNotes?: string;
  materials?: string[];
  assignedTrainer?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
  } | null;
  dailyRate?: number;
  company?: {
    id: number;
    name: string;
  };
  requestedTrainers?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
  }>;
}

interface TrainingDetailsProps {
  training: TrainingData;
  userType: 'TRAINER' | 'TRAINING_COMPANY';
  onInquiry?: () => void;
  loading?: boolean;
  error?: string | null;
  backHref?: string; // Optional back navigation URL
}

export default function TrainingDetails({
  training,
  userType,
  onInquiry,
  loading = false,
  error = null,
  backHref
}: TrainingDetailsProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

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

  // Generate and download an .ics calendar file for the training
  const downloadCalendarEntry = (training: TrainingData) => {
    // Format the dates for iCalendar format (yyyyMMddTHHmmssZ)
    const formatIcsDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15) + "Z";
    };

    const startDate = formatIcsDate(training.date);
    const endDate = formatIcsDate(training.endTime);
    const now = formatIcsDate(new Date().toISOString());

    // Generate a unique identifier for the event
    const uid = `training-${training.id}-${Date.now()}@trainerportal.de`;

    // Description with trainer notes if available
    let description = training.description || '';
    if (training.trainerNotes) {
      description += `\n\nTrainer-Notizen: ${training.trainerNotes}`;
    }
    if (training.materials && training.materials.length > 0) {
      description += `\n\nMaterialien: ${training.materials.join(', ')}`;
    }

    // Create the iCalendar content
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//TrainerPortal//DE",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${training.title}`,
      `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
      `LOCATION:${training.location}`,
      `CATEGORIES:${training.topicName}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    // Create a Blob object from the iCalendar content
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });

    // Create a temporary URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a hidden anchor element for downloading
    const link = document.createElement("a");
    link.href = url;
    link.download = `${training.title.replace(/\s+/g, '_')}.ics`;

    // Append the link to the document, trigger a click, and remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release the URL object to free up memory
    URL.revokeObjectURL(url);
  };

  const generateContractPDF = (training: TrainingData) => {
    const doc = new jsPDF();
    const startDate = formatDate(training.date);
    const startTime = formatTime(training.date);
    const endTime = formatTime(training.endTime);

    // Set up fonts and colors
    const primaryColor = [52, 73, 93]; // Dark blue similar to powertowork branding

    // Header with powertowork branding
    doc.setFontSize(24);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("powertowork", 150, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.text("online academy", 150, 32);

    // Main title
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Dozentenvertrag", 105, 55, { align: "center" });

    // Contract parties
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    doc.text("Zwischen Auftraggeber (AG):", 105, 75, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text("powertowork GmbH", 105, 85, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text("Hermannstraße 3, 33602 Bielefeld", 105, 92, { align: "center" });

    doc.text("und Auftragnehmer (AN)", 105, 105, { align: "center" });
    doc.setFont("helvetica", "bold");

    // Get trainer data from localStorage
    const trainerData = localStorage.getItem("trainer");
    let trainerInfo = "[Trainer Name], [Trainer Adresse]";

    if (trainerData) {
      const trainer = JSON.parse(trainerData);
      const trainerName = `${trainer.firstName} ${trainer.lastName}`;
      const trainerAddress = trainer.street && trainer.zipCode && trainer.city 
        ? `${trainer.street}${trainer.houseNumber ? ' ' + trainer.houseNumber : ''}, ${trainer.zipCode} ${trainer.city}`
        : "[Adresse nicht hinterlegt]";
      trainerInfo = `${trainerName}, ${trainerAddress}`;
    }

    doc.text(trainerInfo, 105, 115, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.text("wird folgender Vertrag mit den Bestandteilen des", 105, 130, { align: "center" });
    doc.text("Rahmenvertrages für Dozenten:innen geschlossen.", 105, 137, { align: "center" });

    // Training information section
    doc.setFont("helvetica", "bold");
    doc.text("Notwendige Informationen für Ihre Schulung:", 20, 155);

    // Create table
    const tableStartY = 165;
    const rowHeight = 12;
    const col1Width = 60;
    const col2Width = 120;

    // Table header style
    doc.setFillColor(240, 240, 240);

    // Table rows data - for completed trainings, we don't have price info
    const tableData = [
      ["Veranstaltungs-ID:", `V-${training.id}`],
      ["Thema:", training.topicName],
      ["Kurstitel:", training.title],
      ["Schulungsinhalte:", `https://powertowork.com/kurse/${training.topicName.toLowerCase()}`],
      ["Termine:", `${startDate} ${startTime} Uhr bis ${endTime} Uhr`],
      ["Dauer in Stunden:", "8 Std."],
      ["Anzahl Teilnehmer:innen:", training.participants.toString()],
      ["Honorar:", "Siehe ursprünglicher Vertrag"]
    ];

    // Draw table
    tableData.forEach((row, index) => {
      const y = tableStartY + (index * rowHeight);

      // Draw row background (alternating)
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, y - 8, col1Width + col2Width, rowHeight, 'F');
      }

      // Draw borders
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, y - 8, col1Width, rowHeight);
      doc.rect(20 + col1Width, y - 8, col2Width, rowHeight);

      // Add text
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(row[0], 22, y - 1);

      doc.setFont("helvetica", "normal");
      // Handle long text wrapping
      const splitText = doc.splitTextToSize(row[1], col2Width - 4);
      doc.text(splitText, 22 + col1Width, y - 1);
    });

    // Footer
    const footerY = tableStartY + (tableData.length * rowHeight) + 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Mit freundlichen Grüßen", 20, footerY);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("- Auch ohne Unterschrift gültig", 20, footerY + 15);

    return doc;
  };

  const downloadContract = (training: TrainingData) => {
    try {
      const doc = generateContractPDF(training);
      const filename = `Dozentenvertrag_${training.title.replace(/\s+/g, '_')}_${training.id}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="animate-pulse space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="h-8 bg-slate-200 rounded w-96"></div>
                  <div className="h-6 bg-slate-200 rounded w-48"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-20"></div>
                    <div className="h-6 bg-slate-200 rounded w-32"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-24 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !training) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Fehler</h2>
            <p className="text-slate-600 mb-6">{error || "Training konnte nicht gefunden werden"}</p>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center space-x-2 hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-sm font-medium">Zurück</span>
                  </button>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">{training.title}</h1>
                <div className="flex items-center space-x-4">
                  <span className="inline-block px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                    {training.topicName}
                  </span>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusClass(training.status)}`}>
                    {getStatusLabel(training.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Training Details Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="block text-sm text-slate-500 font-medium mb-1">Datum</span>
                <span className="text-lg font-semibold text-slate-800">{formatDate(training.date)}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="block text-sm text-slate-500 font-medium mb-1">Zeit</span>
                <span className="text-lg font-semibold text-slate-800">
                  {formatTime(training.date)} - {formatTime(training.endTime)}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="block text-sm text-slate-500 font-medium mb-1">Ort</span>
                <span className="text-lg font-semibold text-slate-800">{training.location}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg">
                <span className="block text-sm text-slate-500 font-medium mb-1">Teilnehmer</span>
                <span className="text-lg font-semibold text-slate-800">{training.participants}</span>
              </div>
            </div>

            {/* Role-specific sections */}
            {userType === 'TRAINER' && training.assignedTrainer && (
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-sm text-blue-600 font-semibold mb-2">Ihre Rolle</span>
                    <p className="text-2xl font-bold text-slate-800">
                      {training.assignedTrainer.fullName}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">Zugewiesener Trainer</p>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Trainer Assignment Section for Companies */}
            {userType === 'TRAINING_COMPANY' && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Zugewiesener Trainer</h3>
                {training.assignedTrainer ? (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-sm text-green-600 font-semibold mb-2">Trainer zugewiesen</span>
                        <Link
                          href={`/dashboard/trainer/${training.assignedTrainer.id}`}
                          className="text-2xl font-bold text-slate-800 hover:text-green-600 hover:underline"
                        >
                          {training.assignedTrainer.fullName}
                        </Link>
                        <p className="text-sm text-green-600 mt-1">Klicken Sie auf den Namen, um das Profil anzuzeigen</p>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="block text-sm text-yellow-600 font-semibold mb-2">Kein Trainer zugewiesen</span>
                        <p className="text-slate-700 mb-4">Dieses Training hat noch keinen zugewiesenen Trainer. Suchen Sie einen passenden Trainer.</p>
                        <Link
                          href={`/dashboard/trainer?topic=${encodeURIComponent(training.topicName)}`}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Trainer suchen
                        </Link>
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Requested Trainers Section for Companies */}
            {userType === 'TRAINING_COMPANY' && training.requestedTrainers && training.requestedTrainers.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Angefragte Trainer</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {training.requestedTrainers.map((trainer) => (
                    <div key={trainer.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link
                            href={`/dashboard/trainer/${trainer.id}`}
                            className="text-lg font-semibold text-slate-800 hover:text-blue-600 hover:underline"
                          >
                            {trainer.firstName} {trainer.lastName}
                          </Link>
                          <p className="text-sm text-slate-600">{trainer.email}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          trainer.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          trainer.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {trainer.status === 'ACCEPTED' ? 'Angenommen' :
                           trainer.status === 'REJECTED' ? 'Abgelehnt' : 'Ausstehend'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {training.description && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Beschreibung</h3>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <p className="text-slate-700 leading-relaxed">{training.description}</p>
                </div>
              </div>
            )}

            {/* Trainer Notes (only for assigned trainers) */}
            {userType === 'TRAINER' && training.trainerNotes && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Notizen für Sie</h3>
                <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                  <p className="text-yellow-800 leading-relaxed">{training.trainerNotes}</p>
                </div>
              </div>
            )}

            {/* Materials */}
            {training.materials && training.materials.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Materialien</h3>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <ul className="space-y-3">
                    {training.materials.map((material, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-slate-700">{material}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-200">
              <button
                onClick={() => downloadCalendarEntry(training)}
                className="px-6 py-3 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-colors flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>Kalender hinzufügen</span>
              </button>

              {/* Contract download for eligible trainings */}
              {(training.status === "confirmed" || training.status === "completed") && (
                <button
                  onClick={() => downloadContract(training)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Vertrag downloaden</span>
                </button>
              )}

              {/* Rückfrage Button for Trainers */}
              {userType === 'TRAINER' && onInquiry && (
                <button
                  onClick={onInquiry}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                  </svg>
                  <span>Rückfrage senden</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
