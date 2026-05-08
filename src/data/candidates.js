// Nam Ngiao Basin — 댐 후보지
// ──────────────────────────────────────────────────
// 차수별 독립 후보지 배열 구조
// Phase 1 (2026-04): flood-fill 기반, S1~S9, 저수량 ≥ 5Mm³
// Phase 2 (2026-05): HydroRIVERS + 유향 적용, C1~C5, 저수량 ≥ 5Mm³
// Phase 3~: 소유역 완성 후 정밀 분석 예정
// ──────────────────────────────────────────────────

// ── 차수 메타정보 ─────────────────────────────────
export const PHASES = {
  1: {
    label:     "1차",
    date:      "2026-04",
    method:    "SRTM GL1 + flood-fill",
    criterion: "상류 저수량 ≥ 5Mm³",
    demSource: "SRTM GL1 30m",
    note:      "초기 분석. 강 중심선 재생성, 등고선 마스킹으로 범람역 제한",
  },
  2: {
    label:     "2차",
    date:      "2026-05",
    method:    "HydroRIVERS + 유향(NEXT_DOWN) 적용",
    criterion: "저수량 ≥ 5Mm³ (쐐기형 근사 추정)",
    demSource: "HydroRIVERS / SRTM GL1 30m",
    note:      "575개 세그먼트 → ORD_STRA≥3, ORD_FLOW≤5, ORD_CLAS≤4 필터 → 5개 선정. 소유역 미완성으로 저수량은 근사치",
  },
  3: {
    label:     "3차",
    date:      "2026-05",
    method:    "QGIS Drainage 분석 + 스트림 네트워크",
    criterion: "집수면적 ≥ 200km², Strahler ≥ 4, 경사 > 0.003",
    demSource: "SRTM GL1 30m",
    note:      "스트림 토포로지 기반 필터링. 집수면적·경사·등급 복합 조건. 저수량은 강수량 기반 근사치",
  },
};

export const CURRENT_PHASE = 3;

// ── BASIN 메타 ────────────────────────────────────
export const BASIN = {
  id: "NAM_NGIAO", name: "Nam Ngiao", namKo: "남지아오",
  country: "Laos",
};

// ══════════════════════════════════════════════════
// Phase 1 후보지 — flood-fill 기반 (S1~S9)
// ══════════════════════════════════════════════════
const phase1Candidates = [
  {
    id:"S1", lat:18.44333, lon:103.58278, bed:138,
    region:"Lower Valley", priority:"검토필요",
    baseFsl:198, baseH:60, baseV:4834, baseArea:204.3, hMin5:40,
    note:"저지대 계곡, H=40m부터 5Mm³ 달성. 대규모 저수 가능하나 침수 리스크 검토 필요",
  },
  {
    id:"S2", lat:18.63667, lon:103.60083, bed:143,
    region:"Lower Valley", priority:"검토필요",
    baseFsl:203, baseH:60, baseV:5928, baseArea:222.8, hMin5:40,
    note:"저지대 계곡, H=40m부터 5Mm³ 달성. 높은 저수 포텐셜, 하류 영향 검토 필요",
  },
  {
    id:"S3", lat:18.93056, lon:103.54556, bed:329,
    region:"Middle Basin", priority:"최우선",
    baseFsl:389, baseH:60, baseV:3277, baseArea:110.9, hMin5:40,
    note:"중고도 협곡형, H=40m부터 5Mm³ 달성. 댐 부지 조건 우수, 이주 영향 최소",
  },
  {
    id:"S4", lat:18.78083, lon:103.51222, bed:259,
    region:"Middle Basin", priority:"최우선",
    baseFsl:319, baseH:60, baseV:3114, baseArea:98.2, hMin5:40,
    note:"중고도 협곡형, H=40m부터 5Mm³ 달성. Nam Ngiep 2 계열과 유사 입지",
  },
  {
    id:"S5", lat:19.03333, lon:103.40694, bed:267,
    region:"Upper Basin", priority:"최우선",
    baseFsl:327, baseH:60, baseV:443, baseArea:26.3, hMin5:120,
    note:"상류 협곡형, H=120m에서 5Mm³ 달성. 높은 댐 필요, 접근성 검토 필요",
  },
  {
    id:"S6", lat:19.28667, lon:103.18889, bed:989,
    region:"Xieng Khouang Highland", priority:"2순위",
    baseFsl:1049, baseH:60, baseV:1398, baseArea:46.6, hMin5:100,
    note:"고원 고낙차형, H=100m에서 5Mm³ 달성. ROR 발전 적합",
  },
  {
    id:"S7", lat:19.14083, lon:103.15972, bed:596,
    region:"Xieng Khouang Highland", priority:"2순위",
    baseFsl:656, baseH:60, baseV:1371, baseArea:44.6, hMin5:120,
    note:"고원 고낙차형, H=120m에서 5Mm³ 달성. 발전 효율 우수",
  },
  {
    id:"S9", lat:19.20722, lon:103.53750, bed:1144,
    region:"Xieng Khouang Highland", priority:"2순위",
    baseFsl:1204, baseH:60, baseV:2114, baseArea:73.3, hMin5:90,
    note:"고원지대, H=90m에서 5Mm³ 달성. 접근성 불량",
  },
  // S8: H=120m에서도 4.88Mm³ 미달 → 제외
];

