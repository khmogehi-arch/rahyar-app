import axios from 'axios';

// Bump this on any change that must force a fresh Vercel build instead of a
// cached one (e.g. after fixing VITE_API_URL/VITE_VISITOR_APP_URL and
// redeploys keep serving the same output bundle hash) — content-hashed
// filenames only change when the file content itself changes.
// build-marker: 2026-09-11

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const VISITOR_APP_URL = import.meta.env.VITE_VISITOR_APP_URL || 'http://localhost:5174';

// Both VITE_ vars are baked in at build time, so a stale value (an old
// preview deployment URL, a typo, or nothing at all) silently produces wrong
// output with no error in the UI. Logging them on load means checking the
// deployed admin panel's devtools console immediately shows which backend
// and visitor app it's actually pointed at, without digging through the
// built bundle.
console.info('[rahyar-admin] API_URL =', API_URL);
console.info('[rahyar-admin] VISITOR_APP_URL =', VISITOR_APP_URL);

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
  // Floor plan images now come back as either a relative /uploads/... path
  // (local dev fallback) or an already-absolute Vercel Blob URL — don't
  // re-prefix the latter with API_URL.
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export function visitorEntryUrl(token) {
  return `${VISITOR_APP_URL}/entry/${token}`;
}

export default client;
