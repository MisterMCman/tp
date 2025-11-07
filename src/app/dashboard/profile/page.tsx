"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { saveTrainerData, saveCompanyData } from "@/lib/session";
import { Trainer } from "@/lib/types";
import { TopicSelector, TopicWithLevel, ExpertiseLevel } from "@/components/TopicSelector";
import { canEditCompany, canManageUsers } from "@/lib/permissions";

interface TrainingCompany {
  id: number;
  userType: 'TRAINING_COMPANY';
  companyName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  street?: string;
  houseNumber?: string;
  zipCode?: string;
  city?: string;
  countryId?: number;
  country?: { id: number; name: string; code: string };
  domain?: string;
  bio?: string;
  logo?: string;
  website?: string;
  industry?: string;
  employees?: string;
  consultantName?: string;
  vatId?: string;
  billingEmail?: string;
  billingNotes?: string;
  iban?: string;
  taxId?: string;
  tags?: string;
  onboardingStatus?: string;
  status: string;
  role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
  companyId?: number;
  isActive?: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Trainer | TrainingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [countries, setCountries] = useState<{id: number, name: string, code: string}[]>([]);
  
  // Topic management state
  const [topics, setTopics] = useState<TopicWithLevel[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<string[]>([]);
  const [topicSearch, setTopicSearch] = useState('');
  const [topicSearchResults, setTopicSearchResults] = useState<{ id: number; name: string; displayName?: string; short_title?: string; type?: 'existing' | 'suggestion'; status?: string }[]>([]);
  
  // Company users management state (for admins)
  const [companyUsers, setCompanyUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [userFormData, setUserFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'EDITOR' as 'ADMIN' | 'EDITOR' | 'VIEWER'
  });


  useEffect(() => {
    loadProfile();
    loadCountries();
  }, []);

  // Load company users if user is admin
  useEffect(() => {
    if (user?.userType === 'TRAINING_COMPANY') {
      // If role is missing, try to get it from session
      const userWithRole = user as any;
      console.log('Checking user role for user management:', { 
        hasRole: !!userWithRole.role, 
        role: userWithRole.role,
        userType: user.userType 
      });
      if (!userWithRole.role) {
        // Dynamically import to avoid SSR issues
        import('@/lib/session').then(({ getCompanyData }) => {
          const sessionData = getCompanyData();
          console.log('Session data for role:', sessionData);
          if (sessionData?.role) {
            setUser({ 
              ...user, 
              role: sessionData.role as 'ADMIN' | 'EDITOR' | 'VIEWER', 
              companyId: (sessionData.companyId || sessionData.id) as number, 
              isActive: (sessionData.isActive ?? true) as boolean 
            });
          }
        });
        return;
      }
      const canManage = canManageUsers(userWithRole);
      console.log('Can manage users?', canManage);
      if (canManage) {
        loadCompanyUsers();
      }
    }
  }, [user]);

  const loadCompanyUsers = async () => {
    try {
      const response = await fetch('/api/company-users');
      if (response.ok) {
        const data = await response.json();
        setCompanyUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading company users:', error);
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

  const loadProfile = async () => {
    try {
      // First, get the current user to determine their type
      const { getTrainerData, getCompanyData } = await import('@/lib/session');
      const trainerData = getTrainerData();
      const companyData = getCompanyData();
      const currentUser = (trainerData || companyData) as any;
      console.log('Current user from session:', currentUser);

      // If we have session data with role, use it and fetch company details
      if (currentUser && currentUser.userType === 'TRAINING_COMPANY' && currentUser.role) {
        console.log('Using session data with role:', currentUser);
        // Fetch company details but preserve role from session
        const companyResponse = await fetch('/api/training-company/profile');
        if (companyResponse.ok) {
          const data = await companyResponse.json();
          const userData = {
            ...data.company,
            role: currentUser.role,
            companyId: currentUser.companyId || data.company.companyId || data.company.id,
            isActive: currentUser.isActive ?? true
          };
          setUser(userData);
          setFormData({
            companyName: data.company.companyName,
            firstName: data.company.firstName,
            lastName: data.company.lastName,
            email: data.company.email,
            phone: data.company.phone,
            street: data.company.street,
            houseNumber: data.company.houseNumber,
            zipCode: data.company.zipCode,
            city: data.company.city,
            countryId: data.company.country?.id,
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            consultantName: data.company.consultantName,
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
            tags: data.company.tags,
          });
          return; // Exit early
        }
      }
      
      // If localStorage is empty, try both APIs to determine user type
      if (!currentUser.userType || Object.keys(currentUser).length === 0) {
        console.log('No userType found, trying both APIs...');
        
        // Try training company first
        const companyResponse = await fetch('/api/training-company/profile');
        if (companyResponse.ok) {
          const data = await companyResponse.json();
          console.log('Successfully loaded as Training Company:', data);
          console.log('Current user from session (for role):', currentUser);
          // Merge session data (which has role) with company data
          const userData = {
            ...data.company,
            role: currentUser?.role || data.company.role || 'ADMIN',
            companyId: currentUser?.companyId || data.company.companyId || data.company.id,
            isActive: currentUser?.isActive ?? data.company.isActive ?? true
          };
          console.log('Final userData with role:', userData);
          setUser(userData);
          // Save to cookies for next time
          saveCompanyData(userData);
          setFormData({
            companyName: data.company.companyName,
            firstName: data.company.firstName,
            lastName: data.company.lastName,
            email: data.company.email,
            phone: data.company.phone,
            street: data.company.street,
            houseNumber: data.company.houseNumber,
            zipCode: data.company.zipCode,
            city: data.company.city,
            countryId: data.company.country?.id,
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            consultantName: data.company.consultantName,
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
            tags: data.company.tags,
          });
          return; // Exit early
        }
        
        // If not a company, try trainer
        const trainerResponse = await fetch('/api/trainer/profile');
        if (trainerResponse.ok) {
          const data = await trainerResponse.json();
          console.log('Successfully loaded as Trainer:', data);
          setUser(data);
          // Save to cookies for next time
          saveTrainerData(data);
          setFormData({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            street: data.street,
            houseNumber: data.houseNumber,
            zipCode: data.zipCode,
            city: data.city,
            countryId: data.country?.id,
            bio: data.bio,
            profilePicture: data.profilePicture,
            iban: data.iban,
            taxId: data.taxId,
            companyName: data.companyName,
            isCompany: data.isCompany,
            dailyRate: data.dailyRate,
            offeredTrainingTypes: data.offeredTrainingTypes || [],
            travelRadius: data.travelRadius,
          });
          
          // Load topics and suggestions - handle both old format (string[]) and new format (TopicWithLevel[])
          const topicsData = data.topics || [];
          setTopics(topicsData.map((t: string | TopicWithLevel) => 
            typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
          ));
          setTopicSuggestions(data.pendingSuggestions || []);
          return; // Exit early
        }
        
        // If both failed, show error
        console.error('Failed to load profile from both APIs');
        return;
      }

      if (currentUser.userType === 'TRAINING_COMPANY') {
        // Load training company profile
        const response = await fetch('/api/training-company/profile');
        console.log('Training company profile response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Training company profile data:', data);
          setUser(data.company);
          setFormData({
            companyName: data.company.companyName,
            firstName: data.company.firstName,
            lastName: data.company.lastName,
            email: data.company.email,
            phone: data.company.phone,
            street: data.company.street,
            houseNumber: data.company.houseNumber,
            zipCode: data.company.zipCode,
            city: data.company.city,
            countryId: data.company.country?.id,
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            consultantName: data.company.consultantName,
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
            tags: data.company.tags,
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
            street: data.street,
            houseNumber: data.houseNumber,
            zipCode: data.zipCode,
            city: data.city,
            countryId: data.country?.id,
            bio: data.bio,
            profilePicture: data.profilePicture,
            iban: data.iban,
            taxId: data.taxId,
            companyName: data.companyName,
            isCompany: data.isCompany,
            dailyRate: data.dailyRate,
            offeredTrainingTypes: data.offeredTrainingTypes || [],
            travelRadius: data.travelRadius,
          });
          
          // Load topics and suggestions - handle both old format (string[]) and new format (TopicWithLevel[])
          const topicsData = data.topics || [];
          setTopics(topicsData.map((t: string | TopicWithLevel) => 
            typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
          ));
          setTopicSuggestions(data.pendingSuggestions || []);
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
      const bodyData = user?.userType !== 'TRAINING_COMPANY' 
        ? { ...formData, topicsWithLevels: topics, topicSuggestions }
        : { ...formData };
      
      if (user?.userType === 'TRAINING_COMPANY') {
        apiEndpoint = '/api/training-company/profile';
      }

      const response = await fetch(apiEndpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      if (response.ok) {
        const data = await response.json();
        if (user?.userType === 'TRAINING_COMPANY') {
          setUser(data.company);
          saveCompanyData(data.company);
        } else {
          setUser(data.trainer);
          saveTrainerData(data.trainer);
          // Reload topics and suggestions after save - handle both formats
          if (data.trainer.topics) {
            const topicsData = data.trainer.topics;
            setTopics(topicsData.map((t: string | TopicWithLevel) => 
              typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
            ));
          }
          if (data.trainer.pendingSuggestions) {
            setTopicSuggestions(data.trainer.pendingSuggestions);
          }
        }
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

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Topic handlers
  const handleTopicAdd = (topicName: string, level: ExpertiseLevel, isSuggestion?: boolean) => {
    if (isSuggestion) {
      if (!topicSuggestions.includes(topicName)) {
        setTopicSuggestions(prev => [...prev, topicName]);
      }
    } else {
      if (!topics.some(t => t.name === topicName)) {
        setTopics(prev => [...prev, { name: topicName, level }]);
      }
    }
  };

  const handleTopicRemove = (topicName: string, isSuggestion?: boolean) => {
    if (isSuggestion) {
      setTopicSuggestions(prev => prev.filter(t => t !== topicName));
    } else {
      setTopics(prev => prev.filter(t => t.name !== topicName));
    }
  };

  const handleTopicSearch = async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 3) {
      setTopicSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/topics?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        const mappedSuggestions = data.map((topic: { 
          id: number; 
          name: string; 
          short_title?: string;
          displayName?: string;
        }) => ({
          id: topic.id,
          name: topic.name,
          short_title: topic.short_title,
          displayName: topic.displayName,
          type: 'existing' as const,
          status: 'online'
        }));
        setTopicSearchResults(mappedSuggestions);
      }
    } catch (error) {
      console.error('Error searching topics:', error);
      setTopicSearchResults([]);
    }
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {user?.userType === 'TRAINING_COMPANY' ? 'Einstellungen' : 'Mein Profil'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.userType === 'TRAINING_COMPANY' 
              ? 'Verwalten Sie Ihr Unternehmensprofil und Benutzer'
              : 'Verwalten Sie Ihre persönlichen Daten und Kompetenzen'}
          </p>
        </div>
      </div>

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800">
              {user?.userType === 'TRAINING_COMPANY' ? 'Persönliche Informationen' : 'Persönliche Daten'}
            </h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {user?.userType === 'TRAINING_COMPANY' ? (
            // Training Company Fields
            <>
              {canEditCompany(user as any) ? (
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
                </>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unternehmensname
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                    {formData.companyName || '-'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Nur Administratoren können Unternehmensdaten ändern</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname (Ansprechpartner) *
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
                  Nachname (Ansprechpartner) *
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

          {/* Address Fields - Trainer */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Straße
                </label>
                <input
                  type="text"
                  placeholder="Straße"
                  value={formData.street || ''}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hausnummer
                </label>
                <input
                  type="text"
                  placeholder="Hausnummer"
                  value={formData.houseNumber || ''}
                  onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PLZ
                </label>
                <input
                  type="text"
                  placeholder="PLZ"
                  value={formData.zipCode || ''}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stadt
                </label>
                <input
                  type="text"
                  placeholder="Stadt"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land
                </label>
                <select
                  value={formData.countryId || ''}
                  onChange={(e) => handleInputChange('countryId', parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Land auswählen</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name} ({country.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
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

              {/* Training Types Offered */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Angebotene Trainingstypen *
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.offeredTrainingTypes || []).includes('ONLINE')}
                      onChange={(e) => {
                        const current = formData.offeredTrainingTypes || [];
                        if (e.target.checked) {
                          handleInputChange('offeredTrainingTypes', [...current, 'ONLINE']);
                        } else {
                          handleInputChange('offeredTrainingTypes', current.filter((t: string) => t !== 'ONLINE'));
                        }
                      }}
                      className="mr-2"
                    />
                    Online
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.offeredTrainingTypes || []).includes('HYBRID')}
                      onChange={(e) => {
                        const current = formData.offeredTrainingTypes || [];
                        if (e.target.checked) {
                          handleInputChange('offeredTrainingTypes', [...current, 'HYBRID']);
                        } else {
                          handleInputChange('offeredTrainingTypes', current.filter((t: string) => t !== 'HYBRID'));
                        }
                      }}
                      className="mr-2"
                    />
                    Hybrid
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.offeredTrainingTypes || []).includes('VOR_ORT')}
                      onChange={(e) => {
                        const current = formData.offeredTrainingTypes || [];
                        if (e.target.checked) {
                          handleInputChange('offeredTrainingTypes', [...current, 'VOR_ORT']);
                        } else {
                          handleInputChange('offeredTrainingTypes', current.filter((t: string) => t !== 'VOR_ORT'));
                        }
                      }}
                      className="mr-2"
                    />
                    Vor Ort
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Wählen Sie die Trainingstypen aus, die Sie anbieten können.
                </p>
              </div>

              {/* Travel Radius - Only show if HYBRID or VOR_ORT is selected */}
              {((formData.offeredTrainingTypes || []).includes('HYBRID') || (formData.offeredTrainingTypes || []).includes('VOR_ORT')) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reiseradius (km) *
                  </label>
                  <input
                    type="number"
                    value={formData.travelRadius || ''}
                    onChange={(e) => handleInputChange('travelRadius', parseInt(e.target.value) || 0)}
                    min="0"
                    step="50"
                    required={(formData.offeredTrainingTypes || []).includes('HYBRID') || (formData.offeredTrainingTypes || []).includes('VOR_ORT')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="z.B. 200"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Wie weit sind Sie bereit zu reisen (von Ihrer Adresse aus)?
                  </p>
                </div>
              )}
            </>
          )}

          {user?.userType === 'TRAINING_COMPANY' && (
            <>
              {/* Additional Company Information */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold mb-4">Zusätzliche Unternehmensinformationen</h2>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branche
                </label>
                <select
                  value={formData.industry || ''}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Branche auswählen</option>
                  <option value="it">Informationstechnologie</option>
                  <option value="finance">Finanzwesen</option>
                  <option value="healthcare">Gesundheitswesen</option>
                  <option value="education">Bildung</option>
                  <option value="manufacturing">Fertigung</option>
                  <option value="retail">Einzelhandel</option>
                  <option value="consulting">Beratung</option>
                  <option value="energy">Energie</option>
                  <option value="automotive">Automobil</option>
                  <option value="pharmaceutical">Pharmazeutisch</option>
                  <option value="construction">Bauwesen</option>
                  <option value="logistics">Logistik</option>
                  <option value="telecommunications">Telekommunikation</option>
                  <option value="other">Sonstige</option>
                </select>
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
                  <option value="201-500">201-500 Mitarbeiter</option>
                  <option value="501-1000">501-1000 Mitarbeiter</option>
                  <option value="1000+">Über 1000 Mitarbeiter</option>
                </select>
              </div>

              <div>
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
                  Kundenberater
                </label>
                <input
                  type="text"
                  value={formData.consultantName || ''}
                  onChange={(e) => handleInputChange('consultantName', e.target.value)}
                  placeholder="Name des zuständigen Beraters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags / Stichworte
                </label>
                <input
                  type="text"
                  value={formData.tags || ''}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="z.B. IT, Schulungen, Remote"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">Komma-getrennte Stichworte für bessere Suche</p>
              </div>

              {/* Financial Data Section for Companies */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold mb-4">Finanzielle Daten</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Umsatzsteuer-ID
                </label>
                <input
                  type="text"
                  value={formData.vatId || ''}
                  onChange={(e) => handleInputChange('vatId', e.target.value)}
                  placeholder="DE123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechnungs-E-Mail
                </label>
                <input
                  type="email"
                  value={formData.billingEmail || ''}
                  onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                  placeholder="rechnung@unternehmen.de"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechnungs-Hinweise
                </label>
                <textarea
                  value={formData.billingNotes || ''}
                  onChange={(e) => handleInputChange('billingNotes', e.target.value)}
                  rows={3}
                  placeholder="Besondere Hinweise für Rechnungen (z.B. Auftragsnummer, Kostenstelle)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban || ''}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  placeholder="DE12 3456 7890 1234 5678 90"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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

          {/* Topics - Only for trainers */}
          {user?.userType !== 'TRAINING_COMPANY' && (
            <div className="md:col-span-2">
              <h2 className="text-lg font-semibold mb-4">Fachgebiete & Kompetenzen</h2>
              <TopicSelector
                topics={topics}
                topicSuggestions={topicSuggestions}
                onAddTopic={handleTopicAdd}
                onRemoveTopic={handleTopicRemove}
                searchTerm={topicSearch}
                onSearchChange={setTopicSearch}
                onSearch={handleTopicSearch}
                suggestions={topicSearchResults}
              />
            </div>
          )}

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
                    htmlFor={user?.userType === 'TRAINING_COMPANY' ? 'companyLogoUpload' : 'profilePictureUpload'}
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
                      id={user?.userType === 'TRAINING_COMPANY' ? 'companyLogoUpload' : 'profilePictureUpload'}
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const fieldName = user?.userType === 'TRAINING_COMPANY' ? 'logo' : 'profilePicture';
                            const uploadType = user?.userType === 'TRAINING_COMPANY' ? 'logo' : 'profilePicture';
                            
                            // Upload to server
                            const formData = new FormData();
                            formData.append('file', file);
                            formData.append('type', uploadType);
                            
                            const response = await fetch('/api/upload-image', {
                              method: 'POST',
                              body: formData,
                            });
                            
                            if (response.ok) {
                              const result = await response.json();
                              handleInputChange(fieldName, result.url);
                            } else {
                              const error = await response.json();
                              alert(`Fehler beim Hochladen: ${error.error || 'Unbekannter Fehler'}`);
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error);
                            alert('Fehler beim Hochladen des Bildes');
                          }
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Change image button (only show if image exists) */}
              {(user?.userType === 'TRAINING_COMPANY' ? formData.logo : formData.profilePicture) && (
                <div className="flex flex-col justify-center">
                  <label
                    htmlFor={user?.userType === 'TRAINING_COMPANY' ? 'companyLogoUpload' : 'profilePictureUpload'}
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Bild ändern
                  </label>
                  <input
                    id={user?.userType === 'TRAINING_COMPANY' ? 'companyLogoUpload' : 'profilePictureUpload'}
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const fieldName = user?.userType === 'TRAINING_COMPANY' ? 'logo' : 'profilePicture';
                          const uploadType = user?.userType === 'TRAINING_COMPANY' ? 'logo' : 'profilePicture';
                          
                          // Upload to server
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('type', uploadType);
                          
                          const response = await fetch('/api/upload-image', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          if (response.ok) {
                            const result = await response.json();
                            handleInputChange(fieldName, result.url);
                          } else {
                            const error = await response.json();
                            alert(`Fehler beim Hochladen: ${error.error || 'Unbekannter Fehler'}`);
                          }
                        } catch (error) {
                          console.error('Error uploading image:', error);
                          alert('Fehler beim Hochladen des Bildes');
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Speichere...' : 'Änderungen speichern'}
            </button>
          </div>
        </form>
      </div>

      {/* Company Settings Section (Admin only) */}
      {user?.userType === 'TRAINING_COMPANY' && canEditCompany(user as any) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-800">Unternehmenseinstellungen</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-9">Verwalten Sie die Daten Ihres Unternehmens</p>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">
              Unternehmensdaten können nur von Administratoren bearbeitet werden. 
              Diese Einstellungen finden Sie im Formular oben.
            </p>
          </div>
        </div>
      )}

      {/* Company Users Management Section (Admin only) */}
      {user?.userType === 'TRAINING_COMPANY' && canManageUsers(user as any) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">Benutzerverwaltung</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Verwalten Sie Benutzer und deren Berechtigungen für Ihr Unternehmen
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setUserFormData({
                    email: '',
                    firstName: '',
                    lastName: '',
                    phone: '',
                    role: 'EDITOR'
                  });
                  setShowUserModal(true);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Benutzer hinzufügen
              </button>
            </div>
          </div>
          <div className="p-6">

            {companyUsers.length === 0 ? (
              <div className="text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-500 text-lg font-medium mb-2">Noch keine Benutzer vorhanden</p>
                <p className="text-gray-400 text-sm mb-4">Erstellen Sie den ersten Benutzer für Ihr Unternehmen</p>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setUserFormData({
                      email: '',
                      firstName: '',
                      lastName: '',
                      phone: '',
                      role: 'EDITOR'
                    });
                    setShowUserModal(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium inline-flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Ersten Benutzer hinzufügen
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">E-Mail</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Rolle</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyUsers.map((companyUser) => (
                      <tr key={companyUser.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                              {companyUser.firstName.charAt(0)}{companyUser.lastName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {companyUser.firstName} {companyUser.lastName}
                                {companyUser.id === (user as any)?.id && (
                                  <span className="ml-2 text-xs text-gray-500">(Sie)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{companyUser.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            companyUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                            companyUser.role === 'EDITOR' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {companyUser.role === 'ADMIN' ? 'Admin' :
                             companyUser.role === 'EDITOR' ? 'Editor' :
                             'Betrachter'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                            companyUser.isActive 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            {companyUser.isActive ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                router.push(`/dashboard/profile/users/${companyUser.id}`);
                              }}
                              className="text-primary-600 hover:text-primary-900 font-medium flex items-center gap-1 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Bearbeiten
                            </button>
                            {companyUser.id !== (user as any)?.id && (
                              <button
                                onClick={async () => {
                                  if (confirm(`Möchten Sie ${companyUser.firstName} ${companyUser.lastName} wirklich deaktivieren?`)) {
                                    try {
                                      const response = await fetch(`/api/company-users/${companyUser.id}`, {
                                        method: 'DELETE'
                                      });
                                      if (response.ok) {
                                        await loadCompanyUsers();
                                      } else {
                                        const error = await response.json();
                                        alert(error.error || 'Fehler beim Deaktivieren des Benutzers');
                                      }
                                    } catch (error) {
                                      console.error('Error deleting user:', error);
                                      alert('Fehler beim Deaktivieren des Benutzers');
                                    }
                                  }
                                }}
                                className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 transition-colors"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Deaktivieren
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingUser ? 'Benutzer bearbeiten' : 'Neuen Benutzer hinzufügen'}
                </h3>
              </div>
            </div>
            <div className="p-6">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const url = editingUser 
                    ? `/api/company-users/${editingUser.id}`
                    : '/api/company-users';
                  const method = editingUser ? 'PATCH' : 'POST';
                  
                  const response = await fetch(url, {
                    method,
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(userFormData),
                  });

                  if (response.ok) {
                    await loadCompanyUsers();
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserFormData({
                      email: '',
                      firstName: '',
                      lastName: '',
                      phone: '',
                      role: 'EDITOR'
                    });
                  } else {
                    const error = await response.json();
                    alert(error.error || 'Fehler beim Speichern');
                  }
                } catch (error) {
                  console.error('Error saving user:', error);
                  alert('Fehler beim Speichern');
                }
              }}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vorname *
                    </label>
                    <input
                      type="text"
                      value={userFormData.firstName}
                      onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nachname *
                    </label>
                    <input
                      type="text"
                      value={userFormData.lastName}
                      onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rolle *
                  </label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as 'ADMIN' | 'EDITOR' | 'VIEWER' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="ADMIN">Admin (kann alles verwalten)</option>
                    <option value="EDITOR">Editor (kann Anfragen stellen, nur eigene Daten ändern)</option>
                    <option value="VIEWER">Betrachter (nur ansehen, keine Anfragen)</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserModal(false);
                    setEditingUser(null);
                    setUserFormData({
                      email: '',
                      firstName: '',
                      lastName: '',
                      phone: '',
                      role: 'EDITOR'
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium transition-colors"
                >
                  {editingUser ? 'Speichern' : 'Benutzer hinzufügen'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}