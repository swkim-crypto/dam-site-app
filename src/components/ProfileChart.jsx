import React, { useState, useMemo } from 'react'
import { profiles } from '../data/profiles.js'
import { calcFsl } from '../data/candidates.js'

const W = 560, H = 240
const PAD = { top:20, right:20, bottom:36, left:56 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

export default function ProfileChart({ candidate, heightM }) {
  // 종횡단 레이블 수정:
  // 'cross' = 횡단면 (강을 가로지름, NS 방향)
  // 'long'  = 종단면 (강 흐름 방향, EW 방향)
  const [mode, setMode] = useState('cross')
  const fsl = calcFsl(candidate, heightM)

  const data = useMemo(() => {
    const p = profiles[candidate.id]
    // 횡단면↔종단면 실제 데이터 매핑 교체
    // 기존 'long'(NS)이 실제 횡단면, 'cross'(EW)가 실제 종단면
    const key = mode === 'cross' ? 'long' : 'cross'
    return p ? p[key] : []
  }, [candidate.id, mode])

  const C = useMemo(() => {
    if (!data.length) return null

    const dMin = data[0].d
    const dMax = data[data.length - 1].d
    const elevs = data.map(p => p.elev)
    const terrainMin = Math.min(...elevs)
    const terrainMax = Math.max(...elevs)

    const eMin = terrainMin - (terrainMax - terrainMin) * 0.05
    const eMax = Math.max(terrainMax, fsl) + (terrainMax - terrainMin) * 0.1

    const sx = d => PAD.left + ((d - dMin) / (dMax - dMin)) * CW
    const sy = e => PAD.top  + CH - ((e - eMin) / (eMax - eMin)) * CH

    // 지형 path
    const pathTerrain = [
      `M${sx(dMin).toFixed(1)},${sy(eMin).toFixed(1)}`,
      ...data.map(p => `L${sx(p.d).toFixed(1)},${sy(p.elev).toFixed(1)}`),
      `L${sx(dMax).toFixed(1)},${sy(eMin).toFixed(1)}`,
      'Z'
    ].join(' ')

    const wY = sy(fsl)

    // 수몰 path — 횡단면은 d<0(상류)만, 종단면은 양쪽
    let waterPath = ''
    let seg = []
    const flush = () => {
      if (seg.length >= 2) {
        const top = seg.map(([x]) => `${x.toFixed(1)},${wY.toFixed(1)}`).join(' L')
        const bot = [...seg].reverse().map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' L')
        waterPath += `M${top} L${bot} Z `
      }
      seg = []
    }
    data.forEach(p => {
      // 횡단면: 상류(d<=0)만 수몰 표시, 종단면: 전체
      const inUpstream = mode === 'cross' ? p.d <= 0 : true
      if (p.elev < fsl && inUpstream) {
        seg.push([sx(p.d), sy(p.elev)])
      } else {
        flush()
      }
    })
    flush()

    // 댐 길이: 횡단면에서 댐 축 양쪽 FSL 교점
    let damLength = null
    if (mode === 'cross') {
      const left  = [...data].filter(p => p.d <= 0).reverse()
      const right = [...data].filter(p => p.d >= 0)
      let lEdge = null, rEdge = null
      for (let i = 0; i < left.length - 1; i++) {
        const a = left[i], b = left[i+1]
        if (a.elev <= fsl && b.elev > fsl && b.elev !== a.elev) {
          lEdge = a.d + (fsl - a.elev) / (b.elev - a.elev) * (b.d - a.d)
          break
        }
      }
      for (let i = 0; i < right.length - 1; i++) {
        const a = right[i], b = right[i+1]
        if (a.elev <= fsl && b.elev > fsl && b.elev !== a.elev) {
          rEdge = a.d + (fsl - a.elev) / (b.elev - a.elev) * (b.d - a.d)
          break
        }
      }
      if (lEdge !== null && rEdge !== null)
        damLength = Math.round(Math.abs(rEdge - lEdge))
    }

    // 댐 몸체 사다리꼴 (횡단면 전용)
    let damBodyPath = null
    if (mode === 'cross') {
      const bedY = sy(candidate.bed)
      const topY = sy(fsl)
      const cx   = sx(0)
      const th   = Math.max(5, Math.min(20, heightM * 0.15))
      const bh   = th * 1.7
      if (Number.isFinite(bedY) && Number.isFinite(topY) && Number.isFinite(cx))
        damBodyPath = `M${cx-th},${topY} L${cx+th},${topY} L${cx+bh},${bedY} L${cx-bh},${bedY} Z`
    }

    // 종단면: 댐 위치(d=0) 기준 상류(d<0)에 수면 채우기
    // 이미 waterPath에서 처리됨

    // Y 눈금
    const yRange = eMax - eMin
    const rawStep = yRange / 6
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const yStep = Math.ceil(rawStep / mag) * mag
    const yTicks = []
    for (let v = Math.ceil(eMin/yStep)*yStep; v <= eMax; v += yStep) yTicks.push(v)

    // X 눈금
    const xStep = (dMax - dMin) > 4000 ? 1000 : 500
    const xTicks = []
    for (let v = Math.ceil(dMin/xStep)*xStep; v <= dMax; v += xStep) xTicks.push(v)

    return { sx, sy, dMin, dMax, eMin, eMax, wY, pathTerrain, waterPath, damBodyPath, damLength, yTicks, xTicks }
  }, [data, fsl, heightM, mode, candidate.bed])

  if (!data.length || !C) return null
  const { sx, sy, dMin, dMax, eMin, eMax, wY, pathTerrain, waterPath, damBodyPath, damLength, yTicks, xTicks } = C
  const fslInRange = fsl >= eMin && fsl <= eMax

  // 축 방향 레이블
  const axisLabel = mode === 'cross'
    ? '거리 — 상류(좌) ← 댐 축 → 하류(우)'
    : '거리 — 남 ← → 북'

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
      <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
        {[
          { key:'cross', label:'횡단면 (댐 축)' },
          { key:'long',  label:'종단면 (강 방향)' },
        ].map(t => (
          <button key={t.key} onClick={() => setMode(t.key)} style={{
            padding:'4px 12px', fontSize:12, fontFamily:'var(--font-mono)',
            background: mode===t.key ? 'var(--acc-teal)' : 'transparent',
            color:      mode===t.key ? 'var(--bg-deep)' : '#a0bcd0',
            border:    `1px solid ${mode===t.key ? 'var(--acc-teal)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius:4, cursor:'pointer', fontWeight: mode===t.key ? 700 : 400,
          }}>{t.label}</button>
        ))}
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--acc-teal)', marginLeft:6 }}>
          FSL {fsl}m EL
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
        <defs>
          <clipPath id="cc3">
            <rect x={PAD.left} y={PAD.top} width={CW} height={CH}/>
          </clipPath>
        </defs>
        <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="rgba(0,0,0,0.3)" rx="3"/>

        {yTicks.map(v => {
          const y = sy(v)
          return <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left+CW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD.left-4} y={y+4} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">{v}</text>
          </g>
        })}

        {xTicks.map(d => {
          const x = sx(d)
          return <g key={d}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+CH} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={x} y={PAD.top+CH+14} textAnchor="middle" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">
              {d===0?'0':`${d>0?'+':''}${(d/1000).toFixed(1)}km`}
            </text>
          </g>
        })}

        <g clipPath="url(#cc3)">
          {/* 1. 수몰 (상류만) */}
          {waterPath && <path d={waterPath} fill="rgba(30,120,255,0.50)" stroke="none"/>}
          {/* 2. 수면선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="rgba(120,190,255,0.6)" strokeWidth="1"/>}
          {/* 3. 지형 */}
          {pathTerrain && <path d={pathTerrain} fill="rgba(29,158,117,0.45)" stroke="#1d9e75" strokeWidth="1.5"/>}
          {/* 4. FSL 점선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3"/>}
          {/* 5. 댐 몸체 */}
          {damBodyPath && <path d={damBodyPath} fill="rgba(240,165,0,0.90)" stroke="#f0a500" strokeWidth="1.5"/>}
          {/* 6. 댐 축 */}
          <line x1={sx(0)} y1={PAD.top} x2={sx(0)} y2={PAD.top+CH} stroke="#f0a500" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"/>
          {/* 7. 상류/하류 레이블 (횡단면) */}
          {mode==='cross' && <>
            <text x={PAD.left+8} y={PAD.top+14} fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">← 상류</text>
            <text x={PAD.left+CW-8} y={PAD.top+14} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">하류 →</text>
          </>}
        </g>

        {/* 댐 길이 배지 */}
        {damLength && Number.isFinite(damLength) && <>
          <rect x={PAD.left+CW-112} y={PAD.top+22} width={110} height={24} fill="rgba(0,196,180,0.18)" rx="4" stroke="var(--acc-teal)" strokeWidth="1"/>
          <text x={PAD.left+CW-57} y={PAD.top+31} textAnchor="middle" fontSize="9" fill="var(--acc-teal)" fontFamily="Space Mono">댐 길이</text>
          <text x={PAD.left+CW-57} y={PAD.top+42} textAnchor="middle" fontSize="11" fill="#fff" fontFamily="Space Mono" fontWeight="700">
            {damLength>=1000?`${(damLength/1000).toFixed(2)} km`:`${damLength} m`}
          </text>
        </>}

        <text x={PAD.left-42} y={PAD.top+CH/2} textAnchor="middle" fontSize="10" fill="#7a9bb5"
          fontFamily="Space Mono" transform={`rotate(-90,${PAD.left-42},${PAD.top+CH/2})`}>고도 (m EL)</text>
        <text x={PAD.left+CW/2} y={H-2} textAnchor="middle" fontSize="9" fill="#7a9bb5" fontFamily="Space Mono">
          {axisLabel}
        </text>
      </svg>

      <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
        {[
          { color:'#1d9e75',              label:'지형',      box:false, dash:false },
          { color:'rgba(30,120,255,0.7)', label:'수몰 (상류)', box:false, dash:false },
          { color:'#1a7fbd',              label:`FSL ${fsl}m`, box:false, dash:true },
          { color:'#f0a500',              label:'댐 몸체',   box:true,  dash:false },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>
            {item.box
              ? <div style={{ width:10, height:13, background:item.color, borderRadius:1 }}/>
              : <div style={{ width:20, height:item.dash?0:3, background:item.color,
                  borderTop:item.dash?`2px dashed ${item.color}`:'none', marginTop:item.dash?2:0 }}/>
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
