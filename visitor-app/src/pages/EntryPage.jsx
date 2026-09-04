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
          setError(err.response?.data?.error || 'کد QR نامعتبر است');
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
