"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrainerData } from "@/lib/session";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const userData = getTrainerData();

    if (userData) {
      // User is authenticated, redirect to dashboard
      router.push("/dashboard");
    }
  }, [router]);

  // Show loading state while checking authentication
  const userData = getTrainerData();

  if (userData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Trainerportal</h1>
          <p className="text-gray-600">Weiterleitung zum Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            TRAINER<span className="text-primary-600">PORTAL</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Die Plattform für Trainer und Schulungsunternehmen.
            Finden Sie qualifizierte Trainer oder bieten Sie Ihre Dienstleistungen an.
          </p>
        </header>

        {/* User Type Selection */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-16">
          {/* Trainer Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Für Trainer</h3>
            <p className="text-gray-600 mb-6">
              Erstellen Sie Ihr Profil, zeigen Sie Ihre Expertise und finden Sie neue Aufträge von Schulungsunternehmen.
            </p>
            <Link
              href="/register/trainer"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Als Trainer registrieren
            </Link>
          </div>

          {/* Training Company Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Für Unternehmen</h3>
            <p className="text-gray-600 mb-6">
              Finden Sie qualifizierte Trainer für Ihre Schulungsbedürfnisse. Durchsuchen Sie unser Trainer-Netzwerk.
            </p>
            <Link
              href="/register/company"
              className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Als Unternehmen registrieren
            </Link>
          </div>
        </div>

        {/* Login Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Bereits registriert?
          </p>
          <Link
            href="/register?mode=login"
            className="inline-block bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Jetzt anmelden
          </Link>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500">
          <p>&copy; 2025 Trainerportal. Alle Rechte vorbehalten.</p>
        </footer>
      </div>
    </div>
  );
}
