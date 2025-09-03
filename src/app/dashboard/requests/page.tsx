"use client";

import { useState, useEffect } from "react";
import jsPDF from 'jspdf';
import { apiRequestedEvents, apiEvents } from "@/lib/apiClient";

interface TrainingRequest {
  id: number;
  courseTitle: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  originalPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  message?: string;
  status: "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = "all" | "pending" | "accepted" | "rejected" | "abgesagt" | "completed";

export default function RequestsPage() {
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<TrainingRequest | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const list = await apiRequestedEvents.list();
      type ProdRequestedEvent = {
        id: number;
        key?: string;
        status?: string;
        course?: { id: number; title: string };
        title?: string;
        description?: string;
        training_type?: string;
        event_dates?: { id: number; day: string; time_start: string; time_end: string };
        event_fee?: number;
        participants?: Array<{
          id: number;
          salutation?: string;
          title?: string;
          first_name?: string;
          last_name?: string;
        }>;
        location_classroom?: { id: number; label: string };
      };

      // @ts-expect-error - Relaxed typing for development flexibility
      const mapped: TrainingRequest[] = (list?.events ?? list ?? []).map((e: ProdRequestedEvent) => ({
        id: e.id,
        courseTitle: e.course?.title ?? e.title ?? "",
        topicName: e.course?.title ?? "",
        date: e.event_dates?.day ? `${e.event_dates.day}T${e.event_dates.time_start}` : new Date().toISOString(),
        endTime: e.event_dates?.day ? `${e.event_dates.day}T${e.event_dates.time_end}` : new Date().toISOString(),
        location: e.location_classroom?.label ?? e.training_type ?? "",
        participants: (e.participants?.length ?? 0) || 0,
        originalPrice: e.event_fee ?? 0,
        proposedPrice: e.event_fee ?? 0,
        counterPrice: undefined,
        message: e.description ?? "",
        status: (e.status as "pending" | "accepted" | "rejected" | "abgesagt" | "completed") ?? "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      setRequests(mapped);
      setFilteredRequests(mapped);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRequest = async (id: number, updates: Partial<TrainingRequest>) => {
    try {
      // Get trainer ID from localStorage for security validation
      const trainerData = localStorage.getItem("trainer");
      if (!trainerData) {
        console.error('No trainer data found');
        return null;
      }
      
      const trainer = JSON.parse(trainerData);
      
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...updates,
          trainerId: trainer.id // Include trainer ID for security validation
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setRequests(prev => 
          prev.map(req => 
            req.id === id ? updatedRequest : req
          )
        );
        return updatedRequest;
      } else {
        const errorData = await response.json();
        console.error('Failed to update request:', errorData.error);
        if (response.status === 403) {
          alert('Sie sind nicht berechtigt, diese Anfrage zu bearbeiten.');
        }
        return null;
      }
    } catch (error) {
      console.error('Error updating request:', error);
      return null;
    }
  };

  // Apply filter when statusFilter changes or requests change
  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(request => request.status === statusFilter));
    }
  }, [statusFilter, requests]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const openRequestDetails = (request: TrainingRequest) => {
    setActiveRequest(request);
    setCounterPrice(request.counterPrice?.toString() || request.proposedPrice.toString());
    setShowModal(true);
  };

  const handleAcceptClick = () => {
    setShowContract(true);
    setShowModal(false);
  };

