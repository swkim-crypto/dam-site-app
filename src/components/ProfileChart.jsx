import React, { useState, useMemo } from 'react'
import { profiles } from '../data/profiles.js'
import { calcFsl } from '../data/candidates.js'

const W = 600, H = 260, PAD = { top: 20, right: 20, bottom: 40, left: 58 }
const CW = W - PAD.left - PAD.right
const CH = H - PAD.top - PAD.bottom

function scaleX(d, dMin, dMax) { return PAD.left + ((d - dMin) / (dMax - dMin)) * CW }
function scaleY(e, eMin, eMax) { return PAD.top + CH - ((e - eMin) / (eMax - eMin)) * CH }

export default function ProfileChart({ candidate, heightM }) {
  const [mode, setMode] = useState('cross')

  const fsl = calcFsl(candidate, heightM)

  const data = useMemo(() => {
    const p = profiles[candidate.id]
    return p ? p[mode] : []
  }, [candidate.id, mode])

  const { dMin, dMax, eMin, eMax, path, waterPath, waterLevel } = useMemo(() => {
    if (!data.length) return {}
    const dMin = data[0].d
    const dMax = data[data.length - 1].d
    const elevs = data.map(p => p.elev)
    const rawMin = Math.min(...elevs)
    const rawMax = Math.max(...elevs)
    const margin = (rawMax - rawMin) * 0.15
    const eMin = rawMin - margin
    const eMax = rawMax + margin

    // 지형 path
    const pts = data.map(p => `${scaleX(p.d, dMin, dMax)},${scaleY(p.elev, eMin, eMax)}`)
    const first = `${scaleX(dMin, dMin, dMax)},${scaleY(eMin, eMin, eMax)}`
    const last  = `${scaleX(dMax, dMin, dMax)},${scaleY(eMin, eMin, eMax)}`
    const path  = `M${first} L${pts.join(' L')} L${last} Z`

    // 수면 path (FSL 이하 지형 클리핑)
    const waterY = scaleY(fsl, eMin, eMax)
    const waterPts = []
    let inWater = false
    data.forEach((p, i) => {
      const x = scaleX(p.d, dMin, dMax)
      const y = scaleY(p.elev, eMin, eMax)
      if (p.elev <= fsl) {
        if (!inWater) {
          waterPts.push(`M${x},${waterY}`)
          inWater = true
        }
        waterPts.push(`L${x},${y}`)
      } else {
        if (inWater) {
          waterPts.push(`L${waterPts[waterPts.length-1].split(',')[0].replace('L','').replace('M','')},${waterY}`)
          inWater = false
        }
      }
    })
    if (inWater) {
      const lastX = scaleX(data[data.length-1].d, dMin, dMax)
      waterPts.push(`L${lastX},${waterY}`)
    }
    const waterPath = waterPts.join(' ')
    const waterLevel = waterY

    return { dMin, dMax, eMin, eMax, path, waterPath, waterLevel }
  }, [data, fsl])

  // Y축 눈금
  const yTicks = useMemo(() => {
    if (eMin === undefined) return []
    const range = eMax - eMin
    const step = range > 500 ? 100 : range > 200 ? 50 : range > 100 ? 25 : 10
    const start = Math.ceil(eMin / step) * step
    const ticks = []
    for (let v = start; v <= eMax; v += step) ticks.push(v)
    return ticks
  }, [eMin, eMax])

  // X축 눈금
  const xTicks = [-2000, -1000, 0, 1000, 2000]

  if (!data.length) return <div style={{ color: 'var(--text-dim)', fontSize: 12, padding: 16 }}>단면 데이터 없음</div>

  const fslInRange = fsl >= eMin && fsl <= eMax
  const fslY = fslInRange ? scaleY(fsl, eMin, eMax) : null

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
      {/* 탭 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', marginRight: 4 }}>단면도</span>
        {[{ key: 'cross', label: '횡단면 (E-W)' }, { key: 'long', label: '종단면 (N-S)' }].map(t => (
          <button key={t.key} onClick={() => setMode(t.key)} style={{
            padding: '4px 12px', fontSize: 11, fontFamily: 'var(--font-mono)',
            background: mode === t.key ? 'var(--acc-teal)' : 'transparent',
            color: mode === t.key ? 'var(--bg-deep)' : 'var(--text-sec)',
            border: `1px solid ${mode === t.key ? 'var(--acc-teal)' : 'var(--border)'}`,
            borderRadius: 4, cursor: 'pointer', fontWeight: mode === t.key ? 700 : 400,
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--acc-teal)' }}>
          FSL {fsl}m EL
        </span>
      </div>

      {/* SVG 차트 */}
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}>
        {/* 배경 */}
        <rect x={PAD.left} y={PAD.top} width={CW} height={CH} fill="rgba(0,0,0,0.2)" rx="3" />

        {/* Y 그리드 + 눈금 */}
        {yTicks.map(v => {
          const y = scaleY(v, eMin, eMax)
          return (
            <g key={v}>
              <line x1={PAD.left} y1={y} x2={PAD.left + CW} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#3d5a72" fontFamily="Space Mono">{v}</text>
            </g>
          )
        })}

        {/* X 눈금 */}
        {xTicks.map(d => {
          if (d < dMin || d > dMax) return null
          const x = scaleX(d, dMin, dMax)
          return (
            <g key={d}>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + CH} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <text x={x} y={PAD.top + CH + 14} textAnchor="middle" fontSize="9" fill="#3d5a72" fontFamily="Space Mono">
                {d === 0 ? '0' : `${d > 0 ? '+' : ''}${(d/1000).toFixed(1)}km`}
              </text>
            </g>
          )
        })}

        {/* 수몰 영역 */}
        {waterPath && (
          <path d={waterPath} fill="rgba(0,140,255,0.25)" stroke="none" />
        )}

        {/* 지형 */}
        <path d={path} fill="rgba(29,158,117,0.35)" stroke="#1d9e75" strokeWidth="1.5" />

        {/* FSL 수위선 */}
        {fslY && (
          <g>
            <line x1={PAD.left} y1={fslY} x2={PAD.left + CW} y2={fslY}
              stroke="#1a7fbd" strokeWidth="1.5" strokeDasharray="6,3" />
            <rect x={PAD.left + CW - 52} y={fslY - 14} width={50} height={14} fill="rgba(26,127,189,0.85)" rx="2" />
            <text x={PAD.left + CW - 27} y={fslY - 4} textAnchor="middle" fontSize="9" fill="#fff" fontFamily="Space Mono" fontWeight="700">
              FSL {fsl}m
            </text>
          </g>
        )}

        {/* 댐 축 (중앙) */}
        <line x1={scaleX(0, dMin, dMax)} y1={PAD.top} x2={scaleX(0, dMin, dMax)} y2={PAD.top + CH}
          stroke="var(--acc-amber)" strokeWidth="1.5" strokeDasharray="4,3" />
        <text x={scaleX(0, dMin, dMax) + 4} y={PAD.top + 12} fontSize="9" fill="var(--acc-amber)" fontFamily="Space Mono">댐 축</text>

        {/* 축 라벨 */}
        <text x={PAD.left - 42} y={PAD.top + CH / 2} textAnchor="middle" fontSize="9" fill="#7a9bb5"
          fontFamily="Space Mono" transform={`rotate(-90, ${PAD.left - 42}, ${PAD.top + CH / 2})`}>고도 (m EL)</text>
        <text x={PAD.left + CW / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#7a9bb5" fontFamily="Space Mono">
          거리 (m) — {mode === 'cross' ? '동 ← → 서' : '북 ← → 남'}
        </text>
      </svg>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: '#1d9e75', label: '지형', dash: false },
          { color: '#1a7fbd', label: `FSL ${fsl}m`, dash: true },
          { color: 'rgba(0,140,255,0.5)', label: '수몰 구간', dash: false },
          { color: 'var(--acc-amber)', label: '댐 축', dash: true },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-sec)', fontFamily: 'var(--font-mono)' }}>
            <div style={{ width: 20, height: 2, background: item.color, borderTop: item.dash ? `2px dashed ${item.color}` : 'none', opacity: 1 }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  )
}
