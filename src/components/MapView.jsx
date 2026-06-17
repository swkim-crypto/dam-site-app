import React, { useEffect, useRef, useState } from 'react'
import { PRIORITY_CONFIG, estimateVolume, calcFsl } from '../data/candidates.js'
import { floodPolygons } from '../data/floodPolygons.js'
import { landcoverFlooded } from '../data/landcoverFlooded.js'

/* 토지피복 오버레이 색상 (경작지/시가지) */
const LC_COLORS = { cropland: '#f0a83c', urban: '#e0484c' }
/* GeoJSON(Polygon/MultiPolygon) → google.maps Polygon paths 목록 (외곽+홀 지원) */
function gjToPaths(geom) {
  if (!geom || !geom.coordinates) return []
  const polys = geom.type === 'MultiPolygon' ? geom.coordinates : [geom.coordinates]
  return polys.map(rings => rings.map(r => r.map(([lng, lat]) => ({ lat, lng }))))
}

/* ────────────────────────────────────────────────────────────
   Google Maps JS API 설정
   ────────────────────────────────────────────────────────────
   Render 환경변수로 키를 넣는다(소스에 키를 박지 않는다).
     VITE_GOOGLE_MAPS_KEY = 발급받은 Maps JavaScript API 키
     VITE_GOOGLE_MAP_ID   = (선택) 벡터 Map ID. 없으면 'DEMO_MAP_ID' 사용.
   - Map ID는 AdvancedMarker(마커)와 기울기(tilt)에 필요. 'DEMO_MAP_ID'는
     구글이 제공하는 테스트용이라 바로 동작하나, 운영은 본인 Map ID 권장.
   - ⚠️ 라오스 산악지는 위성+tilt를 줘도 '진짜 3D 지형 기복'은 약하다(그건 옵션3/Cesium).
     여기선 공식 위성 + 회전/기울기 제스처 + 깔끔한 타일이 핵심 이득. */
const GOOGLE_MAPS_KEY = (import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_KEY) || 'YOUR_API_KEY_HERE'
const GOOGLE_MAP_ID   = (import.meta.env && import.meta.env.VITE_GOOGLE_MAP_ID) || 'DEMO_MAP_ID'

let _gmapsPromise = null
function loadGoogleMaps(key) {
  if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google.maps)
  if (_gmapsPromise) return _gmapsPromise
  _gmapsPromise = new Promise((resolve, reject) => {
    const cb = '__damGmapsReady'
    // 콜백이 호출되는 시점엔 core(Map) + libraries(marker)가 모두 준비됨
    window[cb] = () => {
      if (window.google && window.google.maps && window.google.maps.Map) resolve(window.google.maps)
      else reject(new Error('google.maps 미초기화'))
    }
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker&callback=${cb}`
    s.async = true
    s.onerror = () => reject(new Error('스크립트 로드 실패(네트워크/도메인 차단)'))
    document.head.appendChild(s)
  })
  return _gmapsPromise
}

function nearestStep(h) {
  const steps = [40,50,60,70,80,90,100,110,120]
  return steps.reduce((a,b) => Math.abs(b-h) < Math.abs(a-h) ? b : a)
}

const isMobile = () => window.innerWidth <= 768
const MOB_TAB_H = 52

/* 구글어스(3D) 링크 — 새 탭으로만 연다. search URL이라 cold load에서도 좌표로 비행. */
function googleEarthUrl(c) {
  if (!c) return 'https://earth.google.com/web/'
  return `https://earth.google.com/web/search/${c.lat}%2C${c.lon}`
}

/* ──────────────────────────────────────────────────────────
   수몰 영역 상류 한정(clip) — 엔진 무관 순수 기하. 그대로 유지.
   ──────────────────────────────────────────────────────────── */
const DOWNSTREAM_ANCHOR = { lat: 16.0351, lon: 106.677 }  // 폴백용 하류 앵커(Xe Lanong 3)
const FLOW_OVERRIDE = {
  // 예) 'S62': 350,
}
const CLIP_MARGIN_DEG = 0.001

function upstreamVector(dam, flowBearing) {
  if (flowBearing != null && !Number.isNaN(flowBearing)) {
    const r = (flowBearing * Math.PI) / 180
    return [Math.sin(r), Math.cos(r)]
  }
  return [dam.lon - DOWNSTREAM_ANCHOR.lon, dam.lat - DOWNSTREAM_ANCHOR.lat]
}

function clipRingUpstream(ring, dam, up, cosLat) {
  const ox = dam.lon - up[0] * CLIP_MARGIN_DEG
  const oy = dam.lat - up[1] * CLIP_MARGIN_DEG
  let nx = up[0] * cosLat, ny = up[1]
  const nn = Math.hypot(nx, ny) || 1
  nx /= nn; ny /= nn
  const side = p => ((p[0] - ox) * cosLat) * nx + (p[1] - oy) * ny
  const R = (ring.length > 1 && ring[0][0] === ring[ring.length - 1][0]
             && ring[0][1] === ring[ring.length - 1][1]) ? ring.slice(0, -1) : ring
  const out = []
  const n = R.length
  for (let i = 0; i < n; i++) {
    const cur = R[i], prev = R[(i - 1 + n) % n]
    const sc = side(cur), sp = side(prev)
    if (sc >= 0) {
      if (sp < 0) { const t = sp / (sp - sc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]) }
      out.push(cur)
    } else if (sp >= 0) {
      const t = sp / (sp - sc); out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])])
    }
  }
  if (out.length >= 3) out.push(out[0])
  return out
}

