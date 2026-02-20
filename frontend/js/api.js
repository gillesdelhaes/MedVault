/**
 * Centralized API client.
 * Injects Authorization header, handles 401 → logout, provides typed helpers.
 */
const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('medvault_token');
}

function setToken(token) {
  localStorage.setItem('medvault_token', token);
}

function clearToken() {
  localStorage.removeItem('medvault_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.hash = '#/login';
    throw new Error('Session expired');
  }

  if (res.status === 204) return null;

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.detail || `HTTP ${res.status}`;
    throw new Error(Array.isArray(msg) ? msg.map(e => e.msg).join(', ') : msg);
  }
  return data;
}

const api = {
  // Auth
  login: (password) => apiFetch('/auth/login', {
    method: 'POST', body: JSON.stringify({ password })
  }),
  logout: () => apiFetch('/auth/logout', { method: 'POST' }),
  verify: () => apiFetch('/auth/verify'),

  // Patients
  getPatients: () => apiFetch('/patients'),
  getPatient: (id) => apiFetch(`/patients/${id}`),
  createPatient: (data) => apiFetch('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data) => apiFetch(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id) => apiFetch(`/patients/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: (params = {}) => apiFetch('/appointments?' + new URLSearchParams(params)),
  getAppointment: (id) => apiFetch(`/appointments/${id}`),
  createAppointment: (data) => apiFetch('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id, data) => apiFetch(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAppointment: (id) => apiFetch(`/appointments/${id}`, { method: 'DELETE' }),

  // Symptoms
  getSymptoms: (params = {}) => apiFetch('/symptoms?' + new URLSearchParams(params)),
  getSymptom: (id) => apiFetch(`/symptoms/${id}`),
  createSymptom: (data) => apiFetch('/symptoms', { method: 'POST', body: JSON.stringify(data) }),
  updateSymptom: (id, data) => apiFetch(`/symptoms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSymptom: (id) => apiFetch(`/symptoms/${id}`, { method: 'DELETE' }),

  // Medications
  getMedications: (params = {}) => apiFetch('/medications?' + new URLSearchParams(params)),
  getMedication: (id) => apiFetch(`/medications/${id}`),
  createMedication: (data) => apiFetch('/medications', { method: 'POST', body: JSON.stringify(data) }),
  updateMedication: (id, data) => apiFetch(`/medications/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMedication: (id) => apiFetch(`/medications/${id}`, { method: 'DELETE' }),
  logDose: (id, data) => apiFetch(`/medications/${id}/doses`, { method: 'POST', body: JSON.stringify(data) }),
  getDoses: (id) => apiFetch(`/medications/${id}/doses`),

  // Calendar
  getCalendar: (params) => apiFetch('/calendar?' + new URLSearchParams(params)),

  // Search
  search: (params) => apiFetch('/search?' + new URLSearchParams(params)),

  // Helpers
  setToken, getToken, clearToken,
};

window.api = api;
