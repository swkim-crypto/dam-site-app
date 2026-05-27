export const DAM_CANDIDATES = [
  {
    id: "S34",
    lat: 16.193036,
    lon: 106.634703,
    bed: 342.0,
    baseH: 120,
    baseV: 32180.4,
    baseArea: 4920,
    damLength: 4920,
    catchment: 540.8,
    order: 4,
    priority: "검토필요",
  },
  {
    id: "S39",
    lat: 16.157971,
    lon: 106.607138,
    bed: 354.0,
    baseH: 120,
    baseV: 30427.1,
    baseArea: 4380,
    damLength: 4380,
    catchment: 656.3,
    order: 4,
    priority: "검토필요",
  },
  {
    id: "S49",
    lat: 16.165278,
    lon: 106.625158,
    bed: 340.0,
    baseH: 120,
    baseV: 27397.4,
    baseArea: 4830,
    damLength: 4830,
    catchment: 656.3,
    order: 4,
    priority: "검토필요",
  },
  {
    id: "S54",
    lat: 16.222222,
    lon: 106.606446,
    bed: 309.0,
    baseH: 120,
    baseV: 25904.8,
    baseArea: 3870,
    damLength: 3870,
    catchment: 1266.6,
    order: 5,
    priority: "검토필요",
  },
  {
    id: "S62",
    lat: 16.133403,
    lon: 106.609514,
    bed: 357.0,
    baseH: 120,
    baseV: 24511.2,
    baseArea: 2580,
    damLength: 2580,
    catchment: 656.3,
    order: 4,
    priority: "검토필요",
  },
];
export const ANALYSIS_INFO = {
  basin: { id: 'sebangfai', namKo: '세방히앙 유역' },
  demSource: 'SRTM 30m',
  method: 'DEM 기반 자동 분석',
  analysisDate: '2026-05-27',
  criterion: '홍수조절댐 최적 위치 선정'
};
export const PRIORITY_CONFIG = {
  '최우선': { color: '#e74c3c' }, '우선': { color: '#e67e22' },
  '검토필요': { color: '#3498db' }, '보류': { color: '#95a9a6' }
};
export const HEIGHT_STEPS = [40, 50, 60, 70, 80, 90, 100, 110, 120];
export function estimateVolume(c, h) { return c.baseV * (h / c.baseH) ** 2.5; }
export function estimateArea(c, h)   { return c.baseArea * (h / c.baseH) ** 2; }
export function calcFsl(c, h)        { return c.bed + h; }
export function calcEfficiency(v, a) { return a > 0 ? v / a : 0; }
export function estimateEvap(a)      { return a * 1.5; }