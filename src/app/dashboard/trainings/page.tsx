"use client";

import { useState, useEffect } from "react";
import jsPDF from 'jspdf';
import { getTrainerData } from "@/lib/session";
import Link from "next/link";

interface Training {
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
}

type ViewMode = "upcoming" | "history";

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [pastTrainings, setPastTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [activeTraining, setActiveTraining] = useState<Training | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Load user data
    const currentUser = getTrainerData();
    setUser(currentUser);

    // Fetch actual trainings data from API
    const fetchTrainings = async () => {
      try {
        if (currentUser) {
          let upcomingUrl = '/api/trainings?type=upcoming';
          let pastUrl = '/api/trainings?type=past';

          if (currentUser.userType === 'TRAINER') {
            upcomingUrl += `&trainerId=${currentUser.id}`;
            pastUrl += `&trainerId=${currentUser.id}`;
          } else {
            // For companies, get trainings they created
            upcomingUrl += `&companyId=${currentUser.id}`;
            pastUrl += `&companyId=${currentUser.id}`;
          }

          // Fetch upcoming trainings
          const upcomingResponse = await fetch(upcomingUrl);
          const pastResponse = await fetch(pastUrl);

          if (upcomingResponse.ok && pastResponse.ok) {
            const upcomingData = await upcomingResponse.json();
            const pastData = await pastResponse.json();

            setTrainings(upcomingData);
            setPastTrainings(pastData);
          } else {
            console.error('Failed to fetch trainings data');
          }
        }
      } catch (error) {
        console.error('Error fetching trainings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, []);

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

  const openTrainingDetails = (training: Training) => {
    setActiveTraining(training);
    setShowModal(true);
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
  // Generate and download contract PDF for completed trainings
  const generateContractPDF = (training: Training) => {
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
      const trainerAddress = trainer.address || "[Adresse nicht hinterlegt]";
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

  const downloadContract = (training: Training) => {
    try {
      const doc = generateContractPDF(training);
      const filename = `Dozentenvertrag_${training.title.replace(/\s+/g, '_')}_${training.id}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.');
    }
  };

  const downloadCalendarEntry = (training: Training) => {
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

  const currentData = viewMode === "upcoming" ? trainings : pastTrainings;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {user?.userType === 'TRAINING_COMPANY' ? 'Geplante Trainings' : 'Meine Trainings'}
        </h1>
        {user?.userType === 'TRAINING_COMPANY' && (
          <Link
            href="/dashboard/trainings/create"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Neues Training erstellen
          </Link>
        )}
      </div>
      
      {/* View Mode Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 md:mb-0">Trainings ansehen</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode("upcoming")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                viewMode === "upcoming"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Anstehende Trainings ({trainings.length})
            </button>
            <button
              onClick={() => setViewMode("history")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                viewMode === "history"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Trainingshistorie ({pastTrainings.length})
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : currentData.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {currentData.map((training) => (
            <div key={training.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{training.title}</h3>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {training.topicName}
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(training.status)}`}>
                    {getStatusLabel(training.status)}
                  </span>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500">Datum</span>
                    <span className="font-medium">{formatDate(training.date)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Zeit</span>
                    <span className="font-medium">{formatTime(training.date)} - {formatTime(training.endTime)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Ort</span>
                    <span className="font-medium">{training.location}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Teilnehmer</span>
                    <span className="font-medium">{training.participants}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex justify-end space-x-2">
                {/* Show Calendar button only for upcoming trainings */}
                {viewMode === "upcoming" && (
                  <button
                    onClick={() => downloadCalendarEntry(training)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Kalender
                  </button>
                )}
                
                {/* Show Contract download button for past trainings OR confirmed upcoming trainings */}
                {(viewMode === "history" || (viewMode === "upcoming" && training.status === "confirmed")) && (
                  <button
                    onClick={() => downloadContract(training)}
                    className="px-3 py-1 bg-green-50 border border-green-300 rounded text-sm font-medium text-green-700 hover:bg-green-100 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Vertrag downloaden
                  </button>
                )}
                
                <button
                  onClick={() => openTrainingDetails(training)}
                  className="px-3 py-1 bg-primary-500 rounded text-sm font-medium text-white hover:bg-primary-600 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">
            {viewMode === "upcoming" 
              ? "Keine anstehenden Trainings gefunden." 
              : "Keine abgeschlossenen Trainings gefunden."}
          </p>
        </div>
      )}
      
      {/* Training Details Modal */}
      {showModal && activeTraining && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Training Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex justify-between mb-4">
                <h4 className="text-lg font-semibold">{activeTraining.title}</h4>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusClass(activeTraining.status)}`}>
                  {getStatusLabel(activeTraining.status)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="block text-sm text-gray-500">Thema</span>
                  <span className="font-medium">{activeTraining.topicName}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Datum & Zeit</span>
                  <span className="font-medium">
                    {formatDate(activeTraining.date)}, {formatTime(activeTraining.date)} - {formatTime(activeTraining.endTime)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Ort</span>
                  <span className="font-medium">{activeTraining.location}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Teilnehmer</span>
                  <span className="font-medium">{activeTraining.participants}</span>
                </div>
              </div>
              
              {activeTraining.description && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Beschreibung</span>
                  <p className="p-3 bg-gray-50 rounded border">{activeTraining.description}</p>
                </div>
              )}
              
              {activeTraining.trainerNotes && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Notizen für Trainer</span>
                  <p className="p-3 bg-yellow-50 rounded border border-yellow-200 text-yellow-800">{activeTraining.trainerNotes}</p>
                </div>
              )}
              
              {activeTraining.materials && activeTraining.materials.length > 0 && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Materialien</span>
                  <ul className="p-3 bg-gray-50 rounded border">
                    {activeTraining.materials.map((material, index) => (
                      <li key={index} className="mb-1 last:mb-0 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                        {material}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Schließen
                </button>
                
                {/* Show Calendar button only for upcoming trainings */}
                {viewMode === "upcoming" && (
                  <button
                    onClick={() => downloadCalendarEntry(activeTraining)}
                    className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Zum Kalender hinzufügen
                  </button>
                )}
                
                {/* Show Contract download button for past trainings OR confirmed upcoming trainings */}
                {(viewMode === "history" || (viewMode === "upcoming" && activeTraining.status === "confirmed")) && (
                  <button
                    onClick={() => downloadContract(activeTraining)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Vertrag downloaden
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 