// ══════════════════════════════════════════════════
// Phase 2 후보지 — HydroRIVERS + 유향 적용 (C1~C5)
// baseV / baseArea: 쐐기형 근사 추정 (소유역 미완성)
// baseH: 60m 기준 (저수량 추정 기준고)
// ══════════════════════════════════════════════════
const phase2Candidates = [
  {
    id:"C1", lat:18.4083, lon:103.5937, bed:null,
    region:"Lower Valley", priority:"최우선",
    baseFsl:null, baseH:60, baseV:14.7, baseArea:null, hMin5:20,
    hyriv_id:41232741, upland_skm:4515, dis_av_cms:135.3,
    ord_flow:4, ord_stra:5, ord_clas:2,
    storage_H20:5.0, storage_H30:9.7, storage_H50:23.5, storage_H80:55.2,
    note:"ORD_FLOW=4 대하천. H=20m에서 5Mm³ 달성. 집수면적 4,515km², 유량 135m³/s",
  },
  {
    id:"C2", lat:18.6396, lon:103.6021, bed:null,
    region:"Lower Valley", priority:"최우선",
    baseFsl:null, baseH:60, baseV:13.7, baseArea:null, hMin5:30,
    hyriv_id:41226318, upland_skm:4150, dis_av_cms:117.5,
    ord_flow:4, ord_stra:5, ord_clas:2,
    storage_H20:4.7, storage_H30:9.1, storage_H50:22.2, storage_H80:52.4,
    note:"ORD_FLOW=4 대하천. H=30m에서 5Mm³ 달성. 집수면적 4,150km², 유량 117m³/s",
  },
  {
    id:"C3", lat:18.7604, lon:103.4312, bed:null,
    region:"Middle Basin", priority:"최우선",
    baseFsl:null, baseH:60, baseV:11.7, baseArea:null, hMin5:30,
    hyriv_id:41222969, upland_skm:3386, dis_av_cms:84.9,
    ord_flow:5, ord_stra:5, ord_clas:3,
    storage_H20:4.0, storage_H30:7.8, storage_H50:19.4, storage_H80:46.4,
    note:"ORD_FLOW=5 중간하천. H=30m에서 5Mm³ 달성. 집수면적 3,386km², 유량 84m³/s",
  },
  {
    id:"C4", lat:18.9812, lon:103.4896, bed:null,
    region:"Middle Basin", priority:"2순위",
    baseFsl:null, baseH:60, baseV:9.5, baseArea:null, hMin5:30,
    hyriv_id:41216911, upland_skm:2444, dis_av_cms:49.8,
    ord_flow:5, ord_stra:5, ord_clas:3,
    storage_H20:3.1, storage_H30:6.2, storage_H50:15.8, storage_H80:38.3,
    note:"ORD_FLOW=5 중간하천. H=30m에서 5Mm³ 달성. 집수면적 2,444km², 유량 49m³/s",
  },
  {
    id:"C5", lat:19.1687, lon:103.3562, bed:null,
    region:"Upper Basin", priority:"2순위",
    baseFsl:null, baseH:60, baseV:5.5, baseArea:null, hMin5:50,
    hyriv_id:41212173, upland_skm:908, dis_av_cms:17.8,
    ord_flow:5, ord_stra:4, ord_clas:3,
    storage_H20:1.7, storage_H30:3.5, storage_H50:9.1, storage_H80:22.4,
    note:"ORD_FLOW=5 상류 소하천. H=50m에서 5Mm³ 달성. 집수면적 908km², 유량 17m³/s",
  },
];

