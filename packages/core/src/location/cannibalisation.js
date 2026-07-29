import { distanceMetres } from '../adapters/places.js';
import { OUTLETS } from '../domain/outlets.js';
import { assertTenant } from '../lib/tenantScope.js';
import { toolResult } from '../lib/toolResult.js';
import { LocationScoreError } from './locationScore.js';

/**
 * `bq.cannibalisation` — AC-5.2: a candidate closer than 1.2 km to one of the
 * tenant's own outlets is flagged.
 *
 * The point is not proximity for its own sake: below this distance a new branch
 * mostly moves existing customers rather than adding new ones, so the revenue
 * it shows is partly taken from a branch the tenant already owns.
 */
export const CANNIBALISATION_THRESHOLD_KM = 1.2;

export async function cannibalisation({ tenantId, geo, excludeOutletId = null } = {}) {
  const startedAt = Date.now();
  assertTenant(tenantId);

  if (!geo || typeof geo.lat !== 'number' || typeof geo.lng !== 'number') {
    throw new LocationScoreError('GEO_REQUIRED', 'Koordinat kandidat wajib diisi');
  }

  const own = OUTLETS.filter(
    (outlet) => outlet.tenantId === tenantId && outlet.outletId !== excludeOutletId,
  );

  const ranked = own
    .map((outlet) => ({
      outletId: outlet.outletId,
      name: outlet.name,
      km: Number((distanceMetres(geo, outlet.geo) / 1000).toFixed(2)),
    }))
    .sort((a, b) => a.km - b.km);

  const nearest = ranked[0] ?? null;
  const flagged = Boolean(nearest && nearest.km < CANNIBALISATION_THRESHOLD_KM);

  return toolResult({
    data: {
      nearestOwn: nearest,
      nearestOwnKm: nearest?.km ?? null,
      flagged,
      threshold: CANNIBALISATION_THRESHOLD_KM,
      verdict: verdictFor(nearest, flagged),
      others: ranked.slice(1, 4),
    },
    // The tenant's own outlets are the evidence; a claim about cannibalisation
    // has to point at the branch it would cannibalise.
    sources: ranked.slice(0, 3).map((entry) => ({
      type: 'outlet',
      outletId: entry.outletId,
      name: entry.name,
      distanceKm: entry.km,
    })),
    startedAt,
  });
}

function verdictFor(nearest, flagged) {
  if (!nearest) return 'Tidak ada cabang sendiri untuk dibandingkan.';
  if (flagged) {
    return `Cabang sendiri terdekat ${nearest.name} hanya ${nearest.km} km — sebagian pelanggan akan berpindah, bukan bertambah.`;
  }
  return `Cabang sendiri terdekat ${nearest.name} ${nearest.km} km — tidak berebut pelanggan.`;
}
