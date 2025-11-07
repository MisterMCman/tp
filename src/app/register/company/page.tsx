"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { saveTrainerData } from "@/lib/session";
import { useToast } from "@/components/Toast";
import { sortCountries } from "@/lib/countrySort";

interface CompanyFormData {
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  countryId: number | undefined;
}

function CompanyRegistrationContent() {
  const router = useRouter();
  const { addToast, ToastManager } = useToast();

  // State for countries
  const [countries, setCountries] = useState<{ id: number; name: string; code: string }[]>([]);

  // State for company registration data
  const [companyFormData, setCompanyFormData] = useState<CompanyFormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    street: '',
    houseNumber: '',
    zipCode: '',
    city: '',
    countryId: 1, // Default to Germany (ID 1)
  });

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load countries on component mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        // Try to fetch from API first
        const response = await fetch('/api/countries');
        if (response.ok) {
          const data = await response.json();
          setCountries(data.countries || []);
          return;
        }
      } catch (error) {
        console.error('Error fetching countries from API, using fallback:', error);
      }
      
      // Fallback to hardcoded data (if API call failed or returned non-ok)
      //todo remove the hardcoding, we miht mess up the ids etc
      try {
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
        setCountries(sortCountries(hardcodedCountries));
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };

    loadCountries();
  }, []);

  // Handler for form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCompanyFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handler for company registration submit
  const handleCompanyRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const registerResponse = await fetch('/api/register-training-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: companyFormData.companyName,
          firstName: companyFormData.firstName,
          lastName: companyFormData.lastName,
          email: companyFormData.email,
          phone: companyFormData.phone,
          street: companyFormData.street,
          houseNumber: companyFormData.houseNumber,
          zipCode: companyFormData.zipCode,
          city: companyFormData.city,
          countryId: companyFormData.countryId,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Company registration failed');
      }

      const registerData = await registerResponse.json();

      // Save company data to localStorage for immediate use
      saveTrainerData(registerData.company);

      // Show success message
      setSuccessMessage('Unternehmensregistrierung erfolgreich! Überprüfen Sie Ihre E-Mail für den Login-Link. Nach dem Login können Sie Ihr Profil in den Einstellungen vervollständigen.');
      addToast('Registrierung erfolgreich! Sie können sich jetzt einloggen.', 'success');

      // Redirect to login page after short delay
      setTimeout(() => {
        router.push('/register');
      }, 2000);
    } catch (err: unknown) {
      console.error('Company registration error:', err);
      setError((err as Error)?.message || 'Company registration failed');
      addToast('Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Unternehmensregistrierung</h1>
            <p className="text-gray-600">Registrieren Sie Ihr Unternehmen und finden Sie qualifizierte Trainer</p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Hinweis:</strong> Weitere Informationen wie Unternehmensbeschreibung, Branche, Website und Mitarbeiterzahl können Sie nach der Registrierung bequem in Ihren Profil-Einstellungen ergänzen.
              </p>
            </div>
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

          {/* Company Registration Form */}
          <form onSubmit={handleCompanyRegisterSubmit} className="space-y-5">
            {/* Company Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Unternehmensinformationen</h3>

              <div className="relative mb-4">
                <input
                  type="text"
                  name="companyName"
                  id="companyName"
                  placeholder="Unternehmensname"
                  value={companyFormData.companyName}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
                <label htmlFor="companyName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Unternehmensname *
                </label>
              </div>
            </div>

            {/* Contact Person */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Ansprechpartner</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    name="firstName"
                    id="firstName"
                    placeholder="Vorname"
                    value={companyFormData.firstName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="firstName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Vorname *
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    name="lastName"
                    id="lastName"
                    placeholder="Nachname"
                    value={companyFormData.lastName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="lastName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Nachname *
                  </label>
                </div>
              </div>

              <div className="relative mb-4">
                <input
                  type="email"
                  name="email"
                  id="email"
                  placeholder="E-Mail-Adresse"
                  value={companyFormData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
                <label htmlFor="email" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  E-Mail-Adresse *
                </label>
                <p className="text-xs text-gray-500 mt-1">Die Domain wird automatisch aus Ihrer E-Mail-Adresse extrahiert</p>
              </div>

              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="Telefonnummer"
                  value={companyFormData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
                <label htmlFor="phone" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                  Telefonnummer *
                </label>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Adresse</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative md:col-span-2">
                  <input
                    type="text"
                    name="street"
                    id="street"
                    placeholder="Straße"
                    value={companyFormData.street}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="street" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Straße *
                  </label>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    name="houseNumber"
                    id="houseNumber"
                    placeholder="Hausnummer"
                    value={companyFormData.houseNumber}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="houseNumber" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Hausnummer *
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="relative">
                  <input
                    type="text"
                    name="zipCode"
                    id="zipCode"
                    placeholder="PLZ"
                    value={companyFormData.zipCode}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="zipCode" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    PLZ *
                  </label>
                </div>

                <div className="relative md:col-span-2">
                  <input
                    type="text"
                    name="city"
                    id="city"
                    placeholder="Ort"
                    value={companyFormData.city}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <label htmlFor="city" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
                    Ort *
                  </label>
                </div>
              </div>

              <div className="relative">
                <select
                  name="countryId"
                  id="countryId"
                  value={companyFormData.countryId || ''}
                  onChange={handleInputChange}
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
                  Land *
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Registrierung läuft...' : 'Als Unternehmen registrieren'}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">* Pflichtfelder</p>
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

export default function CompanyRegistration() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center"><div className="text-xl">Laden...</div></div>}>
      <CompanyRegistrationContent />
    </Suspense>
  );
}
