"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// Define trainer type
interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  topics: string[];
  bio?: string;
  profilePicture?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      // Check for token in URL
      const token = searchParams.get("token");
      
      if (token) {
        // Verify token
        await verifyToken(token);
      } else {
        // If no token, try to get trainer data from localStorage
        const storedTrainer = localStorage.getItem("trainer");
        
        if (storedTrainer) {
          setTrainer(JSON.parse(storedTrainer));
          setLoading(false);
        } else {
          // If no trainer data, redirect to login page
          router.push("/register");
        }
      }
    };
    
    checkAuth();
  }, [router, searchParams]);

  // Function to verify token
  const verifyToken = async (token: string) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          action: "verify-token", 
          token: token
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store trainer data in localStorage
        localStorage.setItem("trainer", JSON.stringify(data.trainer));
        setTrainer(data.trainer);
        
        // Remove token from URL to prevent multiple verification attempts on refresh
        // Use setTimeout to ensure this runs after the component updates
        setTimeout(() => {
          router.replace("/dashboard");
        }, 100);
      } else {
        // Display error message and redirect to login page
        console.error("Token verification failed:", data.message);
        alert(`Fehler: ${data.message || "Token-Verifizierung fehlgeschlagen"}`);
        router.push("/register");
      }
    } catch (error) {
      console.error("Error during token verification:", error);
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      router.push("/register");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laden...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">Trainer Portal</h2>
          <p className="text-sm text-gray-600 mt-1">
            {trainer?.firstName} {trainer?.lastName}
          </p>
        </div>
        <nav className="mt-6">
          <Link
            href="/dashboard"
            className="flex items-center px-6 py-3 hover:bg-gray-100 border-l-4 border-transparent hover:border-primary-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-gray-600"
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
            Dashboard
          </Link>
          <Link
            href="/dashboard/profile"
            className="flex items-center px-6 py-3 hover:bg-gray-100 border-l-4 border-transparent hover:border-primary-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-gray-600"
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
            Profil bearbeiten
          </Link>
          <Link
            href="/dashboard/trainings"
            className="flex items-center px-6 py-3 hover:bg-gray-100 border-l-4 border-transparent hover:border-primary-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-gray-600"
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
            Meine Trainings
          </Link>
          <Link
            href="/dashboard/requests"
            className="flex items-center px-6 py-3 hover:bg-gray-100 border-l-4 border-transparent hover:border-primary-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Trainingsanfragen
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200">
          <button
            onClick={() => {
              localStorage.removeItem("trainer");
              router.push("/register");
            }}
            className="flex items-center px-6 py-3 hover:bg-gray-100 w-full text-left"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-3 text-gray-600"
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
            Abmelden
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