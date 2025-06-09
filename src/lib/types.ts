// Shared types for the Trainer Portal application

export interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  bio?: string;
  profilePicture?: string;
  bankDetails?: string;
  taxId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: number;
  name: string;
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

export interface Inquiry {
  id: number;
  trainerId: number;
  eventId: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'ABGESAGT';
  originalPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  message: string;
  createdAt: string;
  updatedAt: string;
  trainer?: Trainer;
  event?: Event;
}

export interface Invoice {
  id: number;
  inquiryId: number;
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

// Form types
export interface TrainerRegistrationForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  bio: string;
  topics: string[];
}

export interface BankDetails {
  accountHolder: string;
  iban: string;
  bic: string;
  bankName: string;
} 