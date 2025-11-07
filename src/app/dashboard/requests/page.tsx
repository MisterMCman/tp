"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import jsPDF from 'jspdf';
import { getUserData, getTrainerData, getCompanyData } from "../../../lib/session";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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
  companyCounterPrice?: number;
  trainerAccepted?: boolean;
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<TrainingRequest | null>(null);
  const [counterPrice, setCounterPrice] = useState<string>("");
  const [companyCounterPrice, setCompanyCounterPrice] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [showContract, setShowContract] = useState(false);
  
  // Initialize statusFilter from URL parameter or default to "all"
  const getInitialFilter = (): FilterStatus => {
    const statusParam = searchParams.get('status');
    const validStatuses: FilterStatus[] = ["all", "pending", "accepted", "rejected", "abgesagt", "completed"];
    return (statusParam && validStatuses.includes(statusParam as FilterStatus)) 
      ? (statusParam as FilterStatus) 
      : "all";
  };
  
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(getInitialFilter());
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [inquirySubject, setInquirySubject] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Ref to prevent duplicate fetches (React Strict Mode in development)
  const hasFetchedRef = useRef(false);

  // Sync filter with URL parameter when URL changes
  useEffect(() => {
    const urlFilter = getInitialFilter();
    if (urlFilter !== statusFilter) {
      setStatusFilter(urlFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    // Prevent duplicate fetches in React Strict Mode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);

      // Get user data (works for both trainers and companies)
      const user = getUserData();

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
            const mapped: TrainingRequest[] = requests.map((req: any) => {
              // Determine status: if training is COMPLETED and request is ACCEPTED, mark as "completed"
              let requestStatus: "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
              if (req.status === 'DECLINED') {
                requestStatus = 'rejected';
              } else if (req.status === 'WITHDRAWN') {
                requestStatus = 'abgesagt';
              } else if (req.status === 'ACCEPTED' && req.training?.status === 'COMPLETED') {
                requestStatus = 'completed';
              } else {
                requestStatus = req.status.toLowerCase() as "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
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
                companyCounterPrice: req.companyCounterPrice,
                trainerAccepted: req.trainerAccepted || false,
                status: requestStatus,
                createdAt: typeof req.createdAt === 'string' ? req.createdAt : req.createdAt.toISOString(),
                updatedAt: typeof req.updatedAt === 'string' ? req.updatedAt : req.updatedAt.toISOString(),
                company: req.training.company ? {
                  id: req.training.company.id,
                  companyName: req.training.company.companyName || '',
                  firstName: req.training.company.firstName || '',
                  lastName: req.training.company.lastName || '',
                  email: req.training.company.email || ''
                } : undefined
              };
            });

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
        // For companies, fetch all training requests for their trainings using companyId
        try {
          const response = await fetch(`/api/training-requests?companyId=${user.id}`);
          if (response.ok) {
            const requests = await response.json();
            console.log(`Found ${requests.length} requests for company`);
            
            const mapped: TrainingRequest[] = requests.map((req: any) => {
              // Ensure we have all required data
              if (!req.training || !req.training.topic || !req.trainer) {
                console.warn('Incomplete request data:', req);
              }
              
              // Determine status: if training is COMPLETED and request is ACCEPTED, mark as "completed"
              let requestStatus: "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
              if (req.status === 'DECLINED') {
                requestStatus = 'rejected';
              } else if (req.status === 'WITHDRAWN') {
                requestStatus = 'abgesagt';
              } else if (req.status === 'ACCEPTED' && req.training?.status === 'COMPLETED') {
                requestStatus = 'completed';
              } else {
                requestStatus = req.status.toLowerCase() as "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
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
                companyCounterPrice: req.companyCounterPrice,
                trainerAccepted: req.trainerAccepted || false,
                status: requestStatus,
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
            
            setRequests(mapped);
            setFilteredRequests(mapped);
            console.log('Loaded training requests for company:', mapped);
          } else {
            console.error('Failed to fetch training requests for company');
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
      // Get user data (works for both trainers and companies)
      const user = getUserData();
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
        }),
      });

      if (response.ok) {
        const updatedRequest = await response.json();
        
        // Determine status: if training is COMPLETED and request is ACCEPTED, mark as "completed"
        let requestStatus: "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
        if (updatedRequest.status === 'DECLINED') {
          requestStatus = 'rejected';
        } else if (updatedRequest.status === 'WITHDRAWN') {
          requestStatus = 'abgesagt';
        } else if (updatedRequest.status === 'ACCEPTED' && updatedRequest.training?.status === 'COMPLETED') {
          requestStatus = 'completed';
        } else {
          requestStatus = updatedRequest.status.toLowerCase() as "pending" | "accepted" | "rejected" | "abgesagt" | "completed";
        }
        
        setRequests(prev =>
          prev.map(req =>
            req.id === id ? {
              ...req,
              status: requestStatus,
              counterPrice: updatedRequest.counterPrice,
              companyCounterPrice: updatedRequest.companyCounterPrice,
              trainerAccepted: updatedRequest.trainerAccepted || false,
              updatedAt: updatedRequest.updatedAt
            } : req
          )
        );
        setFilteredRequests(prev =>
          prev.map(req =>
            req.id === id ? {
              ...req,
              status: requestStatus,
              counterPrice: updatedRequest.counterPrice,
              companyCounterPrice: updatedRequest.companyCounterPrice,
              trainerAccepted: updatedRequest.trainerAccepted || false,
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
    let filtered = requests;
    
    if (statusFilter !== "all") {
      filtered = requests.filter(request => request.status === statusFilter);
    }
    
    // Sort: pending requests first, then others
    filtered = [...filtered].sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return 0;
    });
    
    setFilteredRequests(filtered);
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

  const generateContractPDF = async (request: TrainingRequest) => {
    const doc = new jsPDF();
    // Use company counter price if available, otherwise trainer counter price, otherwise proposed price
    const finalPrice = request.companyCounterPrice || request.counterPrice || request.proposedPrice;
    
    // Calculate duration from dates
    const startDateTime = new Date(request.date);
    const endDateTime = new Date(request.endTime);
    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    const durationHours = Math.round(durationMs / (1000 * 60 * 60));
    const durationDays = Math.floor(durationHours / 24);
    const remainingHours = durationHours % 24;
    const durationText = durationDays > 0 
      ? `${durationDays} Tag${durationDays > 1 ? 'e' : ''}, ${remainingHours} Std.`
      : `${durationHours} Std.`;
    
    // Format dates properly - ensure earlier date comes first
    
    // Determine which date is earlier
    const earlierDate = startDateTime <= endDateTime ? startDateTime : endDateTime;
    const laterDate = startDateTime <= endDateTime ? endDateTime : startDateTime;
    
    // Format dates
    const earlierDateStr = earlierDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const laterDateStr = laterDate.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Extract times from original dates (not swapped)
    const startTime = startDateTime.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const endTime = endDateTime.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format training dates - always show earlier date first
    const trainingDatesText = earlierDateStr === laterDateStr
      ? `${earlierDateStr}, ${startTime} - ${endTime} Uhr`
      : `${earlierDateStr} - ${laterDateStr}, ${startTime} - ${endTime} Uhr`;
    
    // Contract date and number
    const today = new Date();
    const contractDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    const contractNumber = `CT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(request.id).padStart(4, '0')}`;
    
    // Set up fonts and colors
    const primaryColor = [52, 73, 93]; // Dark blue similar to powertowork branding
    
    // Main title - moved to top
    doc.setFontSize(20);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text("Dozentenvertrag", 105, 25, { align: "center" });
    
    // Contract number and date (right-aligned) - moved up
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text(`Vertragsnummer: ${contractNumber}`, 20, 40);
    doc.text(`Datum: ${contractDate}`, 190, 40, { align: 'right' });
    
    // Get trainer data first - try session first, then fetch if needed
    let trainerName = "[Trainer Name]";
    let trainerData: any = null;
    
    const userData = getUserData();
    const trainerId = request.trainer?.id;
    
    if (userData && userData.userType === 'TRAINER') {
      // Trainer viewing their own contract - use session data
      trainerData = userData as any;
      trainerName = `${trainerData.firstName} ${trainerData.lastName}`;
      
      // Check if session data has address fields, if not fetch from API
      if ((!trainerData.street && !trainerData.zipCode) && trainerData.id) {
        try {
          const trainerResponse = await fetch(`/api/trainers/${trainerData.id}`);
          if (trainerResponse.ok) {
            const response = await trainerResponse.json();
            const fetchedData = response.trainer || response;
            // Merge fetched data with session data (prefer fetched data for address fields)
            trainerData = { ...trainerData, ...fetchedData };
          }
        } catch (error) {
          console.error('Error fetching trainer data for contract:', error);
          // Continue with session data even if incomplete
        }
      }
    } else if (trainerId) {
      // Company user - fetch full trainer data including address
      trainerName = `${request.trainer.firstName} ${request.trainer.lastName}`;
      try {
        const trainerResponse = await fetch(`/api/trainers/${trainerId}`);
        if (trainerResponse.ok) {
          const response = await trainerResponse.json();
          trainerData = response.trainer || response;
          
          // Normalize country field (some endpoints return 'location' instead of 'country')
          if (trainerData.location && !trainerData.country) {
            trainerData.country = trainerData.location;
          }
        }
      } catch (error) {
        console.error('Error fetching trainer data for contract:', error);
        // Continue without address data
      }
    }
    
    // Contract parties - side by side layout
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    const leftX = 20;
    const rightX = 110; // Right side starts at middle of page
    let yPosition = 60;
    
    // Left side: Company details
    doc.text("Zwischen Auftraggeber (AG):", leftX, yPosition);
    yPosition += 10;
    doc.setFont("helvetica", "bold");
    doc.text("powertowork GmbH", leftX, yPosition);
    yPosition += 5;
    doc.setFont("helvetica", "normal");
    doc.text("Hermannstraße 3", leftX, yPosition);
    yPosition += 5;
    doc.text("33602 Bielefeld", leftX, yPosition);
    yPosition += 5;
    doc.text("Deutschland", leftX, yPosition);
    
    // Right side: Trainer details (same y-position as company)
    let trainerY = 60;
    doc.setFont("helvetica", "normal");
    doc.text("und Auftragnehmer (AN)", rightX, trainerY);
    trainerY += 10;
    doc.setFont("helvetica", "bold");
    doc.text(trainerName, rightX, trainerY);
    trainerY += 5;
    
    // Structured address formatting - add below trainer name
    if (trainerData) {
      // Debug: log trainer data structure to help diagnose issues
      console.log('Trainer data for contract:', {
        hasStreet: !!trainerData.street,
        hasHouseNumber: !!trainerData.houseNumber,
        hasZipCode: !!trainerData.zipCode,
        hasCity: !!trainerData.city,
        hasCountry: !!trainerData.country,
        hasLocation: !!trainerData.location,
        hasTaxId: !!trainerData.taxId,
        countryType: typeof trainerData.country,
        locationType: typeof trainerData.location
      });
      
      if (trainerData.street) {
        const streetLine = `${trainerData.street}${trainerData.houseNumber ? ' ' + trainerData.houseNumber : ''}`;
        doc.setFont("helvetica", "normal");
        doc.text(streetLine, rightX, trainerY);
        trainerY += 5;
      }
      if (trainerData.zipCode && trainerData.city) {
        doc.text(`${trainerData.zipCode} ${trainerData.city}`, rightX, trainerY);
        trainerY += 5;
      }
      // Handle country field - can be object with name/code or string
      const countryValue = trainerData.country || trainerData.location;
      if (countryValue) {
        const countryText = typeof countryValue === 'object' 
          ? (countryValue.name || countryValue.code || '')
          : countryValue;
        if (countryText) {
          doc.text(countryText, rightX, trainerY);
          trainerY += 5;
        }
      }
      if (trainerData.taxId) {
        doc.setFontSize(10);
        doc.text(`Tax ID: ${trainerData.taxId}`, rightX, trainerY);
        trainerY += 5;
      }
    } else {
      // If no trainer data available, show a note
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("(Adressdaten nicht verfügbar)", rightX, trainerY);
      trainerY += 5;
    }
    
    // Use the maximum y-position from both sides to continue
    yPosition = Math.max(yPosition, trainerY) + 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("wird folgender Vertrag mit den Bestandteilen des", 20, yPosition);
    yPosition += 7;
    doc.text("Rahmenvertrages für Dozenten:innen geschlossen.", 20, yPosition);
    yPosition += 15;
    
    // Training information section
    doc.setFont("helvetica", "bold");
    doc.text("Notwendige Informationen für Ihre Schulung:", 20, yPosition);
    yPosition += 10;
    
    // Create table
    const tableStartY = yPosition;
    const rowHeight = 12;
    const col1Width = 60;
    const col2Width = 120;
    
    // Calculate honorar text (no variable component if it's 0)
    const honorarText = `${formatCurrency(finalPrice)} (Festpreis)`;
    
    // Table rows data
    const tableData = [
      ["Veranstaltungs-ID:", `V-${request.id}`],
      ["Thema:", request.topicName],
      ["Kurstitel:", request.courseTitle],
      ["Schulungsinhalte:", `${process.env.NEXT_PUBLIC_BASE_URL || 'https://powertowork.com'}/dashboard/training/${request.trainingId}`],
      ["Termine:", trainingDatesText],
      ["Dauer:", durationText],
      ["Anzahl Teilnehmer:innen:", request.participants.toString()],
      ["Honorar:", honorarText]
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
    const tableEndY = tableStartY + (tableData.length * rowHeight);
    let footerY = tableEndY + 20;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Mit freundlichen Grüßen", 20, footerY);
    footerY += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("- Auch ohne Unterschrift gültig", 20, footerY);
    
    return doc;
  };

  const downloadContract = async (request: TrainingRequest) => {
    try {
      const doc = await generateContractPDF(request);
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
          counterPrice: price
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

  const handleCompanyCounterOffer = async (id: number) => {
    const price = parseFloat(companyCounterPrice);
    if (isNaN(price) || price <= 0) return;
    try {
      // Send company counteroffer using local API
      const response = await fetch('/api/training-requests', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: id,
          status: 'PENDING', // Keep as pending but update the company counter price
          companyCounterPrice: price
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send company counteroffer');
      }

      await fetchRequests();
      alert('Gegenvorschlag erfolgreich gesendet!');
    } catch (e) {
      console.error('Error sending company counter offer:', e);
      alert('Fehler beim Senden des Gegenvorschlags.');
    }
    setShowModal(false);
  };

  const handleStatusFilterChange = (status: FilterStatus) => {
    setStatusFilter(status);
    
    // Update URL with the new filter status
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    
    // Update URL without page reload
    router.push(`/dashboard/requests?${params.toString()}`, { scroll: false });
  };

  const getRequestCount = (status: FilterStatus) => {
    if (status === "all") return requests.length;
    return requests.filter(req => req.status === status).length;
  };

  const generateContractText = (request: TrainingRequest) => {
    // Use company counter price if available, otherwise trainer counter price, otherwise proposed price
    const finalPrice = request.companyCounterPrice || request.counterPrice || request.proposedPrice;
    const startDate = formatDate(request.date);
    const startTime = formatTime(request.date);
    const endTime = formatTime(request.endTime);
    
    // Get user data from session (works for both trainers and companies)
    const userData = getUserData();
    let trainerName = "[Trainer Name]";
    let trainerAddress = "[Trainer Adresse]";
    
    if (userData && userData.userType === 'TRAINER') {
      const trainer = userData as any;
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

    const userData = getUserData();
    if (!userData || !userData.id || !userData.userType) {
      alert('Fehler: Benutzerdaten nicht gefunden. Bitte melden Sie sich erneut an.');
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
        formData.append('senderId', userData.id.toString());
        formData.append('senderType', userData.userType as string);

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
            senderId: userData.id,
            senderType: userData.userType
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
    const user = getUserData();
    if (user && user.userType) {
      setUserType(user.userType as 'TRAINER' | 'TRAINING_COMPANY');
    }
  }, []);

  return (
    <div>
      <div className="ptw-dashboard-header">
        <h1>{userType === 'TRAINER' ? 'MEINE TRAININGSANFRAGEN' : 'TRAININGSANFRAGEN'}</h1>
      </div>
      
      {/* Filter/Search */}
      <div className="ptw-dashboard-card mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <h2 className="text-lg font-semibold mb-4 md:mb-0" style={{ color: 'var(--ptw-accent-primary)' }}>Filter nach Status</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleStatusFilterChange("all")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "all"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Alle ({getRequestCount("all")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("pending")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "pending"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Offen ({getRequestCount("pending")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("accepted")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "accepted"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Angenommen ({getRequestCount("accepted")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("rejected")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "rejected"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Abgelehnt ({getRequestCount("rejected")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("abgesagt")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "abgesagt"
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Abgesagt ({getRequestCount("abgesagt")})
            </button>
            <button
              onClick={() => handleStatusFilterChange("completed")}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors duration-200 ${
                statusFilter === "completed"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Abgeschlossen ({getRequestCount("completed")})
            </button>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="ptw-dashboard-card flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" text="Anfragen werden geladen..." />
        </div>
      ) : filteredRequests.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className={`ptw-dashboard-card overflow-hidden transition-all hover:shadow-lg ${
              request.status === "pending" 
                ? "ptw-card-pending" 
                : ""
            }`}>
              <div className="p-5 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>{request.courseTitle}</h3>
                    <span className="inline-block px-2.5 py-1 text-xs font-medium rounded-full" style={{ background: 'var(--ptw-info-light)', color: 'var(--ptw-info-dark)' }}>
                      {request.topicName}
                    </span>
                    {/* Show trainer info for companies, company info for trainers */}
                    {userType === 'TRAINING_COMPANY' && request.trainer && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="font-medium">Trainer: </span>
                        <Link
                          href={(() => {
                            // Preserve status filter when linking to trainer profile
                            const params = new URLSearchParams();
                            if (statusFilter && statusFilter !== 'all') {
                              params.set('status', statusFilter);
                            }
                            params.set('returnTo', 'requests');
                            const queryString = params.toString();
                            return `/dashboard/trainer/${request.trainer.id}${queryString ? `?${queryString}` : ''}`;
                          })()}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {request.trainer.firstName} {request.trainer.lastName}
                        </Link>
                        {request.trainer.email && (
                          <span className="text-gray-600 ml-2">({request.trainer.email})</span>
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
                    {request.counterPrice ? (
                      <>
                        <span className="block font-medium text-lg text-gray-900">
                          {formatCurrency(request.counterPrice)}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">
                          Gegenvorschlag
                        </span>
                        <div className="text-sm text-gray-600 mt-1">
                          Original: {formatCurrency(request.originalPrice)}
                        </div>
                      </>
                    ) : (
                      <span className="block font-medium text-lg text-gray-900">
                        {formatCurrency(request.proposedPrice)}
                      </span>
                    )}
                    {request.companyCounterPrice && (
                      <div className="text-sm text-purple-600 mt-1 font-medium">
                        {userType === 'TRAINER' ? "Gegenvorschlag von Firma:" : "Ihr Gegenvorschlag:"} {formatCurrency(request.companyCounterPrice)}
                      </div>
                    )}
                    {request.trainerAccepted && userType === 'TRAINING_COMPANY' && (
                      <div className="text-sm text-green-600 mt-1 font-medium">
                        ✓ Trainer hat zugesagt
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 border-t" style={{ background: 'var(--ptw-bg-tertiary)' }}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Datum</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{formatDate(request.date)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Zeit</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{formatTime(request.date)} - {formatTime(request.endTime)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Ort</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{request.location}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Teilnehmer</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{request.participants}</span>
                  </div>
                </div>
              </div>
              
              <div className="px-5 py-3 border-t text-sm" style={{ background: 'var(--ptw-bg-quaternary)' }}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Erstellt am</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{formatDateTime(request.createdAt)}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-medium mb-1" style={{ color: 'var(--ptw-text-secondary)' }}>Zuletzt geändert</span>
                    <span className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>{formatDateTime(request.updatedAt)}</span>
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex justify-between items-center">
                <div>
                  <StatusBadge status={request.status === "abgesagt" ? "cancelled" : request.status} />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {request.status === "pending" && userType === 'TRAINER' && (
                    <>
                      {/* If company has countered (companyCounterPrice exists), trainer can accept company's counter */}
                      {request.companyCounterPrice && !request.trainerAccepted && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setActiveRequest(request);
                            handleAcceptClick();
                          }}
                          icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          Gegenvorschlag annehmen
                        </Button>
                      )}
                      {/* Trainer can only accept original offer if they haven't made a counter and haven't already accepted */}
                      {!request.counterPrice && !request.trainerAccepted && !request.companyCounterPrice && (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => {
                            setActiveRequest(request);
                            handleAcceptClick();
                          }}
                          icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          Annehmen
                        </Button>
                      )}
                      {/* Show waiting message only if trainer has accepted OR if trainer made counter but company hasn't responded yet */}
                      {request.trainerAccepted && (
                        <span className="px-3 py-1.5 bg-gray-200 border border-gray-400 rounded text-sm font-semibold text-gray-800 flex items-center cursor-not-allowed" title="Sie haben bereits zugesagt. Bitte warten Sie auf die Antwort der Firma.">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Warten auf Firmen-Zusage
                        </span>
                      )}
                      {request.counterPrice && !request.companyCounterPrice && !request.trainerAccepted && (
                        <span className="px-3 py-1.5 bg-gray-200 border border-gray-400 rounded text-sm font-semibold text-gray-800 flex items-center cursor-not-allowed" title="Sie haben einen Gegenvorschlag gemacht. Bitte warten Sie auf die Antwort der Firma.">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Warten auf Antwort
                        </span>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Ablehnen
                      </Button>
                      {/* Counter offer button - available if trainer hasn't accepted, and either no counter yet OR company has countered */}
                      {!request.trainerAccepted && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => {
                            setActiveRequest(request);
                            setCounterPrice(request.counterPrice?.toString() || "");
                            setShowModal(true);
                          }}
                          icon={
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                            </svg>
                          }
                        >
                          {request.companyCounterPrice ? "Neuer Gegenvorschlag" : "Gegenvorschlag"}
                        </Button>
                      )}
                    </>
                  )}
                  {request.status === "pending" && userType === 'TRAINING_COMPANY' && request.counterPrice && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Gegenvorschlag ablehnen
                      </Button>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => {
                          setActiveRequest(request);
                          setCompanyCounterPrice(request.companyCounterPrice?.toString() || "");
                          setShowModal(true);
                        }}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Gegenvorschlag senden
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setActiveRequest(request);
                          handleAccept(request.id);
                        }}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Gegenvorschlag annehmen
                      </Button>
                    </>
                  )}
                  {request.status === "pending" && userType === 'TRAINING_COMPANY' && request.trainerAccepted && !request.counterPrice && (
                    <>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleReject(request.id)}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Ablehnen
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          setActiveRequest(request);
                          handleAccept(request.id);
                        }}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Trainer-Zusage annehmen
                      </Button>
                    </>
                  )}
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => openInquiryModal(request)}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M2.94 6.412A2 2 0 002 8.108V16a2 2 0 002 2h12a2 2 0 002-2V8.108a2 2 0 00-.94-1.696l-6-3.75a2 2 0 00-2.12 0l-6 3.75zm2.615 2.423a1 1 0 10-1.11 1.664l5 3.333a1 1 0 001.11 0l5-3.333a1 1 0 00-1.11-1.664L10 11.798 5.555 8.835z" clipRule="evenodd" />
                      </svg>
                    }
                  >
                    Rückfrage
                  </Button>
                  <Link
                    href={(() => {
                      // Preserve status filter when linking to training details
                      const backUrl = statusFilter && statusFilter !== 'all'
                        ? `/dashboard/requests?status=${statusFilter}`
                        : '/dashboard/requests';
                      return `/dashboard/training/${request.trainingId}?from=${encodeURIComponent(backUrl)}`;
                    })()}
                    className="ptw-btn ptw-btn-outline ptw-btn-sm inline-flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    Details
                  </Link>
                  {(request.status === "accepted" || request.status === "completed") && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => downloadContract(request)}
                      icon={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      }
                    >
                      Vertrag downloaden
                    </Button>
                  )}
                  {request.status === "accepted" && (
                    <>
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => handleCancel()}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Training absagen
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => handleComplete(request.id)}
                        icon={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        }
                      >
                        Training abschließen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ptw-dashboard-card text-center py-12">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 mb-4"
              style={{ color: 'var(--ptw-text-muted)' }}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h4.125M8.25 8.25l5.25 5.25m0 0v-4.5m0 4.5h-4.5"
              />
            </svg>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--ptw-text-primary)' }}>
              Keine {statusFilter !== "all" ? getStatusLabel(statusFilter) + "en" : ""} Trainingsanfragen gefunden
            </h2>
            <p className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
              {statusFilter !== "all" 
                ? `Es gibt derzeit keine ${getStatusLabel(statusFilter)}en Anfragen. Versuchen Sie einen anderen Filter.`
                : "Sie haben noch keine Trainingsanfragen. Neue Anfragen werden hier angezeigt."}
            </p>
          </div>
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
                        <span className="text-sm text-blue-600">
                          {userType === 'TRAINER' ? "Ihr Gegenvorschlag:" : "Gegenvorschlag vom Trainer:"}
                        </span>
                        <span className="font-medium text-lg text-blue-700">{formatCurrency(activeRequest.counterPrice)}</span>
                      </div>
                    </div>
                  )}
                  {activeRequest.companyCounterPrice && (
                    <div className="p-3 bg-purple-50 rounded border border-purple-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-600">
                          {userType === 'TRAINER' ? "Gegenvorschlag von Firma:" : "Ihr Gegenvorschlag:"}
                        </span>
                        <span className="font-medium text-lg text-purple-700">{formatCurrency(activeRequest.companyCounterPrice)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {activeRequest.status === "pending" && userType === 'TRAINER' && !activeRequest.trainerAccepted && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">
                    {activeRequest.companyCounterPrice ? "Neuer Gegenvorschlag (optional)" : activeRequest.counterPrice ? "Neuer Gegenvorschlag (optional)" : "Gegenvorschlag (optional)"}
                  </span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">€</span>
                    <input
                      type="number"
                      value={counterPrice}
                      onChange={(e) => setCounterPrice(e.target.value)}
                      className="form-input"
                      placeholder={activeRequest.companyCounterPrice ? "Neuer Preisvorschlag" : activeRequest.counterPrice ? "Neuer Preisvorschlag" : "Ihr Preisvorschlag"}
                      min="0"
                      step="50"
                    />
                  </div>
                </div>
              )}
              {activeRequest.status === "pending" && userType === 'TRAINER' && activeRequest.trainerAccepted && (
                <div className="mb-6 p-3 bg-green-50 rounded border border-green-200">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-green-800">
                      Sie haben bereits zugesagt. Bitte warten Sie auf die Antwort der Firma.
                    </span>
                  </div>
                </div>
              )}
              
              {activeRequest.status === "pending" && userType === 'TRAINING_COMPANY' && activeRequest.counterPrice && (
                <div className="mb-6">
                  <span className="block text-sm text-gray-500 mb-1">
                    {activeRequest.companyCounterPrice ? "Neuer Gegenvorschlag (optional)" : "Gegenvorschlag (optional)"}
                  </span>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">€</span>
                    <input
                      type="number"
                      value={companyCounterPrice}
                      onChange={(e) => setCompanyCounterPrice(e.target.value)}
                      className="form-input"
                      placeholder={activeRequest.companyCounterPrice ? "Neuer Preisvorschlag" : "Ihr Preisvorschlag"}
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
                    {userType === 'TRAINER' && (
                      <>
                        <button
                          onClick={() => handleReject(activeRequest.id)}
                          className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          Ablehnen
                        </button>
                        
                        {/* If company has countered (companyCounterPrice exists), trainer can accept company's counter */}
                        {activeRequest.companyCounterPrice && !activeRequest.trainerAccepted && (
                          <button
                            onClick={() => handleAcceptClick()}
                            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                          >
                            Gegenvorschlag annehmen
                          </button>
                        )}
                        
                        {/* Trainer can send counter offer if they haven't accepted and either no counter yet OR company has countered */}
                        {!activeRequest.trainerAccepted && parseFloat(counterPrice) !== (activeRequest.counterPrice || activeRequest.proposedPrice) && !isNaN(parseFloat(counterPrice)) && activeRequest.status === "pending" && (
                          <button
                            onClick={() => handleCounterOffer(activeRequest.id)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                          >
                            {activeRequest.companyCounterPrice ? "Neuer Gegenvorschlag senden" : "Gegenvorschlag senden"}
                          </button>
                        )}
                        
                        {/* Trainer can only accept original offer if they haven't made a counter, haven't already accepted, and company hasn't countered */}
                        {!activeRequest.counterPrice && !activeRequest.trainerAccepted && !activeRequest.companyCounterPrice && activeRequest.status === "pending" && (
                          <button
                            onClick={() => handleAcceptClick()}
                            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
                          >
                            Vertrag anzeigen
                          </button>
                        )}
                        {/* Show waiting message only if trainer has accepted OR if trainer made counter but company hasn't responded yet */}
                        {activeRequest.trainerAccepted && (
                          <span className="px-4 py-2 bg-gray-200 border border-gray-400 rounded-md text-gray-800 font-semibold cursor-not-allowed" title="Sie haben bereits zugesagt. Bitte warten Sie auf die Antwort der Firma.">
                            Warten auf Firmen-Zusage
                          </span>
                        )}
                        {activeRequest.counterPrice && !activeRequest.companyCounterPrice && !activeRequest.trainerAccepted && (
                          <span className="px-4 py-2 bg-gray-200 border border-gray-400 rounded-md text-gray-800 font-semibold cursor-not-allowed" title="Sie haben einen Gegenvorschlag gemacht. Bitte warten Sie auf die Antwort der Firma.">
                            Warten auf Antwort
                          </span>
                        )}
                      </>
                    )}
                    {userType === 'TRAINING_COMPANY' && activeRequest.counterPrice && (
                      <>
                        <button
                          onClick={() => handleReject(activeRequest.id)}
                          className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          Gegenvorschlag ablehnen
                        </button>
                        {/* Company can send counter offer - only if company hasn't accepted the trainer's counter yet */}
                        {parseFloat(companyCounterPrice) !== (activeRequest.companyCounterPrice || activeRequest.proposedPrice) && !isNaN(parseFloat(companyCounterPrice)) && activeRequest.status === "pending" && (
                          <button
                            onClick={() => handleCompanyCounterOffer(activeRequest.id)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                          >
                            Gegenvorschlag senden
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Accept the counter offer - this accepts the request with the counter price
                            handleAccept(activeRequest.id);
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                          Gegenvorschlag annehmen
                        </button>
                      </>
                    )}
                    {userType === 'TRAINING_COMPANY' && activeRequest.trainerAccepted && !activeRequest.counterPrice && (
                      <>
                        <button
                          onClick={() => handleReject(activeRequest.id)}
                          className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                        >
                          Ablehnen
                        </button>
                        <button
                          onClick={() => {
                            // Company accepts trainer's acceptance - this fully accepts the request
                            handleAccept(activeRequest.id);
                          }}
                          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                        >
                          Trainer-Zusage annehmen
                        </button>
                      </>
                    )}
                    {userType === 'TRAINING_COMPANY' && !activeRequest.counterPrice && !activeRequest.trainerAccepted && (
                      <button
                        onClick={() => handleReject(activeRequest.id)}
                        className="px-4 py-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                      >
                        Ablehnen
                      </button>
                    )}
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