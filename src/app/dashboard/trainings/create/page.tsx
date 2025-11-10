"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/session";
import Link from "next/link";

interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dailyRate: number;
  profilePicture?: string;
  topics: string[];
  bio?: string;
}

interface Topic {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
  type: 'ONLINE' | 'PHYSICAL';
  onlinePlatform?: string;
  onlineLink?: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  countryId?: number;
  country?: { id: number; name: string; code: string };
}

interface TrainingFormData {
  title: string;
  topicId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  type: 'ONLINE' | 'HYBRID' | 'VOR_ORT';
  locationId?: string; // ID of existing location (if selected)
  // For ONLINE locations (when creating new)
  onlinePlatform?: string; // 'ZOOM', 'TEAMS', 'GOOGLE_MEET', 'OTHER'
  onlineLink?: string;
  // For PHYSICAL locations (when creating new)
  locationName?: string; // Name of the physical location
  locationStreet?: string;
  locationHouseNumber?: string;
  locationZipCode?: string;
  locationCity?: string;
  locationCountryId?: string;
  participants: string;
  dailyRate: string;
  description: string;
  selectedTrainers: number[];
}

export default function CreateTrainingPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [availableTrainers, setAvailableTrainers] = useState<Trainer[]>([]);
  const [filteredTrainers, setFilteredTrainers] = useState<Trainer[]>([]);
  const [showTrainerSelection, setShowTrainerSelection] = useState(false);

  // Topic search state
  const [topicSearchTerm, setTopicSearchTerm] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState<Topic[]>([]);
  const [showTopicSuggestions, setShowTopicSuggestions] = useState(false);

  const [formData, setFormData] = useState<TrainingFormData>({
    title: '',
    topicId: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    type: 'ONLINE',
    locationId: '',
    onlinePlatform: 'ZOOM',
    onlineLink: '',
    locationName: '',
    locationStreet: '',
    locationHouseNumber: '',
    locationZipCode: '',
    locationCity: '',
    locationCountryId: '',
    participants: '',
    dailyRate: '',
    description: '',
    selectedTrainers: []
  });
  const [countries, setCountries] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [useExistingLocation, setUseExistingLocation] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and is a company
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      router.push('/dashboard');
      return;
    }

    setUser(currentUser);
    loadTopics();
    loadCountries();
    loadLocations();
    setLoading(false);
  }, [router]);

  const loadCountries = async () => {
    try {
      const response = await fetch('/api/countries');
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    // Filter trainers when topic changes
    if (formData.topicId && formData.topicId !== '0') {
      filterTrainersByTopic(formData.topicId);
    } else {
      setFilteredTrainers([]);
    }
  }, [formData.topicId]);

  const loadTopics = async () => {
    try {
      const response = await fetch('/api/topics?all=true');
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
    }
  };

  const filterTrainersByTopic = async (topicId: string) => {
    try {
      const response = await fetch(`/api/trainers/search?topicId=${topicId}&status=ACTIVE`);
      if (response.ok) {
        const data = await response.json();
        const trainers = Array.isArray(data.trainers) ? data.trainers : [];
        setAvailableTrainers(trainers);
        setFilteredTrainers(trainers);
      } else {
        // If API fails, set empty arrays
        setAvailableTrainers([]);
        setFilteredTrainers([]);
      }
    } catch (error) {
      console.error('Error loading trainers:', error);
      // Set empty arrays on error
      setAvailableTrainers([]);
      setFilteredTrainers([]);
    }
  };

  const handleTopicSearch = async (term: string) => {
    setTopicSearchTerm(term);

    if (term.length < 3) {
      setTopicSuggestions([]);
      setShowTopicSuggestions(false);
      return;
    }

    try {
      // First try to get topic suggestions
      const response = await fetch('/api/trainers/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: term })
      });

      if (response.ok) {
        const data = await response.json();
        // The API returns topics array with suggestions
        const apiTopics = data.topics || [];
        const filteredTopics = apiTopics
          .filter((topic: any) => topic && topic.name && topic.name.toLowerCase().includes(term.toLowerCase()))
          .slice(0, 10);

        setTopicSuggestions(filteredTopics);
        setShowTopicSuggestions(filteredTopics.length > 0);
      } else {
        // Fallback to searching all topics
        const filteredTopics = topics
          .filter(topic => topic.name.toLowerCase().includes(term.toLowerCase()))
          .slice(0, 10);

        setTopicSuggestions(filteredTopics);
        setShowTopicSuggestions(filteredTopics.length > 0);
      }
    } catch (error) {
      console.error('Error searching topics:', error);
      // Fallback to local search
      const filteredTopics = topics
        .filter(topic => topic.name.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 10);

      setTopicSuggestions(filteredTopics);
      setShowTopicSuggestions(filteredTopics.length > 0);
    }
  };

  const selectTopic = (topic: Topic) => {
    setFormData(prev => ({
      ...prev,
      topicId: topic.id.toString()
    }));
    setTopicSearchTerm(topic.name);
    setShowTopicSuggestions(false);

    // Filter trainers by selected topic if it has an ID
    if (topic.id && topic.id > 0) {
      filterTrainersByTopic(topic.id.toString());
    } else {
      // If it's a new topic suggestion, clear trainer list for now
      setAvailableTrainers([]);
      setFilteredTrainers([]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTrainerSelection = (trainerId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedTrainers: prev.selectedTrainers.includes(trainerId)
        ? prev.selectedTrainers.filter(id => id !== trainerId)
        : [...prev.selectedTrainers, trainerId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Check if we have a valid topic ID
      let topicId = formData.topicId;
      if (!topicId || topicId === '0') {
        // If no valid topic ID, try to find or create the topic
        const selectedTopic = topics.find(t => t.name.toLowerCase() === topicSearchTerm.toLowerCase());
        if (selectedTopic) {
          topicId = selectedTopic.id.toString();
        } else {
          // For now, require a valid topic - in future we could create new topics
          alert('Bitte wählen Sie ein gültiges Thema aus der Liste aus.');
          setSaving(false);
          return;
        }
      }

      // Prepare location data
      let locationData: any = {};

      if (useExistingLocation && formData.locationId) {
        // Use existing location
        locationData.locationId = formData.locationId;
      } else {
        // Create new location (one-time address)
        if (formData.type === 'ONLINE') {
          // ONLINE location
          locationData.locationName = 'Online Training';
          locationData.locationType = 'ONLINE';
          locationData.onlinePlatform = formData.onlinePlatform || 'ZOOM';
          locationData.onlineLink = formData.onlineLink || '';
        } else {
          // HYBRID or VOR_ORT - PHYSICAL location
          locationData.locationName = formData.locationName || 
            (formData.locationCity ? `${formData.locationCity}${formData.locationStreet ? `, ${formData.locationStreet}` : ''}` : 'Vor Ort');
          locationData.locationType = 'PHYSICAL';
          locationData.locationStreet = formData.locationStreet;
          locationData.locationHouseNumber = formData.locationHouseNumber;
          locationData.locationZipCode = formData.locationZipCode;
          locationData.locationCity = formData.locationCity;
          locationData.locationCountryId = formData.locationCountryId;
        }
      }

      // First create the training
      const trainingResponse = await fetch('/api/trainings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          topicId: topicId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          type: formData.type,
          participants: formData.participants,
          dailyRate: formData.dailyRate,
          description: formData.description,
          companyId: user.id,
          ...locationData
        }),
      });

      if (trainingResponse.ok) {
        const trainingData = await trainingResponse.json();

        // Then send requests to selected trainers
        if (formData.selectedTrainers.length > 0) {
          const requestsResponse = await fetch('/api/training-requests', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              trainingId: trainingData.id,
              trainerIds: formData.selectedTrainers
            }),
          });

          if (requestsResponse.ok) {
            const requestsResult = await requestsResponse.json();
            if (requestsResult.duplicates && requestsResult.duplicates.length > 0) {
              // Show warning if there were duplicates
              if (requestsResult.newRequests && requestsResult.newRequests.length > 0) {
                alert(requestsResult.message || `${requestsResult.newRequests.length} neue Anfrage(n) gesendet. ${requestsResult.duplicates.length} Trainer wurde(n) bereits zuvor angefragt.`);
              } else {
                alert(requestsResult.message || `Alle Trainer wurden bereits zuvor angefragt.`);
              }
            }
          }
        }

        router.push('/dashboard/trainings');
      } else {
        const error = await trainingResponse.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating training:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/trainings"
            className="inline-flex items-center text-primary-600 hover:text-primary-800 mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 01.029-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Zurück zu Trainings
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Neues Training erstellen</h1>
            <p className="text-gray-600 mt-1">
              Erstellen Sie ein neues Training für Ihre Teilnehmer
            </p>
          </div>
        </div>
      </div>
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">
        <div className="max-w-4xl mx-auto">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Training Details */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Training Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Titel *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="z.B. Projektmanagement Grundlagen"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Thema *
              </label>
              <input
                type="text"
                value={topicSearchTerm}
                onChange={(e) => handleTopicSearch(e.target.value)}
                onFocus={() => topicSearchTerm.length >= 2 && setShowTopicSuggestions(true)}
                onBlur={() => setTimeout(() => setShowTopicSuggestions(false), 200)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="z.B. Projektmanagement, Python, Marketing..."
              />
              {topicSearchTerm && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute right-3 top-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                </svg>
              )}

              {showTopicSuggestions && topicSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {topicSuggestions.map((topic) => (
                    <div
                      key={topic.id}
                      onClick={() => selectTopic(topic)}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">{topic.name}</span>
                        {topic.id > 0 && (
                          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                            Verfügbar
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {topicSearchTerm.length >= 2 && topicSuggestions.length === 0 && showTopicSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-3 text-gray-500">
                    Keine Themen gefunden für "{topicSearchTerm}"
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startdatum *
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enddatum *
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Startzeit *
              </label>
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endzeit *
              </label>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Training Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trainingstyp *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
                <option value="VOR_ORT">Vor Ort</option>
              </select>
            </div>

            {/* Location Selection */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ort auswählen
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={useExistingLocation}
                    onChange={() => setUseExistingLocation(true)}
                    className="mr-2"
                  />
                  Vorhandenen Ort verwenden
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="locationMode"
                    checked={!useExistingLocation}
                    onChange={() => setUseExistingLocation(false)}
                    className="mr-2"
                  />
                  Neuen Ort eingeben
                </label>
              </div>

              {useExistingLocation ? (
                <select
                  name="locationId"
                  value={formData.locationId || ''}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      locationId: e.target.value
                    }));
                  }}
                  required={useExistingLocation}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Bitte wählen</option>
                  {locations
                    .filter(loc => 
                      (formData.type === 'ONLINE' && loc.type === 'ONLINE') ||
                      ((formData.type === 'HYBRID' || formData.type === 'VOR_ORT') && loc.type === 'PHYSICAL')
                    )
                    .map((location) => (
                      <option key={location.id} value={location.id.toString()}>
                        {location.name} ({location.type === 'ONLINE' ? 'Online' : 'Vor Ort'})
                      </option>
                    ))}
                </select>
              ) : (
                <p className="text-sm text-gray-600">
                  {formData.type === 'ONLINE' 
                    ? 'Geben Sie unten die Online-Plattform-Details ein.'
                    : 'Geben Sie unten die Adressdetails ein.'}
                </p>
              )}
            </div>

            {/* Online Location Fields (only when creating new location) */}
            {formData.type === 'ONLINE' && !useExistingLocation && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Online-Plattform *
                  </label>
                  <select
                    name="onlinePlatform"
                    value={formData.onlinePlatform || 'ZOOM'}
                    onChange={handleInputChange}
                    required={!useExistingLocation}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="ZOOM">Zoom</option>
                    <option value="TEAMS">Microsoft Teams</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="OTHER">Andere</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting-Link (optional)
                  </label>
                  <input
                    type="url"
                    name="onlineLink"
                    value={formData.onlineLink || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </>
            )}

            {/* Detailed Location Fields for HYBRID and VOR_ORT (only when creating new location) */}
            {(formData.type === 'HYBRID' || formData.type === 'VOR_ORT') && !useExistingLocation && (
              <>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Detaillierte Adresse für Präsenzveranstaltung</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name des Ortes (optional)
                  </label>
                  <input
                    type="text"
                    name="locationName"
                    value={formData.locationName || ''}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="z.B. Büro Berlin, Konferenzraum A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Straße *
                  </label>
                  <input
                    type="text"
                    name="locationStreet"
                    value={formData.locationStreet || ''}
                    onChange={handleInputChange}
                    required={!useExistingLocation && (formData.type === 'HYBRID' || formData.type === 'VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Musterstraße"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hausnummer *
                  </label>
                  <input
                    type="text"
                    name="locationHouseNumber"
                    value={formData.locationHouseNumber || ''}
                    onChange={handleInputChange}
                    required={!useExistingLocation && (formData.type === 'HYBRID' || formData.type === 'VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PLZ *
                  </label>
                  <input
                    type="text"
                    name="locationZipCode"
                    value={formData.locationZipCode || ''}
                    onChange={handleInputChange}
                    required={!useExistingLocation && (formData.type === 'HYBRID' || formData.type === 'VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="12345"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stadt *
                  </label>
                  <input
                    type="text"
                    name="locationCity"
                    value={formData.locationCity || ''}
                    onChange={handleInputChange}
                    required={!useExistingLocation && (formData.type === 'HYBRID' || formData.type === 'VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Berlin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Land *
                  </label>
                  <select
                    name="locationCountryId"
                    value={formData.locationCountryId || ''}
                    onChange={handleInputChange}
                    required={!useExistingLocation && (formData.type === 'HYBRID' || formData.type === 'VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Bitte wählen</option>
                    {countries.map((country) => (
                      <option key={country.id} value={country.id.toString()}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teilnehmeranzahl *
              </label>
              <input
                type="number"
                name="participants"
                value={formData.participants}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagessatz (€) *
              </label>
              <input
                type="number"
                name="dailyRate"
                value={formData.dailyRate}
                onChange={handleInputChange}
                required
                min="1"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="z.B. 500"
              />
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beschreibung
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Detaillierte Beschreibung des Trainings..."
            />
          </div>
        </div>

        {/* Trainer Selection */}
        {formData.topicId && formData.topicId !== '0' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Trainer auswählen</h2>
              <button
                type="button"
                onClick={() => setShowTrainerSelection(!showTrainerSelection)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                {showTrainerSelection ? 'Auswahl ausblenden' : 'Trainer anzeigen'}
              </button>
            </div>

            {showTrainerSelection && (
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Wählen Sie die Trainer aus, die Sie für dieses Training anfragen möchten.
                  Gefunden: {Array.isArray(filteredTrainers) ? filteredTrainers.length : 0} Trainer
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {Array.isArray(filteredTrainers) && filteredTrainers.map(trainer => (
                    <div
                      key={trainer.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        formData.selectedTrainers.includes(trainer.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                      onClick={() => handleTrainerSelection(trainer.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {trainer.profilePicture ? (
                            <img
                              src={trainer.profilePicture}
                              alt={`${trainer.firstName} ${trainer.lastName}`}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {trainer.firstName[0]}{trainer.lastName[0]}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <h3 className="text-sm font-medium text-gray-900">
                              {trainer.firstName} {trainer.lastName}
                            </h3>
                            {formData.selectedTrainers.includes(trainer.id) && (
                              <svg className="ml-2 h-5 w-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {trainer.dailyRate}€/Tag
                          </p>
                          {trainer.topics && trainer.topics.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {trainer.topics.slice(0, 3).map((topic, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 text-xs bg-primary-100 text-primary-800 rounded-full"
                                >
                                  {topic}
                                </span>
                              ))}
                              {trainer.topics.length > 3 && (
                                <span className="text-xs text-gray-500">
                                  +{trainer.topics.length - 3} weitere
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {!Array.isArray(filteredTrainers) && (
                  <div className="text-center text-red-500 py-4">
                    Fehler beim Laden der Trainer.
                  </div>
                )}

                {Array.isArray(filteredTrainers) && filteredTrainers.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Keine Trainer für dieses Thema gefunden.
                  </p>
                )}

                {formData.selectedTrainers.length > 0 && (
                  <div className="mt-4 p-4 bg-primary-50 rounded-lg">
                    <p className="text-sm text-primary-800">
                      <strong>{formData.selectedTrainers.length} Trainer ausgewählt</strong>
                      <br />
                      Nach dem Erstellen werden diesen Trainern automatisch Anfragen gesendet.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/trainings"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Abbrechen
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Erstelle Training...' : 'Training erstellen'}
          </button>
        </div>
      </form>
        </div>
      </div>
    </React.Fragment>
  );
}
