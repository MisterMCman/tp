"use client";

import { useState, useEffect } from "react";
import { saveTrainerData } from "@/lib/session";
import { Trainer, TrainerProfileUpdateData } from "@/lib/types";

interface TrainingCompany {
  id: number;
  userType: 'TRAINING_COMPANY';
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string;
  bio?: string;
  logo?: string;
  website?: string;
  industry?: string;
  employees?: string;
  consultantName?: string;
  status: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<Trainer | TrainingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});


  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // First, get the current user to determine their type
      const currentUser = JSON.parse(localStorage.getItem('trainer_data') || '{}');

      if (currentUser.userType === 'TRAINING_COMPANY') {
        // Load training company profile
        const response = await fetch('/api/training-company/profile');
        if (response.ok) {
          const data = await response.json();
          setUser(data.company);
          setFormData({
            companyName: data.company.companyName,
            contactName: data.company.contactName,
            email: data.company.email,
            phone: data.company.phone,
            address: data.company.address,
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            consultantName: data.company.consultantName,
          });
        }
      } else {
        // Load trainer profile
        const response = await fetch('/api/trainer/profile');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          setFormData({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            bio: data.bio,
            profilePicture: data.profilePicture,
            iban: data.iban,
            taxId: data.taxId,
            companyName: data.companyName,
            isCompany: data.isCompany,
            dailyRate: data.dailyRate,
          });
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let apiEndpoint = '/api/trainer/profile';
      if (user?.userType === 'TRAINING_COMPANY') {
        apiEndpoint = '/api/training-company/profile';
      }

      const response = await fetch(apiEndpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (user?.userType === 'TRAINING_COMPANY') {
          setUser(data.company);
        } else {
          setUser(data.trainer);
        }
        saveTrainerData(user?.userType === 'TRAINING_COMPANY' ? data.company : data.trainer);
        alert('Profil erfolgreich aktualisiert!');
      } else {
        const error = await response.json();
        alert(`Fehler: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Fehler beim Aktualisieren des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profil konnte nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          {user?.userType === 'TRAINING_COMPANY' ? 'Unternehmensprofil' : 'Mein Profil'}
        </h1>
      </div>



      {/* Profil-Formular */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persönliche Daten / Unternehmensdaten */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              {user?.userType === 'TRAINING_COMPANY' ? 'Unternehmensdaten' : 'Persönliche Daten'}
            </h2>
          </div>

          {user?.userType === 'TRAINING_COMPANY' ? (
            // Training Company Fields
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unternehmensname *
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ansprechpartner *
                </label>
                <input
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branche
                </label>
                <input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          ) : (
            // Trainer Fields
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname *
                </label>
                <input
                  type="text"
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nachname *
                </label>
                <input
                  type="text"
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail *
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefon *
            </label>
            <input
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <textarea
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Additional Business Data */}
          {user?.userType === 'TRAINER' && (
            <>
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Geschäftliche Daten</h2>
              </div>

              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isCompany || false}
                    onChange={(e) => handleInputChange('isCompany', e.target.checked)}
                    className="mr-2"
                  />
                  Ich bin als Unternehmen/Firma tätig
                </label>
              </div>

              {formData.isCompany && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Firmenname
                  </label>
                  <input
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tagessatz (€)
                </label>
                <input
                  type="number"
                  value={formData.dailyRate || ''}
                  onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                  min="0"
                  step="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          {user?.userType === 'TRAINING_COMPANY' && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website || ''}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://www.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mitarbeiterzahl
                </label>
                <select
                  value={formData.employees || ''}
                  onChange={(e) => handleInputChange('employees', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Bitte wählen</option>
                  <option value="1-10">1-10 Mitarbeiter</option>
                  <option value="11-50">11-50 Mitarbeiter</option>
                  <option value="51-200">51-200 Mitarbeiter</option>
                  <option value="200+">200+ Mitarbeiter</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Berater-Name
                </label>
                <input
                  type="text"
                  value={formData.consultantName || ''}
                  onChange={(e) => handleInputChange('consultantName', e.target.value)}
                  placeholder="Name der Person, die das Portal nutzt"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </>
          )}

          {/* Finanzielle Daten - Only for trainers */}
          {user?.userType === 'TRAINER' && (
            <>
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Finanzielle Daten</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Netto-Tagessatz (€) - Schulung 9-16 Uhr
                </label>
                <input
                  type="number"
                  value={formData.dailyRate || ''}
                  onChange={(e) => handleInputChange('dailyRate', e.target.value ? parseFloat(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="z.B. 450"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ihr regulärer Tagessatz für Schulungen von 9:00 bis 16:00 Uhr
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Steuernummer
                </label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban || ''}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="DE12 3456 7890 1234 5678 90"
                />
              </div>
            </>
          )}

          {/* Profil-Beschreibung / Unternehmensbeschreibung */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">
              {user?.userType === 'TRAINING_COMPANY' ? 'Unternehmensbeschreibung' : 'Profil-Beschreibung'}
            </h2>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kurzbeschreibung
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Beschreiben Sie Ihre Erfahrung und Expertise..."
            />
          </div>

          {/* Profilbild / Firmenlogo */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {user?.userType === 'TRAINING_COMPANY' ? 'Firmenlogo' : 'Profilbild'}
            </label>
            <div className="flex items-center gap-4 w-full">
              {/* Upload area or preview */}
              <div className="flex-1">
                {(user?.userType === 'TRAINING_COMPANY' ? formData.logo : formData.profilePicture) ? (
                  // Show preview with remove button
                  <div className="relative">
                    <img
                      src={user?.userType === 'TRAINING_COMPANY' ? formData.logo : formData.profilePicture}
                      alt={user?.userType === 'TRAINING_COMPANY' ? 'Logo preview' : 'Profile preview'}
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange(user?.userType === 'TRAINING_COMPANY' ? 'logo' : 'profilePicture', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                      title="Bild entfernen"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  // Show upload area
                  <label
                    htmlFor="profilePictureUpload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
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
                      id="profilePictureUpload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file upload here
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            handleInputChange('profilePicture', e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Change image button (only show if image exists) */}
              {formData.profilePicture && (
                <div className="flex flex-col justify-center">
                  <label
                    htmlFor="profilePictureUpload"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Bild ändern
            </label>
            <input
                    id="profilePictureUpload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        // Handle file upload here
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          handleInputChange('profilePicture', e.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Speichere...' : 'Änderungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}