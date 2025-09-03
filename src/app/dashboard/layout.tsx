"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearSession, getTrainerData } from "@/lib/session";
import Link from "next/link";

// Define trainer type
interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  status: string;
  topics?: string[];
  bio?: string;
  profilePicture?: string;
  isCompany?: boolean;
  companyName?: string;
  dailyRate?: number;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // Try to get trainer data from cookies first
        const trainerData = getTrainerData();
        if (trainerData) {
          setTrainer(trainerData as unknown as Trainer);
        } else {
          // Fallback to localStorage for backward compatibility
          const token = localStorage.getItem("mr_token");
          const instructorId = localStorage.getItem("mr_instructor_id");
          if (!token || !instructorId) {
            router.push("/");
            return;
          }
          // Fallback to basic trainer object if no cookie data
          const basicTrainer: Trainer = {
            id: Number(instructorId),
            firstName: "Trainer",
            lastName: "",
            email: "",
            phone: "",
            address: "",
            bio: "",
            profilePicture: "",
            companyName: "",
            isCompany: false,
            dailyRate: undefined,
            status: "ACTIVE",
            topics: [],
          };
          setTrainer(basicTrainer);
        }
      } catch {
        clearSession();
        router.push("/");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laden...</div>;
  }

  return (
    <div className="ptw-dashboard flex h-screen">
      {/* Sidebar */}
      <div className="ptw-sidebar w-64">
        <div className="ptw-sidebar-header">
          <h2 className="font-bold">TRAINER PORTAL</h2>
          <p className="text-sm">
            {trainer?.firstName} {trainer?.lastName}
          </p>
          {trainer?.dailyRate && (
            <p className="text-xs mt-1" style={{ color: 'var(--ptw-accent-primary)' }}>
              €{trainer.dailyRate}/Tag
            </p>
          )}
        </div>
        <nav className="mt-6">
          <Link
            href="/dashboard"
            className={`ptw-nav-item ${pathname === "/dashboard" ? "active" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            DASHBOARD
          </Link>
          <Link
            href="/dashboard/profile"
            className={`ptw-nav-item ${pathname === "/dashboard/profile" ? "active" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            PROFIL
          </Link>
          <Link
            href="/dashboard/trainings"
            className={`ptw-nav-item ${pathname === "/dashboard/trainings" ? "active" : ""}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            TRAININGS
          </Link>
          <Link
            href="/dashboard/requests"
            className={`ptw-nav-item ${pathname === "/dashboard/requests" ? "active" : ""}`}
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.123.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h8.25a2.25 2.25 0 002.25-2.25V6.108a2.25 2.25 0 00-2.25-2.25H15c-1.012 0-1.867.668-2.15 1.586z"
              />
            </svg>
            ANFRAGEN
          </Link>
          <Link
            href="/dashboard/invoices"
            className={`ptw-nav-item ${pathname === "/dashboard/invoices" ? "active" : ""}`}
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            RECHNUNGEN
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 border-t" style={{ borderColor: 'var(--ptw-border-primary)' }}>
          <button
            onClick={() => {
              clearSession();
              router.push("/");
            }}
            className="ptw-nav-item w-full justify-start"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            ABMELDEN
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
} 