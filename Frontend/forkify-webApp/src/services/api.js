import axios from 'axios';

// ── API base URL ──────────────────────────────────────────────────────────────
// In development:  set REACT_APP_API_URL=https://forkify-erp-2.onrender.com/api in .env
// In production:   set REACT_APP_API_URL=https://your-server.com/api in .env.production
// Falls back to localhost:8080 so the app still works without a .env file
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://forkify-erp-2.onrender.com/api';

// ── Axios instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second timeout
});

// ── Request interceptor: attach JWT token to every request ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-logout when token expires (401) ───────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Avoid circular import — dispatch via custom event
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;