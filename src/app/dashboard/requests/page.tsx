"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import jsPDF from 'jspdf';
import { getTrainerData, getCompanyData } from "../../../lib/session";

interface TrainingRequest {
  id: number;
  trainingId: number;
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
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  };
  company?: {
    id: number;
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface ApiTrainingRequest {
  id: number;
  trainingId: number;
  trainerId: number;
  status: string;
  message: string | null;
  counterPrice: number | null;
  createdAt: string;
  updatedAt: string;
  training: {
    id: number;
    title: string;
    topic: {
      name: string;
    };
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    location: string;
    participants: number;
    dailyRate: number;
  };
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
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Get user data to determine if it's a trainer or company
      // Check both trainer and company data
      const trainerData = getTrainerData();
      const companyData = getCompanyData();
      const user = trainerData || companyData;

      if (!user) {
        console.error('No user data found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching requests for user:', user.userType, user.id);

      if (user.userType === 'TRAINER') {
        // For trainers, fetch training requests they received (sent to them)
        try {
          const response = await fetch(`/api/training-requests?trainerId=${user.id}`);
          if (response.ok) {
            const requests = await response.json();

            // Transform training requests to match the existing interface
            const mapped: TrainingRequest[] = requests.map((req: any) => ({
              id: req.id,
              trainingId: req.trainingId,
              courseTitle: req.training.title,
              topicName: req.training.topic.name,
              date: typeof req.training.startDate === 'string' ? req.training.startDate : req.training.startDate.toISOString(),
              endTime: typeof req.training.endDate === 'string' 
                ? new Date(`${req.training.endDate.split('T')[0]}T${req.training.endTime}`).toISOString()
                : new Date(`${req.training.endDate.toISOString().split('T')[0]}T${req.training.endTime}`).toISOString(),
              location: req.training.location,
              participants: req.training.participantCount,
              originalPrice: req.training.dailyRate || 0,
              proposedPrice: req.training.dailyRate || 0,
              counterPrice: req.counterPrice,
              message: req.message || "",
              status: (req.status === 'DECLINED' ? 'rejected' : 
                       req.status === 'WITHDRAWN' ? 'abgesagt' : 
                       req.status.toLowerCase()) as "pending" | "accepted" | "rejected" | "abgesagt" | "completed",
              createdAt: typeof req.createdAt === 'string' ? req.createdAt : req.createdAt.toISOString(),
              updatedAt: typeof req.updatedAt === 'string' ? req.updatedAt : req.updatedAt.toISOString(),
              company: req.training.company ? {
                id: req.training.company.id,
                companyName: req.training.company.companyName || '',
                firstName: req.training.company.firstName || '',
                lastName: req.training.company.lastName || '',
                email: req.training.company.email || ''
              } : undefined
            }));

            setRequests(mapped);
            setFilteredRequests(mapped);
            console.log('Loaded training requests for trainer:', mapped);
          } else {
            console.error('Failed to fetch training requests for trainer');
            setRequests([]);
            setFilteredRequests([]);
          }
        } catch (error) {
          console.error('Error fetching training requests for trainer:', error);
          setRequests([]);
          setFilteredRequests([]);
        }
      } else if (user.userType === 'TRAINING_COMPANY') {
        // For companies, fetch all training requests for their trainings (both upcoming and past)
        try {
          // Get both upcoming and past trainings
          const [upcomingResponse, pastResponse] = await Promise.all([
            fetch(`/api/trainings?companyId=${user.id}&type=upcoming`),
            fetch(`/api/trainings?companyId=${user.id}&type=past`)
          ]);
          
          let trainings = [];
          if (upcomingResponse.ok) {
            const upcoming = await upcomingResponse.json();
            trainings.push(...upcoming);
          }
          if (pastResponse.ok) {
            const past = await pastResponse.json();
            trainings.push(...past);
          }
          
          if (trainings.length > 0) {
            // Fetch requests for all trainings
            const allRequests = await Promise.all(
              trainings.map(async (training: any) => {
                try {
                  console.log(`Fetching requests for training ${training.id}: ${training.title}`);
                  const response = await fetch(`/api/training-requests?trainingId=${training.id}`);
                  if (response.ok) {
                    const requests = await response.json();
                    console.log(`Found ${requests.length} requests for training ${training.id}`);
                    return requests.map((req: any) => {
                      // Ensure we have all required data
                      if (!req.training || !req.training.topic || !req.trainer) {
                        console.warn('Incomplete request data:', req);
                      }
                      return {
                      id: req.id,
                      trainingId: req.trainingId,
                      courseTitle: req.training.title,
                      topicName: req.training.topic.name,
                      date: typeof req.training.startDate === 'string' ? req.training.startDate : req.training.startDate.toISOString(),
                      endTime: typeof req.training.endDate === 'string' 
                        ? new Date(`${req.training.endDate.split('T')[0]}T${req.training.endTime}`).toISOString()
                        : new Date(`${req.training.endDate.toISOString().split('T')[0]}T${req.training.endTime}`).toISOString(),
                      location: req.training.location,
                      participants: req.training.participantCount,
                      originalPrice: req.training.dailyRate || 0,
                      proposedPrice: req.training.dailyRate || 0,
                      counterPrice: req.counterPrice,
                      message: req.message || "",
                      status: (req.status === 'DECLINED' ? 'rejected' : 
                       req.status === 'WITHDRAWN' ? 'abgesagt' : 
                       req.status.toLowerCase()) as "pending" | "accepted" | "rejected" | "abgesagt" | "completed",
                      createdAt: typeof req.createdAt === 'string' ? req.createdAt : req.createdAt.toISOString(),
                      updatedAt: typeof req.updatedAt === 'string' ? req.updatedAt : req.updatedAt.toISOString(),
                      trainer: {
                        id: req.trainer.id,
                        firstName: req.trainer.firstName,
                        lastName: req.trainer.lastName,
                        email: req.trainer.email
                      }
                    };
                    });
                  } else {
                    console.error(`Failed to fetch requests for training ${training.id}:`, response.status, response.statusText);
                    return [];
                  }
                } catch (error) {
                  console.error(`Error fetching requests for training ${training.id}:`, error);
                  return [];
                }
              })
            );
            
            const flattenedRequests = allRequests.flat();
            console.log('Total requests found:', flattenedRequests.length);
            console.log('Sample request:', flattenedRequests[0]);
            setRequests(flattenedRequests);
            setFilteredRequests(flattenedRequests);
            console.log('Loaded training requests for company:', flattenedRequests);
          } else {
            // No trainings found, but that's okay - just no requests to show
            setRequests([]);
            setFilteredRequests([]);
          }
        } catch (error) {
          console.error('Error fetching training requests for company:', error);
          setRequests([]);
          setFilteredRequests([]);
        }
      } else {
        // Unknown user type
        setRequests([]);
        setFilteredRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };


  const updateRequest = async (id: number, updates: Partial<TrainingRequest>) => {
    try {
      // Get user data
      const user = getTrainerData();
      if (!user) {
        console.error('No user data found');
        return null;
      }

      // Use TrainingRequest system for both trainers and companies
      const response = await fetch('/api/training-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          status: updates.status?.toUpperCase(),
          counterPrice: updates.counterPrice,
          message: updates.message
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        setRequests(prev =>
          prev.map(req =>
            req.id === id ? {
              ...req,
              status: (updatedRequest.status === 'DECLINED' ? 'rejected' : 
                       updatedRequest.status === 'WITHDRAWN' ? 'abgesagt' : 
                       updatedRequest.status.toLowerCase()) as any,
              message: updatedRequest.message || req.message,
              counterPrice: updatedRequest.counterPrice,
              updatedAt: updatedRequest.updatedAt
            } : req
          )
        );
        setFilteredRequests(prev =>
          prev.map(req =>
            req.id === id ? {
              ...req,
              status: (updatedRequest.status === 'DECLINED' ? 'rejected' : 
                       updatedRequest.status === 'WITHDRAWN' ? 'abgesagt' : 
                       updatedRequest.status.toLowerCase()) as any,
              message: updatedRequest.message || req.message,
              counterPrice: updatedRequest.counterPrice,
              updatedAt: updatedRequest.updatedAt
            } : req
          )
        );
        return updatedRequest;
      } else {
        const errorData = await response.json();
        console.error('Failed to update training request:', errorData.error);
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
      // Update the training request status using local API
      const response = await fetch('/api/training-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          status: 'ACCEPTED'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept training request');
      }

      // Refresh the requests list
      await fetchRequests();
      alert('Training-Anfrage erfolgreich angenommen!');
    } catch (e) {
      console.error('Error accepting request:', e);
      alert('Fehler beim Bestätigen der Training-Anfrage.');
    }
    setShowContract(false);
    setShowModal(false);
  };

  const handleReject = async (id: number) => {
    try {
      // Update the training request status using local API
      const response = await fetch('/api/training-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          status: 'DECLINED'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject training request');
      }

      // Refresh the requests list
      await fetchRequests();
      alert('Training-Anfrage erfolgreich abgelehnt.');
    } catch (e) {
      console.error('Error rejecting request:', e);
      alert('Fehler beim Ablehnen der Training-Anfrage.');
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
      // Send counteroffer using local API
      const response = await fetch('/api/training-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          status: 'PENDING', // Keep as pending but update the counter price
          counterPrice: price,
          message: `Gegenvorschlag: €${Math.round(price)}`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send counteroffer');
      }

      await fetchRequests();
      alert('Gegenvorschlag erfolgreich gesendet!');
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
      trainerAddress = trainer.street && trainer.zipCode && trainer.city 
        ? `${trainer.street}${trainer.houseNumber ? ' ' + trainer.houseNumber : ''}, ${trainer.zipCode} ${trainer.city}`
        : "[Adresse nicht hinterlegt]";
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

  const openInquiryModal = (request: TrainingRequest) => {
    // Open inquiry modal with pre-filled training info
    setActiveRequest(request);
    // Pre-fill subject with training info
    const formattedDate = formatDate(request.date);
    setInquirySubject(`Rückfrage zu Training: ${request.courseTitle} vom ${formattedDate}`);
    setInquiryMessage("");
    setAttachedFiles([]);
    setShowInquiryModal(true);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newFiles = Array.from(files);
    const totalFiles = attachedFiles.length + newFiles.length;

    if (totalFiles > 5) {
      alert('Sie können maximal 5 Dateien anhängen.');
      return;
    }

    // Validate file types and sizes
    for (const file of newFiles) {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        alert(`Die Datei "${file.name}" ist zu groß. Maximale Größe: 10MB`);
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-rar-compressed',
      ];

      if (!allowedTypes.includes(file.type)) {
        alert(`Der Dateityp von "${file.name}" wird nicht unterstützt.`);
        return;
      }
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sendInquiry = async () => {
    if (!activeRequest || !inquirySubject.trim() || !inquiryMessage.trim()) {
      alert('Bitte füllen Sie Betreff und Nachricht aus.');
      return;
    }

    setIsUploading(true);
    try {
      let response;

      if (attachedFiles.length > 0) {
        // Use FormData for multipart upload
        const formData = new FormData();
        formData.append('trainingRequestId', activeRequest.id.toString());
        formData.append('subject', inquirySubject);
        formData.append('message', inquiryMessage);

        // Add files to form data
        attachedFiles.forEach((file) => {
          formData.append('attachments', file);
        });

        response = await fetch('/api/training-request-messages', {
          method: 'POST',
          body: formData,
        });
      } else {
        // Use JSON for simple message without attachments
        response = await fetch('/api/training-request-messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            trainingRequestId: activeRequest.id,
            subject: inquirySubject,
            message: inquiryMessage,
            senderId: user.id,
            senderType: user.userType
          }),
        });
      }

      if (!response.ok) {
        throw new Error('Failed to send inquiry');
      }

      alert('Ihre Rückfrage wurde erfolgreich gesendet!');
      setShowInquiryModal(false);
      setInquirySubject("");
      setInquiryMessage("");
      setAttachedFiles([]);
    } catch (error) {
      console.error('Error sending inquiry:', error);
      alert('Fehler beim Senden der Rückfrage. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };


  // Get user type for context
  const [userType, setUserType] = useState<'TRAINER' | 'TRAINING_COMPANY' | null>(null);

  useEffect(() => {
    const user = getTrainerData();
    if (user) {
      setUserType(user.userType as 'TRAINER' | 'TRAINING_COMPANY');
    }
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {userType === 'TRAINER' ? 'Meine Trainingsanfragen' : 'Trainingsanfragen'}
      </h1>
      
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
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{request.courseTitle}</h3>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                      {request.topicName}
                    </span>
                    {/* Show trainer info for companies, company info for trainers */}
                    {userType === 'TRAINING_COMPANY' && request.trainer && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Trainer: </span>
                        <Link
                          href={`/dashboard/trainer/${request.trainer.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {request.trainer.firstName} {request.trainer.lastName}
                        </Link>
                        {request.trainer.email && (
                          <span className="text-gray-500 ml-2">({request.trainer.email})</span>
                        )}
                      </div>
                    )}
                    {userType === 'TRAINER' && request.company && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Firma: </span>
                        {request.company.companyName || `${request.company.firstName} ${request.company.lastName}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
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
                    onClick={() => openInquiryModal(request)}
                    className="px-3 py-1 bg-blue-50 border border-blue-300 rounded text-sm font-medium text-blue-700 hover:bg-blue-100 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 11.798 5.555 8.835z" clipRule="evenodd" />
                    </svg>
                    Rückfrage
                  </button>
                  <Link
                    href={`/dashboard/training/${request.trainingId}?from=${encodeURIComponent('/dashboard/requests')}`}
                    className="px-3 py-1 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Details
                  </Link>
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
                  onClick={() => openInquiryModal(activeRequest)}
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

      {/* Inquiry Modal */}
      {showInquiryModal && activeRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Rückfrage senden</h3>
                <button
                  onClick={() => setShowInquiryModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Betreff
                </label>
                <input
                  type="text"
                  value={inquirySubject}
                  onChange={(e) => setInquirySubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Betreff eingeben..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nachricht
                </label>
                <textarea
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ihre Rückfrage hier eingeben..."
                />
              </div>

              {/* File Attachments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dateianhänge (optional)
                </label>
                <div className="space-y-3">
                  {/* File Input */}
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={attachedFiles.length >= 5}
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-sm text-gray-600">
                        {attachedFiles.length >= 5
                          ? "Maximale Anzahl von Dateien erreicht"
                          : "Klicken Sie hier, um Dateien auszuwählen"
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Max. 10MB pro Datei • Unterstützt: PDF, DOC, XLS, Bilder, ZIP
                      </p>
                    </div>
                  </div>

                  {/* Attached Files List */}
                  {attachedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Angehängte Dateien:</p>
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="text-lg">
                              {file.type.startsWith('image/') ? '🖼️' :
                               file.type.includes('pdf') ? '📄' :
                               file.type.includes('word') || file.type.includes('document') ? '📝' :
                               file.type.includes('excel') || file.type.includes('spreadsheet') ? '📊' :
                               file.type.includes('zip') || file.type.includes('rar') ? '📦' : '📎'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Training-Details:</h4>
                <div className="text-sm text-blue-700">
                  <p><strong>Titel:</strong> {activeRequest.courseTitle}</p>
                  <p><strong>Datum:</strong> {formatDate(activeRequest.date)}</p>
                  <p><strong>Ort:</strong> {activeRequest.location}</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowInquiryModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={sendInquiry}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center"
                >
                  {isUploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 11.798 5.555 8.835z" clipRule="evenodd" />
                      </svg>
                      Rückfrage senden
                    </>
                  )}
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