"use client";

import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
  text?: string;
}

export default function LoadingSpinner({ 
  size = 'md', 
  className = '',
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'ptw-spinner-sm',
    md: 'ptw-spinner',
    lg: 'ptw-spinner-lg'
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={sizeClasses[size]} />
      {text && (
        <p className="ptw-loading-text mt-4">{text}</p>
      )}
    </div>
  );
}

