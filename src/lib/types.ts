// Shared types for the Trainer Portal application

export interface Country {
  id: number;
  name: string;
  code: string;
  phoneCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trainer {
  id: number;
  userType?: 'TRAINER' | 'TRAINING_COMPANY';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  bio?: string;
  profilePicture?: string;
  iban?: string;
  taxId?: string;
  companyName?: string;
  isCompany?: boolean;
  dailyRate?: number;
  status: 'ACTIVE' | 'INACTIVE';
  countryId?: number;
  country?: Country;
  createdAt: string;
  updatedAt: string;
  topics?: string[];
  topicSuggestions?: TopicSuggestion[];
}

export interface TrainingCompany {
  id: number;
  userType?: 'TRAINER' | 'TRAINING_COMPANY';
  companyName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  domain?: string;
  bio?: string;
  logo?: string;
  website?: string;
  industry?: string;
  employees?: string;
  consultantName?: string;
  vatId?: string;
  billingEmail?: string;
  billingNotes?: string;
  tags?: string;
  onboardingStatus?: string;
  status: 'ACTIVE' | 'INACTIVE';
  countryId?: number;
  country?: Country;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: number;
  name: string;
}

export interface TopicSuggestion {
  id: number;
  name: string;
  trainerId: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  trainer?: Trainer;
}

export interface Course {
  id: number;
  title: string;
  description?: string;
  topicId?: number;
  topic?: Topic;
  state: string;
}

export interface Event {
  id: number;
  courseId: number;
  course?: Course;
  title: string;
  date: string;
  endTime: string;
  location: string;
  participants: number;
}

export interface Training {
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

export interface TrainingRequest {
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
  message: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}


export interface Invoice {
  id: number;
  trainingRequestId: number;
  invoiceNumber: string;
  amount: number;
  issuedDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  createdAt: string;
  updatedAt: string;
}

// Dashboard specific types
export interface DashboardData {
  upcomingTrainings: Training[];
  pendingRequests: number;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterResponse {
  message: string;
  trainer: Trainer;
}

export interface LoginResponse {
  message: string;
  trainer: Trainer;
  loginLink?: string; // Only in development
}

export interface TokenVerificationResponse {
  message: string;
  trainer: Trainer;
}

export interface TrainerProfileVersion {
  id: number;
  trainerId: number;
  version: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  bio?: string;
  profilePicture?: string;
  iban?: string;
  taxId?: string;
  companyName?: string;
  isCompany?: boolean;
  dailyRate?: number;
  changedFields: string; // JSON string
  changedBy: string; // 'trainer' or 'admin'
  createdAt: string;
}

// Form types
export interface TrainerRegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber?: string;
  zipCode: string;
  city: string;
  bio: string;
  topics: string[];
  isCompany?: boolean;
  companyName?: string;
  dailyRate?: number;
}

export interface LoginFormData {
  email: string;
}

export interface RegistrationFormData {
  salutation: "male" | "female";
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneType: "mobile" | "landline";
  street: string;
  zip: string;
  city: string;
  addressLine2: string;
  countryId?: number;
  isVisitorAddress: boolean;
  isInvoiceAddress: boolean;
  isDeliveryAddress: boolean;
  isHeadquarterAddress: boolean;
  bio: string;
  topics: string[];
  isCompany: boolean;
  companyName: string;
  dailyRate?: number;
}

export interface TrainerProfileUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  bio?: string;
  profilePicture?: string;
  iban?: string;
  taxId?: string;
  companyName?: string;
  isCompany?: boolean;
  dailyRate?: number;
}

export interface BankDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
}

export interface FileAttachment {
  id: number;
  trainingRequestMessageId: number;
  filename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface TrainingRequestMessage {
  id: number;
  trainingRequestId: number;
  trainingRequest?: TrainingRequest;
  senderId: number;
  senderType: 'TRAINER' | 'TRAINING_COMPANY';
  recipientId: number;
  recipientType: 'TRAINER' | 'TRAINING_COMPANY';
  subject: string;
  message: string;
  isRead: boolean;
  attachments?: FileAttachment[];
  createdAt: string;
  updatedAt: string;
  sender?: Trainer | TrainingCompany;
  recipient?: Trainer | TrainingCompany;
} 