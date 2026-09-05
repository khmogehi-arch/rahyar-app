import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/buildings');
    } catch (err) {
      // A response with a body means the backend was reached and rejected
      // the credentials (real auth failure). No response at all means the
      // request never got a valid HTTP reply — wrong VITE_API_URL, a CORS
      // block, or the backend being unreachable — which is a different bug
      // and was previously hidden behind the same generic message.
      console.error('[rahyar-admin] login failed', {
        apiUrl: API_URL,
        hasResponse: Boolean(err.response),
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
      });
      if (err.response) {
        setError(err.response.data?.error || 'ورود ناموفق بود');
      } else {
        setError(
          `اتصال به سرور برقرار نشد (${API_URL}). آدرس بک‌اند یا تنظیمات CORS را بررسی کنید.`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>راهیار</h1>
        <p className="subtitle">پنل داخلی تیم — ورود کارکنان</p>
        <label>
          نام کاربری
          <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        </label>
        <label>
          رمز عبور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'در حال ورود...' : 'ورود'}
        </button>
        <p className="debug-hint" style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.5rem' }}>
          بک‌اند: {API_URL}
        </p>
      </form>
    </div>
  );
}
