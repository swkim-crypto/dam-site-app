// Nam Ngiep Basin — 댐 후보지
// ──────────────────────────────────────────────────
// 분석 정보: SRTM GL1 + flood-fill 기반
// 기준: 상류 저수량 ≥ 5Mm³
// 분석일: 2026-04
// ──────────────────────────────────────────────────

export const ANALYSIS_INFO = {
  basin: {
    id: 'NAM_NGIEP',
    name: 'Nam Ngiep',
    namKo: '남니옙',
    country: 'Laos',
  },
  method: 'SRTM GL1 + flood-fill',
  criterion: '상류 저수량 ≥ 5Mm³',
  demSource: 'SRTM GL1 30m',
  analysisDate: '2026-04',
  note: '초기 분석. 강 중심선 재생성, 등고선 마스킹으로 범람역 제한',
}

// ══════════════════════════════════════════════════
// 댐 후보지 목록 (S1~S9)
// ══════════════════════════════════════════════════
export const candidates = [
  {
    id: 'S1',
    lat: 18.44333,
    lon: 103.58278,
    bed: 138,
    region: 'Lower Valley',
    priority: '검토필요',
    baseFsl: 198,
    baseH: 60,
    baseV: 4834,
    baseArea: 204.3,
    hMin5: 40,
    note: '저지대 계곡, H=40m부터 5Mm³ 달성. 대규모 저수 가능하나 침수 리스크 검토 필요',
  },
  {
    id: 'S2',
    lat: 18.63667,
    lon: 103.60083,
    bed: 143,
    region: 'Lower Valley',
    priority: '검토필요',
    baseFsl: 203,
    baseH: 60,
    baseV: 5928,
    baseArea: 222.8,
    hMin5: 40,
    note: '저지대 계곡, H=40m부터 5Mm³ 달성. 높은 저수 포텐셜, 하류 영향 검토 필요',
  },
  {
    id: 'S3',
    lat: 18.93056,
    lon: 103.54556,
    bed: 329,
    region: 'Middle Basin',
    priority: '최우선',
    baseFsl: 389,
    baseH: 60,
    baseV: 3277,
    baseArea: 110.9,
    hMin5: 40,
    note: '중고도 협곡형, H=40m부터 5Mm³ 달성. 댐 부지 조건 우수, 이주 영향 최소',
  },
  {
    id: 'S4',
    lat: 18.78083,
    lon: 103.51222,
    bed: 259,
    region: 'Middle Basin',
    priority: '최우선',
    baseFsl: 319,
    baseH: 60,
    baseV: 3114,
    baseArea: 98.2,
    hMin5: 40,
    note: '중고도 협곡형, H=40m부터 5Mm³ 달성. Nam Ngiep 2 계열과 유사 입지',
  },
  {
    id: 'S5',
    lat: 19.03333,
    lon: 103.40694,
    bed: 267,
    region: 'Upper Basin',
    priority: '최우선',
    baseFsl: 327,
    baseH: 60,
    baseV: 443,
    baseArea: 26.3,
    hMin5: 120,
    note: '상류 협곡형, H=120m에서 5Mm³ 달성. 높은 댐 필요, 접근성 검토 필요',
  },
  {
    id: 'S6',
    lat: 19.28667,
    lon: 103.18889,
    bed: 989,
    region: 'Xieng Khouang Highland',
    priority: '2순위',
    baseFsl: 1049,
    baseH: 60,
    baseV: 1398,
    baseArea: 46.6,
    hMin5: 100,
    note: '고원 고낙차형, H=100m에서 5Mm³ 달성. ROR 발전 적합',
  },
  {
    id: 'S7',
    lat: 19.14083,
    lon: 103.15972,
    bed: 596,
    region: 'Xieng Khouang Highland',
    priority: '2순위',
    baseFsl: 656,
    baseH: 60,
    baseV: 1371,
    baseArea: 44.6,
    hMin5: 120,
    note: '고원 고낙차형, H=120m에서 5Mm³ 달성. 발전 효율 우수',
  },
  {
    id: 'S9',
    lat: 19.20722,
    lon: 103.53750,
    bed: 1144,
    region: 'Xieng Khouang Highland',
    priority: '2순위',
    baseFsl: 1204,
    baseH: 60,
    baseV: 2114,
    baseArea: 73.3,
    hMin5: 90,
    note: '고원지대, H=90m에서 5Mm³ 달성. 접근성 불량',
  },
]

// ── 저수량 추정 ───────────────────────────────────
// H^2.5 스케일링 (기본 높이 대비)
export const estimateVolume = (c, h) => {
  // 시나리오 데이터가 있는 경우 (향후 확장용)
  if (c.storage_H20 !== undefined) {
    const pts = [
      [20, c.storage_H20],
      [30, c.storage_H30],
      [50, c.storage_H50],
      [80, c.storage_H80],
    ]
    for (let i = 0; i < pts.length - 1; i++) {
      const [h0, v0] = pts[i]
      const [h1, v1] = pts[i + 1]
      if (h >= h0 && h <= h1) {
        return Math.round((v0 + ((v1 - v0) * (h - h0)) / (h1 - h0)) * 10) / 10
      }
    }
    if (h < 20) return Math.round(c.storage_H20 * Math.pow(h / 20, 2.5) * 10) / 10
    return Math.round(c.storage_H80 * Math.pow(h / 80, 2.5) * 10) / 10
  }
  // 기본 스케일링
  return Math.round(c.baseV * Math.pow(h / c.baseH, 2.5))
}

// null-safe 헬퍼들
export const estimateArea = (c, h) =>
  c.baseArea != null
    ? Math.round(c.baseArea * Math.pow(h / c.baseH, 1.8) * 10) / 10
    : null

export const calcFsl = (c, h) => (c.bed != null ? c.bed + h : null)

export const calcEfficiency = (v, a) =>
  v != null && a != null && a !== 0 ? Math.round((v / a) * 100) / 100 : null

export const estimateEvap = (a) => (a != null ? Math.round(a * 1.5 * 10) / 10 : null)

export const PRIORITY_CONFIG = {
  최우선: { color: '#1D9E75', bg: '#E1F5EE' },
  '2순위': { color: '#1A7FBD', bg: '#E6F1FB' },
  검토필요: { color: '#BA7517', bg: '#FAEEDA' },
}

export const HEIGHT_STEPS = [40, 50, 60, 70, 80, 90, 100, 110, 120]
