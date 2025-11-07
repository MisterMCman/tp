/**
 * Permission checking utilities for company users
 */

export type CompanyUserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface UserWithRole {
  userType: 'TRAINING_COMPANY';
  role?: CompanyUserRole;
  id: number;
  companyId?: number;
}

/**
 * Check if user can edit company data
 */
export function canEditCompany(user: UserWithRole | null): boolean {
  if (!user || user.userType !== 'TRAINING_COMPANY') return false;
  return user.role === 'ADMIN';
}

/**
 * Check if user can make requests (create trainings, request trainers, etc.)
 */
export function canMakeRequests(user: UserWithRole | null): boolean {
  if (!user || user.userType !== 'TRAINING_COMPANY') return false;
  return user.role === 'ADMIN' || user.role === 'EDITOR';
}

/**
 * Check if user can view data
 */
export function canViewData(user: UserWithRole | null): boolean {
  if (!user || user.userType !== 'TRAINING_COMPANY') return false;
  return true; // All company users can view
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: UserWithRole | null): boolean {
  if (!user || user.userType !== 'TRAINING_COMPANY') return false;
  return user.role === 'ADMIN';
}

/**
 * Check if user can edit their own profile
 */
export function canEditOwnProfile(user: UserWithRole | null): boolean {
  if (!user || user.userType !== 'TRAINING_COMPANY') return false;
  return true; // All users can edit their own profile
}

