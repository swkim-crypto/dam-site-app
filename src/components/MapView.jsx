import React, { useEffect, useRef } from 'react'
import { PRIORITY_CONFIG, estimateVolume, calcFsl } from '../data/candidates.js'
import { floodPolygons } from '../data/floodPolygons.js'

function nearestStep(h) {
  const steps = [40,50,60,70,80,90,100,110,120]
  return steps.reduce((a,b) => Math.abs(b-h) < Math.abs(a-h) ? b : a)
}

const isMobile = () => window.innerWidth <= 768
const MOB_TAB_H = 52

/* ──────────────────────────────────────────────────────────
   수몰 영역 상류 한정(clip)
   ────────────────────────────────────────────────────────────
   하상고도(수심) 데이터가 없으므로, 댐 지점을 지나 "상류 방향"에
   수직인 선으로 수몰 폴리곤을 잘라 상류 반쪽만 표시한다.

   상류 방향 = (하류 앵커 → 댐) 벡터.
   하류 앵커는 이 후보군 전체의 하류에 위치한 Xe Lanong 3(계획댐).
   특정 후보지의 강 흐름이 달라 잘리는 방향이 어긋나면
   FLOW_OVERRIDE 에 그 후보지의 "상류 나침반 방위(도)"를 넣어 보정한다.
   (0=북, 90=동, 180=남, 270=서 — 물이 차오르는 쪽을 가리킴)
*/
const DOWNSTREAM_ANCHOR = { lat: 16.0351, lon: 106.677 }  // Xe Lanong 3 (하류)
const FLOW_OVERRIDE = {
  // 예) 'S62': 350,   // S62 상류가 거의 정북이면
}
const CLIP_MARGIN_DEG = 0.001  // 댐 바로 앞 수면을 남기기 위한 절단선 하류 이동(약 100m)

// 댐 지점 기준 상류 단위벡터(lon,lat 평면). flowBearing(도)가 있으면 우선.
function upstreamVector(dam, flowBearing) {
  if (flowBearing != null && !Number.isNaN(flowBearing)) {
    const r = (flowBearing * Math.PI) / 180
    return [Math.sin(r), Math.cos(r)]          // 방위 → (lon,lat)
  }
  return [dam.lon - DOWNSTREAM_ANCHOR.lon, dam.lat - DOWNSTREAM_ANCHOR.lat]
}

// 단일 링을 반평면(상류쪽)으로 Sutherland–Hodgman 절단
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
  if (out.length >= 3) out.push(out[0])  // 링 닫기
  return out
}

// 수몰 GeoJSON geometry(Polygon)를 상류 한정으로 clip → 새 geometry 반환
function clipFloodUpstream(geom, dam, flowBearing) {
  if (!geom || !geom.coordinates || !geom.coordinates.length || !dam) return geom
  const rings = geom.coordinates
  const outer = rings.reduce((a, b) => (b.length > a.length ? b : a), rings[0]) // 최대 링(저수 외곽선)
  const cosLat = Math.cos((dam.lat * Math.PI) / 180)
  const up = upstreamVector(dam, flowBearing)
  const clipped = clipRingUpstream(outer, dam, up, cosLat)
  if (clipped.length < 4) return geom   // 절단 실패 시 원본 유지(빈 표시 방지)
  return { type: 'Polygon', coordinates: [clipped] }
}

