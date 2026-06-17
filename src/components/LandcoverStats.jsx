import React from 'react'
import { landcoverStats } from '../data/landcoverStats.js'

/* ────────────────────────────────────────────────────────────
   토지피복 · 수몰구역 stats
   - props: { selected, heightM }
   - dam-site-app 다크 테마(Space Mono)에 맞춤. 우측 패널 하단에 배치.
   - 데이터는 06_landcover_overlay.py 산출 landcoverStats.js (이미 상류 클립 기준).
   ──────────────────────────────────────────────────────────── */
const HEIGHT_STEPS = [40, 50, 60, 70, 80, 90, 100, 110, 120]
const nearestStep = h => HEIGHT_STEPS.reduce((a, b) => Math.abs(b - h) < Math.abs(a - h) ? b : a)

const LC = {
  cropland: { key: 'cropland', label: '경작지', color: '#f0a83c' },
  urban:    { key: 'urban',    label: '시가지', color: '#e0484c' },
}
const fmt = n => (n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function LandcoverStats({ candidate, heightM, mobile }) {
  if (!candidate) return null
  const step = nearestStep(heightM)
  const s = landcoverStats?.[candidate.id]?.[String(step)]

  return (
    <div style={{
      background: 'rgba(13,33,55,0.55)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10, padding: '10px 12px', marginTop: 10,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8,
      }}>
        <span style={{
          fontSize: 10, color: '#5a7a90', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em',
        }}>수몰구역 토지피복</span>
        <span style={{ fontSize: 11, color: '#a0bcd0', fontFamily: 'var(--font-mono)' }}>
          H = {step}m
        </span>
      </div>

      {!s ? (
        <div style={{ fontSize: 11, color: '#5a7a90', fontFamily: 'var(--font-mono)' }}>
          이 높이의 수몰 데이터 없음
        </div>
      ) : (
        <>
          {[LC.cropland, LC.urban].map(c => {
            const km2 = s[`${c.key}Km2`]
            const pct = s[`${c.key}Pct`]
            return (
              <div key={c.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7,
              }}>
                <div style={{
                  width: 9, height: 9, borderRadius: 2, background: c.color,
                  boxShadow: `0 0 5px ${c.color}88`, flexShrink: 0,
                }}/>
                <span style={{
                  fontSize: 11, color: '#c0d4e0', fontFamily: 'var(--font-mono)', minWidth: 42,
                }}>{c.label}</span>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: c.color, fontFamily: 'var(--font-mono)',
                }}>{fmt(km2)}</span>
                <span style={{ fontSize: 11, color: '#8aa6bc', fontFamily: 'var(--font-mono)' }}>
                  km²
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, color: '#8aa6bc', fontFamily: 'var(--font-mono)',
                }}>{fmt(pct)}%</span>
              </div>
            )
          })}

          {/* 수몰면적 대비 비율 막대 (경작지/시가지/기타) */}
          <div style={{
            display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden',
            background: 'rgba(30,120,255,0.22)', margin: '4px 0 8px',
          }}>
            <div style={{ width: `${Math.min(s.croplandPct, 100)}%`, background: LC.cropland.color }}/>
            <div style={{ width: `${Math.min(s.urbanPct, 100)}%`, background: LC.urban.color }}/>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 10, color: '#5a7a90', fontFamily: 'var(--font-mono)',
            borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 6,
          }}>
            <span>수몰면적</span>
            <span style={{ color: '#1e78ff' }}>{fmt(s.floodKm2)} km²</span>
          </div>

          {s.clipped === false && (
            <div style={{
              marginTop: 6, fontSize: 10, color: '#E0A14C', fontFamily: 'var(--font-mono)',
            }}>⚠ 상류 클립 미적용(원본 폴리곤) — 평탄지 검토 필요</div>
          )}
        </>
      )}
    </div>
  )
}
