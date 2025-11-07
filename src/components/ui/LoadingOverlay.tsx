"use client";

import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingOverlayProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingOverlay({ 
  text = 'Laden...',
  fullScreen = true 
}: LoadingOverlayProps) {
  return (
    <div className={fullScreen ? 'ptw-loading-overlay' : 'ptw-loading-content'}>
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

