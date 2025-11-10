"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveTrainerData, saveCompanyData } from "@/lib/session";
import { Trainer } from "@/lib/types";
import { TopicSelector, TopicWithLevel, ExpertiseLevel } from "@/components/TopicSelector";
import { canEditCompany, canManageUsers } from "@/lib/permissions";
import { useToast } from "@/components/Toast";

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
  const { addToast, ToastManager } = useToast();
  const [user, setUser] = useState<Trainer | TrainingCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [countries, setCountries] = useState<{id: number, name: string, code: string}[]>([]);
  
  // Initial state for change detection
  const [initialFormData, setInitialFormData] = useState<any>({});
  const [initialTopics, setInitialTopics] = useState<TopicWithLevel[]>([]);
  const [initialTopicSuggestions, setInitialTopicSuggestions] = useState<string[]>([]);
  const [initialOfferedTrainingTypes, setInitialOfferedTrainingTypes] = useState<string[]>([]);
  
  // Track if there are changes (for re-rendering)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
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
        const users = data.users || [];
        // Get current user ID from session
        const { getCompanyData } = await import('@/lib/session');
        const currentUser = getCompanyData();
        const currentUserId = currentUser?.id;
        
        // Sort: current user (main user) at the bottom, others by role and creation date
        const sortedUsers = users.sort((a: any, b: any) => {
          // If one is the current user, put it at the end
          if (a.id === currentUserId && b.id !== currentUserId) return 1;
          if (b.id === currentUserId && a.id !== currentUserId) return -1;
          // Otherwise sort by role (ADMIN first) then by creation date
          if (a.role !== b.role) {
            const roleOrder = { ADMIN: 1, EDITOR: 2, VIEWER: 3 };
            return (roleOrder[a.role as keyof typeof roleOrder] || 99) - (roleOrder[b.role as keyof typeof roleOrder] || 99);
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        
        setCompanyUsers(sortedUsers);
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
    console.log('🚀 loadProfile called');
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
          const formDataObj = {
            companyName: data.company.companyName,
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
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
            companyType: data.company.companyType,
          };
          setFormData(formDataObj);
          const initialData = JSON.parse(JSON.stringify(formDataObj));
          console.log('📥 Setting initialFormData for company (from session):', initialData);
          setInitialFormData(initialData);
          return; // Exit early
        }
      }
      
      // If localStorage is empty, try both APIs to determine user type
      if (!currentUser || !currentUser.userType || Object.keys(currentUser).length === 0) {
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
          const formDataObj = {
            companyName: data.company.companyName,
            street: data.company.street,
            houseNumber: data.company.houseNumber,
            zipCode: data.company.zipCode,
            city: data.company.city,
            countryId: data.company.country?.id || (countries.find(c => c.code === 'DE')?.id),
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            companyType: data.company.companyType,
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
          };
          setFormData(formDataObj);
          const initialData = JSON.parse(JSON.stringify(formDataObj));
          console.log('📥 Setting initialFormData for company (early return):', initialData);
          setInitialFormData(initialData);
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
          const formDataObj = {
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
          };
          setFormData(formDataObj);
          setInitialFormData(JSON.parse(JSON.stringify(formDataObj)));
          
          // Load topics and suggestions - handle both old format (string[]) and new format (TopicWithLevel[])
          const topicsData = data.topics || [];
          console.log('Loading topics from API response:', { topicsData, rawData: data });
          const mappedTopics = topicsData.map((t: string | TopicWithLevel) => 
            typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
          );
          console.log('Mapped topics for state:', mappedTopics);
          // Sort topics by level when loading
          const sortedTopics = sortTopicsByLevel(mappedTopics);
          setTopics(sortedTopics);
          setInitialTopics(JSON.parse(JSON.stringify(sortedTopics)));
          setTopicSuggestions(data.pendingSuggestions || []);
          setInitialTopicSuggestions([...(data.pendingSuggestions || [])]);
          setInitialOfferedTrainingTypes([...(data.offeredTrainingTypes || [])]);
          return; // Exit early
        }
        
        // If both failed, show error
        console.error('Failed to load profile from both APIs');
        return;
      }

      if (currentUser && currentUser.userType === 'TRAINING_COMPANY') {
        // Load training company profile
        const response = await fetch('/api/training-company/profile');
        console.log('Training company profile response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Training company profile data:', data);
          setUser(data.company);
          const formDataObj = {
            companyName: data.company.companyName,
            street: data.company.street,
            houseNumber: data.company.houseNumber,
            zipCode: data.company.zipCode,
            city: data.company.city,
            countryId: data.company.country?.id || (countries.find(c => c.code === 'DE')?.id),
            bio: data.company.bio,
            logo: data.company.logo,
            website: data.company.website,
            industry: data.company.industry,
            employees: data.company.employees,
            companyType: data.company.companyType,
            vatId: data.company.vatId,
            billingEmail: data.company.billingEmail,
            billingNotes: data.company.billingNotes,
            iban: data.company.iban,
            taxId: data.company.taxId,
          };
          setFormData(formDataObj);
          setInitialFormData(JSON.parse(JSON.stringify(formDataObj)));
        }
      } else {
        // Load trainer profile
        const response = await fetch('/api/trainer/profile');
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          const formDataObj = {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            street: data.street,
            houseNumber: data.houseNumber,
            zipCode: data.zipCode,
            city: data.city,
            countryId: data.country?.id || (countries.find(c => c.code === 'DE')?.id),
            bio: data.bio,
            profilePicture: data.profilePicture,
            iban: data.iban,
            taxId: data.taxId,
            companyName: data.companyName,
            isCompany: data.isCompany,
            dailyRate: data.dailyRate,
            offeredTrainingTypes: data.offeredTrainingTypes || [],
            travelRadius: data.travelRadius,
          };
          setFormData(formDataObj);
          setInitialFormData(JSON.parse(JSON.stringify(formDataObj)));
          
          // Load topics and suggestions - handle both old format (string[]) and new format (TopicWithLevel[])
          const topicsData = data.topics || [];
          console.log('Loading topics from API (company user path):', { topicsData, rawData: data });
          const mappedTopics = topicsData.map((t: string | TopicWithLevel) => 
            typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
          );
          console.log('Mapped topics for state (company user path):', mappedTopics);
          // Sort topics by level when loading
          const sortedTopics = sortTopicsByLevel(mappedTopics);
          setTopics(sortedTopics);
          setInitialTopics(JSON.parse(JSON.stringify(sortedTopics)));
          setTopicSuggestions(data.pendingSuggestions || []);
          setInitialTopicSuggestions([...(data.pendingSuggestions || [])]);
          setInitialOfferedTrainingTypes([...(data.offeredTrainingTypes || [])]);
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
        console.log('Profile update response:', data);
        
        if (user?.userType === 'TRAINING_COMPANY') {
          if (data.company) {
            setUser(data.company);
            saveCompanyData(data.company);
            // Update initial state after successful save
            const formDataObj = {
              companyName: data.company.companyName,
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
              vatId: data.company.vatId,
              billingEmail: data.company.billingEmail,
              billingNotes: data.company.billingNotes,
              iban: data.company.iban,
              taxId: data.company.taxId,
              companyType: data.company.companyType,
            };
            setInitialFormData(JSON.parse(JSON.stringify(formDataObj)));
          } else {
            console.warn('Company data missing in response');
          }
        } else {
          if (data.trainer) {
            setUser(data.trainer);
            saveTrainerData(data.trainer);
            // Reload topics and suggestions after save - handle both formats
            console.log('Profile update response - trainer topics:', data.trainer.topics);
            if (data.trainer.topics && Array.isArray(data.trainer.topics)) {
              const topicsData = data.trainer.topics;
              const mappedTopics = topicsData.map((t: string | TopicWithLevel) => 
                typeof t === 'string' ? { name: t, level: 'GRUNDLAGE' as ExpertiseLevel } : t
              );
              console.log('Setting topics after update:', mappedTopics);
              // Sort topics by level after update
              const sortedTopics = sortTopicsByLevel(mappedTopics);
              setTopics(sortedTopics);
              setInitialTopics(JSON.parse(JSON.stringify(sortedTopics)));
            } else {
              console.warn('Topics data missing or not an array:', data.trainer.topics);
              // Reload profile to get latest topics
              setTimeout(() => loadProfile(), 500);
            }
            if (data.trainer.pendingSuggestions && Array.isArray(data.trainer.pendingSuggestions)) {
              setTopicSuggestions(data.trainer.pendingSuggestions);
              setInitialTopicSuggestions([...data.trainer.pendingSuggestions]);
            }
            // Update initial form data and training types
            const formDataObj = {
              firstName: data.trainer.firstName,
              lastName: data.trainer.lastName,
              email: data.trainer.email,
              phone: data.trainer.phone,
              street: data.trainer.street,
              houseNumber: data.trainer.houseNumber,
              zipCode: data.trainer.zipCode,
              city: data.trainer.city,
              countryId: data.trainer.country?.id,
              bio: data.trainer.bio,
              profilePicture: data.trainer.profilePicture,
              iban: data.trainer.iban,
              taxId: data.trainer.taxId,
              companyName: data.trainer.companyName,
              isCompany: data.trainer.isCompany,
              dailyRate: data.trainer.dailyRate,
              offeredTrainingTypes: data.trainer.offeredTrainingTypes || [],
              travelRadius: data.trainer.travelRadius,
            };
            setInitialFormData(JSON.parse(JSON.stringify(formDataObj)));
            setInitialOfferedTrainingTypes([...(data.trainer.offeredTrainingTypes || [])]);
          } else {
            console.warn('Trainer data missing in response:', data);
            // Try to reload profile data
            loadProfile();
          }
        }
        addToast('Profil erfolgreich aktualisiert!', 'success');
      } else {
        const error = await response.json();
        addToast(`Fehler: ${error.error}`, 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      addToast('Fehler beim Aktualisieren des Profils', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper function to deep compare objects
  const deepEqual = (obj1: any, obj2: any): boolean => {
    if (obj1 === obj2) return true;
    
    // Handle null/undefined/empty string normalization for comparison
    const normalize = (val: any): any => {
      if (val === undefined || val === null || val === '') return null;
      return val;
    };
    
    const norm1 = normalize(obj1);
    const norm2 = normalize(obj2);
    
    if (norm1 === norm2) return true;
    if (norm1 == null && norm2 == null) return true;
    if (norm1 == null || norm2 == null) return false;
    
    if (typeof norm1 !== 'object' || typeof norm2 !== 'object') {
      return norm1 === norm2;
    }
    
    const keys1 = Object.keys(norm1);
    const keys2 = Object.keys(norm2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      const val1 = normalize(norm1[key]);
      const val2 = normalize(norm2[key]);
      if (!deepEqual(val1, val2)) return false;
    }
    
    return true;
  };

  // Helper function to compare arrays of TopicWithLevel
  const topicsEqual = (topics1: TopicWithLevel[], topics2: TopicWithLevel[]): boolean => {
    if (topics1.length !== topics2.length) return false;
    const sorted1 = [...topics1].sort((a, b) => a.name.localeCompare(b.name));
    const sorted2 = [...topics2].sort((a, b) => a.name.localeCompare(b.name));
    return sorted1.every((t1, i) => t1.name === sorted2[i].name && t1.level === sorted2[i].level);
  };

  // Helper function to compare arrays of strings
  const arraysEqual = (arr1: string[], arr2: string[]): boolean => {
    if (arr1.length !== arr2.length) return false;
    const sorted1 = [...arr1].sort();
    const sorted2 = [...arr2].sort();
    return sorted1.every((val, i) => val === sorted2[i]);
  };

  // Check if there are any changes (internal function)
  // Using useCallback to memoize and ensure it's available for useEffect
  const checkForChanges = useCallback((): boolean => {
    console.log('🔍 checkForChanges called');
    console.log('  initialFormData keys:', Object.keys(initialFormData || {}));
    console.log('  formData keys:', Object.keys(formData || {}));
    
    // If initialFormData is empty (not yet loaded), don't show changes
    if (!initialFormData || Object.keys(initialFormData).length === 0) {
      console.log('  ❌ No initialFormData, returning false');
      return false;
    }

    // If formData is empty (not yet loaded), don't show changes
    if (!formData || Object.keys(formData).length === 0) {
      console.log('  ❌ No formData, returning false');
      return false;
    }

    // Normalize function for comparison
    const normalize = (val: any): any => {
      if (val === undefined || val === null || val === '') return null;
      if (typeof val === 'string' && val.trim() === '') return null;
      return val;
    };

    // Compare form data - merge keys from both objects to catch missing fields
    const allKeys = new Set([...Object.keys(formData), ...Object.keys(initialFormData)]);
    console.log('  🔑 Comparing keys:', Array.from(allKeys));
    
    for (const key of allKeys) {
      const formVal = formData[key];
      const initialVal = initialFormData[key];
      
      const normForm = normalize(formVal);
      const normInitial = normalize(initialVal);
      
      console.log(`  📊 ${key}: form="${formVal}" (norm: ${normForm}) vs initial="${initialVal}" (norm: ${normInitial})`);
      
      // Handle objects and arrays
      if (typeof normForm === 'object' && typeof normInitial === 'object' && normForm !== null && normInitial !== null) {
        if (Array.isArray(normForm) && Array.isArray(normInitial)) {
          if (!arraysEqual(normForm, normInitial)) {
            console.log(`  ✅ CHANGE DETECTED: ${key} (arrays differ)`);
            return true;
          }
        } else if (!Array.isArray(normForm) && !Array.isArray(normInitial)) {
          if (!deepEqual(normForm, normInitial)) {
            console.log(`  ✅ CHANGE DETECTED: ${key} (objects differ)`);
            return true;
          }
        } else {
          // One is array, one is object
          console.log(`  ✅ CHANGE DETECTED: ${key} (type mismatch)`);
          return true;
        }
      } else if (normForm !== normInitial) {
        console.log(`  ✅ CHANGE DETECTED: ${key} (${normForm} !== ${normInitial})`);
        return true;
      }
    }

    // For trainers, also compare topics, suggestions, and training types
    if (user?.userType !== 'TRAINING_COMPANY') {
      if (!topicsEqual(topics, initialTopics)) {
        console.log('  ✅ CHANGE DETECTED: topics differ');
        return true;
      }
      if (!arraysEqual(topicSuggestions, initialTopicSuggestions)) {
        console.log('  ✅ CHANGE DETECTED: topicSuggestions differ');
        return true;
      }
      const currentTrainingTypes = formData.offeredTrainingTypes || [];
      if (!arraysEqual(currentTrainingTypes, initialOfferedTrainingTypes)) {
        console.log('  ✅ CHANGE DETECTED: offeredTrainingTypes differ');
        return true;
      }
    }

    console.log('  ❌ No changes detected');
    return false;
  }, [formData, initialFormData, topics, initialTopics, topicSuggestions, initialTopicSuggestions, initialOfferedTrainingTypes, user]);

  // Update hasUnsavedChanges whenever formData, topics, or other relevant state changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for change detection');
    const hasChanges = checkForChanges();
    console.log('  Result:', hasChanges);
    setHasUnsavedChanges(hasChanges);
    console.log('  hasUnsavedChanges set to:', hasChanges);
  }, [checkForChanges]);

  const handleInputChange = (field: string, value: string | number | boolean | string[]) => {
    console.log(`✏️ handleInputChange: ${field} = ${value}`);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log(`  Updated formData:`, newData);
      return newData;
    });
  };

  // Helper function to sort topics by expertise level: EXPERTE first, then FORTGESCHRITTEN, then GRUNDLAGEN
  const sortTopicsByLevel = (topicsList: TopicWithLevel[]): TopicWithLevel[] => {
    const levelOrder: Record<ExpertiseLevel, number> = {
      'EXPERTE': 1,
      'FORTGESCHRITTEN': 2,
      'GRUNDLAGE': 3
    };
    return [...topicsList].sort((a, b) => {
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      // If same level, sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  // Topic handlers
  const handleTopicAdd = (topicName: string, level: ExpertiseLevel, isSuggestion?: boolean) => {
    if (isSuggestion) {
      if (!topicSuggestions.includes(topicName)) {
        setTopicSuggestions(prev => [...prev, topicName]);
      }
    } else {
      if (!topics.some(t => t.name === topicName)) {
        // Add topic and immediately sort
        setTopics(prev => sortTopicsByLevel([...prev, { name: topicName, level }]));
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
    <>
      <div className="fixed top-0 z-40 bg-white border-b border-gray-200 pl-[var(--content-left-padding)] pr-6 py-4 flex justify-between items-start" style={{ left: 'var(--sidebar-width, 256px)', right: 0, paddingLeft: '40px', paddingRight: '40px' }}>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.userType === 'TRAINING_COMPANY' ? 'Einstellungen' : 'Mein Profil'}
          </h1>
          <p className="text-gray-600 mt-1">
            {user?.userType === 'TRAINING_COMPANY'
              ? 'Verwalten Sie Ihr Unternehmensprofil und Benutzer'
              : 'Verwalten Sie Ihre persönlichen Daten und Kompetenzen'}
          </p>
        </div>
        {hasUnsavedChanges && (
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="px-6 py-2 bg-primary-500 text-white rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Speichere...' : 'Änderungen speichern'}
          </button>
        )}
      </div>
      <div className="pl-[var(--content-left-padding)] pr-6 pt-32 pb-6">

      {/* Profile Information Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 px-6 py-4 border-b border-primary-200">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-800">
              {user?.userType === 'TRAINING_COMPANY' ? 'Unternehmensinformationen' : 'Persönliche Daten'}
            </h2>
          </div>
        </div>
        <form id="profile-form" onSubmit={handleSubmit} className="p-6">
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

              {/* Company Information Fields - moved from "Zusätzliche Unternehmensinformationen" */}
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
            </>
          )}

          {/* Address Fields */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse {user?.userType === 'TRAINING_COMPANY' && '*'}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Straße {user?.userType === 'TRAINING_COMPANY' && '*'}
                </label>
                <input
                  type="text"
                  placeholder="Straße"
                  value={formData.street || ''}
                  onChange={(e) => handleInputChange('street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={user?.userType === 'TRAINING_COMPANY'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hausnummer {user?.userType === 'TRAINING_COMPANY' && '*'}
                </label>
                <input
                  type="text"
                  placeholder="Hausnummer"
                  value={formData.houseNumber || ''}
                  onChange={(e) => handleInputChange('houseNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={user?.userType === 'TRAINING_COMPANY'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PLZ {user?.userType === 'TRAINING_COMPANY' && '*'}
                </label>
                <input
                  type="text"
                  placeholder="PLZ"
                  value={formData.zipCode || ''}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={user?.userType === 'TRAINING_COMPANY'}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stadt {user?.userType === 'TRAINING_COMPANY' && '*'}
                </label>
                <input
                  type="text"
                  placeholder="Stadt"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={user?.userType === 'TRAINING_COMPANY'}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Land {user?.userType === 'TRAINING_COMPANY' && '*'}
                </label>
                <select
                  value={formData.countryId || (countries.find(c => c.code === 'DE')?.id || '')}
                  onChange={(e) => handleInputChange('countryId', parseInt(e.target.value) || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={user?.userType === 'TRAINING_COMPANY'}
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
                          const remaining = current.filter((t: string) => t !== 'ONLINE');
                          handleInputChange('offeredTrainingTypes', remaining);
                          // Clear travelRadius if only ONLINE remains or no types selected
                          if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === 'ONLINE')) {
                            handleInputChange('travelRadius', null);
                          }
                        }
                      }}
                      className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
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
                          const remaining = current.filter((t: string) => t !== 'HYBRID');
                          handleInputChange('offeredTrainingTypes', remaining);
                          // Clear travelRadius if only ONLINE remains or no types selected
                          if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === 'ONLINE')) {
                            handleInputChange('travelRadius', null);
                          }
                        }
                      }}
                      className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
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
                          const remaining = current.filter((t: string) => t !== 'VOR_ORT');
                          handleInputChange('offeredTrainingTypes', remaining);
                          // Clear travelRadius if only ONLINE remains or no types selected
                          if (remaining.length === 0 || (remaining.length === 1 && remaining[0] === 'ONLINE')) {
                            handleInputChange('travelRadius', null);
                          }
                        }
                      }}
                      className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
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
                    Reiseradius (km)
                  </label>
                  <input
                    type="number"
                    value={formData.travelRadius || ''}
                    onChange={(e) => handleInputChange('travelRadius', e.target.value ? parseInt(e.target.value) : null)}
                    min="0"
                    step="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="z.B. 50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximale Entfernung in Kilometern, die Sie für Vor-Ort-Trainings reisen können. 
                    Die Koordinaten werden automatisch basierend auf Ihrer Adresse berechnet.
                  </p>
                </div>
              )}
            </>
          )}

          {user?.userType === 'TRAINING_COMPANY' && (
            <>
              {/* Financial Data Section for Companies */}
              <div className="md:col-span-2 mt-6">
                <h2 className="text-lg font-semibold mb-4">Finanzdaten</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rechtsform
                </label>
                <select
                  value={formData.companyType || ''}
                  onChange={(e) => handleInputChange('companyType', e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Rechtsform auswählen</option>
                  <option value="GMBH">GmbH</option>
                  <option value="GBR">GbR</option>
                  <option value="UG">UG (haftungsbeschränkt)</option>
                  <option value="EK">E.K. (Einzelkaufmann/-frau)</option>
                  <option value="AG">AG</option>
                  <option value="KG">KG</option>
                  <option value="OHG">OHG</option>
                  <option value="PARTG">PartG</option>
                  <option value="SONSTIGE">Sonstige</option>
                </select>
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

          {/* Finanzdaten - Only for trainers */}
          {user?.userType === 'TRAINER' && (
            <>
              <div className="md:col-span-2">
                <h2 className="text-lg font-semibold mb-4">Finanzdaten</h2>
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
                topics={sortTopicsByLevel(topics)}
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

        </form>
      </div>

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
                                  <span className="ml-2 text-xs font-semibold text-purple-600">(Hauptbenutzer)</span>
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
      <ToastManager />
      </div>
    </>
  );
}