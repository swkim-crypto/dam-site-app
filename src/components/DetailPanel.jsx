import React, { useMemo, useState } from 'react'
import { calcFsl, calcEfficiency, estimateEvap, PRIORITY_CONFIG, HEIGHT_STEPS } from '../data/candidates.js'
import { damLengths } from '../data/damLengths.js'
import { profiles } from '../data/profiles.js'
import ProfileChart from './ProfileChart.jsx'

// long 종단면 데이터로 저수량·유효길이·수몰면적 계산
// FSL 이하인 연속 구간(첫 FSL 초과 지점에서 stop)만 사다리꼴 적분
function calcFromLong(candidate, heightM) {
  const p = profiles[candidate.id]
  if (!p || !p.long || p.long.length < 2) return null
  const fsl = candidate.bed + heightM
  const pts = p.long

  // 첫 FSL 초과 지점에서 cut
  let cutoffIdx = pts.length
  for (let i = 0; i < pts.length; i++) {
    if (pts[i].elev > fsl) { cutoffIdx = i; break }
  }
  if (cutoffIdx === 0) return { volume: 0, length: 0, area: 0 }

  const valid = pts.slice(0, cutoffIdx)
  const lengthM = valid[valid.length - 1].d

  // cross 데이터에서 FSL 이하 하천폭 추출
  let crossWidthM = 80
  if (p.cross) {
    const belowFsl = p.cross.filter(pt => pt.elev <= fsl)
    if (belowFsl.length >= 2) {
      const dVals = belowFsl.map(pt => pt.d)
      crossWidthM = Math.max(...dVals) - Math.min(...dVals)
    }
  }

  // 사다리꼴 적분: Σ depthAvg × interval × crossWidth → Mm³
  let volM3 = 0
  for (let i = 0; i < valid.length - 1; i++) {
    const a = valid[i], b = valid[i + 1]
    const interval = b.d - a.d
    const depthAvg = ((fsl - a.elev) + (fsl - b.elev)) / 2
    if (depthAvg > 0) volM3 += depthAvg * interval * crossWidthM
  }

  return {
    volume: Math.round(volM3 / 1e6 * 100) / 100,         // Mm³
    length: Math.round(lengthM / 100) / 10,               // km (소수점1)
    area:   Math.round((lengthM * crossWidthM) / 1e6 * 10) / 10, // km²
  }
}

const isApproxMode = (c) => c.bed == null || c.baseArea == null

