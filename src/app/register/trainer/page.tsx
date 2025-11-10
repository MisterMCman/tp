"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { saveTrainerData } from "@/lib/session";
import { useToast } from "@/components/Toast";

function TrainerRegistrationContent() {
  const router = useRouter();
  const { addToast, ToastManager } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Ladezustand
  const [loading, setLoading] = useState(false);

  // Handler für Registrierungs-Änderungen
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler für Registrierungs-Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Register using local API - only firstName, lastName, email
      const registerResponse = await fetch('/api/register-trainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message || errorData.error || 'Registration failed');
      }

      const registerData = await registerResponse.json();

      // Show success message and redirect to login
      setSuccessMessage('Registrierung erfolgreich! Überprüfen Sie Ihre E-Mail für den Login-Link. Nach dem Login müssen Sie Ihr Profil vervollständigen.');
      addToast('Registrierung erfolgreich! Bitte überprüfen Sie Ihre E-Mail.', 'success');

      // Redirect to login page after short delay
      setTimeout(() => {
        router.push('/register');
      }, 3000);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError((err as Error)?.message || 'Registrierung fehlgeschlagen');
      addToast('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Trainer Registrierung</h1>
            <p className="text-gray-600">Erstellen Sie Ihr Trainerprofil und finden Sie neue Aufträge</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Persönliche Informationen</h3>
              <p className="text-sm text-gray-600 mb-4">
                Geben Sie Ihre grundlegenden Informationen ein. Nach der Registrierung und dem ersten Login können Sie Ihr Profil vervollständigen.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    placeholder="Vorname"
                    value={formData.firstName}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="firstName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Vorname *
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    placeholder="Nachname"
                    value={formData.lastName}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="lastName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Nachname *
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="E-Mail-Adresse"
                    value={formData.email}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="email" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    E-Mail-Adresse *
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Registrierung läuft...' : 'Als Trainer registrieren'}
              </button>
            </div>
          </form>

          {/* Back to main page */}
          <div className="text-center mt-6">
            <a href="/" className="text-gray-600 hover:text-gray-800">
              ← Zurück zur Startseite
            </a>
          </div>
        </div>
      </div>
      <ToastManager />
    </div>
  );
}

export default function TrainerRegistration() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center"><div className="text-xl">Laden...</div></div>}>
      <TrainerRegistrationContent />
    </Suspense>
  );
}
