"use client";

import { useState, useEffect } from "react";
import { saveTrainerData } from "@/lib/session";
import { Trainer, TrainerProfileUpdateData } from "@/lib/types";

export default function ProfilePage() {
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<TrainerProfileUpdateData>({});
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/trainer/profile');
      if (response.ok) {
        const data = await response.json();
        setTrainer(data);
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          address: data.address,
          bio: data.bio,
          profilePicture: data.profilePicture,
          bankDetails: data.bankDetails,
          taxId: data.taxId,
          companyName: data.companyName,
          isCompany: data.isCompany,
          dailyRate: data.dailyRate,
        });
      } else {
        console.error('Failed to load profile');
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
      const response = await fetch('/api/trainer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        setTrainer(data.trainer);
        saveTrainerData(data.trainer);
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

  if (!trainer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Profil konnte nicht geladen werden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Mein Profil</h1>
        <button
          onClick={() => setShowVersions(!showVersions)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          {showVersions ? 'Versionen ausblenden' : 'Versionshistorie'}
        </button>
      </div>

      {/* Versionshistorie */}
      {showVersions && trainer.profileVersions && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          <h2 className="text-lg font-semibold mb-4">Versionshistorie</h2>
          <div className="space-y-3">
            {trainer.profileVersions.map((version) => (
              <div key={version.id} className="bg-white p-4 rounded border">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium">Version {version.version}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(version.createdAt).toLocaleString('de-DE')}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    version.changedBy === 'trainer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {version.changedBy === 'trainer' ? 'Trainer' : 'Admin'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Geänderte Felder: {JSON.parse(version.changedFields as string).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profil-Formular */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persönliche Daten */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Persönliche Daten</h2>
          </div>

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

          {/* Unternehmensdaten */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Unternehmensdaten</h2>
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

          {/* Finanzielle Daten */}
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
              Bankverbindung (JSON)
            </label>
            <textarea
              value={formData.bankDetails || ''}
              onChange={(e) => handleInputChange('bankDetails', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder='{"accountHolder": "Max Mustermann", "iban": "DE12...", "bic": "BANKDE...", "bankName": "Bank Name"}'
            />
          </div>

          {/* Profil-Beschreibung */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Profil-Beschreibung</h2>
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

          {/* Profilbild */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Profilbild URL
            </label>
            <input
              type="url"
              value={formData.profilePicture || ''}
              onChange={(e) => handleInputChange('profilePicture', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://..."
            />
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