import React, { useMemo } from 'react'
import { estimateVolume, estimateArea, calcFsl, calcEfficiency, estimateEvap, PRIORITY_CONFIG, HEIGHT_STEPS } from '../data/candidates.js'

function StatCard({ label, value, unit, accent, sub }) {
  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${accent ? 'var(--border-acc)' : 'var(--border)'}`, borderRadius:8, padding:'10px 14px' }}>
      <div style={{ fontSize:11, color:'var(--text-sec)', fontFamily:'var(--font-mono)', letterSpacing:'0.06em', marginBottom:4 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
        <span style={{ fontSize:22, fontWeight:700, fontFamily:'var(--font-mono)', color: accent ? 'var(--acc-teal)' : 'var(--text-pri)' }}>{value}</span>
        <span style={{ fontSize:12, color:'var(--text-pri)', opacity:0.7 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize:11, color:'var(--text-sec)', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

export default function DetailPanel({ candidate, heightM, onHeightChange }) {
  const stats = useMemo(() => {
    if (!candidate) return null
    const v    = estimateVolume(candidate, heightM)
    const a    = estimateArea(candidate, heightM)
    const fsl  = calcFsl(candidate, heightM)
    const er   = calcEfficiency(v, a)
    const evap = estimateEvap(a)
    return { v, a, fsl, er, evap }
  }, [candidate, heightM])

  if (!candidate || !stats) return null
  const cfg = PRIORITY_CONFIG[candidate.priority]
  const isBase = heightM === candidate.baseH
  const pct = Math.round(((stats.v - candidate.baseV) / candidate.baseV) * 100)

  return (
    <div style={{ width:280, background:'var(--bg-panel)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
      {/* 헤더 */}
      <div style={{ padding:'16px 18px 14px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:24, fontWeight:700, color:cfg.color }}>{candidate.id}</span>
          <div style={{ flex:1, padding:'4px 10px', background:`${cfg.color}22`, border:`1px solid ${cfg.color}55`, borderRadius:20, fontSize:11, color:cfg.color, fontFamily:'var(--font-mono)', textAlign:'center' }}>{candidate.priority}</div>
        </div>
        <div style={{ fontSize:11, color:'var(--text-sec)', lineHeight:1.5 }}>{candidate.region}</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-sec)', marginTop:4 }}>
          {candidate.lat.toFixed(4)}°N, {candidate.lon.toFixed(4)}°E
        </div>
      </div>

      <div style={{ overflow:'auto', flex:1, padding:'14px 14px 0' }}>
        {/* 높이 조정 */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-acc)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:10 }}>댐 높이 VARIATION</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:10 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:38, fontWeight:700, color:'var(--acc-teal)', lineHeight:1 }}>{heightM}</span>
            <span style={{ fontSize:14, color:'var(--text-pri)', opacity:0.8 }}>m</span>
            {!isBase && <span style={{ fontSize:12, color:'var(--text-sec)', fontFamily:'var(--font-mono)' }}>기준 {candidate.baseH}m</span>}
          </div>
          <input type="range" min={30} max={120} step={10} value={heightM}
            onChange={e => onHeightChange(Number(e.target.value))}
            style={{ width:'100%', marginBottom:10, accentColor:'var(--acc-teal)', cursor:'pointer' }}
          />
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {HEIGHT_STEPS.map(h => (
              <button key={h} onClick={() => onHeightChange(h)} style={{
                padding:'3px 7px', background: h===heightM ? 'var(--acc-teal)' : 'transparent',
                color: h===heightM ? 'var(--bg-deep)' : 'var(--text-sec)',
                border:`1px solid ${h===heightM ? 'var(--acc-teal)' : 'var(--border)'}`,
                borderRadius:4, fontSize:10, fontFamily:'var(--font-mono)', cursor:'pointer', fontWeight: h===heightM ? 700 : 400,
              }}>{h}m</button>
            ))}
          </div>
        </div>

        {/* 계산 결과 */}
        <div style={{ fontSize:11, color:'var(--text-sec)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:8 }}>계산 결과</div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-acc)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
          <div style={{ fontSize:11, color:'var(--text-sec)', fontFamily:'var(--font-mono)', marginBottom:4 }}>총 저수량 (추정)</div>
          <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:28, fontWeight:700, color:'var(--acc-teal)' }}>{stats.v.toLocaleString()}</span>
            <span style={{ fontSize:12, color:'var(--text-sec)' }}>Mm³</span>
            {!isBase && (
              <span style={{ fontSize:11, padding:'2px 7px', background: pct>0 ? 'rgba(29,158,117,0.15)' : 'rgba(224,92,92,0.15)', color: pct>0 ? 'var(--acc-green)' : 'var(--acc-red)', border:`1px solid ${pct>0?'var(--acc-green)':'var(--acc-red)'}44`, borderRadius:4, fontFamily:'var(--font-mono)' }}>
                {pct>0?'+':''}{pct}%
              </span>
            )}
          </div>
          {!isBase && <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>기준 {candidate.baseV.toLocaleString()} Mm³ 대비</div>}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
          <StatCard label="만수위 (FSL)"  value={stats.fsl}  unit="m EL" />
          <StatCard label="수몰 면적"     value={stats.a}    unit="km²" />
          <StatCard label="E-ratio"       value={stats.er}   unit="Mm³/km²" sub="저수량/수몰면적" />
          <StatCard label="증발 손실"     value={stats.evap} unit="Mm³/yr" sub="(1,500mm/yr)" />
        </div>

        {/* 기본 제원 */}
        <div style={{ fontSize:11, color:'var(--text-sec)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:8 }}>기본 제원</div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:12 }}>
          {[['하상 고도 (Bed)', `${candidate.bed} m EL`],['기준 높이', `${candidate.baseH} m`],['기준 FSL', `${candidate.baseFsl} m EL`],['기준 저수량', `${candidate.baseV.toLocaleString()} Mm³`],['기준 수몰면적', `${candidate.baseArea} km²`]].map(([label,value],i,arr) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'9px 14px', borderBottom: i<arr.length-1 ? '1px solid var(--border)' : 'none', fontSize:12 }}>
              <span style={{ color:'var(--text-sec)' }}>{label}</span>
              <span style={{ color:'var(--text-pri)', fontFamily:'var(--font-mono)', fontWeight:700 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 비고 */}
        <div style={{ background:'rgba(0,196,180,0.06)', border:'1px solid rgba(0,196,180,0.15)', borderRadius:8, padding:'10px 14px', marginBottom:20 }}>
          <div style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', marginBottom:5 }}>NOTE</div>
          <div style={{ fontSize:12, color:'var(--text-pri)', opacity:0.8, lineHeight:1.6 }}>{candidate.note}</div>
        </div>
      </div>
    </div>
  )
}