// ══════════════════════════════════════════════════
// Phase 3~ 후보지 — 소유역 완성 후 추가 예정
// ══════════════════════════════════════════════════
const phase3Candidates = [
  {
    id:'T01', lat:19.29016, lon:103.34676,
    bed:null, baseFsl:null, baseH:60, baseV:98.4, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:328.1, slope:0.0793, ord_stra:5,
    storage_H20:29.5, storage_H30:49.2, storage_H50:98.4, storage_H80:196.8,
    note:'스트림 분석 3차. 집수면적 328km², 경사 0.079, Strahler 5등급.',
  },
  {
    id:'T02', lat:19.22126, lon:103.33102,
    bed:null, baseFsl:null, baseH:60, baseV:119.0, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:396.6, slope:0.0823, ord_stra:5,
    storage_H20:35.7, storage_H30:59.5, storage_H50:119.0, storage_H80:238.0,
    note:'스트림 분석 3차. 집수면적 397km², 경사 0.082, Strahler 5등급.',
  },
  {
    id:'T03', lat:19.06578, lon:103.35605,
    bed:null, baseFsl:null, baseH:60, baseV:513.9, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'최우선',
    upland_skm:1713.0, slope:0.0246, ord_stra:6,
    storage_H20:154.2, storage_H30:256.9, storage_H50:513.9, storage_H80:1027.8,
    note:'스트림 분석 3차. 집수면적 1713km², 경사 0.025, Strahler 6등급.',
  },
  {
    id:'T04', lat:19.16944, lon:103.35353,
    bed:null, baseFsl:null, baseH:60, baseV:267.1, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:890.3, slope:0.0419, ord_stra:6,
    storage_H20:80.1, storage_H30:133.6, storage_H50:267.1, storage_H80:534.2,
    note:'스트림 분석 3차. 집수면적 890km², 경사 0.042, Strahler 6등급.',
  },
  {
    id:'T05', lat:19.13143, lon:103.27870,
    bed:null, baseFsl:null, baseH:60, baseV:160.0, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:533.5, slope:0.0514, ord_stra:5,
    storage_H20:48.0, storage_H30:80.0, storage_H50:160.0, storage_H80:320.0,
    note:'스트림 분석 3차. 집수면적 533km², 경사 0.051, Strahler 5등급.',
  },
  {
    id:'T06', lat:18.68205, lon:103.45773,
    bed:null, baseFsl:null, baseH:60, baseV:1072.7, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'최우선',
    upland_skm:3575.7, slope:0.0219, ord_stra:6,
    storage_H20:321.8, storage_H30:536.4, storage_H50:1072.7, storage_H80:2145.4,
    note:'스트림 분석 3차. 집수면적 3576km², 경사 0.022, Strahler 6등급.',
  },
  {
    id:'T07', lat:19.25868, lon:103.22087,
    bed:null, baseFsl:null, baseH:60, baseV:61.9, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'2순위',
    upland_skm:206.4, slope:0.0194, ord_stra:4,
    storage_H20:18.6, storage_H30:30.9, storage_H50:61.9, storage_H80:123.8,
    note:'스트림 분석 3차. 집수면적 206km², 경사 0.019, Strahler 4등급.',
  },
  {
    id:'T08', lat:19.13728, lon:103.17738,
    bed:null, baseFsl:null, baseH:60, baseV:63.8, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:212.7, slope:0.0403, ord_stra:4,
    storage_H20:19.1, storage_H30:31.9, storage_H50:63.8, storage_H80:127.6,
    note:'스트림 분석 3차. 집수면적 213km², 경사 0.040, Strahler 4등급.',
  },
  {
    id:'T09', lat:18.87516, lon:103.46124,
    bed:null, baseFsl:null, baseH:60, baseV:799.4, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'최우선',
    upland_skm:2664.8, slope:0.0064, ord_stra:6,
    storage_H20:239.8, storage_H30:399.7, storage_H50:799.4, storage_H80:1598.8,
    note:'스트림 분석 3차. 집수면적 2665km², 경사 0.006, Strahler 6등급.',
  },
  {
    id:'T10', lat:18.74500, lon:103.42296,
    bed:null, baseFsl:null, baseH:60, baseV:998.4, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'최우선',
    upland_skm:3327.9, slope:0.0037, ord_stra:6,
    storage_H20:299.5, storage_H30:499.2, storage_H50:998.4, storage_H80:1996.8,
    note:'스트림 분석 3차. 집수면적 3328km², 경사 0.004, Strahler 6등급.',
  },
  {
    id:'T11', lat:19.14329, lon:103.54478,
    bed:null, baseFsl:null, baseH:60, baseV:100.0, baseArea:null, hMin5:30,
    region:'Upper Basin', priority:'최우선',
    upland_skm:333.5, slope:0.0731, ord_stra:4,
    storage_H20:30.0, storage_H30:50.0, storage_H50:100.0, storage_H80:200.0,
    note:'스트림 분석 3차. 집수면적 334km², 경사 0.073, Strahler 4등급.',
  },
  {
    id:'T12', lat:18.64898, lon:103.51089,
    bed:null, baseFsl:null, baseH:60, baseV:1085.6, baseArea:null, hMin5:30,
    region:'Lower Valley', priority:'최우선',
    upland_skm:3618.8, slope:0.0161, ord_stra:6,
    storage_H20:325.7, storage_H30:542.8, storage_H50:1085.6, storage_H80:2171.2,
    note:'스트림 분석 3차. 집수면적 3619km², 경사 0.016, Strahler 6등급.',
  },
  {
    id:'T13', lat:18.81794, lon:103.42408,
    bed:null, baseFsl:null, baseH:60, baseV:829.9, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'최우선',
    upland_skm:2766.2, slope:0.0041, ord_stra:6,
    storage_H20:249.0, storage_H30:414.9, storage_H50:829.9, storage_H80:1659.8,
    note:'스트림 분석 3차. 집수면적 2766km², 경사 0.004, Strahler 6등급.',
  },
  {
    id:'T14', lat:18.58893, lon:103.60701,
    bed:null, baseFsl:null, baseH:60, baseV:1234.2, baseArea:null, hMin5:30,
    region:'Lower Valley', priority:'최우선',
    upland_skm:4114.0, slope:0.0039, ord_stra:6,
    storage_H20:370.3, storage_H30:617.1, storage_H50:1234.2, storage_H80:2468.4,
    note:'스트림 분석 3차. 집수면적 4114km², 경사 0.004, Strahler 6등급.',
  },
  {
    id:'T15', lat:19.07768, lon:103.51652,
    bed:null, baseFsl:null, baseH:60, baseV:121.0, baseArea:null, hMin5:30,
    region:'Middle Basin', priority:'2순위',
    upland_skm:403.2, slope:0.0250, ord_stra:4,
    storage_H20:36.3, storage_H30:60.5, storage_H50:121.0, storage_H80:242.0,
    note:'스트림 분석 3차. 집수면적 403km², 경사 0.025, Strahler 4등급.',
  },
];

