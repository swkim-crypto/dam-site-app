import React, { useEffect, useRef } from 'react'
import { PRIORITY_CONFIG, estimateVolume, calcFsl } from '../data/candidates.js'
import { floodPolygons } from '../data/floodPolygons.js'

function nearestStep(h) {
  const steps = [40,50,60,70,80,90,100,110,120]
  return steps.reduce((a,b) => Math.abs(b-h) < Math.abs(a-h) ? b : a)
}

const isMobile = () => window.innerWidth <= 768
// 모바일 탭바 높이 (App.jsx와 동일)
const MOB_TAB_H = 52

export default function MapView({ candidates, selected, heightM, onSelect }) {
  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const markers    = useRef({})
  const floodLayer = useRef(null)

  // 지도 초기화
  useEffect(() => {
    if (leafletMap.current || !window.L) return
    const map = window.L.map(mapRef.current, {
      center:[18.9, 103.35], zoom:9, zoomControl:true, attributionControl:true
    })
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:18, attribution:'© OpenStreetMap | SRTM GL1'
    }).addTo(map)
    leafletMap.current = map
  }, [])

  // 수몰 폴리곤
  useEffect(() => {
    const L = window.L, map = leafletMap.current
    if (!L || !map || !selected) return
    if (floodLayer.current) { floodLayer.current.remove(); floodLayer.current = null }

    const step = nearestStep(heightM)
    const polyData = floodPolygons[selected.id]?.[String(step)]
    if (!polyData) return

    try {
      if (!map.getPane('floodPane')) {
        map.createPane('floodPane')
        map.getPane('floodPane').style.zIndex = 350
      }
      const layer = window.L.geoJSON({ type:'Feature', geometry: polyData }, {
        pane:'floodPane',
        style:{ color:'#1a7fbd', weight:1.5, opacity:0.85, fillColor:'#1e78ff', fillOpacity:0.30 }
      }).addTo(map)
      floodLayer.current = layer
    } catch(e) { console.error('Flood polygon error:', e) }
  }, [selected, heightM])

  // 마커
  useEffect(() => {
    const L = window.L, map = leafletMap.current
    if (!L || !map) return
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    candidates.forEach(c => {
      const cfg   = PRIORITY_CONFIG[c.priority]
      const isSel = selected?.id === c.id
      const v     = isSel ? estimateVolume(c, heightM) : c.baseV
      const fsl   = isSel ? calcFsl(c, heightM) : c.baseFsl
      const h     = isSel ? heightM : c.baseH
      const sz    = isSel ? 46 : 30

      const icon = L.divIcon({
        className:'',
        iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
        html:`<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cfg.color}${isSel?'':'99'};border:${isSel?3:2}px solid ${isSel?'#fff':cfg.color};display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:${isSel?12:9}px;font-weight:700;color:${isSel?'#0a1628':'#fff'};box-shadow:0 0 ${isSel?18:6}px ${cfg.color}99;cursor:pointer;">${c.id}</div>`,
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
        .on('click', () => onSelect(c))
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
  // 모바일: 오버레이를 탭바 위에 위치
  const bottomOffset = mob ? MOB_TAB_H + 8 : 24

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

      {/* 수몰 정보 오버레이 — 상단 중앙 */}
      {selected && (
        <div style={{
          position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
          background:'rgba(13,33,55,0.92)', border:'1px solid rgba(30,120,255,0.4)',
          borderRadius:8, padding:'6px 14px', zIndex:1000,
          backdropFilter:'blur(8px)', display:'flex', gap:12, alignItems:'center',
          maxWidth:'90vw',
        }}>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>수몰 영역</span>
          <span style={{ fontSize:13, fontWeight:700, color:'#1e78ff', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>H = {heightM}m</span>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', whiteSpace:'nowrap' }}>
            {fslDisplay != null ? `FSL ${fslDisplay}m EL` : '소유역 분석 후 FSL 확정'}
          </span>
        </div>
      )}

      {/* 범례 — 좌하단, 모바일은 탭바 위로 */}
      <div style={{
        position:'absolute', bottom: bottomOffset, left:16,
        background:'rgba(13,33,55,0.92)', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:10, padding:'8px 12px', zIndex:1000, backdropFilter:'blur(8px)',
      }}>
        <div style={{ fontSize:10, color:'#5a7a90', fontFamily:'var(--font-mono)', letterSpacing:'0.12em', marginBottom:6 }}>범례</div>
        {[{color:'#1D9E75',label:'최우선'},{color:'#1A7FBD',label:'2순위'},{color:'#BA7517',label:'검토필요'}].map(i=>(
          <div key={i.label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, fontSize:11 }}>
            <div style={{ width:9, height:9, borderRadius:'50%', background:i.color, boxShadow:`0 0 5px ${i.color}88`, flexShrink:0 }}/>
            <span style={{ color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>{i.label}</span>
          </div>
        ))}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', marginTop:5, paddingTop:5, display:'flex', alignItems:'center', gap:7 }}>
          <div style={{ width:16, height:9, background:'rgba(30,120,255,0.35)', border:'1.5px solid #1a7fbd', borderRadius:2, flexShrink:0 }}/>
          <span style={{ fontSize:10, color:'#c0d4e0', fontFamily:'var(--font-mono)' }}>수몰 예상 구역</span>
        </div>
      </div>

      <style>{`.dam-tip.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  )
}
