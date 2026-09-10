import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// VITE_API_URL is baked in at build time, so a stale value (an old preview
// deployment URL protected by Vercel SSO, or nothing at all) silently makes
// every request fail with a network error that has no useful message of its
// own. Logging it on load means checking the deployed visitor app's devtools
// console immediately shows which backend it's actually pointed at.
console.info('[rahyar-visitor] API_URL =', API_URL);

const client = axios.create({ baseURL: `${API_URL}/api` });

export { API_URL };

export default client;