function clipFloodUpstream(geom, dam, flowBearing) {
  if (!geom || !geom.coordinates || !geom.coordinates.length || !dam) return geom
  const rings = geom.coordinates
  const outer = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0])
  const cosLat = Math.cos((dam.lat * Math.PI) / 180)
  const up = upstreamVector(dam, flowBearing)
  const clipped = clipRingUpstream(outer, dam, up, cosLat)
  if (clipped.length < 4) return geom
  return { type: 'Polygon', coordinates: [clipped] }
}

export default function MapView({ candidates, selected, heightM, onSelect }) {
  const mapRef     = useRef(null)
  const gmap       = useRef(null)
  const markers    = useRef({})
  const floodLayer = useRef(null)
  const lcLayers   = useRef([])
  const [status, setStatus] = useState('loading')  // loading | ready | nokey | error | autherror

  // 지도 초기화 (Google Maps 로드 후)
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY || GOOGLE_MAPS_KEY === 'YOUR_API_KEY_HERE') { setStatus('nokey'); return }
    let cancelled = false
    // 키/리퍼러/결제 등 '인증' 실패는 스크립트 로드 후 이 훅으로 통지된다
    window.gm_authFailure = () => { if (!cancelled) setStatus('autherror') }
    loadGoogleMaps(GOOGLE_MAPS_KEY)
      .then((maps) => {
        if (cancelled || gmap.current || !mapRef.current) return
        gmap.current = new maps.Map(mapRef.current, {
          center: { lat: 16.45, lng: 106.45 }, zoom: 9,
          mapId: GOOGLE_MAP_ID,
          mapTypeId: 'hybrid',          // 위성 + 지명
          tilt: 0,
          gestureHandling: 'greedy',
          mapTypeControl: true,
          mapTypeControlOptions: { mapTypeIds: ['hybrid', 'satellite', 'roadmap', 'terrain'] },
          streetViewControl: false,
          fullscreenControl: false,
          rotateControl: true,
          zoomControl: true,
        })
        setStatus('ready')
      })
      .catch((e) => { console.error('[MapView] 지도 초기화 실패:', e); if (!cancelled) setStatus('error') })
    return () => { cancelled = true }
  }, [])

  // 수몰 폴리곤 — 선택된 후보지만, 해제 시 제거
  useEffect(() => {
    if (status !== 'ready' || !gmap.current || !window.google) return
    const map = gmap.current
    if (floodLayer.current) { floodLayer.current.setMap(null); floodLayer.current = null }
    if (!selected) return

    const step = nearestStep(heightM)
    const polyData = floodPolygons[selected.id]?.[String(step)]
    if (!polyData) return

    const flowBearing = FLOW_OVERRIDE[selected.id] != null
      ? FLOW_OVERRIDE[selected.id]
      : (selected.upstreamBearing != null ? selected.upstreamBearing : null)
    const clipped = clipFloodUpstream(
      polyData, { lat: selected.lat, lon: selected.lon }, flowBearing
    )
    if (!clipped?.coordinates?.length) return

    try {
      const path = clipped.coordinates[0].map(([lng, lat]) => ({ lat, lng }))
      floodLayer.current = new window.google.maps.Polygon({
        paths: path,
        strokeColor: '#1a7fbd', strokeOpacity: 0.85, strokeWeight: 1.5,
        fillColor: '#1e78ff', fillOpacity: 0.30,
        clickable: false, zIndex: 1, map,
      })
    } catch (e) { console.error('Flood polygon error:', e) }
  }, [selected, heightM, status])

  // 토지피복(경작지·시가지) — 수몰면 위에 표시 (이미 상류 클립된 교차 폴리곤)
  useEffect(() => {
    if (status !== 'ready' || !gmap.current || !window.google) return
    const map = gmap.current
    lcLayers.current.forEach(p => p.setMap(null)); lcLayers.current = []
    if (!selected) return
    const step = nearestStep(heightM)
    const data = landcoverFlooded?.[selected.id]?.[String(step)]
    if (!data) return
    const draw = (geom, color) => {
      gjToPaths(geom).forEach(paths => {
        lcLayers.current.push(new window.google.maps.Polygon({
          paths, strokeColor: color, strokeOpacity: 0.9, strokeWeight: 1,
          fillColor: color, fillOpacity: 0.45, clickable: false, zIndex: 3, map,
        }))
      })
    }
    if (data.cropland) draw(data.cropland, LC_COLORS.cropland)
    if (data.urban)    draw(data.urban,    LC_COLORS.urban)
  }, [selected, heightM, status])

  // 마커 — 선택 없으면 전체, 선택 있으면 선택된 것만 강조
  useEffect(() => {
    if (status !== 'ready' || !gmap.current || !window.google) return
    const maps = window.google.maps, map = gmap.current
    Object.values(markers.current).forEach(m => { m.map = null })
    markers.current = {}

    candidates.forEach(c => {
      const cfg    = PRIORITY_CONFIG[c.priority] || { color: '#BA7517' }
      const isSel  = selected?.id === c.id
      const dimmed = selected && !isSel
      const sz     = isSel ? 46 : 30
      const alpha  = dimmed ? '33' : (selected ? '99' : 'cc')
      const v      = isSel ? estimateVolume(c, heightM) : c.baseV
      const fsl    = isSel ? calcFsl(c, heightM) : c.baseFsl
      const h      = isSel ? heightM : c.baseH

      // content: 상대배치 래퍼(점 중심을 좌표에 맞춤) + 호버 툴팁
      const wrap = document.createElement('div')
      wrap.style.cssText = 'position:relative;transform:translateY(50%);'

      const dot = document.createElement('div')
      dot.textContent = c.id
      dot.style.cssText = `width:${sz}px;height:${sz}px;border-radius:50%;`
        + `background:${cfg.color}${alpha};border:${isSel?3:2}px solid ${isSel?'#fff':cfg.color}${dimmed?'55':''};`
        + `display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;`
        + `font-size:${isSel?12:9}px;font-weight:700;color:${isSel?'#0a1628':'#fff'};`
        + `box-shadow:0 0 ${isSel?18:dimmed?2:6}px ${cfg.color}${dimmed?'33':'99'};cursor:pointer;`

      const bedStr = c.bed != null ? `Bed: ${c.bed} m EL<br/>` : ''
      const fslStr = fsl   != null ? `FSL: ${fsl} m EL<br/>` : ''
      const tip = document.createElement('div')
      tip.style.cssText = 'position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);'
        + 'display:none;white-space:nowrap;z-index:5;pointer-events:none;'
      tip.innerHTML = `<div style="font-family:'Space Mono',monospace;font-size:12px;line-height:1.9;`
        + `background:#0d2137;border:1px solid ${cfg.color}55;color:#e8eef4;padding:8px 12px;border-radius:8px;min-width:160px;">`
        + `<b style="color:${cfg.color};font-size:14px;">${c.id}</b> <span style="color:#a0bcd0">${c.priority}</span><br/>`
        + `${bedStr}H: ${h} m<br/>${fslStr}`
        + `V: <b style="color:#00c4b4;">${(v ?? 0).toLocaleString()} Mm³</b></div>`

      wrap.appendChild(tip)
      wrap.appendChild(dot)
      wrap.addEventListener('mouseenter', () => { tip.style.display = 'block' })
      wrap.addEventListener('mouseleave', () => { tip.style.display = 'none' })
      dot.addEventListener('click', (e) => {
        e.stopPropagation()
        if (isSel) onSelect(null); else onSelect(c)
      })

      const marker = new maps.marker.AdvancedMarkerElement({
        map, position: { lat: c.lat, lng: c.lon }, content: wrap,
        zIndex: isSel ? 1000 : 1, gmpClickable: false,
      })
      markers.current[c.id] = marker
    })
  }, [candidates, selected, heightM, onSelect, status])

  // 선택 시 지도 이동 + 약간의 기울기
  useEffect(() => {
    if (status !== 'ready' || !gmap.current) return
    const map = gmap.current
    if (!selected) { map.setTilt(0); return }
    map.panTo({ lat: selected.lat, lng: selected.lon })
    if (map.getZoom() < 12) map.setZoom(12)
    map.setTilt(47.5)
  }, [selected, status])

  const fslDisplay = selected ? calcFsl(selected, heightM) : null
  const mob = isMobile()
  const bottomOffset = mob ? MOB_TAB_H + 8 : 24
  const legendItems = Object.entries(PRIORITY_CONFIG).map(([label, cfg]) => ({ label, color: cfg.color }))

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:'100%', background:'#0a1628' }} />

      {/* API 키/로드 상태 안내 */}
      {status !== 'ready' && (
        <div style={{
          position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
          color:'#a0bcd0', fontFamily:'var(--font-mono)', fontSize:13, textAlign:'center', padding:24,
          background:'#0a1628', zIndex:500,
        }}>
          {status === 'loading' && '지도 불러오는 중…'}
          {status === 'nokey'   && 'Google Maps API 키 미설정 — Render 환경변수 VITE_GOOGLE_MAPS_KEY 를 추가하세요.'}
          {status === 'error'   && '지도 로드 실패 — 콘솔의 [MapView] 에러 또는 네트워크 차단을 확인하세요.'}
          {status === 'autherror' && '구글 인증 거부 — 키 리퍼러 제한 / 결제 연동 / Maps JavaScript API 활성화를 확인하세요. (콘솔의 …MapError 줄 참고)'}
        </div>
      )}

      {/* 수몰 정보 오버레이 */}
      {selected && (
        <div style={{
          position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
          background:'rgba(13,33,55,0.92)', border:'1px solid rgba(30,120,255,0.4)',
          borderRadius:8, padding:'6px 14px', zIndex:1000,
          backdropFilter:'blur(8px)', display:'flex', gap:12, alignItems:'center',
          flexWrap:'wrap', justifyContent:'center', maxWidth:'90vw',
        }}>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>수몰 영역 · 상류</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#1e78ff', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>H = {heightM}m</span>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>
            {fslDisplay != null ? `FSL ${fslDisplay}m EL` : 'FSL 미정'}
          </span>
          <a
            href={googleEarthUrl(selected)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize:11, color:'#00c4b4', fontFamily:'var(--font-mono)', textDecoration:'none', cursor:'pointer', marginLeft:4, whiteSpace:'nowrap', borderBottom:'1px dotted #00c4b4' }}
          >◉ 구글어스 3D ↗</a>
          <span
            onClick={() => onSelect(null)}
            style={{ fontSize:11, color:'#E05C5C', fontFamily:'var(--font-mono)', cursor:'pointer', marginLeft:4, whiteSpace:'nowrap' }}
          >✕ 해제</span>
        </div>
      )}

      {/* 범례 */}
      <div style={{
        position:'absolute', bottom: bottomOffset, left:16,
        background:'rgba(13,33,55,0.92)', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:10, padding:'8px 12px', zIndex:1000, backdropFilter:'blur(8px)',
      }}>
        <div style={{ fontSize:10, color:'#5a7a90', fontFamily:'var(--font-mono)', letterSpacing:'0.12em', marginBottom:6 }}>범례</div>
        {legendItems.map(i => (
          <div key={i.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, fontSize:11 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:i.color, boxShadow:`0 0 5px ${i.color}88`, flexShrink:0 }}/>
            <span style={{ color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>{i.label}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:5, paddingTop:5, display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:16, height:9, background:'rgba(30,120,255,0.35)', border:'1.5px solid #1a7fbd', borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:10, color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>수몰 예상 구역 (상류)</span>
        </div>
        <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:16, height:9, background:'rgba(240,168,60,0.45)', border:'1px solid #f0a83c', borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:10, color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>경작지 (수몰)</span>
        </div>
        <div style={{ marginTop:4, display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:16, height:9, background:'rgba(224,72,76,0.45)', border:'1px solid #e0484c', borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:10, color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>시가지 (수몰)</span>
        </div>
      </div>
    </div>
  )
}
