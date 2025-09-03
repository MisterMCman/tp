import React from 'react';

interface CompanyToggleProps {
  isCompany: boolean;
  companyName: string;
  onToggleChange: (isCompany: boolean) => void;
  onCompanyNameChange: (name: string) => void;
}

export const CompanyToggle: React.FC<CompanyToggleProps> = ({
  isCompany,
  companyName,
  onToggleChange,
  onCompanyNameChange,
}) => {
  return (
    <>
      {/* Company Toggle */}
      <div className="relative">
        <label className="block text-xs text-gray-500 mb-2">Registrierung als</label>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="registrationType"
              checked={!isCompany}
              onChange={() => onToggleChange(false)}
            />
            Privatperson
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="registrationType"
              checked={isCompany}
              onChange={() => onToggleChange(true)}
            />
            Firma/GmbH
          </label>
        </div>
      </div>

      {/* Company Name Field */}
      {isCompany && (
        <div className="relative">
          <input
            type="text"
            name="companyName"
            id="companyName"
            placeholder="Firmenname"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            className="form-input"
            required={isCompany}
          />
          <label htmlFor="companyName" className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
            Firmenname *
          </label>
        </div>
      )}
    </>
  );
};
