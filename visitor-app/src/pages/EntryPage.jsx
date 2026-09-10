import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import { saveEntry } from '../entrySession';

export default function EntryPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      try {
        const { data } = await client.get(`/qrcodes/resolve/${token}`);
        if (cancelled) return;
        saveEntry({
          token: data.token,
          entranceNodeId: data.node_id,
          buildingId: data.building_id,
          buildingName: data.building_name,
          floorName: data.floor_name,
        });
        navigate('/destinations', { replace: true });
      } catch (err) {
        if (!cancelled) {
          if (err.response) {
            // Backend actually answered (e.g. 404 for an unknown token) —
            // this is a genuinely invalid QR code.
            setError(err.response.data?.error || 'کد QR نامعتبر است');
          } else {
            // No response reached us at all: a network/CORS failure, most
            // often caused by VITE_API_URL pointing at a stale preview
            // backend URL or Vercel Deployment Protection blocking the
            // request. This is not the same problem as an invalid QR code,
            // so don't tell the visitor their code is wrong.
            console.error('[rahyar-visitor] QR resolve failed with no response', err);
            setError('خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.');
          }
        }
      }
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="centered-page">
      {!error ? (
        <p>در حال بارگذاری...</p>
      ) : (
        <div className="message-card error">
          <p>{error}</p>
          <p className="muted">لطفاً دوباره کد QR درب ورودی را اسکن کنید.</p>
        </div>
      )}
    </div>
  );
}
