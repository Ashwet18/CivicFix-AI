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

export default api;