export default function MapView({ candidates, selected, heightM, onSelect }) {
  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const markers    = useRef({})
  const floodLayer = useRef(null)

  // 지도 초기화
  useEffect(() => {
    if (leafletMap.current || !window.L) return
    const map = window.L.map(mapRef.current, {
      center:[16.18, 106.62], zoom:10, zoomControl:true, attributionControl:true
    })
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:18, attribution:'© OpenStreetMap | SRTM GL1'
    }).addTo(map)
    leafletMap.current = map
  }, [])

  // 수몰 폴리곤 — 선택된 후보지만, 선택 해제 시 제거
  useEffect(() => {
    const L = window.L, map = leafletMap.current
    if (!L || !map) return
    if (floodLayer.current) { floodLayer.current.remove(); floodLayer.current = null }
    if (!selected) return  // 선택 없으면 폴리곤 없음

    const step = nearestStep(heightM)
    const polyData = floodPolygons[selected.id]?.[String(step)]
    if (!polyData) return

    // 수몰 영역을 댐 상류 방향으로만 한정
    const clipped = clipFloodUpstream(
      polyData,
      { lat: selected.lat, lon: selected.lon },
      FLOW_OVERRIDE[selected.id]
    )

    try {
      if (!map.getPane('floodPane')) {
        map.createPane('floodPane')
        map.getPane('floodPane').style.zIndex = 350
      }
      floodLayer.current = window.L.geoJSON(
        { type:'Feature', geometry: clipped },
        { pane:'floodPane', style:{ color:'#1a7fbd', weight:1.5, opacity:0.85, fillColor:'#1e78ff', fillOpacity:0.30 } }
      ).addTo(map)
    } catch(e) { console.error('Flood polygon error:', e) }
  }, [selected, heightM])

  // 마커 — 선택 없으면 전체 표시, 선택 있으면 선택된 것만 강조
  useEffect(() => {
    const L = window.L, map = leafletMap.current
    if (!L || !map) return
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    candidates.forEach(c => {
      const cfg   = PRIORITY_CONFIG[c.priority] || { color: '#BA7517' }
      const isSel = selected?.id === c.id
      // 선택된 후보지가 있을 때: 선택된 것만 크게, 나머지는 흐리게 작게
      const dimmed = selected && !isSel
      const sz    = isSel ? 46 : 30
      const alpha = dimmed ? '33' : (selected ? '99' : 'cc')
      const v     = isSel ? estimateVolume(c, heightM) : c.baseV
      const fsl   = isSel ? calcFsl(c, heightM) : c.baseFsl
      const h     = isSel ? heightM : c.baseH

      const icon = L.divIcon({
        className:'',
        iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
        html:`<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cfg.color}${alpha};border:${isSel?3:2}px solid ${isSel?'#fff':cfg.color}${dimmed?'55':''};display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:${isSel?12:9}px;font-weight:700;color:${isSel?'#0a1628':'#fff'};box-shadow:0 0 ${isSel?18:dimmed?2:6}px ${cfg.color}${dimmed?'33':'99'};cursor:pointer;">${c.id}</div>`,
      })

      const bedStr = c.bed   != null ? `Bed: ${c.bed} m EL<br/>` : ''
      const fslStr = fsl     != null ? `FSL: ${fsl} m EL<br/>` : ''
      const tip = `<div style="font-family:'Space Mono',monospace;font-size:12px;line-height:1.9;background:#0d2137;border:1px solid ${cfg.color}55;color:#e8eef4;padding:8px 12px;border-radius:8px;min-width:160px;">
        <b style="color:${cfg.color};font-size:14px;">${c.id}</b> <span style="color:#a0bcd0">${c.priority}</span><br/>
        ${bedStr}H: ${h} m<br/>${fslStr}
        V: <b style="color:#00c4b4;">${v.toLocaleString()} Mm³</b></div>`

      const marker = L.marker([c.lat, c.lon], { icon, zIndexOffset: isSel ? 1000 : 0 })
        .addTo(map)
        .bindTooltip(tip, { permanent:false, direction:'top', offset:[0,-sz/2-4], opacity:1, className:'dam-tip' })
        .on('click', () => {
          // 이미 선택된 것 클릭 시 선택 해제
          if (isSel) onSelect(null)
          else onSelect(c)
        })
      markers.current[c.id] = marker
    })
  }, [candidates, selected, heightM, onSelect])

  // 선택 시 지도 이동
  useEffect(() => {
    const map = leafletMap.current
    if (!map || !selected) return
    map.setView([selected.lat, selected.lon], Math.max(map.getZoom(), 10), { animate:true })
  }, [selected])

  const fslDisplay = selected ? calcFsl(selected, heightM) : null
  const mob = isMobile()
  const bottomOffset = mob ? MOB_TAB_H + 8 : 24

  // 범례: candidates의 실제 priority 값 기준
  const legendItems = Object.entries(PRIORITY_CONFIG).map(([label, cfg]) => ({ label, color: cfg.color }))

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

      {/* 수몰 정보 오버레이 */}
      {selected && (
        <div style={{
          position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
          background:'rgba(13,33,55,0.92)', border:'1px solid rgba(30,120,255,0.4)',
          borderRadius:8, padding:'6px 14px', zIndex:1000,
          backdropFilter:'blur(8px)', display:'flex', gap:12, alignItems:'center',
          maxWidth:'90vw',
        }}>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>수몰 영역 · 상류</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#1e78ff', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>H = {heightM}m</span>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>
            {fslDisplay != null ? `FSL ${fslDisplay}m EL` : 'FSL 미정'}
          </span>
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
      </div>

      <style>{`.dam-tip.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  )
}
