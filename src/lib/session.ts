import Cookies from 'js-cookie';

/**
 * Session Management Module
 * 
 * This module uses Cookies as the primary storage mechanism for session data.
 * Cookies are preferred over localStorage/sessionStorage because:
 * - They support server-side rendering (SSR) in Next.js
 * - They can be accessed on both client and server
 * - They support httpOnly flag for enhanced security
 * - They work better with SSR/SSG patterns
 * 
 * All components should use the helper functions (getTrainerData, getCompanyData, getUserData, etc.)
 * instead of directly accessing cookies.
 */

export type AuthSession = {
  token: string;
  instructorId: number;
};

const TOKEN_KEY = "mr_token";
const INSTRUCTOR_ID_KEY = "mr_instructor_id";
const TRAINER_DATA_KEY = "trainer_data";
const COMPANY_DATA_KEY = "company_data";

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;

  Cookies.set(TOKEN_KEY, session.token, {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  Cookies.set(INSTRUCTOR_ID_KEY, String(session.instructorId), {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

export function saveTrainerData(trainerData: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const dataString = JSON.stringify(trainerData);
  
  Cookies.set(TRAINER_DATA_KEY, dataString, {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

export function saveCompanyData(companyData: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const dataString = JSON.stringify(companyData);
  
  Cookies.set(COMPANY_DATA_KEY, dataString, {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(INSTRUCTOR_ID_KEY);
  Cookies.remove(TRAINER_DATA_KEY);
  Cookies.remove(COMPANY_DATA_KEY);
  // Clean up any old localStorage data that might exist
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(INSTRUCTOR_ID_KEY);
  localStorage.removeItem("trainer");
  localStorage.removeItem("trainer_data");
  localStorage.removeItem("company_data");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get(TOKEN_KEY) || null;
}

export function getInstructorId(): number | null {
  if (typeof window === "undefined") return null;
  const cookieId = Cookies.get(INSTRUCTOR_ID_KEY);
  return cookieId ? Number(cookieId) : null;
}

export function getTrainerData(): Record<string, unknown> | null {
  if (typeof window === "undefined") {
    // Server-side: try to get from cookies using Next.js cookies API
    try {
      const { cookies } = require('next/headers');
      const cookieStore = cookies();

      const cookieData = cookieStore.get(TRAINER_DATA_KEY)?.value;
      if (cookieData) {
        try {
          return JSON.parse(cookieData);
        } catch {
          return null;
        }
      }
    } catch (error) {
      // Cookies API might not be available in this context
      console.warn('Could not access cookies on server side:', error);
      return null;
    }
    return null;
  }

  // Client-side: use browser APIs
  const cookieData = Cookies.get(TRAINER_DATA_KEY);
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch {
      return null;
    }
  }

  return null;
}

export function getCompanyData(): Record<string, unknown> | null {
  if (typeof window === "undefined") {
    // Server-side: try to get from cookies using Next.js cookies API
    try {
      const { cookies } = require('next/headers');
      const cookieStore = cookies();

      const cookieData = cookieStore.get(COMPANY_DATA_KEY)?.value;
      if (cookieData) {
        try {
          return JSON.parse(cookieData);
        } catch {
          return null;
        }
      }
    } catch (error) {
      // Cookies API might not be available in this context
      console.warn('Could not access cookies on server side:', error);
      return null;
    }
    return null;
  }

  // Client-side: use browser APIs
  const cookieData = Cookies.get(COMPANY_DATA_KEY);
  if (cookieData) {
    try {
      return JSON.parse(cookieData);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Unified function to get current user data (trainer or company)
 * Returns the user data regardless of type, or null if no user is logged in
 */
export function getUserData(): Record<string, unknown> | null {
  const trainerData = getTrainerData();
  if (trainerData) return trainerData;
  
  const companyData = getCompanyData();
  if (companyData) return companyData;
  
  return null;
}

/**
 * Get the current user type ('TRAINER' | 'TRAINING_COMPANY' | null)
 */
export function getUserType(): 'TRAINER' | 'TRAINING_COMPANY' | null {
  const user = getUserData();
  if (!user) return null;
  
  return (user.userType as 'TRAINER' | 'TRAINING_COMPANY') || null;
}

