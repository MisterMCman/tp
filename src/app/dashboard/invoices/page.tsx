"use client";

import { useState, useEffect } from "react";
import jsPDF from 'jspdf';

interface AccountingCredit {
  id: number;
  invoiceNumber: string;
  courseTitle: string;
  amount: number;
  status: 'pending' | 'generated' | 'paid';
  createdAt: string;
  generatedAt?: string;
  paidAt?: string;
  downloadUrl?: string;
}

interface InquiryData {
  id: number;
  counterPrice: number | null;
  proposedPrice: number;
  updatedAt: string;
  trainer: {
    firstName: string;
    lastName: string;
    address: string | null;
    taxId: string | null;
    bio: string | null;
  };
  event: {
    course: {
      title: string;
    };
  };
}

export default function InvoicesPage() {
  const [credits, setCredits] = useState<AccountingCredit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccountingCredits();
  }, []);

  const fetchAccountingCredits = async () => {
    try {
      setLoading(true);
      
      // Get trainer ID from localStorage
      const trainerData = localStorage.getItem("trainer");
      if (!trainerData) {
        console.error('No trainer data found');
        setLoading(false);
        return;
      }
      
      const trainer = JSON.parse(trainerData);
      
      // Fetch real accounting credits from API
      const response = await fetch(`/api/accounting-credits?trainerId=${trainer.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      } else {
        console.error('Failed to fetch accounting credits');
        setCredits([]); // Show empty state if API fails
      }
    } catch (error) {
      console.error('Error fetching accounting credits:', error);
      setCredits([]); // Show empty state on error
    } finally {
      setLoading(false);
    }
  };

  const generateAccountingCreditPDF = (inquiry: InquiryData, invoiceNumber: string) => {
    const doc = new jsPDF();
    const finalPrice = inquiry.counterPrice || inquiry.proposedPrice;
    const trainerName = `${inquiry.trainer.firstName} ${inquiry.trainer.lastName}`;
    const invoiceDate = new Date(inquiry.updatedAt);
    const endOfMonth = new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0);
    const formattedInvoiceDate = endOfMonth.toLocaleDateString('de-DE');
    const monthAndYear = invoiceDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    
    // Set up colors
    const primaryColor = [0, 51, 102]; // Dark blue similar to powertowork branding
    
    // Header with powertowork branding
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text("powertowork GmbH | Hermannstraße 3 | 33602 Bielefeld | Germany", 20, 20);
    
    // Trainer address - using real database data
    doc.setFontSize(10);
    doc.text(`${trainerName}`, 20, 35);
    if (inquiry.trainer.address) {
      const addressLines = inquiry.trainer.address.split('\n');
      addressLines.forEach((line, index) => {
        doc.text(line, 20, 42 + (index * 7));
      });
    }
    
    // Dynamic trainer role based on bio, with fallback
    const trainerRole = inquiry.trainer.bio ? 
      inquiry.trainer.bio.split('.')[0] + (inquiry.trainer.bio.split('.')[0].endsWith('.') ? '' : '.') : 
      'Professional Trainer';
    doc.text(trainerRole, 20, 63);
    
    if (inquiry.trainer.taxId) {
      doc.text(`Tax ID: ${inquiry.trainer.taxId}`, 20, 70);
    }
    
    // Date (top right)
    doc.text(formattedInvoiceDate, 150, 85);
    
    // Title
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNTING CREDIT", 20, 100);
    
    doc.setFontSize(11);
    doc.text(`Credit Note No.: ${invoiceNumber}`, 20, 110);
    
    // Content
    doc.setFont("helvetica", "normal");
    doc.text(`Dear ${trainerName},`, 20, 125);
    doc.text("Please find below the accounting credit for your services:", 20, 135);
    
    // Table
    const tableStartY = 150;
    
    // Table data
    const baseAmountFormatted = `${finalPrice.toFixed(2).replace('.', ',')} €`;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    
    // Table headers
    doc.text("Pos.", 20, tableStartY);
    doc.text("Description", 40, tableStartY);
    doc.text("Amount", 160, tableStartY);
    
    // Draw line under headers
    doc.line(20, tableStartY + 2, 190, tableStartY + 2);
    
    doc.setFont("helvetica", "normal");
    
    // Row 1: Training service
    const row1Y = tableStartY + 10;
    doc.text("1", 20, row1Y);
    doc.text(`Training: ${inquiry.event.course.title} for ${monthAndYear}`, 40, row1Y);
    doc.text(`Fixed price: ${baseAmountFormatted}`, 40, row1Y + 7);
    doc.text(baseAmountFormatted, 160, row1Y);
    
    // Base amount
    const row2Y = row1Y + 20;
    doc.text("Base Amount", 40, row2Y);
    doc.text(baseAmountFormatted, 160, row2Y);
    
    // VAT
    const row3Y = row2Y + 10;
    doc.text("VAT", 40, row3Y);
    doc.text("VAT excluded", 160, row3Y);
    
    // Total
    const row4Y = row3Y + 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total Amount", 40, row4Y);
    doc.text(baseAmountFormatted, 160, row4Y);
    
    // Draw line above total
    doc.line(40, row4Y - 2, 190, row4Y - 2);
    
    // Notes
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Note: VAT is not applicable as per the reverse charge procedure for cross-border services.", 20, row4Y + 20);
    
    // Footer text
    doc.setFontSize(11);
    doc.text("The amount will be transferred to your account. Thank you for your excellent work and", 20, row4Y + 35);
    doc.text("the pleasant collaboration.", 20, row4Y + 42);
    
    // Signature
    doc.text("Best regards,", 20, row4Y + 57);
    doc.text("powertowork GmbH", 20, row4Y + 64);
    
    // Company information at the bottom
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("POWERTOWORK GMBH:", 20, 270);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("CEO: Lorenz Surkemper, Phone: +49 176 7091 0870", 65, 270);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("| VAT ID:", 20, 277);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("DE341423200", 50, 277);
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("Bank details:", 80, 277);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("Sparkasse Schaumburg, IBAN: DE65 2555 1480 0313 8616 35 | BIC: NOLADE21SHG", 20, 284);
    
    return doc;
  };

  const downloadCredit = async (invoiceNumber: string) => {
    try {
      // Parse invoice number to get inquiry ID
      const parts = invoiceNumber.split('-');
      if (parts.length !== 4 || parts[0] !== 'AC') {
        alert('Invalid invoice number format');
        return;
      }
      
      const inquiryId = parseInt(parts[3]);
      
      // Fetch inquiry data
      const response = await fetch(`/api/requests/${inquiryId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inquiry data');
      }
      
      const inquiry: InquiryData = await response.json();
      
      // Generate and download PDF using jsPDF (same approach as contract)
      const doc = generateAccountingCreditPDF(inquiry, invoiceNumber);
      doc.save(`${invoiceNumber}.pdf`);
      
    } catch (error) {
      console.error('Error downloading credit:', error);
      alert('Fehler beim Herunterladen der Rechnung. Bitte versuchen Sie es erneut.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'generated':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Wartend';
      case 'generated':
        return 'Generiert';
      case 'paid':
        return 'Bezahlt';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
        <p className="text-gray-600 mt-1">
          Übersicht über Ihre generierten Rechnungsgutschriften
        </p>
      </div>

      {credits.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="flex flex-col items-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-4.5B7.875 8.25 6 10.125 6 12.75v2.625M19.5 14.25V18a2.25 2.25 0 01-2.25 2.25h-10.5A2.25 2.25 0 014.5 18v-3.75M19.5 14.25h1.875c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125H19.5m-4.125-5.625v5.625m0 0h4.125m-4.125 0H9.375c-.621 0-1.125.504-1.125 1.125v5.625M6.75 18v-1.875c0-.621.504-1.125 1.125-1.125h1.875M18 12v5.25A2.25 2.25 0 0115.75 19.5H8.25A2.25 2.25 0 016 17.25V12"
              />
            </svg>
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              Keine Rechnungen vorhanden
            </h2>
            <p className="text-gray-500">
              Rechnungsgutschriften werden automatisch generiert, wenn Trainings abgeschlossen sind.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rechnungsnummer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kurs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Betrag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Erstellt
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {credits.map((credit) => (
                  <tr key={credit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {credit.invoiceNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{credit.courseTitle}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatAmount(credit.amount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          credit.status
                        )}`}
                      >
                        {getStatusText(credit.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(credit.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {credit.status !== 'pending' && credit.downloadUrl && (
                        <button
                          onClick={() => downloadCredit(credit.invoiceNumber)}
                          className="text-primary-600 hover:text-primary-900 flex items-center"
                        >
                          <svg
                            className="w-4 h-4 mr-1"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                            />
                          </svg>
                          Download
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Informationen zu Rechnungen
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Rechnungsgutschriften werden automatisch generiert, nachdem ein Training erfolgreich abgeschlossen wurde.
                Sie können die PDFs hier herunterladen und für Ihre Unterlagen verwenden.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 