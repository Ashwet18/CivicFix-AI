/**
 * TypeScript type definitions
 */

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'citizen' | 'admin';
  created_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  role?: 'citizen' | 'admin';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Issue {
  id: number;
  user_id: number;
  title: string | null;
  description: string | null;
  category: string;
  severity: string;
  status: string;
  priority_score: number;
  latitude: number;
  longitude: number;
  address: string | null;
  image_path: string;
  thumbnail_path: string | null;
  ai_category_confidence: number | null;
  ai_severity_confidence: number | null;
  ai_analysis_notes: string | null;
  assigned_department: string | null;
  duplicate_group_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface IssueCreateResponse {
  issue_id: number;
  category: string;
  severity: string;
  safety_risk: number;
  priority_score: number;
  duplicate_count: number;
  status: string;
  ai_analysis_notes: string;
  is_duplicate: boolean;
  duplicate_group_id: number | null;
}

export interface IssueListResponse {
  issues: Issue[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DuplicateInfo {
  is_duplicate: boolean;
  duplicate_group_id?: number;
  primary_issue_id?: number;
  duplicate_count: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface Location {
  lat: number;
  lng: number;
}

// Issue categories
export const ISSUE_CATEGORIES = [
  'Pothole / Road Damage',
  'Broken Streetlight', 
  'Garbage / Waste',
  'Drainage / Open Manhole',
  'Damaged Footpath',
  'Damaged Traffic Sign',
  'Water Leakage',
  'Other'
] as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[number];

// Issue status
export const ISSUE_STATUSES = [
  'reported',
  'assigned',
  'in_progress', 
  'resolved'
] as const;

export type IssueStatus = typeof ISSUE_STATUSES[number];

// Severity levels
export const SEVERITY_LEVELS = [
  'low',
  'medium',
  'high',
  'critical'
] as const;

export type SeverityLevel = typeof SEVERITY_LEVELS[number];
