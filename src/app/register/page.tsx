"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { LoginFormData } from "@/lib/types";

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, ToastManager } = useToast();

  // Check if in login mode
  const isLoginMode = searchParams.get('mode') === 'login';

  // Zustände für Login-Daten
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginMessage(null);
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          action: 'request-link'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login-Link-Anforderung fehlgeschlagen');
      }

      const data = await response.json();

      // Show success message
      setLoginMessage(`Login-Link wurde per E-Mail versendet. Bitte prüfen Sie Ihr E-Mail-Postfach.`);

      // In development mode, also show the link in console for testing
      if (data.loginLink) {
        console.log('Login link (for development):', data.loginLink);
      }

    } catch (err: unknown) {
      console.error("Login error:", err);
      setError((err as Error)?.message || 'Login-Link-Anforderung fehlgeschlagen. Bitte E-Mail-Adresse prüfen.');
      addToast('Login-Link-Anforderung fehlgeschlagen. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Wenn bereits Session vorhanden, direkt weiterleiten
  useEffect(() => {
    const token = localStorage.getItem("mr_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  if (isLoginMode) {
  return (
    <div className="ptw-bg min-h-screen">
        {ToastManager()}
      <div className="ptw-auth-card">
        <h2 className="text-3xl font-bold text-center mb-2">
          TRAINERPORTAL
        </h2>
          <p className="text-center text-gray-600 mb-8 text-sm">
            Melden Sie sich mit Ihrer E-Mail-Adresse an
          </p>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 p-3 text-sm text-red-700 border border-red-200 rounded">{error}</div>
              )}
              {loginMessage && (
                <div className="bg-green-50 p-3 text-sm text-green-700 border border-green-200 rounded">{loginMessage}</div>
              )}

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen sicheren Login-Link per E-Mail.
                </p>
              </div>

              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="loginEmail"
                  placeholder="E-Mail Adresse"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="form-input"
                  required
                />
                <label htmlFor="loginEmail" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  E-Mail
                </label>
              </div>

              <button
                type="submit"
                className="button-style"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Wird gesendet...
                  </span>
                ) : (
                  "Login-Link anfordern"
                )}
              </button>

              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  Kein Passwort mehr nötig! Sie erhalten einen sicheren Link per E-Mail.
                </p>
              <p className="text-xs text-gray-400 mt-2">
                Noch kein Konto?{" "}
                <a href="/register" className="link">
                  Jetzt registrieren
                </a>
              </p>
              </div>
        </form>

          <div className="mt-8 border-t border-gray-200 pt-4">
            <p className="text-center text-sm text-gray-500">
              Mit der Anmeldung akzeptieren Sie unsere{" "}
              <a href="#" className="link">
                Nutzungsbedingungen
              </a>{" "}
              und{" "}
              <a href="#" className="link">
                Datenschutzrichtlinien
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default registration page - redirect to specific registration pages
  return (
    <div className="ptw-bg min-h-screen">
      {ToastManager()}
      <div className="ptw-auth-card">
        <h2 className="text-3xl font-bold text-center mb-2">
          TRAINERPORTAL
        </h2>
        <p className="text-center text-gray-600 mb-8 text-sm">
          Registrieren Sie sich als Trainer oder melden Sie sich an
        </p>

        <div className="space-y-4">
          <a
            href="/register/trainer"
            className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
          >
            Als Trainer registrieren
          </a>
          <a
            href="/register/company"
            className="block w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors text-center font-medium"
          >
            Als Unternehmen registrieren
          </a>
          <a
            href="/register?mode=login"
            className="block w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors text-center font-medium"
          >
            Einloggen
          </a>
        </div>
        
        <div className="mt-8 border-t border-gray-200 pt-4">
          <p className="text-center text-sm text-gray-500">
            Mit der Registrierung akzeptieren Sie unsere{" "}
            <a href="#" className="link">
              Nutzungsbedingungen
            </a>{" "}
            und{" "}
            <a href="#" className="link">
              Datenschutzrichtlinien
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AuthForm() {
  return <AuthFormContent />;
}
