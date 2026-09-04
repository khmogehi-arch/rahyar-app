import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const client = axios.create({ baseURL: `${API_URL}/api` });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('rahyar_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rahyar_admin_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export function fileUrl(path) {
  if (!path) return null;
  return `${API_URL}${path}`;
}

export function visitorEntryUrl(token) {
  const visitorUrl = import.meta.env.VITE_VISITOR_APP_URL || 'http://localhost:5174';
  return `${visitorUrl}/entry/${token}`;
}

export default client;
