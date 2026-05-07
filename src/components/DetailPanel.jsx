import React, { useMemo } from 'react'
import { estimateVolume, estimateArea, calcFsl, calcEfficiency, estimateEvap, PRIORITY_CONFIG, HEIGHT_STEPS } from '../data/candidates.js'
import { damLengths } from '../data/damLengths.js'
import ProfileChart from './ProfileChart.jsx'

const isApproxMode = (c) => c.bed == null || c.baseArea == null

function StatCard({ label, value, unit, sub, mobile }) {
  const display = value == null ? '—' : value
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:6, padding: mobile ? '8px 10px' : '6px 10px' }}>
      <div style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', marginBottom:2 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
        <span style={{ fontSize: mobile ? 18 : 17, fontWeight:700, fontFamily:'var(--font-mono)', color: value == null ? '#5a7a90' : '#e8eef4' }}>{display}</span>
        {value != null && <span style={{ fontSize:12, color:'#c0d4e0' }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize:11, color:'#8aafc8', marginTop:1 }}>{sub}</div>}
    </div>
  )
}

export default function DetailPanel({ candidate, heightM, onHeightChange, mobile }) {
  const approx = candidate ? isApproxMode(candidate) : false

  const stats = useMemo(() => {
    if (!candidate) return null
    const v    = estimateVolume(candidate, heightM)
    const a    = estimateArea(candidate, heightM)
    const fsl  = calcFsl(candidate, heightM)
    const er   = calcEfficiency(v, a)
    const evap = estimateEvap(a)
    return { v, a, fsl, er, evap }
  }, [candidate, heightM])

  const damLength = useMemo(() => {
    if (!candidate || approx) return null
    const steps = [40,50,60,70,80,90,100,110,120]
    const nearest = steps.reduce((a,b) => Math.abs(b-heightM)<Math.abs(a-heightM)?b:a)
    return damLengths[candidate.id]?.[String(nearest)] ?? null
  }, [candidate, heightM, approx])

  if (!candidate || !stats) return (
    <div style={{ width: mobile ? '100%' : 420, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-sec)', fontSize:13, fontFamily:'var(--font-mono)', height:'100%' }}>
      후보지를 선택해 주세요
    </div>
  )

  const cfg    = PRIORITY_CONFIG[candidate.priority]
  const isBase = heightM === candidate.baseH
  const pct    = Math.round(((stats.v - candidate.baseV) / candidate.baseV) * 100)

  return (
    <div style={{
      width: mobile ? '100%' : 420,
      background:'var(--bg-panel)',
      borderLeft: mobile ? 'none' : '1px solid var(--border)',
      display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0,
      height: '100%',
    }}>
      {/* 헤더 */}
      <div style={{ padding: mobile ? '10px 14px 8px' : '8px 14px 7px', borderBottom:'1px solid var(--border)', background:'var(--bg-card)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:3 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize: mobile ? 22 : 20, fontWeight:700, color:cfg.color }}>{candidate.id}</span>
          <div style={{ flex:1, padding:'2px 10px', background:`${cfg.color}22`, border:`1px solid ${cfg.color}55`, borderRadius:20, fontSize:12, color:cfg.color, fontFamily:'var(--font-mono)', textAlign:'center' }}>{candidate.priority}</div>
          {approx && <span style={{ fontSize:10, padding:'2px 7px', background:'rgba(186,117,23,0.15)', border:'1px solid rgba(186,117,23,0.4)', borderRadius:4, color:'#BA7517', fontFamily:'var(--font-mono)' }}>근사치</span>}
        </div>
        <div style={{ display:'flex', gap:12, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#c0d4e0' }}>{candidate.region}</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'#8aafc8' }}>{candidate.lat.toFixed(4)}N, {candidate.lon.toFixed(4)}E</span>
        </div>
      </div>

      <div style={{ overflow:'auto', flex:1, padding: mobile ? '10px 14px 0' : '8px 12px 0' }}>

        {/* 높이 조정 */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-acc)', borderRadius:8, padding: mobile ? '10px 14px' : '8px 12px', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:0, marginBottom:5 }}>
            <span style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em', marginRight:10 }}>높이</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize: mobile ? 32 : 28, fontWeight:700, color:'var(--acc-teal)', lineHeight:1 }}>{heightM}</span>
            <span style={{ fontSize:13, color:'#c0d4e0', marginLeft:3 }}>m</span>
            <div style={{ flex:1 }} />
            {damLength != null && (
              <div style={{ display:'flex', alignItems:'baseline', gap:4, background:'rgba(240,165,0,0.12)', border:'1px solid rgba(240,165,0,0.35)', borderRadius:6, padding:'3px 10px' }}>
                <span style={{ fontSize:11, color:'#f0a500', fontFamily:'var(--font-mono)' }}>길이</span>
                <span style={{ fontSize:16, fontWeight:700, color:'#f0a500', fontFamily:'var(--font-mono)', marginLeft:4 }}>
                  {damLength >= 1000 ? `${(damLength/1000).toFixed(2)}km` : `${damLength}m`}
                </span>
              </div>
            )}
          </div>
          <input type="range" min={30} max={120} step={10} value={heightM}
            onChange={e => onHeightChange(Number(e.target.value))}
            style={{ width:'100%', marginBottom:8, accentColor:'var(--acc-teal)', cursor:'pointer', height: mobile ? 24 : 'auto' }}
          />
          <div style={{ display:'flex', gap:3 }}>
            {HEIGHT_STEPS.map(h => (
              <button key={h} onClick={() => onHeightChange(h)} style={{
                flex:1, padding: mobile ? '5px 0' : '3px 0',
                background: h===heightM ? 'var(--acc-teal)' : 'transparent',
                color: h===heightM ? 'var(--bg-deep)' : '#a0bcd0',
                border:`1px solid ${h===heightM ? 'var(--acc-teal)' : 'rgba(255,255,255,0.12)'}`,
                borderRadius:4, fontSize: mobile ? 12 : 11, fontFamily:'var(--font-mono)',
                cursor:'pointer', fontWeight: h===heightM ? 700 : 400,
              }}>{h}</button>
            ))}
          </div>
        </div>

        {/* 저수량 */}
        <div style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:4 }}>계산 결과</div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-acc)', borderRadius:8, padding:'7px 12px', marginBottom:6, display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>총 저수량</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize: mobile ? 26 : 24, fontWeight:700, color:'var(--acc-teal)' }}>{stats.v.toLocaleString()}</span>
          <span style={{ fontSize:13, color:'#c0d4e0' }}>Mm³</span>
          {!isBase && <span style={{ fontSize:12, padding:'1px 6px', background: pct>0?'rgba(29,158,117,0.15)':'rgba(224,92,92,0.15)', color: pct>0?'var(--acc-green)':'var(--acc-red)', border:`1px solid ${pct>0?'var(--acc-green)':'var(--acc-red)'}44`, borderRadius:4, fontFamily:'var(--font-mono)' }}>{pct>0?'+':''}{pct}%</span>}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:8 }}>
          <StatCard label="만수위 (FSL)"  value={stats.fsl}  unit="m EL" mobile={mobile} />
          <StatCard label="수몰 면적"     value={stats.a}    unit="km²"  mobile={mobile} />
          <StatCard label="E-ratio"       value={stats.er}   unit="Mm³/km²" sub="저수량/수몰면적" mobile={mobile} />
          <StatCard label="증발 손실"     value={stats.evap} unit="Mm³/yr"  sub="1,500mm/yr" mobile={mobile} />
        </div>

        {/* 프로파일 (근사치 모드는 안내문) */}
        {!approx
          ? <ProfileChart candidate={candidate} heightM={heightM} />
          : (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 12px', marginBottom:12, textAlign:'center' }}>
              <div style={{ fontSize:12, color:'#5a7a90', fontFamily:'var(--font-mono)', marginBottom:6 }}>단면 프로파일</div>
              <div style={{ fontSize:11, color:'#8aafc8', lineHeight:1.8 }}>
                소유역 분석 완료 후 제공 예정<br/>
                <span style={{ color:'#BA7517' }}>집수면적 {candidate.upland_skm?.toLocaleString()} km² · 유량 {candidate.dis_av_cms} m³/s</span>
              </div>
            </div>
          )
        }

        {/* 기본 제원 */}
        <div style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:4 }}>기본 제원</div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', marginBottom:8 }}>
          {[
            ['하상 고도 (Bed)', candidate.bed   != null ? `${candidate.bed} m EL`   : '—'],
            ['기준 높이',       `${candidate.baseH} m`],
            ['기준 FSL',        candidate.baseFsl != null ? `${candidate.baseFsl} m EL` : '—'],
            ['기준 저수량',     `${candidate.baseV.toLocaleString()} Mm³`],
            ['기준 수몰면적',   candidate.baseArea != null ? `${candidate.baseArea} km²` : '—'],
          ].map(([label,value],i,arr) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding: mobile ? '7px 14px' : '5px 12px', borderBottom: i<arr.length-1?'1px solid var(--border)':'none', fontSize: mobile ? 13 : 12 }}>
              <span style={{ color:'#a0bcd0' }}>{label}</span>
              <span style={{ color: value==='—' ? '#5a7a90' : '#e8eef4', fontFamily:'var(--font-mono)', fontWeight:700 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 비고 */}
        <div style={{ background:'rgba(0,196,180,0.06)', border:'1px solid rgba(0,196,180,0.15)', borderRadius:8, padding:'7px 12px', marginBottom:14 }}>
          <div style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', marginBottom:3 }}>NOTE</div>
          <div style={{ fontSize: mobile ? 13 : 12, color:'#c0d4e0', lineHeight:1.6 }}>{candidate.note}</div>
        </div>
      </div>
    </div>
  )
}
