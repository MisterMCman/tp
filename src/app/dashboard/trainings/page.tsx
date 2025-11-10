"use client";

import { useState, useEffect } from "react";
import jsPDF from 'jspdf';
import { getUserData } from "@/lib/session";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

interface Training {
  id: number;
  title: string;
  topicName: string;
  date: string;
  endTime: string;
  startTime?: string;
  endDate?: string;
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
  trainerPrice?: number | null;
  requestedTrainers?: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
  }>;
  hasAcceptedTrainer?: boolean;
}

interface User {
  userType: 'TRAINER' | 'TRAINING_COMPANY';
}

type ViewMode = "upcoming" | "history" | "calendar";
type SortField = "date" | "location" | "participants" | null;
type SortOrder = "asc" | "desc";

export default function TrainingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [pastTrainings, setPastTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [sortBy, setSortBy] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Initialize viewMode from URL or default
  const getInitialViewMode = (): ViewMode => {
    const mode = searchParams.get('view');
    if (mode === 'calendar' || mode === 'history' || mode === 'upcoming') {
      return mode as ViewMode;
    }
    return 'upcoming';
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode);

  useEffect(() => {
    // Load user data (works for both trainers and companies)
    const currentUser = getUserData();
    setUser(currentUser as unknown as User | null);

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
    
    // Get user data from session (works for both trainers and companies)
    const userData = getUserData();
    let trainerInfo = "[Trainer Name], [Trainer Adresse]";
    
    if (userData && userData.userType === 'TRAINER') {
      const trainer = userData as any;
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

  const handleRequestTrainer = (training: Training) => {
    // Navigate directly to trainer search with training ID and topic
    router.push(`/dashboard/trainer?trainingId=${training.id}&topic=${encodeURIComponent(training.topicName)}`);
  };

  const getWeekStart = (date: Date = new Date()): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const getWeekDays = (startDate: Date): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getTrainingsForDay = (day: Date, trainingsList: Training[]): Training[] => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    return trainingsList.filter(training => {
      const trainingStartDate = new Date(training.date);
      const trainingEndDate = training.endDate ? new Date(training.endDate) : trainingStartDate;
      
      // Check if the day falls within the training date range
      return (trainingStartDate <= dayEnd && trainingEndDate >= dayStart);
    });
  };
  
  const isMultiDayTraining = (training: Training): boolean => {
    if (!training.endDate) return false;
    const startDate = new Date(training.date);
    const endDate = new Date(training.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 0;
  };
  
  const getTrainingDayIndex = (training: Training, day: Date): number => {
    if (!isMultiDayTraining(training)) return 0;
    const startDate = new Date(training.date);
    startDate.setHours(0, 0, 0, 0);
    const currentDay = new Date(day);
    currentDay.setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((currentDay.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff);
  };
  
  const getTrainingTotalDays = (training: Training): number => {
    if (!training.endDate) return 1;
    const startDate = new Date(training.date);
    const endDate = new Date(training.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff + 1; // +1 because both start and end days are included
  };

  const formatDayName = (date: Date): string => {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' }).format(date);
  };

  const formatDayNumber = (date: Date): string => {
    return new Intl.DateTimeFormat('de-DE', { day: 'numeric' }).format(date);
  };

  // Initialize weekStart from URL or default
  const getInitialWeekStart = (): Date => {
    const weekParam = searchParams.get('week');
    if (weekParam) {
      const weekDate = new Date(weekParam);
      if (!isNaN(weekDate.getTime())) {
        return getWeekStart(weekDate);
      }
    }
    return getWeekStart();
  };

  const [weekStart, setWeekStart] = useState<Date>(() => getInitialWeekStart());

  // Sync state with URL params when they change (e.g., browser back/forward)
  useEffect(() => {
    const urlMode = searchParams.get('view') || 'upcoming';
    const urlWeek = searchParams.get('week');
    
    // Only update if URL params differ from current state
    if (urlMode === 'calendar' || urlMode === 'history' || urlMode === 'upcoming') {
      if (urlMode !== viewMode) {
        setViewMode(urlMode as ViewMode);
      }
    }

    if (urlMode === 'calendar' && urlWeek) {
      const weekDate = new Date(urlWeek);
      if (!isNaN(weekDate.getTime())) {
        const urlWeekStart = getWeekStart(weekDate);
        const currentWeekStartStr = weekStart.toISOString().split('T')[0];
        const urlWeekStartStr = urlWeekStart.toISOString().split('T')[0];
        if (urlWeekStartStr !== currentWeekStartStr) {
          setWeekStart(urlWeekStart);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Update URL when viewMode or weekStart changes (but avoid if URL already matches)
  useEffect(() => {
    const currentView = searchParams.get('view') || 'upcoming';
    const currentWeek = searchParams.get('week');
    
    // Check if we need to update URL
    const needsViewUpdate = (viewMode === 'upcoming' && currentView !== 'upcoming') || 
                            (viewMode !== 'upcoming' && currentView !== viewMode);
    const needsWeekUpdate = viewMode === 'calendar' && 
                            (!currentWeek || currentWeek !== weekStart.toISOString().split('T')[0]);
    
    if (needsViewUpdate || needsWeekUpdate) {
      const params = new URLSearchParams();
      if (viewMode !== 'upcoming') {
        params.set('view', viewMode);
      }
      if (viewMode === 'calendar') {
        params.set('week', weekStart.toISOString().split('T')[0]);
      }
      const newUrl = params.toString() ? `/dashboard/trainings?${params.toString()}` : '/dashboard/trainings';
      router.replace(newUrl, { scroll: false });
    }
  }, [viewMode, weekStart, router, searchParams]);

  const currentData = viewMode === "upcoming" ? trainings : pastTrainings;
  const weekDays = getWeekDays(weekStart);
  const calendarTrainings = viewMode === "calendar" ? trainings : [];

  return (
    <>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4 flex justify-between items-start" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.userType === 'TRAINING_COMPANY' ? 'Geplante Trainings' : 'Meine Trainings'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.userType === 'TRAINING_COMPANY' 
              ? 'Verwalten Sie Ihre geplanten Trainings und Termine'
              : 'Übersicht über Ihre Trainings und Termine'}
          </p>
        </div>
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
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">
      
      {/* View Mode Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 md:mb-0">Trainings ansehen</h2>
          <div className="flex space-x-2 flex-wrap">
            <button
              onClick={() => {
                setViewMode("upcoming");
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                viewMode === "upcoming"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Anstehende Trainings ({trainings.length})
            </button>
            <button
              onClick={() => {
                setViewMode("history");
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                viewMode === "history"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Trainingshistorie ({pastTrainings.length})
            </button>
            <button
              onClick={() => {
                setViewMode("calendar");
              }}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 flex items-center ${
                viewMode === "calendar"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Kalender
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
      ) : viewMode === "calendar" ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Calendar Header with Navigation */}
          <div className="p-4 border-b flex justify-between items-center">
            <button
              onClick={() => {
                const prevWeek = new Date(weekStart);
                prevWeek.setDate(prevWeek.getDate() - 7);
                setWeekStart(prevWeek);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold">
                {formatDate(weekStart.toISOString())} - {formatDate(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString())}
              </h3>
              <button
                onClick={() => setWeekStart(getWeekStart())}
                className="px-3 py-1 text-sm bg-primary-100 text-primary-700 hover:bg-primary-200 rounded-md"
              >
                Heute
              </button>
            </div>
            <button
              onClick={() => {
                const nextWeek = new Date(weekStart);
                nextWeek.setDate(nextWeek.getDate() + 7);
                setWeekStart(nextWeek);
              }}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {weekDays.map((day, dayIndex) => {
              const dayTrainings = getTrainingsForDay(day, calendarTrainings);
              const isToday = new Date().toDateString() === day.toDateString();
              
              return (
                <div key={dayIndex} className="bg-white min-h-[400px]">
                  {/* Day Header */}
                  <div className={`p-2 border-b text-center ${isToday ? 'bg-primary-50' : ''}`}>
                    <div className="text-xs text-gray-500 font-medium">{formatDayName(day)}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-primary-600' : 'text-gray-800'}`}>
                      {formatDayNumber(day)}
                    </div>
                  </div>
                  
                  {/* Trainings for this day */}
                  <div className="p-2 space-y-2">
                    {dayTrainings.map((training) => {
                      const backUrl = `/dashboard/trainings?view=calendar&week=${weekStart.toISOString().split('T')[0]}`;
                      const isMultiDay = isMultiDayTraining(training);
                      const dayIndex = getTrainingDayIndex(training, day);
                      const totalDays = getTrainingTotalDays(training);
                      const isFirstDay = dayIndex === 0;
                      const isLastDay = dayIndex === totalDays - 1;
                      const isMiddleDay = !isFirstDay && !isLastDay;
                      
                      return (
                      <Link
                        key={`${training.id}-${dayIndex}`}
                        href={`/dashboard/training/${training.id}?from=${encodeURIComponent(backUrl)}`}
                        className={`block p-2 rounded border cursor-pointer transition-colors ${
                          isMultiDay 
                            ? isFirstDay 
                              ? 'bg-primary-50 hover:bg-primary-100 border-primary-300 border-l-4' 
                              : isLastDay
                              ? 'bg-primary-50 hover:bg-primary-100 border-primary-300 border-r-4'
                              : 'bg-primary-50 hover:bg-primary-100 border-primary-300 border-y-0'
                            : 'bg-primary-50 hover:bg-primary-100 border-primary-200'
                        }`}
                        title={isMultiDay ? `${training.title} (Tag ${dayIndex + 1} von ${totalDays})` : training.title}
                      >
                        <div className="text-xs font-semibold text-primary-800 truncate">
                          {training.title}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-xs text-gray-600">
                            {isFirstDay || !isMultiDay ? `${training.startTime || '09:00'} - ${training.endTime ? (training.endTime.includes('T') ? formatTime(training.endTime) : training.endTime) : '17:00'}` : 'Ganztägig'}
                          </div>
                          {isMultiDay && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary-200 text-primary-800 font-medium">
                              {dayIndex + 1}/{totalDays}
                            </span>
                          )}
                        </div>
                        {training.assignedTrainer && (isFirstDay || !isMultiDay) && (
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            {training.assignedTrainer.fullName}
                          </div>
                        )}
                      </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : currentData.length > 0 ? (
        <>
          {/* Sort Controls */}
          {viewMode !== "calendar" && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Sortieren nach:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSort("date")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      sortBy === "date"
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Datum
                    {sortBy === "date" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("location")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      sortBy === "location"
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Ort
                    {sortBy === "location" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSort("participants")}
                    className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                      sortBy === "participants"
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Teilnehmer
                    {sortBy === "participants" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                  {sortBy && (
                    <button
                      onClick={() => {
                        setSortBy(null);
                        setSortOrder("asc");
                      }}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      Zurücksetzen
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
                    <span className="font-medium">
                      {training.endDate && new Date(training.endDate).toDateString() !== new Date(training.date).toDateString()
                        ? `${formatDate(training.date)} - ${formatDate(training.endDate)}`
                        : formatDate(training.date)}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Zeit</span>
                    <span className="font-medium">
                      {training.startTime || '09:00'} - {training.endTime ? (training.endTime.includes('T') ? formatTime(training.endTime) : training.endTime) : '17:00'}
                    </span>
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

                {/* Show trainer information */}
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                  {/* Show booked trainer (ACCEPTED) */}
                  {training.hasAcceptedTrainer && training.assignedTrainer ? (
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Gebuchter Trainer</span>
                      <div className="flex items-center justify-between">
                        <Link
                          href={(() => {
                            // Preserve current view state when linking to trainer profile
                            const params = new URLSearchParams();
                            if (viewMode !== 'upcoming') {
                              params.set('view', viewMode);
                            }
                            if (viewMode === 'calendar') {
                              params.set('week', weekStart.toISOString().split('T')[0]);
                            }
                            params.set('returnTo', 'trainings');
                            const queryString = params.toString();
                            return `/dashboard/trainer/${training.assignedTrainer.id}${queryString ? `?${queryString}` : ''}`;
                          })()}
                          className="font-semibold text-primary-600 hover:text-primary-800 hover:underline text-base flex items-center gap-2"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {training.assignedTrainer.fullName}
                        </Link>
                        {training.trainerPrice && (
                          <span className="text-sm font-medium text-gray-700">
                            {training.trainerPrice.toFixed(2)} €/Tag
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                  
                  {/* Show requested trainers (PENDING) */}
                  {training.requestedTrainers && training.requestedTrainers.length > 0 && (
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Angefragte Trainer</span>
                      <div className="space-y-1">
                        {training.requestedTrainers.map((trainer) => (
                          <Link
                            key={trainer.id}
                            href={(() => {
                              const params = new URLSearchParams();
                              if (viewMode !== 'upcoming') {
                                params.set('view', viewMode);
                              }
                              if (viewMode === 'calendar') {
                                params.set('week', weekStart.toISOString().split('T')[0]);
                              }
                              params.set('returnTo', 'trainings');
                              const queryString = params.toString();
                              return `/dashboard/trainer/${trainer.id}${queryString ? `?${queryString}` : ''}`;
                            })()}
                            className="text-sm text-gray-600 hover:text-primary-600 hover:underline flex items-center gap-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                            {trainer.fullName}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show "No trainer" message if neither booked nor requested */}
                  {!training.hasAcceptedTrainer && (!training.requestedTrainers || training.requestedTrainers.length === 0) && (
                    <div>
                      <span className="block text-xs text-gray-500 mb-1">Trainer</span>
                      <span className="text-sm text-gray-400 italic">Kein Trainer zugewiesen</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex justify-end space-x-2">
                {/* Show Calendar button only for trainers and upcoming trainings */}
                {viewMode === "upcoming" && user?.userType === 'TRAINER' && (
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
                
                {/* Show Request Trainer button for companies when no trainer is assigned */}
                {viewMode === "upcoming" && user?.userType === 'TRAINING_COMPANY' && !training.assignedTrainer && (
                  <button
                    onClick={() => handleRequestTrainer(training)}
                    className="px-3 py-1 bg-blue-50 border border-blue-300 rounded text-sm font-medium text-blue-700 hover:bg-blue-100 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                    </svg>
                    Trainer anfragen
                  </button>
                )}
                
                {/* Show Contract download button only when trainer has ACCEPTED status */}
                {training.hasAcceptedTrainer && (
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
                
                <Link
                  href={(() => {
                    // Preserve current view state when linking to training details
                    const params = new URLSearchParams();
                    if (viewMode !== 'upcoming') {
                      params.set('view', viewMode);
                    }
                    if (viewMode === 'calendar') {
                      params.set('week', weekStart.toISOString().split('T')[0]);
                    }
                    const backUrl = params.toString() 
                      ? `/dashboard/trainings?${params.toString()}`
                      : '/dashboard/trainings';
                    return `/dashboard/training/${training.id}?from=${encodeURIComponent(backUrl)}`;
                  })()}
                  className="px-3 py-1 bg-primary-500 rounded text-sm font-medium text-white hover:bg-primary-600 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Details
                </Link>
              </div>
            </div>
          ))}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">
            {viewMode === "upcoming" 
              ? "Keine anstehenden Trainings gefunden." 
              : "Keine abgeschlossenen Trainings gefunden."}
          </p>
        </div>
      )}
      </div>
    </>
  );
} 