// 5m 해상도 버튼. 10m는 candidates.js의 HEIGHT_STEPS 사용.
const STEPS_5 = [40,45,50,55,60,65,70,75,80,85,90,95,100,105,110,115,120]

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

  // 높이 버튼 간격 토글 (10m | 5m). 숫자 계산만 5m로 세분 — 수몰폴리곤·댐길이는
  // 03에서 구워진 단계라 가장 가까운 baked 단계로 스냅된다(별도 재생성 전까지).
  const [stepMode, setStepMode] = useState(10)
  const heightSteps = stepMode === 5 ? STEPS_5 : HEIGHT_STEPS
  const switchStepMode = (m) => {
    setStepMode(m)
    const arr = m === 5 ? STEPS_5 : HEIGHT_STEPS
    const nearest = arr.reduce((a, b) => Math.abs(b - heightM) < Math.abs(a - heightM) ? b : a)
    if (nearest !== heightM) onHeightChange(nearest)
  }

  const stats = useMemo(() => {
    if (!candidate) return null
    const fsl  = calcFsl(candidate, heightM)

    // long 데이터 기반 계산 (있으면 우선 사용)
    const longCalc = calcFromLong(candidate, heightM)
    const v    = longCalc ? longCalc.volume : 0
    const a    = longCalc ? longCalc.area   : 0
    const resLen = longCalc ? longCalc.length : null

    const er   = calcEfficiency(v, a)
    const evap = estimateEvap(a)
    return { v, a, fsl, er, evap, resLen }
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
          <div style={{ display:'flex', alignItems:'baseline', gap:0, marginBottom:5, flexWrap:'wrap', rowGap:6 }}>
            <span style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', letterSpacing:'0.08em', marginRight:10 }}>높이</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize: mobile ? 32 : 28, fontWeight:700, color:'var(--acc-teal)', lineHeight:1 }}>{heightM}</span>
            <span style={{ fontSize:13, color:'#c0d4e0', marginLeft:3 }}>m</span>
            {/* 10m | 5m 간격 토글 */}
            <div style={{ display:'flex', marginLeft:12, border:'1px solid rgba(255,255,255,0.15)', borderRadius:6, overflow:'hidden', flexShrink:0, alignSelf:'center' }}>
              {[10,5].map(m => (
                <button key={m} onClick={() => switchStepMode(m)} style={{
                  padding:'2px 9px', fontSize:11, fontFamily:'var(--font-mono)', cursor:'pointer',
                  background: stepMode===m ? 'var(--acc-teal)' : 'transparent',
                  color: stepMode===m ? 'var(--bg-deep)' : '#a0bcd0',
                  border:'none', fontWeight: stepMode===m ? 700 : 400,
                }}>{m}m</button>
              ))}
            </div>
            <div style={{ flex:1 }} />
            {/* 댐 길이 배지 */}
            {damLength != null && (
              <div style={{ display:'flex', alignItems:'baseline', gap:4, background:'rgba(240,165,0,0.12)', border:'1px solid rgba(240,165,0,0.35)', borderRadius:6, padding:'3px 10px' }}>
                <span style={{ fontSize:11, color:'#f0a500', fontFamily:'var(--font-mono)' }}>댐길이</span>
                <span style={{ fontSize:16, fontWeight:700, color:'#f0a500', fontFamily:'var(--font-mono)', marginLeft:4 }}>
                  {damLength >= 1000 ? `${(damLength/1000).toFixed(2)}km` : `${damLength}m`}
                </span>
              </div>
            )}
            {/* 저수지 길이 배지 */}
            {stats.resLen != null && (
              <div style={{ display:'flex', alignItems:'baseline', gap:4, background:'rgba(30,120,255,0.12)', border:'1px solid rgba(30,120,255,0.35)', borderRadius:6, padding:'3px 10px', marginLeft:4 }}>
                <span style={{ fontSize:11, color:'#6ab4ff', fontFamily:'var(--font-mono)' }}>저수지</span>
                <span style={{ fontSize:16, fontWeight:700, color:'#6ab4ff', fontFamily:'var(--font-mono)', marginLeft:4 }}>
                  {stats.resLen}km
                </span>
              </div>
            )}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
            {heightSteps.map(h => (
              <button key={h} onClick={() => onHeightChange(h)} style={{
                flex: stepMode === 5 ? '1 1 30px' : 1, padding: mobile ? '5px 0' : '3px 0',
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
        <div style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', marginBottom:4 }}>계산 결과 <span style={{ color:'#5a7a90', fontSize:10 }}>(종단면 적분)</span></div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-acc)', borderRadius:8, padding:'7px 12px', marginBottom:6, display:'flex', alignItems:'baseline', gap:8, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>총 저수량</span>
          <span style={{ fontFamily:'var(--font-mono)', fontSize: mobile ? 26 : 24, fontWeight:700, color:'var(--acc-teal)' }}>{stats.v.toLocaleString()}</span>
          <span style={{ fontSize:13, color:'#c0d4e0' }}>Mm³</span>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginBottom:8 }}>
          <StatCard label="만수위 (FSL)"  value={stats.fsl}  unit="m EL" mobile={mobile} />
          <StatCard label="수몰 면적"     value={stats.a}    unit="km²"  mobile={mobile} />
          <StatCard label="E-ratio"       value={stats.er != null ? Math.round(stats.er*100)/100 : null} unit="Mm³/km²" sub="저수량/수몰면적" mobile={mobile} />
          <StatCard label="증발 손실"     value={stats.evap} unit="Mm³/yr"  sub="1,500mm/yr" mobile={mobile} />
        </div>

        {/* 프로파일 */}
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
            ['집수 면적',       candidate.catchment != null ? `${candidate.catchment.toLocaleString()} km²` : '—'],
            ['하천 차수',       candidate.order != null ? `${candidate.order} order` : '—'],
          ].map(([label,value],i,arr) => (
            <div key={label} style={{ display:'flex', justifyContent:'space-between', padding: mobile ? '7px 14px' : '5px 12px', borderBottom: i<arr.length-1?'1px solid var(--border)':'none', fontSize: mobile ? 13 : 12 }}>
              <span style={{ color:'#a0bcd0' }}>{label}</span>
              <span style={{ color: value==='—' ? '#5a7a90' : '#e8eef4', fontFamily:'var(--font-mono)', fontWeight:700 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* 비고 */}
        {candidate.note && (
          <div style={{ background:'rgba(0,196,180,0.06)', border:'1px solid rgba(0,196,180,0.15)', borderRadius:8, padding:'7px 12px', marginBottom:14 }}>
            <div style={{ fontSize:11, color:'var(--acc-teal)', fontFamily:'var(--font-mono)', marginBottom:3 }}>NOTE</div>
            <div style={{ fontSize: mobile ? 13 : 12, color:'#c0d4e0', lineHeight:1.6 }}>{candidate.note}</div>
          </div>
        )}
      </div>
    </div>
  )
}
