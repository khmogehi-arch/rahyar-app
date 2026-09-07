import { useEffect, useState } from 'react';
import client, { fileUrl } from '../api/client';
import FloorPlanCanvas from '../components/FloorPlanCanvas';

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloorId, setSelectedFloorId] = useState(null);

  const [newBuildingName, setNewBuildingName] = useState('');
  const [newBuildingAddress, setNewBuildingAddress] = useState('');

  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorOrder, setNewFloorOrder] = useState(0);

  const [scalePoints, setScalePoints] = useState([]);
  const [scaleDistance, setScaleDistance] = useState('');
  const [message, setMessage] = useState('');

  async function loadBuildings() {
    const { data } = await client.get('/buildings');
    setBuildings(data);
    if (!selectedBuildingId && data.length > 0) {
      setSelectedBuildingId(data[0].id);
    }
  }

  async function loadBuildingDetail(id) {
    if (!id) return;
    const { data } = await client.get(`/buildings/${id}`);
    setSelectedBuilding(data);
    if (data.floors.length > 0 && !data.floors.some((f) => f.id === selectedFloorId)) {
      setSelectedFloorId(data.floors[0].id);
    } else if (data.floors.length === 0) {
      setSelectedFloorId(null);
    }
  }

  useEffect(() => {
    loadBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setScalePoints([]);
    loadBuildingDetail(selectedBuildingId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuildingId]);

  const selectedFloor = selectedBuilding?.floors.find((f) => f.id === selectedFloorId) || null;

  async function handleCreateBuilding(e) {
    e.preventDefault();
    if (!newBuildingName.trim()) return;
    const { data } = await client.post('/buildings', {
      name: newBuildingName,
      address: newBuildingAddress,
    });
    setNewBuildingName('');
    setNewBuildingAddress('');
    await loadBuildings();
    setSelectedBuildingId(data.id);
  }

  async function handleCreateFloor(e) {
    e.preventDefault();
    if (!newFloorName.trim() || !selectedBuildingId) return;
    await client.post('/floors', {
      buildingId: selectedBuildingId,
      name: newFloorName,
      order: Number(newFloorOrder) || 0,
    });
    setNewFloorName('');
    setNewFloorOrder(0);
    await loadBuildingDetail(selectedBuildingId);
  }

  async function handleUploadImage(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedFloorId) return;
    const formData = new FormData();
    formData.append('image', file);
    await client.post(`/floors/${selectedFloorId}/plan-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setScalePoints([]);
    await loadBuildingDetail(selectedBuildingId);
  }

  function handleCanvasClick(point) {
    if (scalePoints.length >= 2) {
      setScalePoints([point]);
    } else {
      setScalePoints([...scalePoints, point]);
    }
  }

  async function handleSaveScale() {
    if (scalePoints.length !== 2 || !scaleDistance) return;
    await client.post(`/floors/${selectedFloorId}/scale`, {
      point1: scalePoints[0],
      point2: scalePoints[1],
      realDistanceMeters: Number(scaleDistance),
    });
    setScalePoints([]);
    setScaleDistance('');
    setMessage('مقیاس با موفقیت ثبت شد');
    await loadBuildingDetail(selectedBuildingId);
    setTimeout(() => setMessage(''), 3000);
  }

  async function handleDeleteBuilding(id) {
    if (!window.confirm('این ساختمان و همه طبقات/داده‌های آن حذف شود؟')) return;
    await client.delete(`/buildings/${id}`);
    setSelectedBuildingId(null);
    await loadBuildings();
  }

  async function handleDeleteFloor(id) {
    if (!window.confirm('این طبقه و همه نقشه/نودها/مسیرها/QR کدهای آن حذف شود؟')) return;
    await client.delete(`/floors/${id}`);
    if (selectedFloorId === id) {
      setSelectedFloorId(null);
    }
    await loadBuildingDetail(selectedBuildingId);
  }

  return (
    <div className="page">
      <h2>ساختمان‌ها</h2>

      <div className="two-col">
        <section className="panel">
          <h3>ساختمان‌ها</h3>
          <ul className="list">
            {buildings.map((b) => (
              <li
                key={b.id}
                className={b.id === selectedBuildingId ? 'list-item active' : 'list-item'}
                onClick={() => setSelectedBuildingId(b.id)}
              >
                <span>{b.name}</span>
                <button
                  type="button"
                  className="btn-icon-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBuilding(b.id);
                  }}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
          <form className="inline-form" onSubmit={handleCreateBuilding}>
            <input
              placeholder="نام ساختمان جدید"
              value={newBuildingName}
              onChange={(e) => setNewBuildingName(e.target.value)}
              required
            />
            <input
              placeholder="آدرس (اختیاری)"
              value={newBuildingAddress}
              onChange={(e) => setNewBuildingAddress(e.target.value)}
            />
            <button type="submit" className="btn-primary">
              افزودن ساختمان
            </button>
          </form>
        </section>

        <section className="panel">
          <h3>طبقات {selectedBuilding ? `— ${selectedBuilding.name}` : ''}</h3>
          {!selectedBuilding && <p className="muted">یک ساختمان انتخاب کنید</p>}
          {selectedBuilding && (
            <>
              <ul className="list">
                {selectedBuilding.floors.map((f) => (
                  <li
                    key={f.id}
                    className={f.id === selectedFloorId ? 'list-item active' : 'list-item'}
                    onClick={() => setSelectedFloorId(f.id)}
                  >
                    <span>
                      {f.name} {f.scale_meters_per_pixel ? '✓ مقیاس‌بندی شده' : ''}
                    </span>
                    <button
                      type="button"
                      className="btn-icon-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFloor(f.id);
                      }}
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
              <form className="inline-form" onSubmit={handleCreateFloor}>
                <input
                  placeholder="نام طبقه (مثلاً همکف)"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="ترتیب"
                  value={newFloorOrder}
                  onChange={(e) => setNewFloorOrder(e.target.value)}
                  style={{ width: 80 }}
                />
                <button type="submit" className="btn-primary">
                  افزودن طبقه
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      {selectedFloor && (
        <section className="panel">
          <h3>پلان طبقه — {selectedFloor.name}</h3>
          <div className="toolbar">
            <label className="btn-secondary file-input-label">
              آپلود / جایگزینی تصویر پلان
              <input type="file" accept="image/*" onChange={handleUploadImage} hidden />
            </label>
            {selectedFloor.scale_meters_per_pixel && (
              <span className="badge">
                مقیاس: {selectedFloor.scale_meters_per_pixel.toFixed(4)} متر/پیکسل
              </span>
            )}
          </div>

          {selectedFloor.floor_plan_image_url && (
            <>
              <p className="muted">
                برای تعیین مقیاس، دو نقطه روی پلان با فاصله واقعی معلوم (مثلاً دو سر یک راهرو)
                کلیک کنید، سپس فاصله واقعی را به متر وارد و ثبت کنید.
              </p>
              <FloorPlanCanvas
                imageUrl={fileUrl(selectedFloor.floor_plan_image_url)}
                onImageClick={handleCanvasClick}
                markers={scalePoints.map((p, i) => ({ ...p, label: `${i + 1}`, color: '#2563eb' }))}
                edges={
                  scalePoints.length === 2
                    ? [{ x1: scalePoints[0].x, y1: scalePoints[0].y, x2: scalePoints[1].x, y2: scalePoints[1].y }]
                    : []
                }
              />
              <div className="toolbar">
                <input
                  type="number"
                  step="0.01"
                  placeholder="فاصله واقعی بین دو نقطه (متر)"
                  value={scaleDistance}
                  onChange={(e) => setScaleDistance(e.target.value)}
                  disabled={scalePoints.length !== 2}
                />
                <button
                  type="button"
                  className="btn-primary"
                  disabled={scalePoints.length !== 2 || !scaleDistance}
                  onClick={handleSaveScale}
                >
                  ثبت مقیاس
                </button>
                {message && <span className="success-text">{message}</span>}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
