-- Weekly theme rollup per outlet, with the systemic flag.
--
-- Runs after clustering has written `review.themes`. Rebuilds the whole 8-week
-- window for one tenant, so a re-run is idempotent.
--
-- AC-2.2: a theme carried by 4 or more distinct regions in the same week is
-- systemic. The region count is computed here rather than in the application so
-- the flag on screen 07 and the flag the agent reasons over are the same number.

DECLARE window_start DATE DEFAULT DATE_SUB(DATE(@asOf), INTERVAL 8 WEEK);

CREATE TEMP TABLE weekly AS
SELECT
  r.tenant_id,
  r.outlet_id,
  t.theme,
  DATE_TRUNC(DATE(r.published_at), WEEK(MONDAY)) AS week_start,
  COUNT(*) AS count
FROM `${project_id}.${marts_dataset}.review` AS r,
  UNNEST(r.themes) AS t
WHERE r.tenant_id = @tenantId
  AND DATE(r.published_at) >= window_start
  -- Complaints only: a five-star review that happens to mention parking is not
  -- a parking complaint.
  AND r.rating <= 3
GROUP BY tenant_id, outlet_id, theme, week_start;

CREATE TEMP TABLE regions AS
SELECT
  w.theme,
  w.week_start,
  COUNT(DISTINCT o.region) AS region_count
FROM weekly AS w
JOIN `${project_id}.${marts_dataset}.outlet` AS o
  ON o.outlet_id = w.outlet_id AND o.tenant_id = w.tenant_id
GROUP BY theme, week_start;

DELETE FROM `${project_id}.${marts_dataset}.theme_rollup`
WHERE tenant_id = @tenantId AND week_start >= window_start;

INSERT INTO `${project_id}.${marts_dataset}.theme_rollup` (
  tenant_id, outlet_id, theme, week_start, week_index,
  count, delta, region_count, systemic, computed_at
)
SELECT
  w.tenant_id,
  w.outlet_id,
  w.theme,
  w.week_start,
  DENSE_RANK() OVER (ORDER BY w.week_start) AS week_index,
  w.count,
  SAFE_DIVIDE(
    w.count,
    LAG(w.count, 4) OVER (PARTITION BY w.outlet_id, w.theme ORDER BY w.week_start)
  ) AS delta,
  r.region_count,
  r.region_count >= 4 AS systemic,
  CURRENT_TIMESTAMP() AS computed_at
FROM weekly AS w
JOIN regions AS r
  ON r.theme = w.theme AND r.week_start = w.week_start;
