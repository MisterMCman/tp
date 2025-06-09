"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Zustand für Login/Registrierung
  const [isRegistering, setIsRegistering] = useState(true);

  // Zustände für Registrierungsdaten
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
    profilePicture: "",
    topics: [] as string[], // List of selected topic names
  });

  // Zustände für Login-Daten
  const [loginData, setLoginData] = useState({
    email: "",
  });

  // Zustand für Login-Status
  const [loginLinkSent, setLoginLinkSent] = useState(false);
  const [loginLink, setLoginLink] = useState("");

  // Zustände für Themen-Suche
  const [topicSearch, setTopicSearch] = useState(""); // Eingabe des Trainers
  const [topicSuggestions, setTopicSuggestions] = useState<{ id: number; name: string }[]>([]);// Vorschläge aus der Datenbank

  // Ladezustand
  const [loading, setLoading] = useState(false);

  // Check for token in URL on component mount
  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      // Verify token
      verifyToken(token);
    }
  }, [searchParams]);

  // Function to verify token
  const verifyToken = async (token: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "verify-token", token }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Store trainer data in localStorage
        localStorage.setItem("trainer", JSON.stringify(data.trainer));
        
        // Redirect to dashboard
        router.push("/dashboard");
      } else {
        // Display error message
        alert(`Fehler: ${data.message || "Token-Verifizierung fehlgeschlagen"}`);
      }
    } catch (error) {
      console.error("Error during token verification:", error);
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  // Event-Handler für Registrierungsänderungen
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // Themen-Suche und Vorschläge abrufen
  useEffect(() => {
    const fetchTopics = async () => {
      if (topicSearch.trim() === "") {
        setTopicSuggestions([]);
        console.log("Topic search is empty. Suggestions cleared.");
        return;
      }
      console.log(`Fetching topics for query: "${topicSearch}"`);
      try {
        const response = await fetch(`/api/topics?query=${topicSearch}`);
        const data = await response.json();
        console.log("Fetched topics:", data);
        setTopicSuggestions(data || []);
      } catch (error) {
        console.error("Error fetching topic suggestions:", error);
      }
    };

    const debounce = setTimeout(() => fetchTopics(), 300); // Debounce API calls
    return () => clearTimeout(debounce);
  }, [topicSearch]);

  // Thema hinzufügen
  const addTopic = (topicName: string) => {
    console.log(`Adding topic: ${topicName}`);
    if (!formData.topics.includes(topicName)) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, topicName],
      }));
    }
    setTopicSearch('');
    setTopicSuggestions([]);
  };


  // Thema entfernen
  const removeTopic = (topic: string) => {
    console.log(`Removing topic: ${topic}`);
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((t) => t !== topic),
    }));
  };

  // Registrierung absenden
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting registration data:", formData);
    setLoading(true);
    try {
      const response = await fetch("/api/register-trainer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert("Trainer erfolgreich registriert!");
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          address: "",
          bio: "",
          profilePicture: "",
          topics: [],
        });
        
        // Switch to login form after successful registration
        setIsRegistering(false);
        setLoginData({ email: formData.email });
      } else {
        const errorData = await response.json();
        alert(`Fehler: ${errorData.message || "Registrierung fehlgeschlagen"}`);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  // Login absenden - jetzt für Email-Link-Anfrage
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log("Requesting login link for:", loginData.email);
      
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email: loginData.email,
          action: "request-link" 
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        // Show success message
        setLoginLinkSent(true);
        
        // For demonstration purposes, show the link
        // In a real app, this would be sent via email
        if (data.loginLink) {
          setLoginLink(data.loginLink);
        }
      } else {
        // Display error message
        alert(`Fehler: ${data.message || "Login-Link-Anfrage fehlgeschlagen"}`);
      }
    } catch (error) {
      console.error("Error during login link request:", error);
      alert("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient min-h-screen">
      <div className="glassmorphism">
        <h2 className="text-3xl font-bold text-center text-secondary-600 mb-2">
          Trainerportal
        </h2>
        <p className="text-center text-gray-500 mb-8">Registrieren Sie sich als Trainer oder melden Sie sich an</p>
        
        {/* PowerToWork style Toggle Switch */}
        <div className="flex items-center justify-center mb-8">
          <div className="pw-toggle w-64">
            <div 
              className="pw-toggle-slider" 
              style={{ 
                left: isRegistering ? '4px' : 'auto', 
                right: isRegistering ? 'auto' : '4px' 
              }} 
            />
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className={`pw-toggle-button ${isRegistering ? 'text-white' : 'text-gray-600'}`}
            >
              Registrieren
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className={`pw-toggle-button ${!isRegistering ? 'text-white' : 'text-gray-600'}`}
            >
              Einloggen
            </button>
          </div>
        </div>
        
        <form onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit} className="space-y-5">
          {isRegistering ? (
            <>
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
                    Vorname
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
                    Nachname
                  </label>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="E-Mail Adresse"
                  value={formData.email}
                  onChange={handleRegisterChange}
                  className="form-input"
                  required
                />
                <label htmlFor="email" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  E-Mail
                </label>
              </div>
              
              <div className="relative w-1/2">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="Telefon"
                  value={formData.phone}
                  onChange={handleRegisterChange}
                  className="form-input"
                  required
                />
                <label htmlFor="phone" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Telefon
                </label>
              </div>
              
              <div className="relative">
                <textarea
                  name="address"
                  id="address"
                  placeholder="Straße, PLZ Stadt, Land - Für Vertragsunterlagen erforderlich"
                  value={formData.address}
                  onChange={handleRegisterChange}
                  className="form-input min-h-[80px] resize-none"
                  rows={3}
                  required
                />
                <label htmlFor="address" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Adresse *
                </label>
              </div>
              
              <div className="relative">
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Beschreiben Sie Ihre Erfahrung und Expertise..."
                  value={formData.bio}
                  onChange={handleRegisterChange}
                  className="form-input min-h-[100px] resize-none"
                  rows={4}
                />
                <label htmlFor="bio" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Kurzbeschreibung (optional)
                </label>
              </div>
              
              <div className="relative">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="profilePicture"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Klicken Sie zum Hochladen</span> oder ziehen Sie ein Bild hierher
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG oder GIF (MAX. 800x400px)</p>
                    </div>
                    <input
                      id="profilePicture"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file upload here
                          setFormData({ ...formData, profilePicture: URL.createObjectURL(file) });
                        }
                      }}
                    />
                  </label>
                </div>
                <label htmlFor="profilePicture" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Profilfoto
                </label>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  id="topicSearch"
                  placeholder="Python, Marketing, Projektmanagement..."
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  className="form-input pr-10"
                />
                <label htmlFor="topicSearch" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Kompetenzen/Themen
                </label>
                {topicSearch && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                       className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                )}
                
                {topicSuggestions.length > 0 && (
                  <ul className="suggestions-dropdown w-full">
                    {topicSuggestions.map((topic) => (
                      <li
                        key={topic.id}
                        onClick={() => addTopic(topic.name)}
                        className="p-3 hover:bg-primary-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        {topic.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {formData.topics.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.topics.map((topic, index) => (
                    <span
                      key={index}
                      className="selected-topic"
                    >
                      {topic}
                      <button
                        type="button"
                        onClick={() => removeTopic(topic)}
                        className="ml-2 text-white opacity-70 hover:opacity-100"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {loginLinkSent ? (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-green-800 font-medium mb-2">Login-Link wurde angefordert!</h3>
                  <p className="text-green-700 mb-3">
                    Wir haben einen Login-Link an Ihre E-Mail-Adresse gesendet. Bitte prüfen Sie Ihr Postfach und klicken Sie auf den Link, um sich einzuloggen.
                  </p>
                  
                  {/* This is only for demonstration purposes */}
                  {loginLink && (
                    <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
                      <p className="text-sm text-gray-500 mb-1">Für Demonstrationszwecke:</p>
                      <a 
                        href={loginLink} 
                        className="text-primary-600 break-all"
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {loginLink}
                      </a>
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setLoginLinkSent(false);
                      setLoginLink("");
                    }}
                    className="mt-3 text-primary-600 hover:text-primary-800 underline text-sm"
                  >
                    Anderes E-Mail verwenden
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      id="loginEmail"
                      placeholder="E-Mail Adresse"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ email: e.target.value })}
                      className="form-input"
                      required
                    />
                    <label htmlFor="loginEmail" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                      E-Mail
                    </label>
                  </div>
                  
                  <div className="flex justify-end">
                    <button type="button" className="link text-sm">
                      Hilfe benötigt?
                    </button>
                  </div>
                </>
              )}
              
              {!loginLinkSent && (
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
              )}
            </>
          )}
          
          {isRegistering && (
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
                "Registrieren"
              )}
            </button>
          )}
        </form>
        
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
