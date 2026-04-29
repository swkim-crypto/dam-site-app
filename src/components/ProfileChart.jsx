import React, { useState, useMemo } from 'react'
import { profiles } from '../data/profiles.js'
import { calcFsl } from '../data/candidates.js'

const W = 580, H = 240
const PAD = { top:20, right:24, bottom:38, left:58 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

export default function ProfileChart({ candidate, heightM }) {
  const [mode, setMode] = useState('cross')
  const fsl = calcFsl(candidate, heightM)

  const data = useMemo(() => {
    const p = profiles[candidate.id]
    return p ? p[mode] : []
  }, [candidate.id, mode])

  const C = useMemo(() => {
    if (!data.length) return null

    // ── 종단면: d는 음수(상류), 맨 오른쪽이 댐(d=0) ──
    // ── 횡단면: d<0 상류, d>0 하류, 중앙이 댐(d=0) ──
    const dMin = data[0].d
    const dMax = data[data.length - 1].d

    const elevs = data.map(p => p.elev)
    const tMin = Math.min(...elevs)
    const tMax = Math.max(...elevs)
    const range = tMax - tMin || 10

    const eMin = tMin - range * 0.05
    const eMax = Math.max(tMax, fsl) + range * 0.10

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

    // 수몰 path
    // 횡단면: 상류(d<=0)만, 종단면: 전체(모두 상류)
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
      const include = mode === 'cross' ? p.d <= 0 : true
      if (p.elev < fsl && include) seg.push([sx(p.d), sy(p.elev)])
      else flush()
    })
    flush()

    // 댐 길이 (횡단면: 댐 축 양쪽 FSL 교점)
    let damLength = null
    if (mode === 'cross') {
      const left  = [...data].filter(p => p.d <= 0).reverse()
      const right = [...data].filter(p => p.d >= 0)
      let lEdge = null, rEdge = null
      for (let i=0; i<left.length-1; i++) {
        const a=left[i], b=left[i+1]
        if (a.elev<=fsl && b.elev>fsl && b.elev!==a.elev) {
          lEdge = a.d + (fsl-a.elev)/(b.elev-a.elev)*(b.d-a.d); break
        }
      }
      for (let i=0; i<right.length-1; i++) {
        const a=right[i], b=right[i+1]
        if (a.elev<=fsl && b.elev>fsl && b.elev!==a.elev) {
          rEdge = a.d + (fsl-a.elev)/(b.elev-a.elev)*(b.d-a.d); break
        }
      }
      if (lEdge!==null && rEdge!==null)
        damLength = Math.round(Math.abs(rEdge-lEdge))
    }

    // 댐 몸체 사다리꼴 (횡단면: 중앙, 종단면: 맨 오른쪽)
    let damBodyPath = null
    if (mode === 'cross') {
      // 횡단면: 중앙(d=0)에 사다리꼴
      const bedY = sy(candidate.bed)
      const topY = sy(fsl)
      const cx   = sx(0)
      const th   = Math.max(5, Math.min(18, heightM * 0.13))
      const bh   = th * 1.7
      if (Number.isFinite(bedY) && Number.isFinite(cx))
        damBodyPath = `M${cx-th},${topY} L${cx+th},${topY} L${cx+bh},${bedY} L${cx-bh},${bedY} Z`
    }
    // 종단면: 댐은 수직선으로 맨 오른쪽에 표시 (damBodyPath 대신 별도 처리)

    // Y 눈금
    const rawStep = (eMax-eMin)/6
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep||1)))
    const yStep = Math.ceil(rawStep/mag)*mag
    const yTicks = []
    for (let v=Math.ceil(eMin/yStep)*yStep; v<=eMax; v+=yStep) yTicks.push(v)

    // X 눈금
    const xSpan = dMax - dMin
    const xStep = xSpan > 20000 ? 10000 : xSpan > 8000 ? 2000 : xSpan > 4000 ? 1000 : 500
    const xTicks = []
    for (let v=Math.ceil(dMin/xStep)*xStep; v<=dMax; v+=xStep) xTicks.push(v)

    return { sx, sy, dMin, dMax, eMin, eMax, wY, pathTerrain, waterPath, damBodyPath, damLength, yTicks, xTicks }
  }, [data, fsl, heightM, mode, candidate.bed])

  if (!data.length || !C) return null
  const { sx, sy, dMin, dMax, eMin, eMax, wY, pathTerrain, waterPath, damBodyPath, damLength, yTicks, xTicks } = C
  const fslInRange = fsl >= eMin && fsl <= eMax

  // 종단면 댐 위치: 맨 오른쪽 (d=0이 dMax)
  const damX = sx(0)

  const fmtDist = d => {
    const km = Math.abs(d)/1000
    return km >= 1 ? `${km.toFixed(0)}km` : `${Math.abs(d)}m`
  }

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
      {/* 탭 */}
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
          <clipPath id="cc4">
            <rect x={PAD.left} y={PAD.top} width={CW} height={CH}/>
          </clipPath>
        </defs>
        <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="rgba(0,0,0,0.3)" rx="3"/>

        {/* Y 그리드 */}
        {yTicks.map(v => {
          const y = sy(v)
          return <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left+CW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD.left-4} y={y+4} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">{v}</text>
          </g>
        })}

        {/* X 그리드 */}
        {xTicks.map(d => {
          const x = sx(d)
          return <g key={d}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+CH} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={x} y={PAD.top+CH+14} textAnchor="middle" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">
              {mode==='long'
                ? (d===0 ? '댐' : fmtDist(d))
                : (d===0 ? '0' : `${d>0?'+':''}${(d/1000).toFixed(1)}km`)
              }
            </text>
          </g>
        })}

        <g clipPath="url(#cc4)">
          {/* 수몰 */}
          {waterPath && <path d={waterPath} fill="rgba(30,120,255,0.50)" stroke="none"/>}
          {/* 수면선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="rgba(120,190,255,0.55)" strokeWidth="1"/>}
          {/* 지형 */}
          {pathTerrain && <path d={pathTerrain} fill="rgba(29,158,117,0.45)" stroke="#1d9e75" strokeWidth="1.5"/>}
          {/* FSL 점선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3"/>}

          {/* 횡단면: 댐 몸체 사다리꼴 */}
          {mode==='cross' && damBodyPath &&
            <path d={damBodyPath} fill="rgba(240,165,0,0.90)" stroke="#f0a500" strokeWidth="1.5"/>}
          {/* 횡단면: 댐 축 점선 */}
          {mode==='cross' &&
            <line x1={damX} y1={PAD.top} x2={damX} y2={PAD.top+CH} stroke="#f0a500" strokeWidth="1" strokeDasharray="3,3" opacity="0.5"/>}

          {/* 종단면: 맨 오른쪽에 댐 굵은 수직선 */}
          {mode==='long' && <>
            <line x1={damX} y1={PAD.top} x2={damX} y2={PAD.top+CH}
              stroke="#f0a500" strokeWidth="4" opacity="0.9"/>
            <text x={damX-4} y={PAD.top+14} textAnchor="end" fontSize="11"
              fill="#f0a500" fontFamily="Space Mono" fontWeight="700">댐</text>
          </>}

          {/* 횡단면: 상류/하류 방향 레이블 */}
          {mode==='cross' && <>
            <text x={PAD.left+8} y={PAD.top+14} fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">← 상류</text>
            <text x={PAD.left+CW-8} y={PAD.top+14} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">하류 →</text>
          </>}
          {/* 종단면: 상류 방향 레이블 */}
          {mode==='long' &&
            <text x={PAD.left+8} y={PAD.top+14} fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">← 상류 50km</text>}
        </g>

        {/* 댐 길이 배지 (횡단면) */}
        {mode==='cross' && damLength && Number.isFinite(damLength) && <>
          <rect x={PAD.left+CW-112} y={PAD.top+22} width={110} height={24}
            fill="rgba(0,196,180,0.18)" rx="4" stroke="var(--acc-teal)" strokeWidth="1"/>
          <text x={PAD.left+CW-57} y={PAD.top+31} textAnchor="middle" fontSize="9"
            fill="var(--acc-teal)" fontFamily="Space Mono">댐 길이</text>
          <text x={PAD.left+CW-57} y={PAD.top+42} textAnchor="middle" fontSize="11"
            fill="#fff" fontFamily="Space Mono" fontWeight="700">
            {damLength>=1000?`${(damLength/1000).toFixed(2)} km`:`${damLength} m`}
          </text>
        </>}

        {/* 축 라벨 */}
        <text x={PAD.left-44} y={PAD.top+CH/2} textAnchor="middle" fontSize="10" fill="#7a9bb5"
          fontFamily="Space Mono" transform={`rotate(-90,${PAD.left-44},${PAD.top+CH/2})`}>고도 (m EL)</text>
        <text x={PAD.left+CW/2} y={H-2} textAnchor="middle" fontSize="9" fill="#7a9bb5" fontFamily="Space Mono">
          {mode==='cross' ? '거리 (댐 축 기준)' : '거리 (상류 방향)'}
        </text>
      </svg>

      {/* 범례 */}
      <div style={{ display:'flex', gap:14, marginTop:6, flexWrap:'wrap' }}>
        {[
          { color:'#1d9e75',              label:'지형',             box:false, dash:false },
          { color:'rgba(30,120,255,0.7)', label:'수몰 (상류)',      box:false, dash:false },
          { color:'#1a7fbd',              label:`FSL ${fsl}m`,      box:false, dash:true  },
          { color:'#f0a500',              label: mode==='cross'?'댐 몸체':'댐 위치', box:mode==='cross', dash:mode==='long' },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>
            {item.box
              ? <div style={{ width:10, height:13, background:item.color, borderRadius:1 }}/>
              : <div style={{ width:item.dash?20:20, height:item.dash?0:3, background:item.color,
                  borderTop:item.dash?`2px solid ${item.color}`:'none', marginTop:item.dash?2:0 }}/>
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
