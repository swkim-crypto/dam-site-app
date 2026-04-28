import React, { useState, useMemo } from 'react'
import { profiles } from '../data/profiles.js'
import { calcFsl } from '../data/candidates.js'

const W = 560, H = 240
const PAD = { top:18, right:18, bottom:36, left:52 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

const sx = (d, dMin, dMax) => PAD.left + ((d - dMin) / (dMax - dMin)) * CW
const sy = (e, eMin, eMax) => PAD.top + CH - ((e - eMin) / (eMax - eMin)) * CH

export default function ProfileChart({ candidate, heightM }) {
  const [mode, setMode] = useState('cross')
  const fsl = calcFsl(candidate, heightM)

  const data = useMemo(() => {
    const p = profiles[candidate.id]
    return p ? p[mode] : []
  }, [candidate.id, mode])

  const computed = useMemo(() => {
    if (!data.length) return {}
    const dMin = data[0].d, dMax = data[data.length - 1].d
    const elevs = data.map(p => p.elev)
    const rawMin = Math.min(...elevs), rawMax = Math.max(...elevs)
    const margin = (rawMax - rawMin) * 0.15
    const eMin = rawMin - margin, eMax = rawMax + margin

    // 지형 filled path
    const pts = data.map(p => `${sx(p.d, dMin, dMax).toFixed(1)},${sy(p.elev, eMin, eMax).toFixed(1)}`)
    const pathTerrain = [
      `M${sx(dMin, dMin, dMax).toFixed(1)},${sy(eMin, eMin, eMax).toFixed(1)}`,
      ...pts.map(p => `L${p}`),
      `L${sx(dMax, dMin, dMax).toFixed(1)},${sy(eMin, eMin, eMax).toFixed(1)}`,
      'Z'
    ].join(' ')

    // 수몰 구간: 지형과 FSL 수위선 사이 영역
    // 각 점에서 elev < fsl이면 (x, waterY)~(x, terrainY) 사이가 물
    const wY = sy(fsl, eMin, eMax)
    const clampY = PAD.top + CH  // 하단 클리핑
    let waterPath = ''
    let seg = []
    data.forEach((p, i) => {
      if (p.elev < fsl) {
        seg.push({ x: sx(p.d, dMin, dMax), ty: sy(p.elev, eMin, eMax) })
      } else {
        if (seg.length >= 2) {
          // 위: FSL 수평선, 아래: 지형 라인
          const top = seg.map(s => `${s.x.toFixed(1)},${wY.toFixed(1)}`).join(' L')
          const bot = [...seg].reverse().map(s => `${s.x.toFixed(1)},${s.ty.toFixed(1)}`).join(' L')
          waterPath += `M${top} L${bot} Z `
        }
        seg = []
      }
    })
    if (seg.length >= 2) {
      const top = seg.map(s => `${s.x.toFixed(1)},${wY.toFixed(1)}`).join(' L')
      const bot = [...seg].reverse().map(s => `${s.x.toFixed(1)},${s.ty.toFixed(1)}`).join(' L')
      waterPath += `M${top} L${bot} Z`
    }

    // 댐 길이 (횡단면에서 FSL 이하 구간 폭)
    let damLength = null
    if (mode === 'cross') {
      const below = data.filter(p => p.elev <= fsl)
      if (below.length >= 2) {
        damLength = Math.abs(below[below.length - 1].d - below[0].d)
      }
    }

    return {
      dMin, dMax, eMin, eMax,
      pathTerrain, waterPath,
      waterY: wY,
      fslInRange: fsl >= eMin && fsl <= eMax,
      damLength,
    }
  }, [data, fsl, mode])

  const { dMin, dMax, eMin, eMax, pathTerrain, waterPath, waterY, fslInRange, damLength } = computed

  const yTicks = useMemo(() => {
    if (eMin === undefined) return []
    const range = eMax - eMin
    const step = range > 500 ? 100 : range > 200 ? 50 : range > 80 ? 25 : 10
    const start = Math.ceil(eMin / step) * step
    const ticks = []
    for (let v = start; v <= eMax; v += step) ticks.push(v)
    return ticks
  }, [eMin, eMax])

  const xTicks = useMemo(() => {
    if (dMin === undefined) return []
    const step = (dMax - dMin) > 4000 ? 1000 : 500
    const ticks = []
    for (let v = Math.ceil(dMin / step) * step; v <= dMax; v += step) ticks.push(v)
    return ticks
  }, [dMin, dMax])

  if (!data.length) return null

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>

      {/* 탭 헤더 — 한 줄, [단면도] 제거 */}
      <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
        {[
          { key:'cross', label:'횡단면 (EW)' },
          { key:'long',  label:'종단면 (NS)' },
        ].map(t => (
          <button key={t.key} onClick={() => setMode(t.key)} style={{
            padding:'4px 12px', fontSize:12, fontFamily:'var(--font-mono)',
            background: mode === t.key ? 'var(--acc-teal)' : 'transparent',
            color:      mode === t.key ? 'var(--bg-deep)' : '#a0bcd0',
            border:    `1px solid ${mode === t.key ? 'var(--acc-teal)' : 'rgba(255,255,255,0.15)'}`,
            borderRadius:4, cursor:'pointer', fontWeight: mode === t.key ? 700 : 400,
            whiteSpace:'nowrap',
          }}>{t.label}</button>
        ))}
        {/* FSL 한 줄로 */}
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--acc-teal)', marginLeft:6 }}>
          FSL {fsl}m EL
        </span>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
        <defs>
          <clipPath id="chartClip">
            <rect x={PAD.left} y={PAD.top} width={CW} height={CH} />
          </clipPath>
        </defs>
        <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="rgba(0,0,0,0.25)" rx="3"/>

        {/* Y 그리드 */}
        {yTicks.map(v => {
          const y = sy(v, eMin, eMax)
          return <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left+CW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD.left-5} y={y+4} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">{v}</text>
          </g>
        })}

        {/* X 그리드 */}
        {xTicks.map(d => {
          const x = sx(d, dMin, dMax)
          return <g key={d}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+CH} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={x} y={PAD.top+CH+14} textAnchor="middle" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">
              {d === 0 ? '0' : `${d > 0 ? '+' : ''}${(d/1000).toFixed(1)}km`}
            </text>
          </g>
        })}

        {/* ★ 수몰 구간 — clipPath로 차트 영역 안에만 */}
        <g clipPath="url(#chartClip)">
          {waterPath && (
            <path d={waterPath} fill="rgba(30,120,255,0.45)" stroke="rgba(30,150,255,0.6)" strokeWidth="0.5"/>
          )}
          {/* 지형 */}
          {pathTerrain && (
            <path d={pathTerrain} fill="rgba(29,158,117,0.35)" stroke="#1d9e75" strokeWidth="1.5"/>
          )}
          {/* FSL 수위선 */}
          {fslInRange && (
            <line x1={PAD.left} y1={waterY} x2={PAD.left+CW} y2={waterY}
              stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3"/>
          )}
          {/* 댐 축 */}
          <line x1={sx(0,dMin,dMax)} y1={PAD.top} x2={sx(0,dMin,dMax)} y2={PAD.top+CH}
            stroke="var(--acc-amber)" strokeWidth="1.5" strokeDasharray="4,3"/>
        </g>

        {/* 댐 축 라벨 */}
        <text x={sx(0,dMin,dMax)+5} y={PAD.top+14} fontSize="11" fill="var(--acc-amber)" fontFamily="Space Mono">축</text>

        {/* 댐 길이 배지 (우상단) */}
        {mode === 'cross' && damLength && <>
          <rect x={PAD.left+CW-118} y={PAD.top+4} width={116} height={26} fill="rgba(0,196,180,0.15)" rx="4" stroke="var(--acc-teal)" strokeWidth="1"/>
          <text x={PAD.left+CW-60} y={PAD.top+14} textAnchor="middle" fontSize="9" fill="var(--acc-teal)" fontFamily="Space Mono">길이</text>
          <text x={PAD.left+CW-60} y={PAD.top+25} textAnchor="middle" fontSize="12" fill="#fff" fontFamily="Space Mono" fontWeight="700">
            {damLength >= 1000 ? `${(damLength/1000).toFixed(2)} km` : `${Math.round(damLength)} m`}
          </text>
        </>}

        {/* 축 라벨 */}
        <text x={PAD.left-38} y={PAD.top+CH/2} textAnchor="middle" fontSize="10" fill="#7a9bb5"
          fontFamily="Space Mono" transform={`rotate(-90,${PAD.left-38},${PAD.top+CH/2})`}>고도 (m EL)</text>
        <text x={PAD.left+CW/2} y={H-3} textAnchor="middle" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">
          {mode === 'cross' ? '거리 — 동 ← → 서' : '거리 — 북 ← → 남'}
        </text>
      </svg>

      {/* 범례 */}
      <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
        {[
          { color:'#1d9e75',              label:'지형',    dash:false },
          { color:'rgba(30,120,255,0.7)', label:'수몰 구간', dash:false },
          { color:'#1a7fbd',              label:`FSL ${fsl}m`, dash:true },
          { color:'var(--acc-amber)',     label:'댐 축',   dash:true },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>
            <div style={{ width:20, height:item.dash?0:3, background:item.color,
              borderTop: item.dash ? `2px dashed ${item.color}` : 'none',
              marginTop: item.dash ? 2 : 0 }}/>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
