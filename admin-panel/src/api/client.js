import axios from 'axios';

// Bump this on any change that must force a fresh Vercel build instead of a
// cached one (e.g. after fixing VITE_API_URL and redeploys keep serving the
// same output bundle hash) — content-hashed filenames only change when the
// file content itself changes.
// build-marker: 2026-09-06

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
  // Floor plan images now come back as either a relative /uploads/... path
  // (local dev fallback) or an already-absolute Vercel Blob URL — don't
  // re-prefix the latter with API_URL.
  if (/^https?:\/\//.test(path)) return path;
  return `${API_URL}${path}`;
}

export function visitorEntryUrl(token) {
  const visitorUrl = import.meta.env.VITE_VISITOR_APP_URL || 'http://localhost:5174';
  // VITE_VISITOR_APP_URL must be just an origin (e.g.
  // "https://rahyar-visitor-app.vercel.app"), no trailing path. A "/" typo'd
  // where a "-" was meant in the domain (e.g. "rahyar/visitor-app.vercel.app")
  // still parses as a "valid" URL, just with the wrong part read as a path —
  // which silently breaks every generated QR link. Warn on load so a typo'd
  // Vercel env var is obvious in devtools instead of showing up as bad QR
  // links in the field.
  try {
    const { pathname } = new URL(visitorUrl);
    if (pathname && pathname !== '/') {
      console.warn(
        `[rahyar-admin] VITE_VISITOR_APP_URL="${visitorUrl}" has a path ("${pathname}") — it should be ` +
          'just the origin with no trailing path, e.g. "https://rahyar-visitor-app.vercel.app". ' +
          'Check for a "/" where a "-" was meant in the domain.'
      );
    }
  } catch {
    console.warn(`[rahyar-admin] VITE_VISITOR_APP_URL="${visitorUrl}" is not a valid URL.`);
  }
  return `${visitorUrl}/entry/${token}`;
}

export default client;