// ── 차수별 후보 맵 ────────────────────────────────
const PHASE_CANDIDATES = {
  1: phase1Candidates,
  2: phase2Candidates,
  3: phase3Candidates,
};

// ── 헬퍼: 특정 차수 후보 반환 ────────────────────
export const getCandidatesByPhase = (phase) =>
  PHASE_CANDIDATES[phase] ?? [];

// 하위 호환: 기존 코드가 candidates를 직접 참조하는 경우
export const candidates = phase2Candidates;

// ── 저수량/면적 추정 함수 ─────────────────────────
export const estimateVolume = (c, h) => {
  // Phase 2: 시나리오별 저수량 직접 보간
  if (c.storage_H20 !== undefined) {
    const pts = [[20,c.storage_H20],[30,c.storage_H30],[50,c.storage_H50],[80,c.storage_H80]]
    for (let i = 0; i < pts.length - 1; i++) {
      const [h0,v0] = pts[i], [h1,v1] = pts[i+1]
      if (h >= h0 && h <= h1) return Math.round((v0 + (v1-v0)*(h-h0)/(h1-h0)) * 10) / 10
    }
    if (h < 20) return Math.round(c.storage_H20 * Math.pow(h/20, 2.5) * 10) / 10
    return Math.round(c.storage_H80 * Math.pow(h/80, 2.5) * 10) / 10
  }
  // Phase 1: H^2.5 스케일링
  return Math.round(c.baseV * Math.pow(h / c.baseH, 2.5))
}
export const estimateArea   = (c, h) => c.baseArea ? Math.round(c.baseArea * Math.pow(h / c.baseH, 1.8) * 10) / 10 : null
export const calcFsl        = (c, h) => c.bed ? c.bed + h : null
export const calcEfficiency = (v, a) => a ? Math.round((v / a) * 100) / 100 : null
export const estimateEvap   = (a)    => a ? Math.round(a * 1.5 * 10) / 10 : null

export const PRIORITY_CONFIG = {
  "최우선":  { color: "#1D9E75", bg: "#E1F5EE" },
  "2순위":   { color: "#1A7FBD", bg: "#E6F1FB" },
  "검토필요":{ color: "#BA7517", bg: "#FAEEDA" },
};

export const HEIGHT_STEPS = [40, 50, 60, 70, 80, 90, 100, 110, 120];
