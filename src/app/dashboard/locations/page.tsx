"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserData } from "@/lib/session";

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
  latitude?: number;
  longitude?: number;
  description?: string;
  trainings?: { id: number }[];
}

export default function LocationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [countries, setCountries] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'ONLINE' as 'ONLINE' | 'PHYSICAL',
    onlinePlatform: 'ZOOM',
    onlineLink: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    countryId: '',
    description: ''
  });

  useEffect(() => {
    const currentUser = getUserData();
    if (!currentUser || currentUser.userType !== 'TRAINING_COMPANY') {
      router.push('/dashboard');
      return;
    }

    setUser(currentUser);
    loadLocations();
    loadCountries();
    setLoading(false);
  }, [router]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name,
        type: location.type,
        onlinePlatform: location.onlinePlatform || 'ZOOM',
        onlineLink: location.onlineLink || '',
        street: location.street || '',
        houseNumber: location.houseNumber || '',
        zipCode: location.zipCode || '',
        city: location.city || '',
        countryId: location.countryId?.toString() || '',
        description: location.description || ''
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        type: 'ONLINE',
        onlinePlatform: 'ZOOM',
        onlineLink: '',
        street: '',
        houseNumber: '',
        zipCode: '',
        city: '',
        countryId: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingLocation(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingLocation 
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations';
      
      const method = editingLocation ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadLocations();
        handleCloseModal();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`Möchten Sie den Ort "${location.name}" wirklich löschen?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadLocations();
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      alert('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--ptw-text-primary)' }}>
          Orte verwalten
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="ptw-button-primary"
        >
          + Neuer Ort
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className="p-4 rounded-lg border"
            style={{ background: 'var(--ptw-bg-secondary)', borderColor: 'var(--ptw-border-primary)' }}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold" style={{ color: 'var(--ptw-text-primary)' }}>
                {location.name}
              </h3>
              <span className={`text-xs px-2 py-1 rounded ${
                location.type === 'ONLINE' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {location.type === 'ONLINE' ? 'Online' : 'Vor Ort'}
              </span>
            </div>

            {location.type === 'ONLINE' ? (
              <div className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                <p>Plattform: {location.onlinePlatform}</p>
                {location.onlineLink && (
                  <p className="truncate" title={location.onlineLink}>
                    Link: {location.onlineLink}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--ptw-text-secondary)' }}>
                {location.street && location.houseNumber && (
                  <p>{location.street} {location.houseNumber}</p>
                )}
                {location.zipCode && location.city && (
                  <p>{location.zipCode} {location.city}</p>
                )}
                {location.country && <p>{location.country.name}</p>}
              </div>
            )}

            {location.description && (
              <p className="text-sm mt-2 line-clamp-2" style={{ color: 'var(--ptw-text-secondary)' }}>
                {location.description}
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleOpenModal(location)}
                className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
                style={{ borderColor: 'var(--ptw-border-primary)' }}
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(location)}
                className="text-sm px-3 py-1 rounded border hover:bg-red-50 text-red-600"
                style={{ borderColor: 'var(--ptw-border-primary)' }}
                disabled={location.trainings && location.trainings.length > 0}
              >
                Löschen
              </button>
            </div>

            {location.trainings && location.trainings.length > 0 && (
              <p className="text-xs mt-2 text-gray-500">
                Wird in {location.trainings.length} Training(s) verwendet
              </p>
            )}
          </div>
        ))}

        {locations.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p style={{ color: 'var(--ptw-text-secondary)' }}>
              Noch keine Orte erstellt. Erstellen Sie einen neuen Ort, um ihn in Trainings zu verwenden.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">
                  {editingLocation ? 'Ort bearbeiten' : 'Neuer Ort'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="z.B. Zoom Meeting, Büro Berlin"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Typ *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ONLINE">Online</option>
                  <option value="PHYSICAL">Vor Ort</option>
                </select>
              </div>

              {formData.type === 'ONLINE' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Online-Plattform *
                    </label>
                    <select
                      name="onlinePlatform"
                      value={formData.onlinePlatform}
                      onChange={handleInputChange}
                      required
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
                      value={formData.onlineLink}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://zoom.us/j/..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Straße *
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={formData.street}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hausnummer *
                      </label>
                      <input
                        type="text"
                        name="houseNumber"
                        value={formData.houseNumber}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PLZ *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stadt *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Land *
                      </label>
                      <select
                        name="countryId"
                        value={formData.countryId}
                        onChange={handleInputChange}
                        required
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
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beschreibung (optional)
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="ptw-button-primary"
                >
                  {editingLocation ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

