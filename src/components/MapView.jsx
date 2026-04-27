import React, { useEffect, useRef } from 'react'
import { PRIORITY_CONFIG, estimateVolume, calcFsl } from '../data/candidates.js'

export default function MapView({ candidates, selected, heightM, onSelect }) {
  const mapRef     = useRef(null)
  const leafletMap = useRef(null)
  const markers    = useRef({})

  // 지도 초기화
  useEffect(() => {
    if (leafletMap.current || !window.L) return
    const map = window.L.map(mapRef.current, { center:[18.9, 103.35], zoom:9, zoomControl:true, attributionControl:true })
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18, attribution:'© OpenStreetMap | SRTM GL1' }).addTo(map)
    leafletMap.current = map
  }, [])

  // 마커 업데이트
  useEffect(() => {
    const L = window.L; const map = leafletMap.current
    if (!L || !map) return
    Object.values(markers.current).forEach(m => m.remove())
    markers.current = {}

    candidates.forEach(c => {
      const cfg   = PRIORITY_CONFIG[c.priority]
      const isSel = selected?.id === c.id
      const v     = isSel ? estimateVolume(c, heightM) : c.baseV
      const fsl   = isSel ? calcFsl(c, heightM)        : c.baseFsl
      const h     = isSel ? heightM : c.baseH
      const sz    = isSel ? 46 : 30

      const icon = L.divIcon({
        className: '',
        iconSize:   [sz, sz],
        iconAnchor: [sz/2, sz/2],
        html: `<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${cfg.color}${isSel?'':'99'};border:${isSel?3:2}px solid ${isSel?'#fff':cfg.color};display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:${isSel?12:9}px;font-weight:700;color:${isSel?'#0a1628':'#fff'};box-shadow:0 0 ${isSel?18:6}px ${cfg.color}99;cursor:pointer;">${c.id}</div>`,
      })

      const tooltipHtml = `<div style="font-family:'Space Mono',monospace;font-size:11px;line-height:1.9;background:#0d2137;border:1px solid ${cfg.color}55;color:#e8eef4;padding:8px 12px;border-radius:8px;min-width:160px;"><b style="color:${cfg.color};font-size:13px;">${c.id}</b> <span style="color:#7a9bb5">${c.priority}</span><br/>Bed: ${c.bed} m EL<br/>H: ${h} m<br/>FSL: ${fsl} m EL<br/>V: <b style="color:#00c4b4;">${v.toLocaleString()} Mm³</b></div>`

      const marker = L.marker([c.lat, c.lon], { icon })
        .addTo(map)
        .bindTooltip(tooltipHtml, { permanent:false, direction:'top', offset:[0,-sz/2-4], opacity:1, className:'dam-tip' })
        .on('click', () => onSelect(c))
      markers.current[c.id] = marker
    })
  }, [candidates, selected, heightM, onSelect])

  // 선택 시 이동
  useEffect(() => {
    const map = leafletMap.current
    if (!map || !selected) return
    map.setView([selected.lat, selected.lon], Math.max(map.getZoom(), 10), { animate:true })
  }, [selected])

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

      {/* 범례 */}
      <div style={{ position:'absolute', bottom:24, left:16, background:'rgba(13,33,55,0.92)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 14px', zIndex:1000, backdropFilter:'blur(8px)' }}>
        <div style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.12em', marginBottom:8 }}>범례</div>
        {[{color:'#1D9E75',label:'최우선'},{color:'#1A7FBD',label:'2순위'},{color:'#BA7517',label:'검토필요'}].map(i=>(
          <div key={i.label} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, fontSize:11 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background:i.color, boxShadow:`0 0 6px ${i.color}88` }} />
            <span style={{ color:'var(--text-sec)', fontFamily:'var(--font-mono)' }}>{i.label}</span>
          </div>
        ))}
      </div>

      {/* 툴팁 CSS */}
      <style>{`.dam-tip.leaflet-tooltip{background:transparent!important;border:none!important;box-shadow:none!important;padding:0!important;}`}</style>
    </div>
  )
}
