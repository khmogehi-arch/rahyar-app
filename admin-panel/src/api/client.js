import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// VITE_API_URL is baked in at build time, so a stale value (an old preview
// deployment URL, or nothing at all) silently makes every request fail with
// no useful error in the UI. Logging it on load means checking the deployed
// admin panel's devtools console immediately shows which backend it's
// actually pointed at.
console.info('[rahyar-admin] API_URL =', API_URL);

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

export { API_URL };

export function fileUrl(path) {
  if (!path) return null;
  return `${API_URL}${path}`;
}

export function visitorEntryUrl(token) {
  const visitorUrl = import.meta.env.VITE_VISITOR_APP_URL || 'http://localhost:5174';
  return `${visitorUrl}/entry/${token}`;
}

export default client;