  const generateContractPDF = (request: TrainingRequest) => {
    const doc = new jsPDF();
    const finalPrice = request.counterPrice || request.proposedPrice;
    const startDate = formatDate(request.date);
    const startTime = formatTime(request.date);
    const endTime = formatTime(request.endTime);
    
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
    
    // Table rows data
    const tableData = [
      ["Veranstaltungs-ID:", `V-${request.id}`],
      ["Thema:", request.topicName],
      ["Kurstitel:", request.courseTitle],
      ["Schulungsinhalte:", `https://powertowork.com/kurse/${request.topicName.toLowerCase()}`],
      ["Termine:", `${startDate} ${startTime} Uhr bis ${endTime} Uhr`],
      ["Dauer in Stunden:", "8 Std."],
      ["Anzahl Teilnehmer:innen:", request.participants.toString()],
      ["Honorar:", `${formatCurrency(finalPrice)} | + 0,00 € pro weiterem Teilnehmer`]
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

  const downloadContract = (request: TrainingRequest) => {
    try {
      const doc = generateContractPDF(request);
      const filename = `Dozentenvertrag_${request.courseTitle.replace(/\s+/g, '_')}_${request.id}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fehler beim Erstellen des PDFs. Bitte versuchen Sie es erneut.');
    }
  };

  const handleAccept = async (id: number) => {
    try {
      await apiRequestedEvents.sendDecision(id, undefined, { state_key: "request-accepted" });
      // Download contract from production API
      const blob = await apiEvents.downloadContract(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Dozentenvertrag_${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      await fetchRequests();
    } catch (e) {
      console.error('Error accepting request:', e);
      alert('Fehler beim Bestätigen.');
    }
    setShowContract(false);
    setShowModal(false);
  };

  const handleReject = async (id: number) => {
    try {
      await apiRequestedEvents.sendDecision(id, undefined, { state_key: "request-declined" });
      await fetchRequests();
    } catch (e) {
      console.error('Error rejecting request:', e);
      alert('Fehler beim Ablehnen.');
    }
    setShowModal(false);
  };

  const handleCancel = async () => {
    // Not specified in API; leaving as UI-only feedback
    setShowModal(false);
  };

  const handleComplete = async (id: number) => {
    const confirmed = confirm("Möchten Sie dieses Training als abgeschlossen markieren? Dies wird automatisch eine Rechnungsgutschrift generieren.");
    if (confirmed) {
      await updateRequest(id, { status: "completed" });
      setShowModal(false);
    }
  };

  const handleCounterOffer = async (id: number) => {
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) return;
    try {
      await apiRequestedEvents.sendDecision(id, undefined, { state_key: "counteroffer-sent", instructor_fee: Math.round(price) });
      await fetchRequests();
    } catch (e) {
      console.error('Error sending counter offer:', e);
      alert('Fehler beim Senden des Gegenvorschlags.');
    }
    setShowModal(false);
  };

  const handleStatusFilterChange = (status: FilterStatus) => {
    setStatusFilter(status);
  };

  const getRequestCount = (status: FilterStatus) => {
    if (status === "all") return requests.length;
    return requests.filter(req => req.status === status).length;
  };

  const generateContractText = (request: TrainingRequest) => {
    const finalPrice = request.counterPrice || request.proposedPrice;
    const startDate = formatDate(request.date);
    const startTime = formatTime(request.date);
    const endTime = formatTime(request.endTime);
    
    // Get trainer data from localStorage
    const trainerData = localStorage.getItem("trainer");
    let trainerName = "[Trainer Name]";
    let trainerAddress = "[Trainer Adresse]";
    
    if (trainerData) {
      const trainer = JSON.parse(trainerData);
      trainerName = `${trainer.firstName} ${trainer.lastName}`;
      trainerAddress = trainer.address || "[Adresse nicht hinterlegt]";
    }
    
    return `Dozentenvertrag

Zwischen Auftraggeber (AG):
powertowork GmbH
Hermannstraße 3, 33602 Bielefeld

und Auftragsnehmer (AN)
${trainerName}
${trainerAddress}

wird folgender Vertrag mit den Bestandteilen des Rahmenvertrages für Dozenten:innen geschlossen.

Notwendige Informationen für Ihre Schulung:

Veranstaltungs-ID: V-${request.id}
Thema: ${request.topicName}
Kurstitel: ${request.courseTitle}
Schulungsinhalte: [Schulungslink]
Termine: ${startDate} ${startTime} Uhr bis ${endTime} Uhr
Dauer in Stunden: [Stunden]
Anzahl Teilnehmer:innen: ${request.participants}
Honorar: ${formatCurrency(finalPrice)} | + 0,00 € pro weiterem Teilnehmer

Mit freundlichen Grüßen
- Auch ohne Unterschrift gültig`;
  };

  const sendInquiryEmail = (request: TrainingRequest) => {
    // Get trainer ID from localStorage (in a real app this would be more securely handled)
    const trainerData = localStorage.getItem("trainer");
    let trainerId = "unknown";
    
    if (trainerData) {
      const trainer = JSON.parse(trainerData);
      trainerId = trainer.id;
    }
    
    // Format the date for the email
    const formattedDate = formatDate(request.date);
    
    // Create email subject
    const subject = `Rückfrage zu Training: ${request.courseTitle} (ID: ${request.id} /T${trainerId})`;
    
    // Create email body
    const body = `Liebes powertowork Team,

folgende Frage habe ich zu Ihrer Anfrage vom ${formattedDate}:

[Ihre Frage hier eingeben]


Mit freundlichen Grüßen,`
;
    
    // Encode subject and body for mailto link
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(body);
    
    // Open default email client with pre-populated fields
    window.location.href = `mailto:info@powertowork.com?subject=${encodedSubject}&body=${encodedBody}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Trainingsanfragen</h1>
      
      {/* Filter/Search */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 md:mb-0">Filter nach Status</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilterChange("all")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "all"
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Alle ({getRequestCount("all")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("pending")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "pending"
                ? "bg-yellow-600 text-white"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
              }`}
            >
              Offen ({getRequestCount("pending")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("accepted")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "accepted"
                ? "bg-green-600 text-white"
                : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              Angenommen ({getRequestCount("accepted")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("rejected")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "rejected"
                ? "bg-red-600 text-white"
                : "bg-red-100 text-red-800 hover:bg-red-200"
              }`}
            >
              Abgelehnt ({getRequestCount("rejected")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("abgesagt")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "abgesagt"
                ? "bg-orange-600 text-white"
                : "bg-orange-100 text-orange-800 hover:bg-orange-200"
              }`}
            >
              Abgesagt ({getRequestCount("abgesagt")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("completed")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "completed"
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Abgeschlossen ({getRequestCount("completed")})
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
      ) : filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{request.courseTitle}</h3>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {request.topicName}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block font-medium text-lg text-gray-900">
                      {formatCurrency(request.counterPrice || request.proposedPrice)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {request.counterPrice ? "Gegenvorschlag" : "Tageshonorar"}
                    </span>
                    {request.counterPrice && (
                      <div className="text-sm text-gray-400 mt-1">
                        Original: {formatCurrency(request.originalPrice)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500">Datum</span>
                    <span className="font-medium">{formatDate(request.date)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Zeit</span>
                    <span className="font-medium">{formatTime(request.date)} - {formatTime(request.endTime)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Ort</span>
                    <span className="font-medium">{request.location}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Teilnehmer</span>
                    <span className="font-medium">{request.participants}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 bg-gray-100 text-sm text-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-gray-500">Erstellt am</span>
                    <span className="font-medium">{formatDateTime(request.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500">Zuletzt geändert</span>
                    <span className="font-medium">{formatDateTime(request.updatedAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex justify-between items-center">
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === "pending" 
                    ? "bg-yellow-100 text-yellow-800" 
                    : request.status === "accepted" 
                    ? "bg-green-100 text-green-800" 
                    : request.status === "rejected"
                    ? "bg-red-100 text-red-800"
                    : request.status === "abgesagt"
                    ? "bg-orange-100 text-orange-800"
                    : "bg-gray-100 text-gray-800"
                  }`}>
                    {request.status === "pending" 
                      ? "Offen" 
                      : request.status === "accepted" 
                      ? "Angenommen" 
                      : request.status === "rejected"
                      ? "Abgelehnt"
                      : request.status === "abgesagt"
                      ? "Abgesagt"
                      : "Abgeschlossen"}
                  </span>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => sendInquiryEmail(request)}
                    className="px-3 py-1 bg-blue-50 border border-blue-300 rounded text-sm font-medium text-blue-700 hover:bg-blue-100 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 11.798 5.555 8.835z" clipRule="evenodd" />
                    </svg>
                    Rückfrage
                  </button>
                  <button
                    onClick={() => openRequestDetails(request)}
                    className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Details
                  </button>
                  {(request.status === "accepted" || request.status === "completed") && (
                    <button
                      onClick={() => downloadContract(request)}
                      className="px-3 py-1 bg-green-50 border border-green-300 rounded text-sm font-medium text-green-700 hover:bg-green-100 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Vertrag downloaden
                    </button>
                  )}
                  {request.status === "accepted" && (
                    <>
                      <button
                        onClick={() => handleCancel()}
                        className="px-3 py-1 bg-orange-50 border border-orange-300 rounded text-sm font-medium text-orange-700 hover:bg-orange-100 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        Training absagen
                      </button>
                      <button
                        onClick={() => handleComplete(request.id)}
                        className="px-3 py-1 bg-green-50 border border-green-300 rounded text-sm font-medium text-green-700 hover:bg-green-100 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Training abschließen
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">Keine {statusFilter !== "all" ? getStatusLabel(statusFilter) + "en" : ""} Trainingsanfragen gefunden.</p>
        </div>
      )}
      
      {/* Request Details Modal */}
      {showModal && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Anfrage Details</h3>
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
              <h4 className="text-lg font-semibold mb-4">{activeRequest.courseTitle}</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="block text-sm text-gray-500">Thema</span>
                  <span className="font-medium">{activeRequest.topicName}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Datum & Zeit</span>
                  <span className="font-medium">
                    {formatDate(activeRequest.date)}, {formatTime(activeRequest.date)} - {formatTime(activeRequest.endTime)}
                  </span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Ort</span>
                  <span className="font-medium">{activeRequest.location}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Teilnehmer</span>
                  <span className="font-medium">{activeRequest.participants}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="block text-sm text-gray-500">Erstellt am</span>
                  <span className="font-medium">{formatDateTime(activeRequest.createdAt)}</span>
                </div>
                <div>
                  <span className="block text-sm text-gray-500">Zuletzt geändert</span>
                  <span className="font-medium">{formatDateTime(activeRequest.updatedAt)}</span>
                </div>
              </div>
              
              {activeRequest.message && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Nachricht</span>
                  <p className="p-3 bg-gray-50 rounded border">{activeRequest.message}</p>
                </div>
              )}
              
              <div className="mb-6">
                <span className="block text-sm text-gray-500 mb-1">Preisdetails</span>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Tageshonorar:</span>
                      <span className="font-medium text-lg">{formatCurrency(activeRequest.originalPrice)}</span>
                    </div>
                  </div>
                  {activeRequest.counterPrice && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-600">Ihr Gegenvorschlag:</span>
                        <span className="font-medium text-lg text-blue-700">{formatCurrency(activeRequest.counterPrice)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {activeRequest.status === "pending" && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">
                    {activeRequest.counterPrice ? "Neuer Gegenvorschlag (optional)" : "Gegenvorschlag (optional)"}
                  </span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">€</span>
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="form-input"
                      placeholder={activeRequest.counterPrice ? "Neuer Preisvorschlag" : "Ihr Preisvorschlag"}
                      min="0"
                      step="50"
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 border-t pt-4 mt-6">
                <button
                  onClick={() => sendInquiryEmail(activeRequest)}
                  className="px-4 py-2 bg-blue-50 border border-blue-300 rounded-md text-blue-700 hover:bg-blue-100 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 11.798 5.555 8.835z" clipRule="evenodd" />
                  </svg>
                  Rückfrage senden
                </button>
                
                {activeRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReject(activeRequest.id)}
                      className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                    >
                      Ablehnen
                    </button>
                    
                    {parseFloat(counterPrice) !== (activeRequest.counterPrice || activeRequest.proposedPrice) && !isNaN(parseFloat(counterPrice)) && (
                      <button
                        onClick={() => handleCounterOffer(activeRequest.id)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      >
                        Gegenvorschlag senden
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAcceptClick()}
                      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                    >
                      Vertrag anzeigen
                    </button>
                  </>
                )}

                {(activeRequest.status === "accepted" || activeRequest.status === "completed") && (
                  <button
                    onClick={() => downloadContract(activeRequest)}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Vertrag downloaden
                  </button>
                )}

                {activeRequest.status === "accepted" && (
                  <>
                     <button
                       onClick={() => handleCancel()}
                      className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Training absagen
                    </button>
                    <button
                      onClick={() => handleComplete(activeRequest.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Training abschließen
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {showContract && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Dozentenvertrag</h3>
                <button 
                  onClick={() => setShowContract(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="whitespace-pre-line text-sm leading-relaxed">
                {generateContractText(activeRequest)}
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowContract(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Zurück
                </button>
                <button
                  onClick={() => handleAccept(activeRequest.id)}
                  className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                >
                  Vertrag akzeptieren und PDF herunterladen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get status label
function getStatusLabel(status: FilterStatus): string {
  switch (status) {
    case "pending": return "offen";
    case "accepted": return "angenommen";
    case "rejected": return "abgelehnt";
    case "abgesagt": return "abgesagt";
    case "completed": return "abgeschlossen";
    default: return "";
  }
} 