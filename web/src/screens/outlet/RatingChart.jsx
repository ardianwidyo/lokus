import { useLocale } from '../../i18n/index.js';

/**
 * Weekly mean rating, with the change points the analytics found and — when
 * Places recorded one — a dashed line on the week a competitor opened.
 *
 * The dashed line comes from the Places response, not from the rating series.
 * Drawing it from the biggest drop would have made every branch look like it
 * had an explanation, which is the exact claim this chart must not make.
 */

const WIDTH = 620;
const HEIGHT = 120;
const PADDING = { top: 12, right: 12, bottom: 22, left: 30 };

/** The chart never implies a 1-to-5 range it does not draw. */
const FLOOR = 2.5;
const CEILING = 5;

export function RatingChart({ points, changePoints = [], event = null, weeks }) {
  const { t, fmt } = useLocale();

  if (!points?.length) return null;

  const rated = points.filter((point) => point.rating !== null);
  if (rated.length < 2) return null;

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;
  const step = innerW / (points.length - 1);

  const x = (week) => PADDING.left + (week - 1) * step;
  const y = (rating) =>
    PADDING.top + innerH - ((clamp(rating) - FLOOR) / (CEILING - FLOOR)) * innerH;

  const line = rated.map((point) => `${x(point.week).toFixed(1)},${y(point.rating).toFixed(1)}`);
  const changeWeeks = new Set(changePoints.map((change) => change.week));

  return (
    <svg
      className="rating-chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={t('chart.ratingLabel', {
        weeks,
        from: fmt.number(rated[0].rating),
        to: fmt.number(rated.at(-1).rating),
      })}
    >
      <g className="chart-grid" aria-hidden="true">
        {[FLOOR, (FLOOR + CEILING) / 2, CEILING].map((value) => (
          <g key={value}>
            <line x1={PADDING.left} y1={y(value)} x2={WIDTH - PADDING.right} y2={y(value)} />
            <text className="chart-axis" x={PADDING.left - 6} y={y(value) + 3} textAnchor="end">
              {fmt.number(value, 1)}
            </text>
          </g>
        ))}
      </g>

      {event ? (
        <g className="chart-event">
          <line
            x1={x(event.week)}
            y1={PADDING.top}
            x2={x(event.week)}
            y2={PADDING.top + innerH}
          />
          <text className="chart-event-label" x={x(event.week) + 5} y={PADDING.top + 9}>
            {t('chart.eventLabel', { day: fmt.shortDate(event.openedAt), name: event.name })}
          </text>
        </g>
      ) : null}

      <polyline className="chart-line" points={line.join(' ')} />

      {rated.map((point) => (
        <circle
          key={point.week}
          className={`chart-point${changeWeeks.has(point.week) ? ' is-change' : ''}`}
          cx={x(point.week)}
          cy={y(point.rating)}
          r={changeWeeks.has(point.week) ? 3.5 : 2}
        >
          <title>
            {t('chart.pointLabel', {
              week: point.week,
              date: point.startsAt,
              rating: fmt.number(point.rating),
              reviews: point.reviewCount,
            })}
          </title>
        </circle>
      ))}

      <g className="chart-axis" aria-hidden="true">
        <text x={PADDING.left} y={HEIGHT - 6}>
          {fmt.shortDate(points[0].startsAt)}
        </text>
        <text x={WIDTH - PADDING.right} y={HEIGHT - 6} textAnchor="end">
          {fmt.shortDate(points.at(-1).startsAt)}
        </text>
      </g>
    </svg>
  );
}

function clamp(rating) {
  return Math.min(CEILING, Math.max(FLOOR, rating));
}
