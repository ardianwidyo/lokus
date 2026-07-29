/**
 * 90x20 sparkline, stroke only, no fill — design/UI-GUIDELINES.md "Kartu
 * metrik". A flat series still draws a flat line rather than disappearing, so
 * an empty row is visibly empty rather than ambiguous.
 */
export function Sparkline({ values, width = 90, height = 20, label }) {
  if (!values?.length) return null;

  const max = Math.max(...values, 1);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? `Tren ${values.length} pekan, nilai terakhir ${values.at(-1)}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * Intensity maps onto one accent ramp, never a rainbow. Text flips to the
 * ground colour from step 500 up, where the tint is dark enough to need it.
 */
export function intensityStyle(value, max) {
  if (!value) return { background: 'transparent' };

  const steps = [200, 300, 400, 500, 600, 700, 800];
  const index = Math.min(steps.length - 1, Math.floor((value / Math.max(max, 1)) * steps.length));
  const step = steps[index];

  return {
    background: `var(--color-accent-${step})`,
    color: step >= 500 ? 'var(--color-bg)' : 'var(--color-text)',
  };
}
