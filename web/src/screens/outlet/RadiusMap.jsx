import { useT } from '../../i18n/index.js';

/**
 * The 1 km neighbourhood around one branch.
 *
 * Positions come from the POIs' real distance and bearing relative to the
 * branch, projected to scale — the radius ring is the actual radius, so a
 * competitor drawn near the edge is near the edge.
 */

const SIZE = 200;
const CENTRE = SIZE / 2;
const RING = 78;

export function RadiusMap({ outlet, pois = [], radiusM = 1000 }) {
  const t = useT();

  if (!outlet?.geo) return null;

  const place = (poi) => {
    const dLat = poi.geo.lat - outlet.geo.lat;
    const dLng = poi.geo.lng - outlet.geo.lng;
    const scale = (poi.distanceM / radiusM) * RING;
    const norm = Math.hypot(dLat, dLng) || 1;

    return {
      x: CENTRE + (dLng / norm) * scale,
      // Latitude grows north, y grows down.
      y: CENTRE - (dLat / norm) * scale,
    };
  };

  return (
    <svg
      className="radius-map"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label={t('radiusMap.label', { name: outlet.name, count: pois.length, radius: radiusM })}
    >
      <rect width={SIZE} height={SIZE} className="map-bg" />

      <circle className="map-radius" cx={CENTRE} cy={CENTRE} r={RING} />
      <circle className="map-radius is-inner" cx={CENTRE} cy={CENTRE} r={RING / 2} />

      {pois.map((poi) => {
        const point = place(poi);
        return (
          <circle
            key={poi.placeId}
            className={`map-competitor${poi.openedAt ? ' is-new' : ''}`}
            cx={point.x}
            cy={point.y}
            r="4"
          >
            <title>
              {poi.openedAt
                ? t('radiusMap.competitorTitle', {
                    name: poi.name,
                    distance: poi.distanceM,
                    date: poi.openedAt,
                  })
                : t('radiusMap.competitorTitleNoDate', { name: poi.name, distance: poi.distanceM })}
            </title>
          </circle>
        );
      })}

      <rect
        className="map-self"
        x={CENTRE - 5}
        y={CENTRE - 5}
        width="10"
        height="10"
      >
        <title>{outlet.name}</title>
      </rect>
    </svg>
  );
}
