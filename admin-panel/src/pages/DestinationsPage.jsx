import { useEffect, useState } from 'react';
import client from '../api/client';

export default function DestinationsPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [poiNodes, setPoiNodes] = useState([]);
  const [destinations, setDestinations] = useState([]);

  const [formNodeId, setFormNodeId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    client.get('/buildings').then(({ data }) => {
      setBuildings(data);
      if (data.length > 0) setBuildingId(data[0].id);
    });
  }, []);

  async function loadForBuilding(id) {
    if (!id) return;
    const { data: building } = await client.get(`/buildings/${id}`);
    const floorDetails = await Promise.all(building.floors.map((f) => client.get(`/floors/${f.id}`)));
    const nodes = floorDetails.flatMap((res, i) =>
      res.data.nodes
        .filter((n) => n.type === 'poi')
        .map((n) => ({ ...n, floorId: building.floors[i].id, floorName: building.floors[i].name }))
    );
    setPoiNodes(nodes);
    setFormNodeId(nodes[0]?.id || '');

    const { data: allDestinations } = await client.get('/destinations');
    const nodeIds = new Set(nodes.map((n) => n.id));
    setDestinations(allDestinations.filter((d) => nodeIds.has(d.node_id)));
  }

  useEffect(() => {
    loadForBuilding(buildingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const node = poiNodes.find((n) => n.id === Number(formNodeId));
    if (!node || !displayName.trim()) return;
    await client.post('/destinations', {
      nodeId: node.id,
      floorId: node.floorId,
      displayName,
      category,
    });
    setDisplayName('');
    setCategory('');
    await loadForBuilding(buildingId);
  }

  async function handleDelete(id) {
    await client.delete(`/destinations/${id}`);
    await loadForBuilding(buildingId);
  }

  return (
    <div className="page">
      <h2>مقاصد</h2>
      <p className="muted">
        هر مقصد به یک نقطه از نوع «مقصد (POI)» روی نقشه متصل است و در وب‌اپ مراجعه‌کننده، در فهرست
        انتخاب مقصد نمایش داده می‌شود.
      </p>

      <div className="toolbar">
        <select value={buildingId || ''} onChange={(e) => setBuildingId(Number(e.target.value))}>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {poiNodes.length === 0 ? (
        <p className="muted">
          هیچ نقطه POI برای این ساختمان ثبت نشده — از «ویرایشگر نقشه» یک نقطه با نوع «مقصد» اضافه
          کنید.
        </p>
      ) : (
        <form className="inline-form" onSubmit={handleSubmit}>
          <select value={formNodeId} onChange={(e) => setFormNodeId(e.target.value)}>
            {poiNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label || `POI #${n.id}`} ({n.floorName})
              </option>
            ))}
          </select>
          <input
            placeholder="نام نمایشی (مثلاً بخش قلب)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <input
            placeholder="دسته‌بندی (مثلاً بخش‌ها، سرویس‌ها، اورژانس)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            افزودن مقصد
          </button>
        </form>
      )}

      <h3>مقاصد ثبت‌شده</h3>
      <ul className="list">
        {destinations.map((d) => (
          <li key={d.id} className="list-item">
            <span>
              {d.display_name} {d.category ? `— ${d.category}` : ''}
            </span>
            <button type="button" className="btn-icon-danger" onClick={() => handleDelete(d.id)}>
              حذف
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
