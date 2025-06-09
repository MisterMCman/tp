"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  status: string;
  topics: string[];
  bio?: string;
  profilePicture?: string;
  bankDetails?: {
    accountHolder: string;
    iban: string;
    bic: string;
    bankName: string;
  };
  taxId?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // For topic functionality
  const [topicSearch, setTopicSearch] = useState("");
  const [topicSuggestions, setTopicSuggestions] = useState<{id: number; name: string}[]>([]);



  useEffect(() => {
    const fetchTrainerData = async () => {
      try {
        setLoading(true);
        
        // Get trainer ID from localStorage
        const storedTrainer = localStorage.getItem("trainer");
        if (!storedTrainer) {
          setLoading(false);
          return;
        }
        
        const localTrainer = JSON.parse(storedTrainer);
        
        // Fetch fresh data from database
        const response = await fetch(`/api/trainer/${localTrainer.id}`);
        
        if (response.ok) {
          const freshTrainerData = await response.json();
          setTrainer(freshTrainerData);
          
          // Update localStorage with fresh data
          localStorage.setItem("trainer", JSON.stringify(freshTrainerData));
        } else {
          // Fallback to localStorage data if API fails
          setTrainer(localTrainer);
        }
      } catch (error) {
        console.error('Error fetching trainer data:', error);
        
        // Fallback to localStorage data
        const storedTrainer = localStorage.getItem("trainer");
        if (storedTrainer) {
          setTrainer(JSON.parse(storedTrainer));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTrainerData();
  }, []);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!trainer) return;
    
    setTrainer({
      ...trainer,
      [e.target.name]: e.target.value,
    });
  };

  // Handle bank details changes
  const handleBankDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!trainer) return;
    
    const { name, value } = e.target;
    setTrainer({
      ...trainer,
      bankDetails: {
        accountHolder: trainer.bankDetails?.accountHolder || "",
        iban: trainer.bankDetails?.iban || "",
        bic: trainer.bankDetails?.bic || "",
        bankName: trainer.bankDetails?.bankName || "",
        [name]: value,
      },
    });
  };

  // Topic search functionality
  useEffect(() => {
    const fetchTopics = async () => {
      if (topicSearch.trim() === "") {
        setTopicSuggestions([]);
        return;
      }
      try {
        const response = await fetch(`/api/topics?query=${topicSearch}`);
        const data = await response.json();
        setTopicSuggestions(data || []);
      } catch (error) {
        console.error("Error fetching topic suggestions:", error);
      }
    };

    const debounce = setTimeout(() => fetchTopics(), 300);
    return () => clearTimeout(debounce);
  }, [topicSearch]);

  // Add topic
  const addTopic = (topicName: string) => {
    if (!trainer) return;
    
    if (!trainer.topics.includes(topicName)) {
      setTrainer({
        ...trainer,
        topics: [...trainer.topics, topicName],
      });
    }
    setTopicSearch('');
    setTopicSuggestions([]);
  };

  // Remove topic
  const removeTopic = (topic: string) => {
    if (!trainer) return;
    
    setTrainer({
      ...trainer,
      topics: trainer.topics.filter((t) => t !== topic),
    });
  };

  // Handle profile picture upload
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && trainer) {
      // In a real app, you would upload the file to a server
      // For now, we'll use a data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setTrainer({
          ...trainer,
          profilePicture: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainer) return;

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      // Update trainer data via API
      const response = await fetch(`/api/trainer/${trainer.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trainer),
      });

      if (response.ok) {
        const updatedTrainer = await response.json();
        setTrainer(updatedTrainer);
        
        // Update localStorage with fresh data
        localStorage.setItem("trainer", JSON.stringify(updatedTrainer));
        
        setMessage({
          text: "Profil erfolgreich aktualisiert!",
          type: "success",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        text: "Fehler beim Aktualisieren des Profils. Bitte versuchen Sie es erneut.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Laden...</div>;
  }

  if (!trainer) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500 mb-4">Trainer-Daten nicht gefunden. Bitte loggen Sie sich erneut ein.</p>
        <button
          onClick={() => router.push("/register")}
          className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600"
        >
          Zum Login
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profil bearbeiten</h1>
      
      {message.text && (
        <div 
          className={`p-4 mb-6 rounded-md ${
            message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="shrink-0">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
              {trainer.profilePicture ? (
                <img 
                  src={trainer.profilePicture} 
                  alt={`${trainer.firstName} ${trainer.lastName}`} 
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-12 w-12" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1} 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profilbild
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
          </div>
        </div>
      
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <input
              type="text"
              name="firstName"
              id="firstName"
              placeholder="Vorname"
              value={trainer.firstName}
              onChange={handleChange}
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
              value={trainer.lastName}
              onChange={handleChange}
              className="form-input"
              required
            />
            <label htmlFor="lastName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              Nachname
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="relative">
            <input
              type="email"
              name="email"
              id="email"
              placeholder="E-Mail Adresse"
              value={trainer.email}
              onChange={handleChange}
              className="form-input"
              required
            />
            <label htmlFor="email" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              E-Mail
            </label>
          </div>
          
          <div className="relative">
            <input
              type="tel"
              name="phone"
              id="phone"
              placeholder="Telefon"
              value={trainer.phone}
              onChange={handleChange}
              className="form-input"
              required
            />
            <label htmlFor="phone" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              Telefon
            </label>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <textarea
              name="bio"
              id="bio"
              placeholder="Beschreiben Sie Ihre Erfahrung und Expertise..."
              value={trainer.bio || ""}
              onChange={handleChange}
              className="form-input min-h-[100px] resize-none"
              rows={4}
            />
            <label htmlFor="bio" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              Kurzbeschreibung (optional)
            </label>
          </div>
        </div>
        
        <div className="mb-6">
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
              Kompetenzen/Themen hinzufügen
            </label>
            {topicSearch && (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" 
                   className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            )}
            
            {topicSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg max-h-60 overflow-auto border">
                {topicSuggestions.map((topic) => (
                  <li
                    key={topic.id}
                    onClick={() => addTopic(topic.name)}
                    className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    {topic.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {trainer.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {trainer.topics.map((topic, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                >
                  {topic}
                  <button
                    type="button"
                    onClick={() => removeTopic(topic)}
                    className="ml-1.5 text-primary-600 hover:text-primary-900"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Address Section */}
        <div className="mb-6">
          <div className="relative">
            <textarea
              name="address"
              id="address"
              placeholder="Straße, PLZ Stadt, Land - Für Vertragsunterlagen erforderlich"
              value={trainer.address || ""}
              onChange={handleChange}
              className="form-input min-h-[80px] resize-none"
              rows={3}
            />
            <label htmlFor="address" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              Adresse
            </label>
          </div>
        </div>
        
        {/* Tax ID Section */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              name="taxId"
              id="taxId"
              placeholder="Steuernummer (optional)"
              value={trainer.taxId || ""}
              onChange={handleChange}
              className="form-input"
            />
            <label htmlFor="taxId" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
              Steuernummer (optional)
            </label>
          </div>
        </div>
        
        {/* Bank Details Section */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bankverbindung</h3>
          <p className="text-sm text-gray-500 mb-4">
            Diese Informationen werden für die automatische Generierung von Rechnungsgutschriften benötigt.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative">
              <input
                type="text"
                name="accountHolder"
                id="accountHolder"
                placeholder="Kontoinhaber"
                value={trainer.bankDetails?.accountHolder || ""}
                onChange={handleBankDetailsChange}
                className="form-input"
                required
              />
              <label htmlFor="accountHolder" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                Kontoinhaber *
              </label>
            </div>
            
            <div className="relative">
              <input
                type="text"
                name="bankName"
                id="bankName"
                placeholder="Name der Bank"
                value={trainer.bankDetails?.bankName || ""}
                onChange={handleBankDetailsChange}
                className="form-input"
                required
              />
              <label htmlFor="bankName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                Bank *
              </label>
            </div>
            
            <div className="relative">
              <input
                type="text"
                name="iban"
                id="iban"
                placeholder="DE89370400440532013000"
                value={trainer.bankDetails?.iban || ""}
                onChange={handleBankDetailsChange}
                className="form-input"
                required
              />
              <label htmlFor="iban" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                IBAN *
              </label>
            </div>
            
            <div className="relative">
              <input
                type="text"
                name="bic"
                id="bic"
                placeholder="COBADEFFXXX"
                value={trainer.bankDetails?.bic || ""}
                onChange={handleBankDetailsChange}
                className="form-input"
                required
              />
              <label htmlFor="bic" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                BIC *
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Speichern...
              </span>
            ) : (
              "Speichern"
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 