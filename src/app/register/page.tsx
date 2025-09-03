"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { saveTrainerData } from "@/lib/session";
import { TopicSelector } from "@/components/TopicSelector";
import { CompanyToggle } from "@/components/CompanyToggle";
import { useToast } from "@/components/Toast";
import { RegistrationFormData, LoginFormData } from "@/lib/types";

function AuthFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast, ToastManager } = useToast();
  
  // Zustand für Login/Registrierung
  const [isRegistering, setIsRegistering] = useState(true);
  const [countries, setCountries] = useState<{ id: number; name: string; code: string }[]>([]);

  // Zustände für Registrierungsdaten
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

  // Zustände für Login-Daten
  const [loginData, setLoginData] = useState<LoginFormData>({
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loginMessage, setLoginMessage] = useState<string | null>(null);

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
          { id: 216, name: 'Angola', code: 'AO' },
          { id: 217, name: 'Mosambik', code: 'MZ' },
          { id: 218, name: 'Simbabwe', code: 'ZW' },
          { id: 219, name: 'Botsuana', code: 'BW' },
          { id: 220, name: 'Sambia', code: 'ZM' },
          { id: 221, name: 'Malawi', code: 'MW' },
          { id: 222, name: 'Tansania', code: 'TZ' },
          { id: 223, name: 'Kenia', code: 'KE' },
          { id: 224, name: 'Uganda', code: 'UG' },
          { id: 225, name: 'Ruanda', code: 'RW' },
          { id: 226, name: 'Burundi', code: 'BI' },
          { id: 227, name: 'Südafrika', code: 'ZA' }
        ];

        setCountries(hardcodedCountries);

        // Set Germany as default
        const germany = hardcodedCountries.find(c => c.code === 'DE');
        if (germany) {
          setFormData(prev => ({ ...prev, countryId: germany.id }));
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();
  }, []);

  // Wenn bereits Session vorhanden, direkt weiterleiten
  useEffect(() => {
    const token = localStorage.getItem("mr_token");
    const instructorId = localStorage.getItem("mr_instructor_id");
    if (token && instructorId) {
      router.push("/dashboard");
    }
  }, [searchParams, router]);

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
        const response = await fetch(`/api/topic-suggestions?query=${topicSearch}`);

        if (!response.ok) {
          console.warn(`API returned error status: ${response.status}`);
          setTopicSuggestions([]);
          return;
        }

        const data = await response.json();

        // Ensure data is an array, fallback to empty array if not
        if (Array.isArray(data)) {
          setTopicSuggestions(data);
        } else {
          console.warn("Received non-array data from API:", data);
          setTopicSuggestions([]);
        }
      } catch (error) {
        console.error("Error fetching topic suggestions:", error);
        setTopicSuggestions([]);
      }
    };

    const debounce = setTimeout(() => fetchTopics(), 300); // Debounce API calls
    return () => clearTimeout(debounce);
  }, [topicSearch]);

  // Thema hinzufügen
  const addTopic = (topicName: string, isSuggestion?: boolean) => {
    console.log(`Adding topic: ${topicName}, isSuggestion: ${isSuggestion}`);

    if (isSuggestion) {
      // Add to suggestions list instead of regular topics
      if (!topicSuggestionsList.includes(topicName)) {
        setTopicSuggestionsList(prev => [...prev, topicName]);
      }
    } else {
      // Add to regular topics
      if (!formData.topics.includes(topicName)) {
        setFormData((prev) => ({
          ...prev,
          topics: [...prev.topics, topicName],
        }));
      }
    }

    setTopicSearch('');
    setTopicSuggestions([]);
  };


  // Thema entfernen
  const removeTopic = (topic: string) => {
    console.log(`Removing topic: ${topic}`);

    // Check if it's a suggestion or regular topic
    if (topicSuggestionsList.includes(topic)) {
      setTopicSuggestionsList(prev => prev.filter(t => t !== topic));
    } else {
      setFormData((prev) => ({
        ...prev,
        topics: prev.topics.filter((t) => t !== topic),
      }));
    }
  };

  // Registrierung absenden
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
          profilePicture: formData.profilePicture,
          isCompany: formData.isCompany,
          companyName: formData.companyName,
          dailyRate: formData.dailyRate,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.message || 'Registrierung fehlgeschlagen');
      }

      const registerData = await registerResponse.json();

      // 2) Create login token and send email (for now, just create token)
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          action: 'request-link'
        }),
      });

      if (!loginResponse.ok) {
        console.warn('Could not create login token, but registration was successful');
      }

      // Store trainer data in cookies
      const trainerData = registerData.trainer;
      saveTrainerData(trainerData);

      // Show success toast and switch to login form
      addToast("Ihr Konto wurde erfolgreich registriert! Sie erhalten in Kürze einen Login-Link per E-Mail.", "success");
      setIsRegistering(false); // Switch to login form
    } catch (error) {
      console.error("Error during registration:", error);
      setError("Registrierung fehlgeschlagen. Bitte Eingaben prüfen und erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  // Login absenden (One-Time-Link)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoginMessage(null);
    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginData.email,
          action: 'request-link'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login-Link-Anforderung fehlgeschlagen');
      }

      const data = await response.json();

      // Show success message
      setLoginMessage(`Login-Link wurde per E-Mail versendet. Bitte prüfen Sie Ihr E-Mail-Postfach.`);

      // In development mode, also show the link in console for testing
      if (data.loginLink) {
        console.log('Login link (for development):', data.loginLink);
      }

    } catch (error) {
      console.error("Login error:", error);
      setError("Login-Link-Anforderung fehlgeschlagen. Bitte E-Mail-Adresse prüfen.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ptw-bg min-h-screen">
      <ToastManager />
      <div className="ptw-auth-card">
        <h2 className="text-3xl font-bold text-center mb-2">
          TRAINERPORTAL
        </h2>
        <p className="text-center text-gray-600 mb-8 text-sm">Registrieren Sie sich als Trainer oder melden Sie sich an</p>

        {/* Modern Toggle Switch */}
        <div className="flex items-center justify-center mb-8">
          <div className="ptw-toggle w-72">
            <div
              className="ptw-toggle-slider"
              style={{
                left: isRegistering ? '4px' : 'auto',
                right: isRegistering ? 'auto' : '4px'
              }}
            />
            <button
              type="button"
              onClick={() => setIsRegistering(true)}
              className={`ptw-toggle-button ${isRegistering ? 'text-white' : 'text-gray-600'}`}
            >
              Registrieren
            </button>
            <button
              type="button"
              onClick={() => setIsRegistering(false)}
              className={`ptw-toggle-button ${!isRegistering ? 'text-white' : 'text-gray-600'}`}
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
                <label className="block text-xs text-gray-500 mb-1">Anrede</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="salutation" checked={formData.salutation === 'male'} onChange={() => setFormData(prev => ({...prev, salutation: 'male'}))} />
                    Herr
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="radio" name="salutation" checked={formData.salutation === 'female'} onChange={() => setFormData(prev => ({...prev, salutation: 'female'}))} />
                    Frau
                  </label>
                </div>
              </div>

              <CompanyToggle
                isCompany={formData.isCompany}
                companyName={formData.companyName}
                onToggleChange={(isCompany) => setFormData(prev => ({
                  ...prev,
                  isCompany,
                  companyName: isCompany ? prev.companyName : ""
                }))}
                onCompanyNameChange={(companyName) => setFormData(prev => ({...prev, companyName}))}
              />

              <div className="relative">
                <input
                  type="number"
                  name="dailyRate"
                  id="dailyRate"
                  placeholder="z.B. 450"
                  value={formData.dailyRate || ""}
                  onChange={(e) => setFormData(prev => ({...prev, dailyRate: e.target.value ? parseFloat(e.target.value) : undefined}))}
                  className="form-input"
                  min="0"
                  step="0.01"
                />
                <label htmlFor="dailyRate" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Netto-Tagessatz (€) - Schulung 9-16 Uhr
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Ihr regulärer Tagessatz für Schulungen von 9:00 bis 16:00 Uhr
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
                  E-Mail *
                </label>
              </div>

              {/* Password fields removed - using email login links instead */}

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
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
                    Straße
                  </label>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    name="addressLine2"
                    id="addressLine2"
                    placeholder="Adresszusatz (optional)"
                    value={formData.addressLine2}
                    onChange={handleRegisterChange}
                    className="form-input"
                  />
                  <label htmlFor="addressLine2" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Adresszusatz
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
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
                <div className="relative col-span-2">
                  <input
                    type="text"
                    name="city"
                    id="city"
                    placeholder="Stadt"
                    value={formData.city}
                    onChange={handleRegisterChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="city" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Stadt
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    name="countryId"
                    id="countryId"
                    value={formData.countryId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, countryId: parseInt(e.target.value) || undefined }))}
                    className="form-input"
                    required
                  >
                    <option value="">Land auswählen...</option>
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
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Telefon-Typ</label>
                  <select
                    className="form-input"
                    value={formData.phoneType}
                    onChange={(e) => setFormData(prev => ({...prev, phoneType: e.target.value as "mobile" | "landline"}))}
                  >
                    <option value="mobile">Mobil</option>
                    <option value="landline">Festnetz</option>
                  </select>
              </div>
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
              
              {/* Structured address fields are above; legacy free-text removed */}
              
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
                <div className="flex items-center gap-4 w-full">
                  {/* Upload area or preview */}
                  <div className="flex-1">
                    {formData.profilePicture ? (
                      // Show preview with remove button
                      <div className="relative">
                        <img
                          src={formData.profilePicture}
                          alt="Profile preview"
                          className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, profilePicture: "" })}
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
                        htmlFor="profilePicture"
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
                    )}
                  </div>

                  {/* Change image button (only show if image exists) */}
                  {formData.profilePicture && (
                    <div className="flex flex-col justify-center">
                      <label
                        htmlFor="profilePicture"
                        className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-600 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Bild ändern
                      </label>
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
                    </div>
                  )}
                </div>
                <label className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Profilfoto
                </label>
              </div>
              
              <TopicSelector
                topics={formData.topics}
                topicSuggestions={topicSuggestionsList}
                onAddTopic={addTopic}
                onRemoveTopic={removeTopic}
                searchTerm={topicSearch}
                onSearchChange={setTopicSearch}
                suggestions={topicSuggestions}
              />

              {successMessage && (
                <div className="bg-green-50 p-3 text-sm text-green-700 border border-green-200 rounded">{successMessage}</div>
              )}
            </>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 p-3 text-sm text-red-700 border border-red-200 rounded">{error}</div>
              )}
              {loginMessage && (
                <div className="bg-green-50 p-3 text-sm text-green-700 border border-green-200 rounded">{loginMessage}</div>
              )}

              <div className="text-center mb-4">
                <p className="text-sm text-gray-600">
                  Geben Sie Ihre E-Mail-Adresse ein. Sie erhalten einen sicheren Login-Link per E-Mail.
                </p>
              </div>

              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="loginEmail"
                  placeholder="E-Mail Adresse"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  className="form-input"
                  required
                />
                <label htmlFor="loginEmail" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  E-Mail
                </label>
              </div>

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

              <div className="text-center mt-4">
                <p className="text-xs text-gray-500">
                  Kein Passwort mehr nötig! Sie erhalten einen sicheren Link per E-Mail.
                </p>
              </div>
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

export default function AuthForm() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Laden...</div>}>
      <AuthFormContent />
    </Suspense>
  );
}
