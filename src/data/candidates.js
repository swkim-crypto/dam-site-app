export const BASIN = {
  id: "NAM_NGIAO", name: "Nam Ngiao", namKo: "남지아오",
  country: "Laos", totalCandidates: 9, demSource: "SRTM GL1 30m", analysisDate: "2026-04",
};

export const candidates = [
  { id:"S1", lat:18.4476, lon:103.5718, bed:151,  baseFsl:211,  baseH:60, baseV:1343, baseArea:268.6, region:"Lower Valley",           priority:"검토필요", note:"저지대 계곡, 대규모 저수 가능하나 침수 리스크 검토 필요" },
  { id:"S2", lat:18.6476, lon:103.5718, bed:169,  baseFsl:229,  baseH:60, baseV:1077, baseArea:215.5, region:"Lower Valley",           priority:"검토필요", note:"저지대 계곡, 높은 저수 포텐셜, 하류 영향 검토 필요" },
  { id:"S3", lat:18.9410, lon:103.5718, bed:380,  baseFsl:440,  baseH:60, baseV:959,  baseArea:191.8, region:"Middle Basin",           priority:"최우선",   note:"중고도 협곡형, 댐 부지 조건 우수, 이주 영향 최소" },
  { id:"S4", lat:18.8076, lon:103.4918, bed:365,  baseFsl:425,  baseH:60, baseV:946,  baseArea:189.2, region:"Middle Basin",           priority:"최우선",   note:"중고도 협곡형, Nam Ngiep 2 계열과 유사 입지" },
  { id:"S5", lat:19.0343, lon:103.3851, bed:352,  baseFsl:412,  baseH:60, baseV:942,  baseArea:188.4, region:"Upper Basin",            priority:"최우선",   note:"상류 협곡형, 안정적 유량, 접근성 검토 필요" },
  { id:"S6", lat:19.3143, lon:103.1851, bed:1138, baseFsl:1198, baseH:60, baseV:565,  baseArea:113.1, region:"Xieng Khouang Highland", priority:"2순위",    note:"고원 고낙차형, ROR 발전 적합, 소규모 저수" },
  { id:"S7", lat:19.1676, lon:103.1318, bed:1140, baseFsl:1200, baseH:60, baseV:546,  baseArea:109.1, region:"Xieng Khouang Highland", priority:"2순위",    note:"고원 고낙차형, 발전 효율 우수" },
  { id:"S8", lat:19.2743, lon:103.3585, bed:1123, baseFsl:1183, baseH:60, baseV:491,  baseArea:98.1,  region:"Xieng Khouang Highland", priority:"2순위",    note:"고원지대, 지질 안정성 추가 확인 필요" },
  { id:"S9", lat:19.2343, lon:103.5185, bed:1212, baseFsl:1272, baseH:60, baseV:137,  baseArea:27.5,  region:"Xieng Khouang Highland", priority:"2순위",    note:"최고도 위치, 소규모, 접근성 불량" },
];

export const estimateVolume = (c, h) => Math.round(c.baseV * Math.pow(h / c.baseH, 2.5));
export const estimateArea   = (c, h) => Math.round(c.baseArea * Math.pow(h / c.baseH, 1.8) * 10) / 10;
export const calcFsl        = (c, h) => c.bed + h;
export const calcEfficiency = (v, a) => Math.round((v / a) * 100) / 100;
export const estimateEvap   = (a)    => Math.round(a * 1.5 * 10) / 10;

export const PRIORITY_CONFIG = {
  "최우선":  { color: "#1D9E75", bg: "#E1F5EE" },
  "2순위":   { color: "#1A7FBD", bg: "#E6F1FB" },
  "검토필요":{ color: "#BA7517", bg: "#FAEEDA" },
};

export const HEIGHT_STEPS = [40, 50, 60, 70, 80, 90, 100, 110, 120];
