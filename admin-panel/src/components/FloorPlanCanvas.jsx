import { useRef, useState } from 'react';

/**
 * Renders a floor plan image and turns clicks into natural-pixel coordinates
 * (independent of how large the image is drawn on screen), so stored
 * node/scale coordinates stay consistent across devices.
 *
 * Markers and edges are positioned with percentages of the natural image
 * size, so they stay aligned with the image at any zoom/display size.
 */
export default function FloorPlanCanvas({ imageUrl, markers = [], edges = [], onImageClick }) {
  const imgRef = useRef(null);
  const [naturalSize, setNaturalSize] = useState(null);

  function handleLoad() {
    const img = imgRef.current;
    if (img) {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }

  function handleClick(e) {
    if (!onImageClick || !imgRef.current || !naturalSize) return;
    const rect = imgRef.current.getBoundingClientRect();
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;
    const x = fracX * naturalSize.width;
    const y = fracY * naturalSize.height;
    onImageClick({ x, y });
  }

  if (!imageUrl) {
    return <div className="canvas-placeholder">ابتدا تصویر پلان طبقه را آپلود کنید</div>;
  }

  return (
    <div className="floorplan-wrap">
      <img
        ref={imgRef}
        src={imageUrl}
        alt="پلان طبقه"
        className="floorplan-img"
        onLoad={handleLoad}
        onClick={handleClick}
        draggable={false}
      />
      {naturalSize && (
        <svg
          className="floorplan-overlay"
          viewBox={`0 0 ${naturalSize.width} ${naturalSize.height}`}
          preserveAspectRatio="none"
        >
          {edges.map((edge, i) => (
            <line
              key={i}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              stroke="#0f766e"
              strokeWidth={Math.max(naturalSize.width * 0.003, 2)}
            />
          ))}
          {markers.map((marker, i) => (
            <g
              key={i}
              transform={`translate(${marker.x}, ${marker.y})`}
              onClick={(e) => {
                e.stopPropagation();
                marker.onClick?.();
              }}
              style={{ cursor: marker.onClick ? 'pointer' : 'default' }}
            >
              <circle
                r={Math.max(naturalSize.width * 0.008, 6)}
                fill={marker.color || '#e11d48'}
                stroke="#fff"
                strokeWidth={Math.max(naturalSize.width * 0.0015, 1)}
              />
              {marker.label && (
                <text
                  y={-Math.max(naturalSize.width * 0.012, 10)}
                  textAnchor="middle"
                  fontSize={Math.max(naturalSize.width * 0.014, 12)}
                  fill="#111827"
                  stroke="#fff"
                  strokeWidth={Math.max(naturalSize.width * 0.002, 2)}
                  paintOrder="stroke"
                >
                  {marker.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}
