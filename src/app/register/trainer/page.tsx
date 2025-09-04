"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { saveTrainerData } from "@/lib/session";
import { TopicSelector } from "@/components/TopicSelector";
import { useToast } from "@/components/Toast";
import { RegistrationFormData } from "@/lib/types";

function TrainerRegistrationContent() {
  const router = useRouter();
  const { addToast, ToastManager } = useToast();

  // Zustände für Registrierungsdaten
  const [countries, setCountries] = useState<{ id: number; name: string; code: string }[]>([]);

  const [formData, setFormData] = useState<RegistrationFormData>({
    salutation: "male",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneType: "mobile",
    street: "",
    zip: "",
    city: "",
    addressLine2: "",
    countryId: undefined, // Will be set to Germany ID when countries are loaded
    isVisitorAddress: false,
    isInvoiceAddress: false,
    isDeliveryAddress: false,
    isHeadquarterAddress: true,
    bio: "",
    profilePicture: "",
    topics: [],
    isCompany: false,
    companyName: "",
    dailyRate: undefined,
  });

  // Separate state for topic suggestions
  const [topicSuggestionsList, setTopicSuggestionsList] = useState<string[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Zustände für Themen-Suche
  const [topicSearch, setTopicSearch] = useState(""); // Eingabe des Trainers
  const [topicSuggestions, setTopicSuggestions] = useState<{ id: number; name: string; type?: 'existing' | 'suggestion'; status?: string }[]>([]);// Vorschläge aus der Datenbank

  // Ladezustand
  const [loading, setLoading] = useState(false);

  // Lade Länder beim ersten Laden der Seite
  useEffect(() => {
    const loadCountries = async () => {
      try {
        // For now, we'll create a simple countries API endpoint or use hardcoded data
        // In a real app, you'd fetch this from the API
        const hardcodedCountries = [
          { id: 1, name: 'Deutschland', code: 'DE' },
          { id: 2, name: 'Österreich', code: 'AT' },
          { id: 3, name: 'Schweiz', code: 'CH' },
          { id: 4, name: 'Frankreich', code: 'FR' },
          { id: 5, name: 'Niederlande', code: 'NL' },
          { id: 6, name: 'Belgien', code: 'BE' },
          { id: 7, name: 'Luxemburg', code: 'LU' },
          { id: 8, name: 'Dänemark', code: 'DK' },
          { id: 9, name: 'Schweden', code: 'SE' },
          { id: 10, name: 'Norwegen', code: 'NO' },
          { id: 11, name: 'Finnland', code: 'FI' },
          { id: 12, name: 'Estland', code: 'EE' },
          { id: 13, name: 'Lettland', code: 'LV' },
          { id: 14, name: 'Litauen', code: 'LT' },
          { id: 15, name: 'Polen', code: 'PL' },
          { id: 16, name: 'Tschechien', code: 'CZ' },
          { id: 17, name: 'Slowakei', code: 'SK' },
          { id: 18, name: 'Ungarn', code: 'HU' },
          { id: 19, name: 'Slowenien', code: 'SI' },
          { id: 20, name: 'Kroatien', code: 'HR' },
          { id: 21, name: 'Serbien', code: 'RS' },
          { id: 22, name: 'Bosnien und Herzegowina', code: 'BA' },
          { id: 23, name: 'Montenegro', code: 'ME' },
          { id: 24, name: 'Albanien', code: 'AL' },
          { id: 25, name: 'Nordmazedonien', code: 'MK' },
          { id: 26, name: 'Bulgarien', code: 'BG' },
          { id: 27, name: 'Rumänien', code: 'RO' },
          { id: 28, name: 'Moldau', code: 'MD' },
          { id: 29, name: 'Ukraine', code: 'UA' },
          { id: 30, name: 'Weißrussland', code: 'BY' },
          { id: 31, name: 'Russland', code: 'RU' },
          { id: 32, name: 'Georgien', code: 'GE' },
          { id: 33, name: 'Armenien', code: 'AM' },
          { id: 34, name: 'Aserbaidschan', code: 'AZ' },
          { id: 35, name: 'Kasachstan', code: 'KZ' },
          { id: 36, name: 'Kirgisistan', code: 'KG' },
          { id: 37, name: 'Tadschikistan', code: 'TJ' },
          { id: 38, name: 'Turkmenistan', code: 'TM' },
          { id: 39, name: 'Usbekistan', code: 'UZ' },
          { id: 40, name: 'Vereinigtes Königreich', code: 'GB' },
          { id: 41, name: 'Irland', code: 'IE' },
          { id: 42, name: 'Island', code: 'IS' },
          { id: 43, name: 'Portugal', code: 'PT' },
          { id: 44, name: 'Spanien', code: 'ES' },
          { id: 45, name: 'Italien', code: 'IT' },
          { id: 46, name: 'San Marino', code: 'SM' },
          { id: 47, name: 'Vatikanstadt', code: 'VA' },
          { id: 48, name: 'Malta', code: 'MT' },
          { id: 49, name: 'Griechenland', code: 'GR' },
          { id: 50, name: 'Zypern', code: 'CY' },
          { id: 51, name: 'Türkei', code: 'TR' },
          { id: 52, name: 'Israel', code: 'IL' },
          { id: 53, name: 'Jordanien', code: 'JO' },
          { id: 54, name: 'Libanon', code: 'LB' },
          { id: 55, name: 'Syrien', code: 'SY' },
          { id: 56, name: 'Saudi-Arabien', code: 'SA' },
          { id: 57, name: 'Vereinigte Arabische Emirate', code: 'AE' },
          { id: 58, name: 'Oman', code: 'OM' },
          { id: 59, name: 'Jemen', code: 'YE' },
          { id: 60, name: 'Katar', code: 'QA' },
          { id: 61, name: 'Kuwait', code: 'KW' },
          { id: 62, name: 'Bahrain', code: 'BH' },
          { id: 63, name: 'Irak', code: 'IQ' },
          { id: 64, name: 'Iran', code: 'IR' },
          { id: 65, name: 'Afghanistan', code: 'AF' },
          { id: 66, name: 'Pakistan', code: 'PK' },
          { id: 67, name: 'Indien', code: 'IN' },
          { id: 68, name: 'Bangladesch', code: 'BD' },
          { id: 69, name: 'Nepal', code: 'NP' },
          { id: 70, name: 'Bhutan', code: 'BT' },
          { id: 71, name: 'Sri Lanka', code: 'LK' },
          { id: 72, name: 'Maldiven', code: 'MV' },
          { id: 73, name: 'Thailand', code: 'TH' },
          { id: 74, name: 'Kambodscha', code: 'KH' },
          { id: 75, name: 'Laos', code: 'LA' },
          { id: 76, name: 'Vietnam', code: 'VN' },
          { id: 77, name: 'Myanmar', code: 'MM' },
          { id: 78, name: 'Malaysia', code: 'MY' },
          { id: 79, name: 'Singapur', code: 'SG' },
          { id: 80, name: 'Indonesien', code: 'ID' },
          { id: 81, name: 'Brunei', code: 'BN' },
          { id: 82, name: 'Philippinen', code: 'PH' },
          { id: 83, name: 'Osttimor', code: 'TL' },
          { id: 84, name: 'Australien', code: 'AU' },
          { id: 85, name: 'Neuseeland', code: 'NZ' },
          { id: 86, name: 'Fidschi', code: 'FJ' },
          { id: 87, name: 'Papua-Neuguinea', code: 'PG' },
          { id: 88, name: 'Salomonen', code: 'SB' },
          { id: 89, name: 'Vanuatu', code: 'VU' },
          { id: 90, name: 'Samoa', code: 'WS' },
          { id: 91, name: 'Kiribati', code: 'KI' },
          { id: 92, name: 'Tuvalu', code: 'TV' },
          { id: 93, name: 'Tonga', code: 'TO' },
          { id: 94, name: 'Niue', code: 'NU' },
          { id: 95, name: 'Cookinseln', code: 'CK' },
          { id: 96, name: 'Amerikanisch-Samoa', code: 'AS' },
          { id: 97, name: 'Nördliche Marianen', code: 'MP' },
          { id: 98, name: 'Guam', code: 'GU' },
          { id: 99, name: 'Palau', code: 'PW' },
          { id: 100, name: 'Mikronesien', code: 'FM' },
          { id: 101, name: 'Marshallinseln', code: 'MH' },
          { id: 102, name: 'Nauru', code: 'NR' },
          { id: 103, name: 'Japan', code: 'JP' },
          { id: 104, name: 'Südkorea', code: 'KR' },
          { id: 105, name: 'Nordkorea', code: 'KP' },
          { id: 106, name: 'China', code: 'CN' },
          { id: 107, name: 'Mongolei', code: 'MN' },
          { id: 108, name: 'Taiwan', code: 'TW' },
          { id: 109, name: 'Hongkong', code: 'HK' },
          { id: 110, name: 'Macau', code: 'MO' },
          { id: 111, name: 'Kanada', code: 'CA' },
          { id: 112, name: 'Vereinigte Staaten', code: 'US' },
          { id: 113, name: 'Mexiko', code: 'MX' },
          { id: 114, name: 'Guatemala', code: 'GT' },
          { id: 115, name: 'Belize', code: 'BZ' },
          { id: 116, name: 'El Salvador', code: 'SV' },
          { id: 117, name: 'Honduras', code: 'HN' },
          { id: 118, name: 'Nicaragua', code: 'NI' },
          { id: 119, name: 'Costa Rica', code: 'CR' },
          { id: 120, name: 'Panama', code: 'PA' },
          { id: 121, name: 'Kolumbien', code: 'CO' },
          { id: 122, name: 'Venezuela', code: 'VE' },
          { id: 123, name: 'Guyana', code: 'GY' },
          { id: 124, name: 'Suriname', code: 'SR' },
          { id: 125, name: 'Französisch-Guayana', code: 'GF' },
          { id: 126, name: 'Brasilien', code: 'BR' },
          { id: 127, name: 'Bolivien', code: 'BO' },
          { id: 128, name: 'Chile', code: 'CL' },
          { id: 129, name: 'Argentinien', code: 'AR' },
          { id: 130, name: 'Uruguay', code: 'UY' },
          { id: 131, name: 'Paraguay', code: 'PY' },
          { id: 132, name: 'Ecuador', code: 'EC' },
          { id: 133, name: 'Peru', code: 'PE' },
          { id: 134, name: 'Trinidad und Tobago', code: 'TT' },
          { id: 135, name: 'Barbados', code: 'BB' },
          { id: 136, name: 'Jamaika', code: 'JM' },
          { id: 137, name: 'Haiti', code: 'HT' },
          { id: 138, name: 'Dominikanische Republik', code: 'DO' },
          { id: 139, name: 'Kuba', code: 'CU' },
          { id: 140, name: 'Bahamas', code: 'BS' },
          { id: 141, name: 'Puerto Rico', code: 'PR' },
          { id: 142, name: 'Jungferninseln (USA)', code: 'VI' },
          { id: 143, name: 'Anguilla', code: 'AI' },
          { id: 144, name: 'Saint Kitts und Nevis', code: 'KN' },
          { id: 145, name: 'Antigua und Barbuda', code: 'AG' },
          { id: 146, name: 'Montserrat', code: 'MS' },
          { id: 147, name: 'Guadeloupe', code: 'GP' },
          { id: 148, name: 'Martinique', code: 'MQ' },
          { id: 149, name: 'Saint Lucia', code: 'LC' },
          { id: 150, name: 'Saint Vincent und die Grenadinen', code: 'VC' },
          { id: 151, name: 'Grenada', code: 'GD' },
          { id: 152, name: 'Aruba', code: 'AW' },
          { id: 153, name: 'Curaçao', code: 'CW' },
          { id: 154, name: 'Bonaire', code: 'BQ' },
          { id: 155, name: 'Saba', code: 'BQ' },
          { id: 156, name: 'Sint Eustatius', code: 'BQ' },
          { id: 157, name: 'Sint Maarten', code: 'SX' },
          { id: 158, name: 'Turks- und Caicosinseln', code: 'TC' },
          { id: 159, name: 'Cayman Islands', code: 'KY' },
          { id: 160, name: 'Bermuda', code: 'BM' },
          { id: 161, name: 'Grönland', code: 'GL' },
          { id: 162, name: 'Färöer', code: 'FO' },
          { id: 163, name: 'Ägypten', code: 'EG' },
          { id: 164, name: 'Libyen', code: 'LY' },
          { id: 165, name: 'Tunesien', code: 'TN' },
          { id: 166, name: 'Algerien', code: 'DZ' },
          { id: 167, name: 'Marokko', code: 'MA' },
          { id: 168, name: 'Westsahara', code: 'EH' },
          { id: 169, name: 'Mauretanien', code: 'MR' },
          { id: 170, name: 'Mali', code: 'ML' },
          { id: 171, name: 'Burkina Faso', code: 'BF' },
          { id: 172, name: 'Niger', code: 'NE' },
          { id: 173, name: 'Tschad', code: 'TD' },
          { id: 174, name: 'Sudan', code: 'SD' },
          { id: 175, name: 'Eritrea', code: 'ER' },
          { id: 176, name: 'Dschibuti', code: 'DJ' },
          { id: 177, name: 'Somalia', code: 'SO' },
          { id: 178, name: 'Äthiopien', code: 'ET' },
          { id: 179, name: 'Kenia', code: 'KE' },
          { id: 180, name: 'Tansania', code: 'TZ' },
          { id: 181, name: 'Uganda', code: 'UG' },
          { id: 182, name: 'Ruanda', code: 'RW' },
          { id: 183, name: 'Burundi', code: 'BI' },
          { id: 184, name: 'Mosambik', code: 'MZ' },
          { id: 185, name: 'Malawi', code: 'MW' },
          { id: 186, name: 'Sambia', code: 'ZM' },
          { id: 187, name: 'Simbabwe', code: 'ZW' },
          { id: 188, name: 'Botswana', code: 'BW' },
          { id: 189, name: 'Namibia', code: 'NA' },
          { id: 190, name: 'Südafrika', code: 'ZA' },
          { id: 191, name: 'Lesotho', code: 'LS' },
          { id: 192, name: 'Eswatini', code: 'SZ' },
          { id: 193, name: 'Komoren', code: 'KM' },
          { id: 194, name: 'Madagaskar', code: 'MG' },
          { id: 195, name: 'Mauritius', code: 'MU' },
          { id: 196, name: 'Seychellen', code: 'SC' },
          { id: 197, name: 'Kap Verde', code: 'CV' },
          { id: 198, name: 'São Tomé und Príncipe', code: 'ST' },
          { id: 199, name: 'Äquatorialguinea', code: 'GQ' },
          { id: 200, name: 'Gabun', code: 'GA' },
          { id: 201, name: 'Republik Kongo', code: 'CG' },
          { id: 202, name: 'Demokratische Republik Kongo', code: 'CD' },
          { id: 203, name: 'Angola', code: 'AO' },
          { id: 204, name: 'Namibia', code: 'NA' },
          { id: 205, name: 'Zimbabwe', code: 'ZW' },
          { id: 206, name: 'Botsuana', code: 'BW' },
          { id: 207, name: 'Sambia', code: 'ZM' },
          { id: 208, name: 'Malawi', code: 'MW' },
          { id: 209, name: 'Tansania', code: 'TZ' },
          { id: 210, name: 'Kenia', code: 'KE' },
          { id: 211, name: 'Uganda', code: 'UG' },
          { id: 212, name: 'Ruanda', code: 'RW' },
          { id: 213, name: 'Burundi', code: 'BI' },
          { id: 214, name: 'Südafrika', code: 'ZA' },
          { id: 215, name: 'Namibia', code: 'NA' },
        ];
        setCountries(hardcodedCountries);

        // Set Germany as default country (ID 1)
        setFormData(prev => ({ ...prev, countryId: 1 }));
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();
  }, []);

  // Handler für Registrierungs-Änderungen
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'dailyRate' ? (value ? parseFloat(value) : undefined) : value,
    }));
  };

  // Handler für Checkbox-Änderungen
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Handler für Themen-Auswahl
  const handleTopicSelect = (topicName: string, isSuggestion?: boolean) => {
    if (isSuggestion) {
      // Add to topic suggestions list
      if (!topicSuggestionsList.includes(topicName)) {
        setTopicSuggestionsList(prev => [...prev, topicName]);
      }
    } else {
      // Add to main topics
      if (!formData.topics.includes(topicName)) {
        setFormData(prev => ({
          ...prev,
          topics: [...prev.topics, topicName],
        }));
      }
    }
  };

  // Handler für Themen-Entfernung
  const handleTopicRemove = (topicName: string, isSuggestion?: boolean) => {
    if (isSuggestion) {
      setTopicSuggestionsList(prev => prev.filter(t => t !== topicName));
    } else {
      setFormData(prev => ({
        ...prev,
        topics: prev.topics.filter(t => t !== topicName),
      }));
    }
  };

  // Handler für Themen-Suche
  const handleTopicSearch = async (searchTerm: string) => {
    // Handle empty search term
    if (!searchTerm || searchTerm.length < 2) {
      setTopicSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/topics?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setTopicSuggestions(data.map((topic: { id: number; name: string; status: string }) => ({
          id: topic.id,
          name: topic.name,
          type: 'existing',
          status: topic.status,
        })));
      }
    } catch (error) {
      console.error('Error searching topics:', error);
    }
  };

  // Handler für Registrierungs-Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Password validation removed - using email login links instead

      // 1) Register using local API
      const registerResponse = await fetch('/api/register-trainer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: `${formData.street}, ${formData.zip} ${formData.city}`,
          countryId: formData.countryId,
          topics: formData.topics,
          topicSuggestions: topicSuggestionsList,
          bio: formData.bio,
          dailyRate: formData.dailyRate,
          profilePicture: formData.profilePicture,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const registerData = await registerResponse.json();

      // 2) Save trainer data to localStorage for immediate use
      saveTrainerData(registerData.trainer);

      // 3) Show success message and redirect to login
      setSuccessMessage('Registration erfolgreich! Überprüfen Sie Ihre E-Mail für den Login-Link.');
      addToast('Registrierung erfolgreich! Sie können sich jetzt einloggen.', 'success');

      // Redirect to login page after short delay
      setTimeout(() => {
        router.push('/register');
      }, 2000);
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError((err as Error)?.message || 'Registration failed');
      addToast('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handler für Profilbild-Upload
  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setFormData(prev => ({ ...prev, profilePicture: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handler für Profilbild-Entfernung
  const handleRemoveProfilePicture = () => {
    setFormData(prev => ({ ...prev, profilePicture: '' }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Trainer Registrierung</h1>
            <p className="text-gray-600">Erstellen Sie Ihr Trainerprofil und finden Sie neue Aufträge</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{successMessage}</p>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            {/* Personal Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Persönliche Informationen</h3>

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

              <div className="mt-4">
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    placeholder="E-Mail-Adresse"
                    value={formData.email}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="email" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    E-Mail-Adresse
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    placeholder="Telefonnummer"
                    value={formData.phone}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="phone" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Telefonnummer
                  </label>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Adresse</h3>

              <div className="relative mb-4">
                <input
                  type="text"
                  name="street"
                  id="street"
                  placeholder="Straße und Hausnummer"
                  value={formData.street}
                  onChange={handleRegisterChange}
                  className="form-input"
                  required
                />
                <label htmlFor="street" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Straße und Hausnummer
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    name="zip"
                    id="zip"
                    placeholder="PLZ"
                    value={formData.zip}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="zip" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    PLZ
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="city"
                    id="city"
                    placeholder="Ort"
                    value={formData.city}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="city" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Ort
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <div className="relative">
                  <select
                    name="countryId"
                    id="countryId"
                    value={formData.countryId || ''}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  >
                    <option value="">Land auswählen</option>
                    {countries.map(country => (
                      <option key={country.id} value={country.id}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="countryId" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Land
                  </label>
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Professionelle Informationen</h3>

              <div className="relative mb-4">
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Beschreiben Sie Ihre Expertise und Erfahrung"
                  value={formData.bio}
                  onChange={handleRegisterChange}
                  className="form-input"
                  rows={4}
                  required
                />
                <label htmlFor="bio" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Profilbeschreibung
                </label>
              </div>

              <div className="relative mb-4">
                <input
                  type="number"
                  name="dailyRate"
                  id="dailyRate"
                  placeholder="Tageshonorar in EUR"
                  value={formData.dailyRate || ''}
                  onChange={handleRegisterChange}
                  className="form-input"
                  step="0.01"
                  min="0"
                />
                <label htmlFor="dailyRate" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Tageshonorar (EUR)
                </label>
              </div>

              {/* Topics */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fachgebiete
                </label>
                <TopicSelector
                  topics={formData.topics}
                  topicSuggestions={topicSuggestionsList}
                  onAddTopic={handleTopicSelect}
                  onRemoveTopic={handleTopicRemove}
                  searchTerm={topicSearch}
                  onSearchChange={setTopicSearch}
                  onSearch={handleTopicSearch}
                  suggestions={topicSuggestions}
                />
              </div>

              {/* Profile Picture */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profilbild
                </label>
                <div className="flex items-center space-x-4">
                  {formData.profilePicture && (
                    <div className="relative">
                      <img
                        src={formData.profilePicture}
                        alt="Profile preview"
                        className="w-20 h-20 object-cover rounded-full border"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfilePicture}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                      id="profilePicture"
                    />
                    <label
                      htmlFor="profilePicture"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 text-sm"
                    >
                      {formData.profilePicture ? 'Ändern' : 'Hochladen'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Registrierung läuft...' : 'Als Trainer registrieren'}
              </button>
            </div>
          </form>

          {/* Back to main page */}
          <div className="text-center mt-6">
            <a href="/" className="text-gray-600 hover:text-gray-800">
              ← Zurück zur Startseite
            </a>
          </div>
        </div>
      </div>
      <ToastManager />
    </div>
  );
}

export default function TrainerRegistration() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center"><div className="text-xl">Laden...</div></div>}>
      <TrainerRegistrationContent />
    </Suspense>
  );
}
