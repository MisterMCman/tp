"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTrainerData, saveTrainerData } from "@/lib/session";
import { TopicSelector, TopicWithLevel, ExpertiseLevel } from "@/components/TopicSelector";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    countryId: null as number | null,
    bio: '',
    isCompany: false,
    companyName: '',
    dailyRate: '',
    offeredTrainingTypes: [] as string[],
  });
  const [topicsWithLevels, setTopicsWithLevels] = useState<TopicWithLevel[]>([]);
  const [topicSuggestionsList, setTopicSuggestionsList] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState('');
  const [topicSuggestions, setTopicSuggestions] = useState<{ id: number; name: string; type?: 'existing' | 'suggestion'; status?: string }[]>([]);
  const [countries, setCountries] = useState<{id: number, name: string, code: string}[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = getTrainerData();
    if (!currentUser || currentUser.userType !== 'TRAINER') {
      router.push('/dashboard');
      return;
    }

    // If profile is already complete, redirect to dashboard
    if (currentUser.status === 'ACTIVE') {
      router.push('/dashboard');
      return;
    }

    loadProfile();
    loadCountries();
  }, [router]);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/trainer/profile');
      if (response.ok) {
        const data = await response.json();
        const trainer = data.trainer;
        setFormData({
          firstName: trainer.firstName || '',
          lastName: trainer.lastName || '',
          email: trainer.email || '',
          phone: trainer.phone === '000000000' ? '' : (trainer.phone || ''),
          street: trainer.street || '',
          houseNumber: trainer.houseNumber || '',
          zipCode: trainer.zipCode || '',
          city: trainer.city || '',
          countryId: trainer.country?.id || null,
          bio: trainer.bio || '',
          isCompany: trainer.isCompany || false,
          companyName: trainer.companyName || '',
          dailyRate: trainer.dailyRate?.toString() || '',
          offeredTrainingTypes: trainer.offeredTrainingTypes || [],
        });
        setTopicsWithLevels(trainer.topics?.map((t: {name: string, level: string}) => ({ name: t.name, level: t.level as ExpertiseLevel })) || []);
        setTopicSuggestionsList(trainer.pendingSuggestions || []);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
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

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTopicSelect = (topicName: string, level: ExpertiseLevel, isSuggestion?: boolean) => {
    if (isSuggestion) {
      if (!topicSuggestionsList.includes(topicName)) {
        setTopicSuggestionsList(prev => [...prev, topicName]);
      }
    } else {
      if (!topicsWithLevels.some(t => t.name === topicName)) {
        setTopicsWithLevels(prev => [...prev, { name: topicName, level }]);
      }
    }
  };

  const handleTopicRemove = (topicName: string, isSuggestion?: boolean) => {
    if (isSuggestion) {
      setTopicSuggestionsList(prev => prev.filter(t => t !== topicName));
    } else {
      setTopicsWithLevels(prev => prev.filter(t => t.name !== topicName));
    }
  };

  const handleTopicSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setTopicSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/topics?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        const mappedSuggestions = data.map((topic: { id: number; name: string; short_title?: string; displayName?: string }) => ({
          id: topic.id,
          name: topic.name,
          short_title: topic.short_title,
          displayName: topic.displayName,
          type: 'existing' as const,
          status: 'online'
        }));
        setTopicSuggestions(mappedSuggestions);
      }
    } catch (error) {
      console.error('Error searching topics:', error);
      setTopicSuggestions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.phone || !formData.street || !formData.zipCode || !formData.city || !formData.countryId || !formData.bio) {
        setError('Bitte füllen Sie alle Pflichtfelder aus.');
        setSaving(false);
        return;
      }

      if (topicsWithLevels.length === 0) {
        setError('Bitte wählen Sie mindestens ein Fachgebiet aus.');
        setSaving(false);
        return;
      }

      if (formData.offeredTrainingTypes.length === 0) {
        setError('Bitte wählen Sie mindestens einen Trainingstyp aus.');
        setSaving(false);
        return;
      }

      const response = await fetch('/api/trainer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formData.phone,
          street: formData.street,
          houseNumber: formData.houseNumber,
          zipCode: formData.zipCode,
          city: formData.city,
          countryId: formData.countryId,
          bio: formData.bio,
          isCompany: formData.isCompany,
          companyName: formData.companyName || null,
          dailyRate: formData.dailyRate ? parseFloat(formData.dailyRate) : null,
          topicsWithLevels: topicsWithLevels,
          topicSuggestions: topicSuggestionsList,
          offeredTrainingTypes: formData.offeredTrainingTypes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      const data = await response.json();
      saveTrainerData(data.trainer);

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: unknown) {
      console.error('Error saving profile:', err);
      setError((err as Error)?.message || 'Ein Fehler ist aufgetreten');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>;
  }

  return (
    <>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <h1 className="text-2xl font-bold text-gray-900">Profil vervollständigen</h1>
        <p className="text-gray-600 mt-1">
          Bitte vervollständigen Sie Ihr Profil, damit Unternehmen Sie finden und anfragen können. Alle Felder mit * sind Pflichtfelder.
        </p>
      </div>
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">
      
      <div className="max-w-4xl mx-auto space-y-6">

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Persönliche Informationen</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vorname *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nachname *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Adresse</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Straße *
              </label>
              <input
                type="text"
                value={formData.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hausnummer
              </label>
              <input
                type="text"
                value={formData.houseNumber}
                onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PLZ *
              </label>
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stadt *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Land *
              </label>
              <select
                value={formData.countryId || ''}
                onChange={(e) => handleInputChange('countryId', parseInt(e.target.value) || null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Land auswählen</option>
                {countries.map((country) => (
                  <option key={country.id} value={country.id}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Professionelle Informationen</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profilbeschreibung *
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                placeholder="Beschreiben Sie Ihre Expertise und Erfahrung"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tagessatz (€)
              </label>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                min="0"
                step="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="z.B. 500"
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isCompany}
                  onChange={(e) => handleInputChange('isCompany', e.target.checked)}
                  className="mr-2"
                />
                Ich bin als Unternehmen/Firma tätig
              </label>
            </div>

            {formData.isCompany && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Angebotene Trainingstypen *
              </label>
              <div className="space-y-2">
                {['ONLINE', 'HYBRID', 'VOR_ORT'].map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.offeredTrainingTypes.includes(type)}
                      onChange={(e) => {
                        const current = formData.offeredTrainingTypes;
                        if (e.target.checked) {
                          handleInputChange('offeredTrainingTypes', [...current, type]);
                        } else {
                          handleInputChange('offeredTrainingTypes', current.filter(t => t !== type));
                        }
                      }}
                      className="mr-2"
                    />
                    {type === 'ONLINE' ? 'Online' : type === 'HYBRID' ? 'Hybrid' : 'Vor Ort'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fachgebiete *
              </label>
              <TopicSelector
                topics={topicsWithLevels}
                topicSuggestions={topicSuggestionsList}
                onAddTopic={handleTopicSelect}
                onRemoveTopic={handleTopicRemove}
                searchTerm={topicSearch}
                onSearchChange={setTopicSearch}
                onSearch={handleTopicSearch}
                suggestions={topicSuggestions}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Speichern...' : 'Profil vervollständigen'}
          </button>
        </div>
      </form>
      </div>
      </div>
    </>
  );
}

