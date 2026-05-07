import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import MapView from './components/MapView.jsx'
import Header from './components/Header.jsx'
import { getCandidatesByPhase, CURRENT_PHASE } from './data/candidates.js'

const isMobile = () => window.innerWidth <= 768

export default function App() {
  const [phase, setPhase] = useState(CURRENT_PHASE)
  const candidates = getCandidatesByPhase(phase)
  const [selected, setSelected] = useState(() => getCandidatesByPhase(CURRENT_PHASE)[0])
  const [heightM, setHeightM] = useState(60)
  const [mobile, setMobile] = useState(isMobile())
  const [mobTab, setMobTab] = useState('map')

  useEffect(() => {
    const handler = () => setMobile(isMobile())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handlePhaseChange = (newPhase) => {
    setPhase(newPhase)
    const next = getCandidatesByPhase(newPhase)
    const same = next.find(c => c.id === selected?.id)
    setSelected(same ?? next[0])
    setHeightM(60)
  }

  const handleSelect = (c) => {
    setSelected(c)
    setHeightM(60)
    if (mobile) setMobTab('detail')
  }

  // ── 데스크탑 ──
  if (!mobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', overflow:'hidden', background:'var(--bg-deep)' }}>
        <Header phase={phase} />
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <Sidebar candidates={candidates} selected={selected} onSelect={handleSelect} phase={phase} onPhaseChange={handlePhaseChange} />
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <MapView candidates={candidates} selected={selected} heightM={heightM} onSelect={handleSelect} />
          </div>
          <DetailPanel candidate={selected} heightM={heightM} onHeightChange={setHeightM} />
        </div>
      </div>
    )
  }

  // ── 모바일 ──
  // 전체를 position:fixed로 잡아서 100vh 정확히 사용
  const HDR_H = 44
  const TAB_H = 52
  const CONTENT_H = `calc(100dvh - ${HDR_H}px - ${TAB_H}px)`

  return (
    <div style={{ position:'fixed', inset:0, height:'100dvh', display:'flex', flexDirection:'column', background:'var(--bg-deep)', overflow:'hidden' }}>

      {/* 헤더 */}
      <Header phase={phase} mobile />

      {/* 지도 영역 — 고정 높이 */}
      <div style={{ height:CONTENT_H, position:'relative', overflow:'hidden', flexShrink:0 }}>
        <MapView
          candidates={candidates} selected={selected}
          heightM={heightM} onSelect={handleSelect}
        />
      </div>

      {/* 하단 탭 바 */}
      <div style={{
        height: TAB_H, flexShrink:0,
        display:'flex',
        background:'var(--bg-panel)',
        borderTop:'1px solid var(--border)',
        zIndex:50,
      }}>
        {[
          { key:'map',    icon:'🌏', label:'지도' },
          { key:'list',   icon:'📋', label:'목록' },
          { key:'detail', icon:'📊', label:'상세' },
        ].map(t => {
          const active = mobTab === t.key
          return (
            <button key={t.key}
              onClick={() => setMobTab(active && t.key !== 'map' ? 'map' : t.key)}
              style={{
                flex:1, display:'flex', flexDirection:'column',
                alignItems:'center', justifyContent:'center', gap:2,
                border:'none',
                background: active ? 'rgba(0,196,180,0.08)' : 'transparent',
                cursor:'pointer',
                color: active ? 'var(--acc-teal)' : 'var(--text-sec)',
                fontSize:9, fontFamily:'var(--font-mono)',
                borderTop: active ? '2px solid var(--acc-teal)' : '2px solid transparent',
                transition:'all 0.15s',
              }}>
              <span style={{ fontSize:22, lineHeight:1 }}>{t.icon}</span>
              <span style={{ marginTop:1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* 목록 오버레이 — 탭바 위에 absolute */}
      {mobTab === 'list' && (
        <div style={{
          position:'fixed',
          bottom: TAB_H,
          left:0, right:0,
          height:'60vh',
          background:'var(--bg-panel)',
          borderTop:'2px solid var(--acc-teal)',
          borderRadius:'14px 14px 0 0',
          overflow:'hidden',
          zIndex:40,
          boxShadow:'0 -4px 24px rgba(0,0,0,0.5)',
        }}>
          <Sidebar
            candidates={candidates} selected={selected}
            onSelect={handleSelect} phase={phase}
            onPhaseChange={handlePhaseChange} mobile
          />
        </div>
      )}

      {/* 상세 오버레이 — 탭바 위에 absolute */}
      {mobTab === 'detail' && (
        <div style={{
          position:'fixed',
          bottom: TAB_H,
          left:0, right:0,
          height:'68vh',
          background:'var(--bg-panel)',
          borderTop:'2px solid var(--acc-teal)',
          borderRadius:'14px 14px 0 0',
          overflow:'hidden',
          zIndex:40,
          boxShadow:'0 -4px 24px rgba(0,0,0,0.5)',
        }}>
          <DetailPanel candidate={selected} heightM={heightM} onHeightChange={setHeightM} mobile />
        </div>
      )}

    </div>
  )
}
