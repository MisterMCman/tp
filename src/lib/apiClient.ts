import { getInstructorId, getToken, clearSession } from "./session";

const DEFAULT_BASE_URL = "https://www.medienreich.de/api/instructorPortal";
const DEFAULT_PROXY_PATH = "/mr";

function getBaseUrl(): string {
  // In the browser, prefer proxy path to avoid CORS
  if (typeof window !== "undefined") {
    const proxyPath = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_PROXY_PATH)
      ? process.env.NEXT_PUBLIC_API_PROXY_PATH!
      : DEFAULT_PROXY_PATH;
    return proxyPath.replace(/\/+$/, "");
  }
  // On the server, call the upstream API directly
  const raw = (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MR_API_BASE_URL)
    ? process.env.NEXT_PUBLIC_MR_API_BASE_URL!
    : DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  formData?: FormData;
  requireAuth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const isAbsolute = /^https?:\/\//i.test(path);
  let target = isAbsolute ? path : `${baseUrl}${path}`;

  if (options.query) {
    const url = new URL(target);
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
    target = url.toString();
  }

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Auth header via bearer token if available
  const token = getToken();
  if (options.requireAuth && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method: options.method || "GET",
    headers,
  };

  if (options.formData) {
    init.body = options.formData;
    // Let browser set proper multipart boundary; do not set Content-Type
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(target, init);

  // If unauthorized, clear session
  if (res.status === 401 || res.status === 403) {
    clearSession();
  }

  // Handle inline PDF (contract download)
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/pdf")) {
    return (await res.blob()) as T;
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON response
  }

  if (!res.ok) {
    const errorMessage = (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string' ? data.message : undefined) || res.statusText;
    throw new Error(String(errorMessage));
  }

  return data as T;
}

// Auth APIs - using local API instead of external ERP
export const apiAuth = {
  register: (payload: {
    salutation: "male" | "female";
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    c_password: string;
  }): Promise<unknown> => {
    // Use local registration API instead of external ERP
    return fetch('/api/register-trainer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json());
  },

  login: (payload: { email: string; password: string }): Promise<unknown> => {
    // Use local login API with token system
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: payload.email, action: 'request-link' })
    }).then(res => res.json());
  },

  forgotPassword: (payload: { email: string }): Promise<unknown> =>
    request<unknown>("/forgot-password", { method: "POST", body: payload }),
};

// Profile APIs
export const apiProfile = {
  get: (id?: number): Promise<Record<string, unknown>> => {
    const instructorId = id ?? getInstructorId();
    if (!instructorId) throw new Error("Missing instructor id");
    return request<Record<string, unknown>>(`/profile/${instructorId}`, { requireAuth: true });
  },
  update: (payload: Record<string, unknown>, id?: number): Promise<Record<string, unknown>> => {
    const instructorId = id ?? getInstructorId();
    if (!instructorId) throw new Error("Missing instructor id");
    return request<Record<string, unknown>>(`/profile/${instructorId}`, {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    });
  },
};

// Email addresses
export const apiEmails = {
  create: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emailaddresses`, { method: "POST", body: payload, requireAuth: true }),
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emailaddresses/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
  delete: (id: number): Promise<void> =>
    request<void>(`/emailaddresses/${id}`, { method: "DELETE", requireAuth: true }),
};

// Phone numbers
export const apiPhones = {
  create: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/phonenumbers`, { method: "POST", body: payload, requireAuth: true }),
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/phonenumbers/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
  delete: (id: number): Promise<void> =>
    request<void>(`/phonenumbers/${id}`, { method: "DELETE", requireAuth: true }),
};

