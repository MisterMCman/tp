"use client";

import { useState, useEffect } from "react";

interface TrainingRequest {
  id: number;
  courseTitle: string;
  topicName: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
  proposedPrice: number;
  message?: string;
  status: "pending" | "accepted" | "rejected";
}

type FilterStatus = "all" | "pending" | "accepted" | "rejected";

export default function RequestsPage() {
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<TrainingRequest | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    // In a real application, you would fetch from your API
    // For now, let's mock the data
    const fetchRequests = async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockRequests: TrainingRequest[] = [
        {
          id: 1,
          courseTitle: "Python für Einsteiger",
          topicName: "Python",
          date: "2025-12-10T09:00:00",
          endTime: "2025-12-10T17:00:00",
          location: "Online",
          participants: 15,
          proposedPrice: 800,
          message: "Wir suchen einen erfahrenen Python-Trainer für unseren Einsteigerkurs. Inhalt sollte grundlegende Python-Syntax und einfache Anwendungen umfassen.",
          status: "pending"
        },
        {
          id: 2,
          courseTitle: "JavaScript Fortgeschrittene",
          topicName: "JavaScript",
          date: "2025-12-15T13:30:00",
          endTime: "2025-12-15T18:00:00",
          location: "Berlin, Hauptstr. 17",
          participants: 10,
          proposedPrice: 950,
          message: "Workshop für Entwickler mit JavaScript-Grundkenntnissen. Fokus auf modernen ES6+ Features und asynchroner Programmierung.",
          status: "pending"
        },
        {
          id: 3,
          courseTitle: "Projektmanagement in agilen Teams",
          topicName: "Projektmanagement",
          date: "2025-07-05T10:00:00",
          endTime: "2025-07-05T16:00:00",
          location: "München, Bahnhofplatz 3",
          participants: 12,
          proposedPrice: 1200,
          status: "pending"
        },
        {
          id: 4,
          courseTitle: "React Workshop",
          topicName: "JavaScript",
          date: "2025-02-15T09:30:00",
          endTime: "2025-02-15T16:30:00",
          location: "Online",
          participants: 8,
          proposedPrice: 850,
          message: "Eine Einführung in React mit praktischen Übungen.",
          status: "accepted"
        },
        {
          id: 5,
          courseTitle: "Excel für Fortgeschrittene",
          topicName: "Excel",
          date: "2025-01-20T10:00:00",
          endTime: "2025-01-20T15:00:00",
          location: "Hamburg, Neuer Wall 50",
          participants: 6,
          proposedPrice: 600,
          message: "Schwerpunkt auf Pivot-Tabellen und Makros.",
          status: "rejected"
        }
      ];
      
      setRequests(mockRequests);
      setFilteredRequests(mockRequests);
      setLoading(false);
    };
    
    fetchRequests();
  }, []);

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
    setCounterPrice(request.proposedPrice.toString());
    setShowModal(true);
  };

  const handleAccept = (id: number) => {
    // In a real application, you would call an API to update the status
    setRequests(prev => 
      prev.map(req => 
        req.id === id 
          ? { ...req, status: "accepted" } 
          : req
      )
    );
    setShowModal(false);
  };

  const handleReject = (id: number) => {
    // In a real application, you would call an API to update the status
    setRequests(prev => 
      prev.map(req => 
        req.id === id 
          ? { ...req, status: "rejected" } 
          : req
      )
    );
    setShowModal(false);
  };

  const handleCounterOffer = (id: number) => {
    // In a real application, you would call an API to update the counter price
    const price = parseFloat(counterPrice);
    if (isNaN(price) || price <= 0) return;
    
    setRequests(prev => 
      prev.map(req => 
        req.id === id 
          ? { ...req, proposedPrice: price, status: "pending" } 
          : req
      )
    );
    setShowModal(false);
  };

  const handleStatusFilterChange = (status: FilterStatus) => {
    setStatusFilter(status);
  };

  const getRequestCount = (status: FilterStatus) => {
    if (status === "all") return requests.length;
    return requests.filter(req => req.status === status).length;
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
          <div className="flex space-x-2">
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
                    <span className="block font-medium text-lg text-gray-900">{formatCurrency(request.proposedPrice)}</span>
                    <span className="text-sm text-gray-500">Vorgeschlagener Preis</span>
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
              
              <div className="p-5 flex justify-between items-center">
                <div>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    request.status === "pending" 
                    ? "bg-yellow-100 text-yellow-800" 
                    : request.status === "accepted" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                  }`}>
                    {request.status === "pending" 
                      ? "Offen" 
                      : request.status === "accepted" 
                      ? "Angenommen" 
                      : "Abgelehnt"}
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
                  {request.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Ablehnen
                      </button>
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="px-3 py-1 bg-primary-500 rounded text-sm font-medium text-white hover:bg-primary-600"
                      >
                        Annehmen
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
              
              {activeRequest.message && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Nachricht</span>
                  <p className="p-3 bg-gray-50 rounded border">{activeRequest.message}</p>
                </div>
              )}
              
              <div className="mb-6">
                <span className="block text-sm text-gray-500 mb-1">Preisvorschlag</span>
                <div className="p-3 bg-gray-50 rounded border">
                  <span className="font-medium text-xl">{formatCurrency(activeRequest.proposedPrice)}</span>
                </div>
              </div>
              
              {activeRequest.status === "pending" && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">Gegenvorschlag (optional)</span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">€</span>
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="form-input"
                      placeholder="Ihr Preisvorschlag"
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
                
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Schließen
                </button>
                
                {activeRequest.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleReject(activeRequest.id)}
                      className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                    >
                      Ablehnen
                    </button>
                    
                    {parseFloat(counterPrice) !== activeRequest.proposedPrice && !isNaN(parseFloat(counterPrice)) && (
                      <button
                        onClick={() => handleCounterOffer(activeRequest.id)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                      >
                        Gegenvorschlag senden
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleAccept(activeRequest.id)}
                      className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                    >
                      Annehmen
                    </button>
                  </>
                )}
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
    default: return "";
  }
} 