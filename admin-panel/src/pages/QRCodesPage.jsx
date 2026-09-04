import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import client, { visitorEntryUrl } from '../api/client';

export default function QRCodesPage() {
  const [buildings, setBuildings] = useState([]);
  const [buildingId, setBuildingId] = useState(null);
  const [entranceNodes, setEntranceNodes] = useState([]);
  const [qrByNodeId, setQrByNodeId] = useState({});

  useEffect(() => {
    client.get('/buildings').then(({ data }) => {
      setBuildings(data);
      if (data.length > 0) setBuildingId(data[0].id);
    });
    refreshQrCodes();
  }, []);

  async function refreshQrCodes() {
    const { data } = await client.get('/qrcodes');
    setQrByNodeId(Object.fromEntries(data.map((q) => [q.node_id, q])));
  }

  useEffect(() => {
    async function loadEntranceNodes() {
      if (!buildingId) return;
      const { data: building } = await client.get(`/buildings/${buildingId}`);
      const floorDetails = await Promise.all(
        building.floors.map((f) => client.get(`/floors/${f.id}`))
      );
      const nodes = floorDetails.flatMap((res, i) =>
        res.data.nodes
          .filter((n) => n.type === 'entrance')
          .map((n) => ({ ...n, floorName: building.floors[i].name }))
      );
      setEntranceNodes(nodes);
    }
    loadEntranceNodes();
  }, [buildingId]);

  async function handleGenerate(nodeId) {
    await client.post('/qrcodes', { nodeId });
    await refreshQrCodes();
  }

  function handleDownload(nodeId, label) {
    const canvas = document.getElementById(`qr-canvas-${nodeId}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `rahyar-qr-${label || nodeId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function handlePrint(nodeId) {
    const canvas = document.getElementById(`qr-canvas-${nodeId}`);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    win.document.write(
      `<html dir="rtl"><head><title>چاپ QR</title></head><body style="text-align:center;font-family:sans-serif">
      <img src="${dataUrl}" style="width:300px;height:300px" /><p>راهیار — اسکن کنید تا مسیر شروع شود</p>
      </body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="page">
      <h2>کدهای QR</h2>
      <p className="muted">
        برای هر نقطه از نوع «ورودی» یک QR منحصربه‌فرد تولید می‌شود؛ اسکن آن، مراجعه‌کننده را مستقیم
        به صفحه انتخاب مقصد وب‌اپ مراجعه‌کننده می‌برد.
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

      {entranceNodes.length === 0 && (
        <p className="muted">
          هیچ نقطه ورودی برای این ساختمان ثبت نشده — از «ویرایشگر نقشه» یک نقطه با نوع «ورودی» اضافه
          کنید.
        </p>
      )}

      <div className="qr-grid">
        {entranceNodes.map((node) => {
          const qr = qrByNodeId[node.id];
          const url = qr ? visitorEntryUrl(qr.token) : null;
          return (
            <div className="qr-card" key={node.id}>
              <h4>
                {node.label || `ورودی #${node.id}`} <span className="muted">({node.floorName})</span>
              </h4>
              {url ? (
                <>
                  <QRCodeCanvas id={`qr-canvas-${node.id}`} value={url} size={180} />
                  <p className="url-preview">{url}</p>
                  <div className="toolbar">
                    <button type="button" className="btn-secondary" onClick={() => handleDownload(node.id, node.label)}>
                      دانلود PNG
                    </button>
                    <button type="button" className="btn-secondary" onClick={() => handlePrint(node.id)}>
                      چاپ
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="btn-primary" onClick={() => handleGenerate(node.id)}>
                  تولید QR
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
