import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { loadEntry } from '../entrySession';

export default function DestinationSelectPage() {
  const navigate = useNavigate();
  const entry = loadEntry();
  const [destinations, setDestinations] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!entry) return;
    client
      .get('/destinations/public', { params: { buildingId: entry.buildingId } })
      .then(({ data }) => setDestinations(data));
  }, [entry]);

  const grouped = useMemo(() => {
    const filtered = destinations.filter((d) =>
      d.display_name.toLowerCase().includes(search.trim().toLowerCase())
    );
    const byCategory = new Map();
    for (const d of filtered) {
      const cat = d.category || 'سایر';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat).push(d);
    }
    return byCategory;
  }, [destinations, search]);

  function handleSelect(destination) {
    navigate(`/route/${destination.node_id}`, {
      state: { destinationName: destination.display_name },
    });
  }

  return (
    <div className="page">
      <header className="visitor-header">
        <h2>راهیار</h2>
        {entry?.buildingName && <p className="muted">{entry.buildingName}</p>}
      </header>

      <input
        className="search-input"
        placeholder="جستجوی مقصد..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {destinations.length === 0 && <p className="muted">مقصدی برای این ساختمان ثبت نشده است.</p>}

      {[...grouped.entries()].map(([category, items]) => (
        <section key={category} className="category-section">
          <h3>{category}</h3>
          <ul className="destination-list">
            {items.map((d) => (
              <li key={d.id}>
                <button type="button" className="destination-btn" onClick={() => handleSelect(d)}>
                  {d.display_name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
