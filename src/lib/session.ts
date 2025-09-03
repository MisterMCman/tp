import Cookies from 'js-cookie';

export type AuthSession = {
  token: string;
  instructorId: number;
};

const TOKEN_KEY = "mr_token";
const INSTRUCTOR_ID_KEY = "mr_instructor_id";
const TRAINER_DATA_KEY = "trainer_data";

export function saveSession(session: AuthSession): void {
  if (typeof window === "undefined") return;

  // Set cookies with 7 days expiration
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

  Cookies.set(TRAINER_DATA_KEY, JSON.stringify(trainerData), {
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
  // Also clear localStorage for backward compatibility
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(INSTRUCTOR_ID_KEY);
  localStorage.removeItem("trainer");
  localStorage.removeItem("trainer_data");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
}

export function getInstructorId(): number | null {
  if (typeof window === "undefined") return null;
  const cookieId = Cookies.get(INSTRUCTOR_ID_KEY);
  if (cookieId) return Number(cookieId);

  // Fallback to localStorage
  const localId = localStorage.getItem(INSTRUCTOR_ID_KEY);
  return localId ? Number(localId) : null;
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

  // Fallback to localStorage
  const localData = localStorage.getItem("trainer_data");
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch {
      return null;
    }
  }

  return null;
}


