/**
 * The map surface. Real coordinates projected into the viewbox — no tile
 * layer, no map library, and no invented positions.
 *
 * Markers are shape-coded, not colour-coded: a square is an own branch, a
 * circle is a competitor. Status in this design system is carried by shape and
 * tag rather than by hue, and a map is where that discipline matters most,
 * because a dark field flattens colour differences.
 */

const WIDTH = 720;
const HEIGHT = 520;
const PADDING = 56;

/** Projects lat/lng into the viewbox, keeping relative positions honest. */
export function project(points, width = WIDTH, height = HEIGHT, padding = PADDING) {
  const lats = points.map((p) => p.geo.lat);
  const lngs = points.map((p) => p.geo.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  // A single point, or a perfectly straight line of them, would divide by zero.
  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;

  return (geo) => ({
    x: padding + ((geo.lng - minLng) / spanLng) * (width - padding * 2),
    // Latitude grows north, y grows down.
    y: padding + ((maxLat - geo.lat) / spanLat) * (height - padding * 2),
  });
}

export function MapField({ outlets, competitors = [], layer, selectedId, onSelect }) {
  if (outlets.length === 0) return null;

  const to = project(outlets);
  const worst = outlets[0];

  return (
    <svg
      className="map-field"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Peta ${outlets.length} cabang dan ${competitors.length} pesaing`}
    >
      <rect width={WIDTH} height={HEIGHT} className="map-bg" />

      <g className="map-grid-lines" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 72} y1="0" x2={(i + 1) * 72} y2={HEIGHT} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 65} x2={WIDTH} y2={(i + 1) * 65} />
        ))}
      </g>

      {/* The analysis radius, drawn around the branch that needs attention. */}
      <circle
        className="map-radius"
        cx={to(worst.geo).x}
        cy={to(worst.geo).y}
        r="58"
        aria-hidden="true"
      />

      {competitors.map((poi) => {
        const point = to(poi.geo);
        return (
          <circle
            key={poi.placeId}
            className={`map-competitor${poi.openedAt ? ' is-new' : ''}`}
            cx={point.x}
            cy={point.y}
            r="5"
          >
            <title>
              {poi.name}
              {poi.openedAt ? ` · buka ${poi.openedAt}` : ''} · {poi.distanceM} m
            </title>
          </circle>
        );
      })}

      {outlets.map((outlet) => {
        const point = to(outlet.geo);
        const isSelected = outlet.outletId === selectedId;

        return (
          <g
            key={outlet.outletId}
            className={`map-outlet${isSelected ? ' is-selected' : ''}`}
            onClick={() => onSelect?.(outlet.outletId)}
            role="button"
            tabIndex={0}
            aria-label={`${outlet.name}, skor ${outlet.score}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.(outlet.outletId);
              }
            }}
          >
            <rect x={point.x - 6.5} y={point.y - 6.5} width="13" height="13" />
            <text x={point.x + 12} y={point.y + 1} className="map-label">
              {outlet.code} {outlet.name}
            </text>
            <text x={point.x + 12} y={point.y + 15} className="map-sublabel">
              {labelFor(outlet, layer)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The layer chip decides what the second line says, not what the map draws. */
function labelFor(outlet, layer) {
  if (layer === 'reputasi') {
    return outlet.rating === null
      ? 'rating belum tersedia'
      : `rating ${outlet.rating.toFixed(1).replace('.', ',')}`;
  }
  if (layer === 'pesaing') {
    return `${outlet.competitorCount} pesaing${
      outlet.newCompetitorCount > 0 ? ` · ${outlet.newCompetitorCount} baru` : ''
    }`;
  }
  return `skor ${outlet.score}`;
}
