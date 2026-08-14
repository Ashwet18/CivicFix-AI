/**
 * Axios API client configuration
 */
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Functions

// Authentication
export const login = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password });
  return response.data;
};

export const register = async (email: string, password: string, full_name?: string, phone?: string) => {
  const response = await api.post('/api/auth/register', { email, password, full_name, phone });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

// Issues
export const createIssue = async (formData: FormData) => {
  const response = await api.post('/api/issues/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getMyIssues = async (page = 1, pageSize = 20, statusFilter?: string) => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  
  if (statusFilter) {
    params.append('status_filter', statusFilter);
  }
  
  const response = await api.get(`/api/issues/my?${params}`);
  return response.data;
};

export const getIssueDetail = async (issueId: number) => {
  const response = await api.get(`/api/issues/${issueId}`);
  return response.data;
};

export const getIssueDuplicates = async (issueId: number) => {
  const response = await api.get(`/api/issues/${issueId}/duplicates`);
  return response.data;
};

// Admin APIs
export const getAdminDashboard = async () => {
  const response = await api.get('/api/admin/dashboard');
  return response.data;
};

export const getAdminIssues = async (
  page = 1,
  pageSize = 20,
  filters?: {
    status?: string;
    category?: string;
    severity?: string;
    priorityMin?: number;
    priorityMax?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }
) => {
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
  });
  
  if (filters?.status) params.append('status_filter', filters.status);
  if (filters?.category) params.append('category_filter', filters.category);
  if (filters?.severity) params.append('severity_filter', filters.severity);
  if (filters?.priorityMin !== undefined) params.append('priority_min', filters.priorityMin.toString());
  if (filters?.priorityMax !== undefined) params.append('priority_max', filters.priorityMax.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.sortBy) params.append('sort_by', filters.sortBy);
  if (filters?.sortOrder) params.append('sort_order', filters.sortOrder);
  
  const response = await api.get(`/api/admin/issues?${params}`);
  return response.data;
};

export const getAdminIssueDetail = async (issueId: number) => {
  const response = await api.get(`/api/admin/issues/${issueId}`);
  return response.data;
};

export const updateIssueStatus = async (issueId: number, newStatus: string, notes?: string) => {
  const response = await api.patch(`/api/admin/issues/${issueId}/status`, {
    new_status: newStatus,
    notes
  });
  return response.data;
};

export const assignIssueDepartment = async (issueId: number, department: string) => {
  const response = await api.patch(`/api/admin/issues/${issueId}/department`, {
    department
  });
  return response.data;
};

export const addAdminNote = async (issueId: number, note: string) => {
  const response = await api.post(`/api/admin/issues/${issueId}/notes`, {
    note
  });
  return response.data;
};

export const resolveIssue = async (issueId: number, resolutionNotes: string, resolutionImage?: File) => {
  const formData = new FormData();
  formData.append('resolution_notes', resolutionNotes);
  
  if (resolutionImage) {
    formData.append('resolution_image', resolutionImage);
  }
  
  const response = await api.post(`/api/admin/issues/${issueId}/resolution`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getUnresolvedIssuesForMap = async () => {
  const response = await api.get('/api/admin/issues/map/unresolved');
  return response.data;
};

export default api;
