"use client";

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'ptw-btn';
  const variantClasses = `ptw-btn-${variant}`;
  const sizeClasses = `ptw-btn-${size}`;
  const widthClasses = fullWidth ? 'w-full' : '';
  const disabledClasses = (disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : '';
  
  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${widthClasses} ${disabledClasses} ${className}`.trim();

  const iconElement = icon && (
    <span className={iconPosition === 'left' ? 'mr-2' : 'ml-2'}>
      {icon}
    </span>
  );

  return (
    <button
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {children}
        </>
      ) : (
        <>
          {iconPosition === 'left' && iconElement}
          {children}
          {iconPosition === 'right' && iconElement}
        </>
      )}
    </button>
  );
}

