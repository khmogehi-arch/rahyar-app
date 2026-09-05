import { useEffect, useState } from 'react';
import client from '../api/client';

export default function BeaconsPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [elevatorNodes, setElevatorNodes] = useState([]);
  const [beacons, setBeacons] = useState([]);

  const [formNodeId, setFormNodeId] = useState('');
  const [uuid, setUuid] = useState('');
  const [major, setMajor] = useState('');
  const [minor, setMinor] = useState('');

  useEffect(() => {
    client.get('/buildings').then(({ data }) => {
      setBuildings(data);
      if (data.length > 0) setBuildingId(data[0].id);
    });
    refreshBeacons();
  }, []);

  async function refreshBeacons() {
    const { data } = await client.get('/beacons');
    setBeacons(data);
  }

  useEffect(() => {
    async function loadElevatorNodes() {
      if (!buildingId) return;
      const { data: building } = await client.get(`/buildings/${buildingId}`);
      const floorDetails = await Promise.all(
        building.floors.map((f) => client.get(`/floors/${f.id}`))
      );
      const nodes = floorDetails.flatMap((res, i) =>
        res.data.nodes
          .filter((n) => n.type === 'elevator')
          .map((n) => ({ ...n, floorName: building.floors[i].name }))
      );
      setElevatorNodes(nodes);
      setFormNodeId(nodes[0]?.id || '');
    }
    loadElevatorNodes();
  }, [buildingId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formNodeId || !uuid || major === '' || minor === '') return;
    await client.post('/beacons', {
      nodeId: Number(formNodeId),
      uuid,
      major: Number(major),
      minor: Number(minor),
    });
    setUuid('');
    setMajor('');
    setMinor('');
    await refreshBeacons();
  }

  async function handleDelete(id) {
    await client.delete(`/beacons/${id}`);
    await refreshBeacons();
  }

  return (
    <div className="page">
      <h2>بیکن‌ها (اختیاری)</h2>
      <p className="muted">
        این صفحه فقط ثبت شناسه بیکن (UUID/Major/Minor) و اتصال آن به نقطه آسانسور در دیتابیس است —
        هیچ اسکن یا موقعیت‌یابی زنده‌ای در این پروژه پیاده‌سازی نشده است.
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

      {elevatorNodes.length === 0 ? (
        <p className="muted">
          هیچ نقطه آسانسوری برای این ساختمان ثبت نشده — از «ویرایشگر نقشه» یک نقطه با نوع «آسانسور»
          اضافه کنید.
        </p>
      ) : (
        <form className="inline-form" onSubmit={handleSubmit}>
          <select value={formNodeId} onChange={(e) => setFormNodeId(e.target.value)}>
            {elevatorNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label || `آسانسور #${n.id}`} ({n.floorName})
              </option>
            ))}
          </select>
          <input placeholder="UUID" value={uuid} onChange={(e) => setUuid(e.target.value)} required />
          <input
            placeholder="Major"
            type="number"
            value={major}
            onChange={(e) => setMajor(e.target.value)}
            style={{ width: 90 }}
            required
          />
          <input
            placeholder="Minor"
            type="number"
            value={minor}
            onChange={(e) => setMinor(e.target.value)}
            style={{ width: 90 }}
            required
          />
          <button type="submit" className="btn-primary">
            ثبت بیکن
          </button>
        </form>
      )}

      <h3>بیکن‌های ثبت‌شده</h3>
      <ul className="list">
        {beacons.map((b) => (
          <li key={b.id} className="list-item">
            <span>
              {b.node_label || `آسانسور #${b.node_id}`} — UUID: {b.uuid} — Major: {b.major} — Minor:{' '}
              {b.minor}
            </span>
            <button type="button" className="btn-icon-danger" onClick={() => handleDelete(b.id)}>
              حذف
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
