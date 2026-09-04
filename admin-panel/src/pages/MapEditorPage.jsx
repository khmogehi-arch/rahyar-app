import { useEffect, useState } from 'react';
import client, { fileUrl } from '../api/client';
import FloorPlanCanvas from '../components/FloorPlanCanvas';

const NODE_TYPES = [
  { value: 'entrance', label: 'ورودی', color: '#16a34a' },
  { value: 'poi', label: 'مقصد (POI)', color: '#e11d48' },
  { value: 'junction', label: 'تقاطع', color: '#6b7280' },
  { value: 'elevator', label: 'آسانسور', color: '#7c3aed' },
];

const DIRECTIONS = [
  { value: 'straight', label: 'مستقیم' },
  { value: 'left', label: 'چپ' },
  { value: 'right', label: 'راست' },
  { value: 'up', label: 'بالا (پله/آسانسور)' },
  { value: 'down', label: 'پایین (پله/آسانسور)' },
];

function typeColor(type) {
  return NODE_TYPES.find((t) => t.value === type)?.color || '#111827';
}
function typeLabel(type) {
  return NODE_TYPES.find((t) => t.value === type)?.label || type;
}

export default function MapEditorPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [floors, setFloors] = useState([]);
  const [floorId, setFloorId] = useState(null);
  const [floor, setFloor] = useState(null);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [mode, setMode] = useState('node'); // 'node' | 'edge'

  const [pendingPoint, setPendingPoint] = useState(null);
  const [nodeType, setNodeType] = useState('poi');
  const [nodeLabel, setNodeLabel] = useState('');

  const [edgeFrom, setEdgeFrom] = useState(null);
  const [edgeTo, setEdgeTo] = useState(null);
  const [edgeDistance, setEdgeDistance] = useState('');
  const [edgeInstruction, setEdgeInstruction] = useState('');
  const [edgeDirection, setEdgeDirection] = useState('straight');

  useEffect(() => {
    client.get('/buildings').then(({ data }) => {
      setBuildings(data);
      if (data.length > 0) setBuildingId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!buildingId) return;
    client.get(`/buildings/${buildingId}`).then(({ data }) => {
      setFloors(data.floors);
      setFloorId(data.floors[0]?.id || null);
    });
  }, [buildingId]);

  async function loadFloorData(id) {
    if (!id) return;
    const [floorRes, edgesRes] = await Promise.all([
      client.get(`/floors/${id}`),
      client.get('/edges', { params: { floorId: id } }),
    ]);
    setFloor(floorRes.data);
    setNodes(floorRes.data.nodes);
    setEdges(edgesRes.data);
  }

  useEffect(() => {
    setPendingPoint(null);
    setEdgeFrom(null);
    setEdgeTo(null);
    loadFloorData(floorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorId]);

  function handleCanvasClick(point) {
    if (mode !== 'node') return;
    setPendingPoint(point);
    setNodeLabel('');
    setNodeType('poi');
  }

  async function handleSaveNode() {
    if (!pendingPoint || !floorId) return;
    await client.post('/nodes', {
      floorId,
      type: nodeType,
      label: nodeLabel || null,
      x: pendingPoint.x,
      y: pendingPoint.y,
    });
    setPendingPoint(null);
    await loadFloorData(floorId);
  }

  async function handleDeleteNode(id) {
    if (!window.confirm('این نقطه (و یال‌های متصل به آن) حذف شود؟')) return;
    await client.delete(`/nodes/${id}`);
    if (edgeFrom === id) setEdgeFrom(null);
    if (edgeTo === id) setEdgeTo(null);
    await loadFloorData(floorId);
  }

  function handleMarkerClick(nodeId) {
    if (mode !== 'edge') return;
    if (!edgeFrom) {
      setEdgeFrom(nodeId);
    } else if (!edgeTo && nodeId !== edgeFrom) {
      setEdgeTo(nodeId);
    } else {
      setEdgeFrom(nodeId);
      setEdgeTo(null);
    }
  }

  async function handleSaveEdge() {
    if (!edgeFrom || !edgeTo || !edgeDistance) return;
    await client.post('/edges', {
      fromNodeId: edgeFrom,
      toNodeId: edgeTo,
      distanceMeters: Number(edgeDistance),
      instruction: edgeInstruction,
      direction: edgeDirection,
    });
    setEdgeFrom(null);
    setEdgeTo(null);
    setEdgeDistance('');
    setEdgeInstruction('');
    await loadFloorData(floorId);
  }

  async function handleDeleteEdge(id) {
    await client.delete(`/edges/${id}`);
    await loadFloorData(floorId);
  }

  const markers = nodes.map((n) => ({
    x: n.x,
    y: n.y,
    color:
      n.id === edgeFrom ? '#2563eb' : n.id === edgeTo ? '#f59e0b' : typeColor(n.type),
    label: n.label || typeLabel(n.type),
    onClick: () => handleMarkerClick(n.id),
  }));

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edgeLines = edges
    .filter((e) => nodeById[e.from_node_id] && nodeById[e.to_node_id])
    .map((e) => ({
      x1: nodeById[e.from_node_id].x,
      y1: nodeById[e.from_node_id].y,
      x2: nodeById[e.to_node_id].x,
      y2: nodeById[e.to_node_id].y,
    }));

  if (pendingPoint) {
    markers.push({ x: pendingPoint.x, y: pendingPoint.y, color: '#0f766e', label: 'جدید' });
  }

  return (
    <div className="page">
      <h2>ویرایشگر نقشه</h2>

      <div className="toolbar">
        <select value={buildingId || ''} onChange={(e) => setBuildingId(Number(e.target.value))}>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select value={floorId || ''} onChange={(e) => setFloorId(Number(e.target.value))}>
          {floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <div className="mode-toggle">
          <button
            type="button"
            className={mode === 'node' ? 'btn-toggle active' : 'btn-toggle'}
            onClick={() => {
              setMode('node');
              setEdgeFrom(null);
              setEdgeTo(null);
            }}
          >
            افزودن نقطه (Node)
          </button>
          <button
            type="button"
            className={mode === 'edge' ? 'btn-toggle active' : 'btn-toggle'}
            onClick={() => {
              setMode('edge');
              setPendingPoint(null);
            }}
          >
            رسم یال (Edge)
          </button>
        </div>
      </div>

      {!floor?.floor_plan_image_url && (
        <p className="muted">برای این طبقه هنوز پلانی آپلود نشده — از صفحه «ساختمان‌ها» آپلود کنید.</p>
      )}

      <div className="two-col">
        <section className="panel">
          <FloorPlanCanvas
            imageUrl={fileUrl(floor?.floor_plan_image_url)}
            markers={markers}
            edges={edgeLines}
            onImageClick={handleCanvasClick}
          />
        </section>

        <section className="panel">
          {mode === 'node' && (
            <>
              <h3>نقطه جدید</h3>
              {!pendingPoint && <p className="muted">روی پلان کلیک کنید تا نقطه‌ای اضافه شود.</p>}
              {pendingPoint && (
                <div className="form-stack">
                  <label>
                    نوع
                    <select value={nodeType} onChange={(e) => setNodeType(e.target.value)}>
                      {NODE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    برچسب (اختیاری)
                    <input value={nodeLabel} onChange={(e) => setNodeLabel(e.target.value)} />
                  </label>
                  <div className="toolbar">
                    <button type="button" className="btn-primary" onClick={handleSaveNode}>
                      ذخیره نقطه
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => setPendingPoint(null)}>
                      انصراف
                    </button>
                  </div>
                </div>
              )}

              <h3>نقاط این طبقه</h3>
              <ul className="list">
                {nodes.map((n) => (
                  <li key={n.id} className="list-item">
                    <span>
                      <b style={{ color: typeColor(n.type) }}>{typeLabel(n.type)}</b> —{' '}
                      {n.label || `#${n.id}`}
                    </span>
                    <button type="button" className="btn-icon-danger" onClick={() => handleDeleteNode(n.id)}>
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {mode === 'edge' && (
            <>
              <h3>یال جدید</h3>
              <p className="muted">
                روی یک نقطه کلیک کنید (مبدا)، سپس روی نقطه دوم (مقصد) — یال جهت‌دار از مبدا به
                مقصد ساخته می‌شود.
              </p>
              <div className="form-stack">
                <div>
                  مبدا: <b>{edgeFrom ? nodeById[edgeFrom]?.label || `#${edgeFrom}` : '—'}</b>
                </div>
                <div>
                  مقصد: <b>{edgeTo ? nodeById[edgeTo]?.label || `#${edgeTo}` : '—'}</b>
                </div>
                {edgeFrom && edgeTo && (
                  <>
                    <label>
                      فاصله واقعی (متر)
                      <input
                        type="number"
                        step="0.1"
                        value={edgeDistance}
                        onChange={(e) => setEdgeDistance(e.target.value)}
                      />
                    </label>
                    <label>
                      دستورالعمل متنی
                      <input
                        placeholder="مثلاً: ۱۵ متر مستقیم بروید و راست بپیچید"
                        value={edgeInstruction}
                        onChange={(e) => setEdgeInstruction(e.target.value)}
                      />
                    </label>
                    <label>
                      جهت
                      <select value={edgeDirection} onChange={(e) => setEdgeDirection(e.target.value)}>
                        {DIRECTIONS.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="toolbar">
                      <button type="button" className="btn-primary" onClick={handleSaveEdge}>
                        ذخیره یال
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => {
                          setEdgeFrom(null);
                          setEdgeTo(null);
                        }}
                      >
                        انصراف
                      </button>
                    </div>
                  </>
                )}
              </div>

              <h3>یال‌های این طبقه</h3>
              <ul className="list">
                {edges.map((e) => (
                  <li key={e.id} className="list-item">
                    <span>
                      {nodeById[e.from_node_id]?.label || `#${e.from_node_id}`} ←{' '}
                      {nodeById[e.to_node_id]?.label || `#${e.to_node_id}`} ({e.distance_meters} متر)
                    </span>
                    <button type="button" className="btn-icon-danger" onClick={() => handleDeleteEdge(e.id)}>
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
