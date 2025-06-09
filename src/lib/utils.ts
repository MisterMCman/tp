// Utility functions for the Trainer Portal application

/**
 * Format date to German locale
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

/**
 * Format time to German locale
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format date and time to German locale
 */
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

/**
 * Format currency to EUR
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
};

/**
 * Get status label in German
 */
export const getStatusLabel = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': 'Ausstehend',
    'accepted': 'Angenommen',
    'rejected': 'Abgelehnt',
    'completed': 'Abgeschlossen',
    'abgesagt': 'Abgesagt',
    'confirmed': 'Bestätigt',
    'canceled': 'Storniert'
  };
  return statusMap[status.toLowerCase()] || status;
};

/**
 * Get status CSS classes for styling
 */
export const getStatusClass = (status: string): string => {
  const statusClasses: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'accepted': 'bg-green-100 text-green-800',
    'rejected': 'bg-red-100 text-red-800',
    'completed': 'bg-blue-100 text-blue-800',
    'abgesagt': 'bg-red-100 text-red-800',
    'confirmed': 'bg-green-100 text-green-800',
    'canceled': 'bg-red-100 text-red-800'
  };
  return statusClasses[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

/**
 * Calculate duration between two dates in hours
 */
export const calculateDurationHours = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffInMs = end.getTime() - start.getTime();
  return Math.round(diffInMs / (1000 * 60 * 60));
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate German phone number format
 */
export const isValidGermanPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+49|0)[1-9][0-9]{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Format German phone number
 */
export const formatGermanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+49')) {
    return cleaned.replace('+49', '+49 ').replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  if (cleaned.startsWith('0')) {
    return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
};

/**
 * Generate unique invoice number
 */
export const generateInvoiceNumber = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = now.getTime().toString().slice(-6);
  return `INV-${year}${month}-${timestamp}`;
};

/**
 * Generate calendar event (.ics) content
 */
export const generateICSContent = (
  title: string,
  description: string,
  location: string,
  startDate: string,
  endDate: string,
  uid?: string
): string => {
  const formatIcsDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().replace(/-|:|\.\d+/g, "").slice(0, 15) + "Z";
  };
  
  const startFormatted = formatIcsDate(startDate);
  const endFormatted = formatIcsDate(endDate);
  const now = formatIcsDate(new Date().toISOString());
  const eventUid = uid || `training-${Date.now()}@trainerportal.de`;
  
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrainerPortal//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${eventUid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startFormatted}`,
    `DTEND:${endFormatted}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
    `LOCATION:${location}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
};

/**
 * Download file with given content and filename
 */
export const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain'): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Get trainer full name
 */
export const getTrainerFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`;
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}; 