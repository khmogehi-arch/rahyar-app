import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import client from '../api/client';
import { loadEntry } from '../entrySession';

const DIRECTION_ICONS = {
  straight: '⬆️',
  left: '⬅️',
  right: '➡️',
  up: '🔼',
  down: '🔽',
};

export default function RoutePage() {
  const { destinationNodeId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const entry = loadEntry();

  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entry) return;
    client
      .get('/route', { params: { from: entry.entranceNodeId, to: destinationNodeId } })
      .then(({ data }) => setRoute(data))
      .catch((err) => setError(err.response?.data?.error || 'مسیری یافت نشد'));
  }, [entry, destinationNodeId]);

  function handleLost() {
    navigate('/destinations');
  }

  return (
    <div className="page">
      <header className="visitor-header">
        <button type="button" className="btn-back" onClick={() => navigate('/destinations')}>
          ← بازگشت
        </button>
        <h2>{state?.destinationName || 'مسیر'}</h2>
      </header>

      {error && <p className="error-text">{error}</p>}

      {!route && !error && <p className="muted">در حال محاسبه مسیر...</p>}

      {route && (
        <>
          <p className="muted">فاصله کل تقریبی: {Math.round(route.totalDistanceMeters)} متر</p>
          <ol className="route-steps">
            {route.steps.map((step, i) => (
              <li key={i} className="route-step">
                <span className="route-icon">{DIRECTION_ICONS[step.direction] || '⬆️'}</span>
                <span className="route-text">
                  {step.instruction || `${Math.round(step.distanceMeters)} متر بروید`}
                </span>
              </li>
            ))}
            <li className="route-step route-step-final">
              <span className="route-icon">📍</span>
              <span className="route-text">به مقصد رسیدید</span>
            </li>
          </ol>
        </>
      )}

      <button type="button" className="btn-lost" onClick={handleLost}>
        مسیر را گم کردم
      </button>
    </div>
  );
}