// Post addresses
export const apiAddresses = {
  create: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/postaddresses`, { method: "POST", body: payload, requireAuth: true }),
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/postaddresses/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
  delete: (id: number): Promise<void> =>
    request<void>(`/postaddresses/${id}`, { method: "DELETE", requireAuth: true }),
};

// Areas
export const apiAreas = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/areas/${id}`, { requireAuth: true });
  },
  create: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/areas`, { method: "POST", body: payload, requireAuth: true }),
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/areas/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
  delete: (id: number): Promise<void> =>
    request<void>(`/areas/${id}`, { method: "DELETE", requireAuth: true }),
};

// Absences
export const apiAbsences = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/absences/${id}`, { requireAuth: true });
  },
  create: (payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/absences`, { method: "POST", body: payload, requireAuth: true }),
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/absences/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
  delete: (id: number): Promise<void> =>
    request<void>(`/absences/${id}`, { method: "DELETE", requireAuth: true }),
};

// Skills
export const apiSkills = {
  listAll: (): Promise<Record<string, unknown>> => {
    // In the browser, use same-origin proxy to avoid CORS
    if (typeof window !== "undefined") {
      return request<Record<string, unknown>>("/mr-all-skills", { requireAuth: true });
    }
    const allSkillsUrl =
      (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MR_ALL_SKILLS_URL)
        ? process.env.NEXT_PUBLIC_MR_ALL_SKILLS_URL
        : "https://www.medienreich.com/api/instructorPortal/all_skills";
    return request<Record<string, unknown>>(allSkillsUrl, { requireAuth: true });
  },
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/skills/${id}`, { requireAuth: true });
  },
  update: (id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/skills/${id}`, { method: "PATCH", body: payload, requireAuth: true }),
};

// Requested events
export const apiRequestedEvents = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/requested_events/${id}`, { requireAuth: true });
  },
  get: (eventId: number): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/requested_events/event/${eventId}`, { requireAuth: true }),
  sendDecision: (eventId: number, instructorId?: number, payload?: { state_key: "request-accepted" | "request-declined" | "counteroffer-sent"; instructor_fee?: number; instructor_expenses?: number }): Promise<Record<string, unknown>> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>>(`/events/event/${eventId}/instructor/${id}/send_request_decision`, {
      method: "PATCH",
      body: payload,
      requireAuth: true,
    });
  },
};

// Events
export const apiEvents = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/events/${id}`, { requireAuth: true });
  },
  get: (eventId: number): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/events/event/${eventId}`, { requireAuth: true }),
  downloadContract: async (eventId: number, instructorId?: number): Promise<Blob> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    const blob = await request<Blob>(`/events/event/${eventId}/instructor/${id}/download_contract`, { requireAuth: true });
    return blob;
  },
  updateIndividualContents: (eventId: number, payload: { individual_contents: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/events/event/${eventId}/update_individual_contents`, { method: "PATCH", body: payload, requireAuth: true }),
  uploadInvoice: (eventId: number, pdfFile: File): Promise<Record<string, unknown>> => {
    const formData = new FormData();
    formData.append("file", pdfFile);
    return request<Record<string, unknown>>(`/events/event/${eventId}/upload_invoice`, { method: "POST", formData, requireAuth: true });
  },
  updateParticipant: (participantId: number, payload: { salutation?: string; title?: string; first_name?: string; last_name?: string }): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/events/event/update_participant/${participantId}`, { method: "PATCH", body: payload, requireAuth: true }),
};

// Ratings
export const apiRatings = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/instructor/${id}/ratings`, { requireAuth: true });
  },
};

// Emails
export const apiMail = {
  list: (instructorId?: number): Promise<Record<string, unknown>[]> => {
    const id = instructorId ?? getInstructorId();
    if (!id) throw new Error("Missing instructor id");
    return request<Record<string, unknown>[]>(`/emails/${id}`, { requireAuth: true });
  },
  get: (emailId: number): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emails/email/${emailId}`, { requireAuth: true }),
  markRead: (emailId: number, isRead: boolean): Promise<Record<string, unknown>> =>
    request<Record<string, unknown>>(`/emails/email/${emailId}`, { method: "PATCH", body: { is_read: isRead }, requireAuth: true }),
};

export { request };


