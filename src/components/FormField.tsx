import React from 'react';

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  className = "form-input",
  children,
}) => {
  const inputProps = {
    type,
    name,
    id: name,
    placeholder,
    value,
    onChange,
    className,
    required,
  };

  return (
    <div className="relative">
      {children ? (
        children
      ) : type === "textarea" ? (
        <textarea
          {...(inputProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={4}
        />
      ) : (
        <input {...inputProps} />
      )}
      <label htmlFor={name} className="absolute -top-2.5 left-3 bg-white px-1 text-xs text-gray-500">
        {label} {required && "*"}
      </label>
    </div>
  );
};
