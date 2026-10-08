import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'mediscan_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (value) => localStorage.setItem(TOKEN_KEY, value),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function extractError(error) {
  if (error.response) {
    const detail = error.response.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item.msg || item).join(', ');
    }
    if (error.response.status === 401) return 'Your session has expired. Please sign in again.';
    if (error.response.status === 403) return 'You do not have permission to do that.';
    if (error.response.status === 404) return 'The requested item was not found.';
    return 'Something went wrong. Please try again.';
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  return 'Cannot reach the server. Please check that the backend is running.';
}

let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStore.get()) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        tokenStore.clear();
        if (onUnauthorized) onUnauthorized();
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error) {
  return extractError(error);
}

const auth = {
  register: (payload) => api.post('/auth/register', payload).then((r) => r.data),
  login: (email, password) => api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
};

const patients = {
  getProfile: () => api.get('/patients/me').then((r) => r.data),
  updateProfile: (payload) => api.put('/patients/me', payload).then((r) => r.data),
};

const doctors = {
  list: (params = {}) => api.get('/doctors', { params }).then((r) => r.data),
  get: (id) => api.get(`/doctors/${id}`).then((r) => r.data),
  getMyProfile: () => api.get('/doctors/me/profile').then((r) => r.data),
  updateMyProfile: (payload) => api.put('/doctors/me', payload).then((r) => r.data),
};

const hospitals = {
  list: () => api.get('/hospitals').then((r) => r.data),
  get: (id) => api.get(`/hospitals/${id}`).then((r) => r.data),
  getMyProfile: () => api.get('/hospitals/me/profile').then((r) => r.data),
  updateMyProfile: (payload) => api.put('/hospitals/me', payload).then((r) => r.data),
};

const documents = {
  upload: (file, documentType, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    form.append('document_type', documentType || 'other');
    return api
      .post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (event) => {
          if (onProgress && event.total) {
            onProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      })
      .then((r) => r.data);
  },
  list: () => api.get('/documents').then((r) => r.data),
  get: (id) => api.get(`/documents/${id}`).then((r) => r.data),
  remove: (id) => api.delete(`/documents/${id}`).then((r) => r.data),
  downloadUrl: (id) => `${baseURL}/documents/${id}/download`,
  download: async (id, filename) => {
    const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'document';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

const ai = {
  analyze: (documentId) => api.post(`/ai/analyze-document/${documentId}`).then((r) => r.data),
  chat: (message, history = [], attachment = null) =>
    api
      .post('/ai/chat', { message, history, attachment }, { timeout: 120000 })
      .then((r) => r.data),
};

const appointments = {
  create: (payload) => api.post('/appointments', payload).then((r) => r.data),
  list: (detail = false) => api.get('/appointments', { params: { detail } }).then((r) => r.data),
  get: (id) => api.get(`/appointments/${id}`).then((r) => r.data),
  updateStatus: (id, status) =>
    api.put(`/appointments/${id}/status`, { status }).then((r) => r.data),
};

const medicalRecords = {
  list: () => api.get('/medical-records').then((r) => r.data),
  create: (payload) => api.post('/medical-records', payload).then((r) => r.data),
};

const consultations = {
  list: () => api.get('/consultations').then((r) => r.data),
  create: (payload) => api.post('/consultations', payload).then((r) => r.data),
};

const notifications = {
  list: (unreadOnly = false) =>
    api.get('/notifications', { params: { unread_only: unreadOnly } }).then((r) => r.data),
  markRead: (id) => api.put(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.put('/notifications/read-all').then((r) => r.data),
};

const conversations = {
  list: () => api.get('/conversations').then((r) => r.data),
  open: (otherUserId) =>
    api.post('/conversations', { other_user_id: otherUserId }).then((r) => r.data),
  get: (id) => api.get(`/conversations/${id}`).then((r) => r.data),
  messages: (id) => api.get(`/conversations/${id}/messages`).then((r) => r.data),
  send: (id, content) => api.post(`/conversations/${id}/messages`, { content }).then((r) => r.data),
  markRead: (id) => api.post(`/conversations/${id}/read`).then((r) => r.data),
};

export function getChatSocketURL() {
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').trim();
  const wsBase = base.replace(/^http/i, 'ws').replace(/\/api\/?$/i, '');
  return `${wsBase}/api/ws/chat?token=${encodeURIComponent(tokenStore.get() || '')}`;
}

const dashboard = {
  stats: () => api.get('/dashboard/stats').then((r) => r.data),
};

const admin = {
  stats: () => api.get('/admin/stats').then((r) => r.data),
  users: (role) => api.get('/admin/users', { params: { role } }).then((r) => r.data),
  doctors: () => api.get('/admin/doctors').then((r) => r.data),
  hospitals: () => api.get('/admin/hospitals').then((r) => r.data),
  appointments: () => api.get('/admin/appointments').then((r) => r.data),
  documents: () => api.get('/admin/documents').then((r) => r.data),
  verifyDoctor: (id, verified = true) =>
    api.put(`/admin/doctors/${id}/verify`, null, { params: { verified } }).then((r) => r.data),
};

export const services = {
  auth,
  patients,
  doctors,
  hospitals,
  documents,
  ai,
  appointments,
  medicalRecords,
  consultations,
  notifications,
  conversations,
  dashboard,
  admin,
};
