"use client";

import React from 'react';

export type StatusType = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'abgesagt';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  pending: {
    label: 'Offen',
    className: 'ptw-badge ptw-badge-pending'
  },
  accepted: {
    label: 'Angenommen',
    className: 'ptw-badge ptw-badge-accepted'
  },
  rejected: {
    label: 'Abgelehnt',
    className: 'ptw-badge ptw-badge-rejected'
  },
  cancelled: {
    label: 'Abgesagt',
    className: 'ptw-badge ptw-badge-cancelled'
  },
  abgesagt: {
    label: 'Abgesagt',
    className: 'ptw-badge ptw-badge-cancelled'
  },
  completed: {
    label: 'Abgeschlossen',
    className: 'ptw-badge ptw-badge-completed'
  }
};

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`${config.className} ${className}`}>
      {config.label}
    </span>
  );
}

