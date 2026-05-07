import React, { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import MapView from './components/MapView.jsx'
import Header from './components/Header.jsx'
import { getCandidatesByPhase, CURRENT_PHASE } from './data/candidates.js'

// 모바일 여부 감지
const isMobile = () => window.innerWidth <= 768

export default function App() {
  const [phase, setPhase] = useState(CURRENT_PHASE)
  const candidates = getCandidatesByPhase(phase)

  const [selected, setSelected] = useState(() => getCandidatesByPhase(CURRENT_PHASE)[0])
  const [heightM, setHeightM] = useState(60)
  const [mobile, setMobile] = useState(isMobile())
  const [mobTab, setMobTab] = useState('list') // 'map' | 'list' | 'detail'

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
    if (mobile) setMobTab('detail') // 모바일: 선택 시 상세로 이동
  }

  // ── 데스크탑 레이아웃 ──
  if (!mobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg-deep)' }}>
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

  // ── 모바일 레이아웃 ──
  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background:'var(--bg-deep)' }}>
      {/* 헤더 (간소화) */}
      <Header phase={phase} mobile />

      {/* 컨텐츠 영역 */}
      <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
        {/* 지도는 항상 렌더링 (탭과 무관) */}
        <div style={{ position:'absolute', inset:0 }}>
          <MapView candidates={candidates} selected={selected} heightM={heightM} onSelect={handleSelect} />
        </div>

        {/* 목록 패널 - 하단 서랍 */}
        {mobTab === 'list' && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            height:'58vh', background:'var(--bg-panel)',
            borderTop:'2px solid var(--acc-teal)',
            borderRadius:'14px 14px 0 0',
            display:'flex', flexDirection:'column',
            overflow:'hidden', zIndex:10,
          }}>
            <Sidebar
              candidates={candidates} selected={selected}
              onSelect={handleSelect} phase={phase}
              onPhaseChange={handlePhaseChange} mobile
            />
          </div>
        )}

        {/* 상세 패널 - 하단 서랍 */}
        {mobTab === 'detail' && selected && (
          <div style={{
            position:'absolute', bottom:0, left:0, right:0,
            height:'65vh', background:'var(--bg-panel)',
            borderTop:'2px solid var(--acc-teal)',
            borderRadius:'14px 14px 0 0',
            overflow:'hidden', zIndex:10,
          }}>
            <DetailPanel candidate={selected} heightM={heightM} onHeightChange={setHeightM} mobile />
          </div>
        )}
      </div>

      {/* 하단 탭 바 */}
      <div style={{
        display:'flex', height:52, flexShrink:0,
        background:'var(--bg-panel)', borderTop:'1px solid var(--border)',
        zIndex:20,
      }}>
        {[
          { key:'map',    icon:'🌏', label:'지도' },
          { key:'list',   icon:'📋', label:'목록' },
          { key:'detail', icon:'📊', label:'상세' },
        ].map(t => (
          <button key={t.key} onClick={() => setMobTab(t.key)} style={{
            flex:1, display:'flex', flexDirection:'column',
            alignItems:'center', justifyContent:'center', gap:2,
            border:'none', background:'transparent', cursor:'pointer',
            color: mobTab === t.key ? 'var(--acc-teal)' : 'var(--text-sec)',
            fontSize:9, fontFamily:'var(--font-mono)',
            transition:'color 0.15s',
          }}>
            <span style={{ fontSize:20, lineHeight:1 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
