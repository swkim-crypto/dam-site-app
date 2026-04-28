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
    const rawMin = Math.min(...elevs)

    // ★ Y축: bed 기준 아래 20m ~ FSL 위 35m 로 고정
    // → 댐 높이와 저수면이 차트의 주인공이 되도록
    const eMin = Math.max(rawMin - 5, fsl - heightM - 25)
    const eMax = fsl + 35

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

    // ★ 댐 길이: 댐 축(d=0) 근처에서 양쪽 지형이 FSL과 만나는 교점 사이 거리
    // 저수지 전체 폭이 아니라, 댐이 실제로 막는 계곡 폭
    let damLength = null
    if (mode === 'cross') {
      // 댐 축 왼쪽: d<0 구간에서 FSL 위로 처음 올라오는 지점 (안쪽→바깥쪽 탐색)
      const leftSide  = [...data].filter(p => p.d <= 0).reverse() // 0에서 왼쪽으로
      const rightSide = [...data].filter(p => p.d >= 0)           // 0에서 오른쪽으로

      let leftEdge = null, rightEdge = null

      // 왼쪽: 댐 축에서 바깥으로 나가면서 처음으로 elev > fsl 인 지점
      for (let i = 0; i < leftSide.length - 1; i++) {
        if (leftSide[i].elev <= fsl && leftSide[i+1].elev > fsl) {
          // 선형 보간으로 정확한 교점
          const d1 = leftSide[i].d, e1 = leftSide[i].elev
          const d2 = leftSide[i+1].d, e2 = leftSide[i+1].elev
          leftEdge = d1 + (fsl - e1) / (e2 - e1) * (d2 - d1)
          break
        }
      }
      // 오른쪽: 댐 축에서 바깥으로 나가면서 처음으로 elev > fsl 인 지점
      for (let i = 0; i < rightSide.length - 1; i++) {
        if (rightSide[i].elev <= fsl && rightSide[i+1].elev > fsl) {
          const d1 = rightSide[i].d, e1 = rightSide[i].elev
          const d2 = rightSide[i+1].d, e2 = rightSide[i+1].elev
          rightEdge = d1 + (fsl - e1) / (e2 - e1) * (d2 - d1)
          break
        }
      }

      if (leftEdge !== null && rightEdge !== null) {
        damLength = Math.round(Math.abs(rightEdge - leftEdge))
      }
    }

    return {
      dMin, dMax, eMin, eMax,
      pathTerrain, waterPath,
      waterY: wY,
      fslInRange: fsl >= eMin && fsl <= eMax,
      damLength,
      leftEdge, rightEdge,
    }
  }, [data, fsl, mode])

  const { dMin, dMax, eMin, eMax, pathTerrain, waterPath, waterY, fslInRange, damLength, leftEdge, rightEdge } = computed

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
          {/* 수몰 영역 (지형 아래, 댐 앞) */}
          {waterPath && (
            <path d={waterPath} fill="rgba(30,120,255,0.45)" stroke="rgba(30,150,255,0.6)" strokeWidth="0.5"/>
          )}
          {/* 수면 — FSL 수평선 위에 얇은 밝은 선 */}
          {fslInRange && (
            <line x1={PAD.left} y1={waterY} x2={PAD.left+CW} y2={waterY}
              stroke="rgba(100,180,255,0.85)" strokeWidth="1.5"/>
          )}
          {/* 지형 */}
          {pathTerrain && (
            <path d={pathTerrain} fill="rgba(29,158,117,0.40)" stroke="#1d9e75" strokeWidth="1.5"/>
          )}
          {/* FSL 점선 */}
          {fslInRange && (
            <line x1={PAD.left} y1={waterY} x2={PAD.left+CW} y2={waterY}
              stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3"/>
          )}
          {/* ★ 댐 길이 교점 마커 + 치수선 */}
          {mode === 'cross' && leftEdge !== null && rightEdge !== null && (() => {
            const lx = sx(leftEdge, dMin, dMax)
            const rx = sx(rightEdge, dMin, dMax)
            const wy = waterY
            const tickH = 8
            return <>
              {/* 치수선 */}
              <line x1={lx} y1={wy} x2={rx} y2={wy} stroke="#f0a500" strokeWidth="2" strokeDasharray="none"/>
              {/* 왼쪽 교점 수직선 */}
              <line x1={lx} y1={wy - tickH} x2={lx} y2={wy + tickH} stroke="#f0a500" strokeWidth="2"/>
              {/* 오른쪽 교점 수직선 */}
              <line x1={rx} y1={wy - tickH} x2={rx} y2={wy + tickH} stroke="#f0a500" strokeWidth="2"/>
              {/* 왼쪽 삼각 화살 */}
              <polygon points={`${lx},${wy} ${lx+7},${wy-4} ${lx+7},${wy+4}`} fill="#f0a500"/>
              {/* 오른쪽 삼각 화살 */}
              <polygon points={`${rx},${wy} ${rx-7},${wy-4} ${rx-7},${wy+4}`} fill="#f0a500"/>
            </>
          })()}
          {/* ★ 댐 몸체 — 사다리꼴 (횡단면일 때만) */}
          {mode === 'cross' && (() => {
            const bedY  = sy(candidate.bed, eMin, eMax)
            const fslY2 = sy(fsl, eMin, eMax)
            const cx    = sx(0, dMin, dMax)
            // 댐 상단 폭: heightM 비례 (최소 8px, 최대 30px 반폭)
            const topHalf = Math.max(8, Math.min(30, heightM * 0.25))
            // 댐 하단 폭: 상단의 1.6배
            const botHalf = topHalf * 1.6
            const damPath = [
              `M${cx - topHalf},${fslY2}`,
              `L${cx + topHalf},${fslY2}`,
              `L${cx + botHalf},${bedY}`,
              `L${cx - botHalf},${bedY}`,
              'Z'
            ].join(' ')
            return <path d={damPath} fill="rgba(240,165,0,0.85)" stroke="#f0a500" strokeWidth="1.5"/>
          })()}
          {/* 댐 축 선 */}
          <line x1={sx(0,dMin,dMax)} y1={PAD.top} x2={sx(0,dMin,dMax)} y2={PAD.top+CH}
            stroke="var(--acc-amber)" strokeWidth="1" strokeDasharray="4,3" opacity="0.6"/>
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
          { color:'#1d9e75',              label:'지형',     dash:false, rect:false },
          { color:'rgba(30,120,255,0.7)', label:'수몰 구간', dash:false, rect:false },
          { color:'#1a7fbd',              label:`FSL ${fsl}m`, dash:true, rect:false },
          { color:'#f0a500',              label:'댐 몸체',  dash:false, rect:true  },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>
            {item.rect
              ? <div style={{ width:10, height:12, background:item.color, borderRadius:1, border:`1px solid ${item.color}` }}/>
              : <div style={{ width:20, height:item.dash?0:3, background:item.color,
                  borderTop: item.dash ? `2px dashed ${item.color}` : 'none',
                  marginTop: item.dash ? 2 : 0 }}/>
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
