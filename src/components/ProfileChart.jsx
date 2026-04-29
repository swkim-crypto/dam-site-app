import React, { useState, useMemo } from 'react'
import { profiles } from '../data/profiles.js'
import { calcFsl } from '../data/candidates.js'

const W = 580, H = 260
const PAD = { top:22, right:28, bottom:40, left:58 }
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

    const dMin = data[0].d
    const dMax = data[data.length - 1].d
    const elevs = data.map(p => p.elev)
    const tMin = Math.min(...elevs)
    const tMax = Math.max(...elevs)
    const range = tMax - tMin || 10

    const eMin = tMin - range * 0.04
    const eMax = Math.max(tMax, fsl) + range * 0.12

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
    const bedY = sy(candidate.bed)

    // ── 횡단면 ──────────────────────────────────────────
    // 수몰: 상류(d<=0)에서 지형과 FSL 사이
    let waterPath = ''
    if (mode === 'cross') {
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
        if (p.d <= 0 && p.elev < fsl) seg.push([sx(p.d), sy(p.elev)])
        else flush()
      })
      flush()
    }

    // 종단면 수몰: 전체 구간 FSL 이하
    if (mode === 'long') {
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
        if (p.elev < fsl) seg.push([sx(p.d), sy(p.elev)])
        else flush()
      })
      flush()
    }

    // ── 횡단면: 댐 역삼각형(▽) ──────────────────────────
    // V자 계곡을 막는 역삼각형: FSL 수위에서 계곡 양쪽 교점을 꼭짓점으로,
    // 아래 꼭짓점은 bed 고도(하상)
    let damTriPath = null
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

      if (lEdge!==null && rEdge!==null) {
        damLength = Math.round(Math.abs(rEdge-lEdge))
        const lx = sx(lEdge), rx = sx(rEdge)
        const cx = sx(0)
        // 역삼각형: 상단 두 꼭짓점(FSL 수위 교점) + 하단 꼭짓점(bed, 댐 축)
        damTriPath = `M${lx.toFixed(1)},${wY.toFixed(1)} L${rx.toFixed(1)},${wY.toFixed(1)} L${cx.toFixed(1)},${bedY.toFixed(1)} Z`
      }
    }

    // ── 종단면: 댐 측면도 (슬림 사다리꼴, 맨 우측) ──────
    // 댐 위치 d=0 → X축 맨 오른쪽
    let damSideBody = null
    if (mode === 'long') {
      const damX = sx(0)
      const topW  = 4   // 댐 정상부 반폭 (px)
      const botW  = 12  // 댐 하부 반폭 (px)
      const topY2 = sy(fsl)
      const botY2 = sy(candidate.bed)
      if (Number.isFinite(topY2) && Number.isFinite(botY2)) {
        damSideBody = `M${(damX-topW).toFixed(1)},${topY2.toFixed(1)} L${(damX+topW).toFixed(1)},${topY2.toFixed(1)} L${(damX+botW).toFixed(1)},${botY2.toFixed(1)} L${(damX-botW).toFixed(1)},${botY2.toFixed(1)} Z`
      }
    }

    // Y 눈금
    const rawStep = (eMax-eMin)/6
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep||1)))
    const yStep = Math.ceil(rawStep/mag)*mag
    const yTicks = []
    for (let v=Math.ceil(eMin/yStep)*yStep; v<=eMax; v+=yStep) yTicks.push(v)

    // X 눈금
    const xSpan = dMax - dMin
    const xStep = xSpan>30000 ? 10000 : xSpan>15000 ? 5000 : xSpan>8000 ? 2000 : xSpan>4000 ? 1000 : 500
    const xTicks = []
    for (let v=Math.ceil(dMin/xStep)*xStep; v<=dMax; v+=xStep) xTicks.push(v)

    return {
      sx, sy, dMin, dMax, eMin, eMax, wY, bedY,
      pathTerrain, waterPath,
      damTriPath, damLength,
      damSideBody,
      yTicks, xTicks
    }
  }, [data, fsl, heightM, mode, candidate.bed])

  if (!data.length || !C) return null
  const { sx, sy, dMin, dMax, eMin, eMax, wY, bedY, pathTerrain, waterPath, damTriPath, damLength, damSideBody, yTicks, xTicks } = C
  const fslInRange = fsl >= eMin && fsl <= eMax

  const fmtX = d => {
    if (mode === 'long') {
      if (d === 0) return ''
      const km = Math.abs(d)/1000
      return km >= 1 ? `${km.toFixed(0)}km` : `${Math.abs(d)}m`
    }
    return d===0 ? '0' : `${d>0?'+':''}${(d/1000).toFixed(1)}km`
  }

  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 12px', marginBottom:12 }}>
      {/* 탭 */}
      <div style={{ display:'flex', gap:6, marginBottom:8, alignItems:'center' }}>
        {[
          { key:'cross', label:'횡단면 (댐 축)' },
          { key:'long',  label:'종단면 (강 방향)' },
        ].map(t => (
          <button key={t.key} onClick={()=>setMode(t.key)} style={{
            padding:'4px 13px', fontSize:12, fontFamily:'var(--font-mono)',
            background: mode===t.key?'var(--acc-teal)':'transparent',
            color:      mode===t.key?'var(--bg-deep)':'#a0bcd0',
            border:    `1px solid ${mode===t.key?'var(--acc-teal)':'rgba(255,255,255,0.15)'}`,
            borderRadius:4, cursor:'pointer', fontWeight: mode===t.key?700:400,
          }}>{t.label}</button>
        ))}
        <span style={{ fontSize:12, fontFamily:'var(--font-mono)', color:'var(--acc-teal)', marginLeft:6 }}>
          FSL {fsl}m EL
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', display:'block' }}>
        <defs>
          <clipPath id="cc5">
            <rect x={PAD.left} y={PAD.top} width={CW} height={CH}/>
          </clipPath>
        </defs>

        <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="rgba(0,0,0,0.3)" rx="3"/>

        {/* Y 그리드 + 눈금 */}
        {yTicks.map(v => {
          const y = sy(v)
          return <g key={v}>
            <line x1={PAD.left} y1={y} x2={PAD.left+CW} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
            <text x={PAD.left-4} y={y+4} textAnchor="end" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">{v}</text>
          </g>
        })}

        {/* X 그리드 + 눈금 */}
        {xTicks.map(d => {
          const x = sx(d)
          const label = fmtX(d)
          return <g key={d}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top+CH} stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            {label && <text x={x} y={PAD.top+CH+14} textAnchor="middle" fontSize="10" fill="#7a9bb5" fontFamily="Space Mono">{label}</text>}
          </g>
        })}

        <g clipPath="url(#cc5)">
          {/* 수몰 영역 */}
          {waterPath && <path d={waterPath} fill="rgba(30,120,255,0.48)" stroke="none"/>}
          {/* 수면선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="rgba(120,190,255,0.55)" strokeWidth="1"/>}
          {/* 지형 */}
          {pathTerrain && <path d={pathTerrain} fill="rgba(29,158,117,0.45)" stroke="#1d9e75" strokeWidth="1.5"/>}
          {/* FSL 점선 */}
          {fslInRange && <line x1={PAD.left} y1={wY} x2={PAD.left+CW} y2={wY} stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3"/>}

          {/* ── 횡단면: 역삼각형 댐 ── */}
          {mode==='cross' && damTriPath &&
            <path d={damTriPath} fill="rgba(240,165,0,0.88)" stroke="#f0a500" strokeWidth="2"/>}

          {/* ── 종단면: 슬림 사다리꼴 측면도 ── */}
          {mode==='long' && damSideBody &&
            <path d={damSideBody} fill="rgba(240,165,0,0.90)" stroke="#f0a500" strokeWidth="2"/>}

          {/* 종단면: 전체 연장 표시 (노란 굵은 선, 저면) */}
          {mode==='long' && (() => {
            const x0 = sx(dMin), x1 = sx(0)
            const lineY = PAD.top + CH + 6  // 차트 바로 아래
            return null  // 아래 별도 레이어로
          })()}
        </g>

        {/* 종단면: 전체 연장 표시 막대 (차트 하단 바깥) */}
        {mode==='long' && (() => {
          const x0 = PAD.left
          const x1 = sx(0)
          const barY = PAD.top + CH + 22
          const totalKm = Math.round(Math.abs(dMin)/1000)
          return <>
            {/* 노란 연장 선 */}
            <line x1={x0} y1={barY} x2={x1} y2={barY} stroke="#f0e040" strokeWidth="3"/>
            <line x1={x0} y1={barY-5} x2={x0} y2={barY+5} stroke="#f0e040" strokeWidth="2"/>
            <line x1={x1} y1={barY-5} x2={x1} y2={barY+5} stroke="#f0e040" strokeWidth="2"/>
            {/* 화살 */}
            <polygon points={`${x0},${barY} ${x0+8},${barY-4} ${x0+8},${barY+4}`} fill="#f0e040"/>
            <polygon points={`${x1},${barY} ${x1-8},${barY-4} ${x1-8},${barY+4}`} fill="#f0e040"/>
            {/* 연장 텍스트 */}
            <text x={(x0+x1)/2} y={barY-6} textAnchor="middle"
              fontSize="13" fontWeight="700" fill="#f0e040" fontFamily="Space Mono">
              {totalKm} km
            </text>
          </>
        })()}

        {/* 종단면: 댐 라벨 */}
        {mode==='long' && (() => {
          const damX = sx(0)
          return <text x={damX-5} y={PAD.top+12} textAnchor="end"
            fontSize="12" fontWeight="700" fill="#f0a500" fontFamily="Space Mono">댐▶</text>
        })()}

        {/* 횡단면: 방향 레이블 */}
        {mode==='cross' && <>
          <text x={PAD.left+8} y={PAD.top+14} fontSize="11" fill="#7a9bb5" fontFamily="Space Mono">← 상류</text>
          <text x={PAD.left+CW-8} y={PAD.top+14} textAnchor="end" fontSize="11" fill="#7a9bb5" fontFamily="Space Mono">하류 →</text>
        </>}

        {/* 댐 길이 배지 (횡단면) */}
        {mode==='cross' && damLength && Number.isFinite(damLength) && <>
          <rect x={PAD.left+CW-114} y={PAD.top+4} width={112} height={26}
            fill="rgba(0,196,180,0.18)" rx="4" stroke="var(--acc-teal)" strokeWidth="1"/>
          <text x={PAD.left+CW-58} y={PAD.top+13} textAnchor="middle" fontSize="9"
            fill="var(--acc-teal)" fontFamily="Space Mono">댐 길이</text>
          <text x={PAD.left+CW-58} y={PAD.top+25} textAnchor="middle" fontSize="12"
            fill="#fff" fontFamily="Space Mono" fontWeight="700">
            {damLength>=1000?`${(damLength/1000).toFixed(2)} km`:`${damLength} m`}
          </text>
        </>}

        {/* Y축 라벨 */}
        <text x={PAD.left-44} y={PAD.top+CH/2} textAnchor="middle" fontSize="10" fill="#7a9bb5"
          fontFamily="Space Mono" transform={`rotate(-90,${PAD.left-44},${PAD.top+CH/2})`}>고도 (m EL)</text>
      </svg>

      {/* 범례 */}
      <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
        {[
          { color:'#1d9e75',              label:'지형',          box:false, dash:false },
          { color:'rgba(30,120,255,0.7)', label:'수몰 (상류)',   box:false, dash:false },
          { color:'#1a7fbd',              label:`FSL ${fsl}m`,   box:false, dash:true  },
          { color:'#f0a500',              label: mode==='cross'?'댐 (역삼각형)':'댐 측면', box:true, dash:false },
          ...(mode==='long'?[{ color:'#f0e040', label:'전체 연장', box:false, dash:false, thick:true }]:[]),
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#a0bcd0', fontFamily:'var(--font-mono)' }}>
            {item.box
              ? <div style={{ width:10, height:13, background:item.color, borderRadius:1 }}/>
              : <div style={{ width:20, height:item.dash?0:item.thick?4:3, background:item.color,
                  borderTop:item.dash?`2px dashed ${item.color}`:'none', marginTop:item.dash?2:0,
                  borderRadius:2 }}/>
            }
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
