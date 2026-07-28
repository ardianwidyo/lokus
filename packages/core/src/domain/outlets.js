/**
 * The pilot tenant's outlets. Codes, names, ratings and location scores are the
 * ones design/SCREENS.md shows on screens 03 and 04; `region` is what the
 * systemic-theme rule counts (AC-2.2: a theme in 4+ regions is systemic).
 *
 * Coordinates are real Jabodetabek positions, used by the location agent for
 * distance and catchment maths in P3.
 */
export const OUTLETS = Object.freeze([
  {
    outletId: 'BKS-02',
    tenantId: 'nusa-retail',
    code: 'BKS-02',
    name: 'Bekasi Timur',
    shortName: 'Bekasi',
    region: 'Bekasi',
    address: 'Jl. Chairil Anwar No. 88',
    manager: 'Dwi Kurnia',
    openedAt: '2021-03-01',
    geo: { lat: -6.2383, lng: 107.0011 },
  },
  {
    outletId: 'CKR-01',
    tenantId: 'nusa-retail',
    code: 'CKR-01',
    name: 'Cikarang Jababeka',
    shortName: 'Cikarang',
    region: 'Cikarang',
    address: 'Jl. Niaga Raya Blok C',
    manager: 'Rangga Prasetyo',
    openedAt: '2020-08-14',
    geo: { lat: -6.2797, lng: 107.1518 },
  },
  {
    outletId: 'DPK-01',
    tenantId: 'nusa-retail',
    code: 'DPK-01',
    name: 'Depok Margonda',
    shortName: 'Depok',
    region: 'Depok',
    address: 'Jl. Margonda Raya No. 204',
    manager: 'Sari Wulandari',
    openedAt: '2019-11-02',
    geo: { lat: -6.3742, lng: 106.8294 },
  },
  {
    outletId: 'SRP-03',
    tenantId: 'nusa-retail',
    code: 'SRP-03',
    name: 'Serpong Sektor 7',
    shortName: 'Serpong',
    region: 'Serpong',
    address: 'Ruko Sektor 7 Blok RA',
    manager: 'Bayu Nugroho',
    openedAt: '2022-01-20',
    geo: { lat: -6.2924, lng: 106.6741 },
  },
  {
    outletId: 'BGR-01',
    tenantId: 'nusa-retail',
    code: 'BGR-01',
    name: 'Bogor Pajajaran',
    shortName: 'Bogor',
    region: 'Bogor',
    address: 'Jl. Raya Pajajaran No. 17',
    manager: 'Intan Permata',
    openedAt: '2021-09-06',
    geo: { lat: -6.5944, lng: 106.8006 },
  },
  {
    outletId: 'TGR-01',
    tenantId: 'nusa-retail',
    code: 'TGR-01',
    name: 'Tangerang Alam Sutera',
    shortName: 'Tangerang',
    region: 'Tangerang',
    address: 'Jl. Alam Sutera Boulevard',
    manager: 'Fajar Ramadhan',
    openedAt: '2020-02-11',
    geo: { lat: -6.2286, lng: 106.6534 },
  },
]);

const BY_ID = new Map(OUTLETS.map((outlet) => [outlet.outletId, outlet]));

export function findOutlet(outletId) {
  return BY_ID.get(outletId) ?? null;
}

export function outletsForTenant(tenantId) {
  return OUTLETS.filter((outlet) => outlet.tenantId === tenantId);
}

export function regionCount(outletIds) {
  return new Set(
    outletIds.map((id) => findOutlet(id)?.region).filter(Boolean),
  ).size;
}
