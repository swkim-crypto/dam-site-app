import React, { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import MapView from './components/MapView.jsx'
import Header from './components/Header.jsx'
import { getCandidatesByPhase, CURRENT_PHASE } from './data/candidates.js'

export default function App() {
  const [phase, setPhase] = useState(CURRENT_PHASE)
  const candidates = getCandidatesByPhase(phase)
  const [selected, setSelected] = useState(() => getCandidatesByPhase(CURRENT_PHASE)[0])
  const [heightM, setHeightM] = useState(60)
  const [mobTab, setMobTab] = useState('map')

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
    setMobTab('detail')
  }

  const tabs = [
    { key:'map',    icon:'🌏', label:'지도' },
    { key:'list',   icon:'📋', label:'목록' },
    { key:'detail', icon:'📊', label:'상세' },
  ]

  return (
    <>
      {/* ── 데스크탑 ── */}
      <div className="desktop-layout">
        <Header phase={phase} />
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
          <Sidebar candidates={candidates} selected={selected} onSelect={handleSelect} phase={phase} onPhaseChange={handlePhaseChange} />
          <div style={{ flex:1, position:'relative', overflow:'hidden' }}>
            <MapView candidates={candidates} selected={selected} heightM={heightM} onSelect={handleSelect} />
          </div>
          <DetailPanel candidate={selected} heightM={heightM} onHeightChange={setHeightM} />
        </div>
      </div>

      {/* ── 모바일 ── */}
      <div className="mobile-layout">
        <Header phase={phase} mobile />

        <div className="mobile-map">
          <MapView candidates={candidates} selected={selected} heightM={heightM} onSelect={handleSelect} />
        </div>

        {/* 서랍 하나만 — 탭에 따라 내용 전환 */}
        <div className={`mobile-drawer ${mobTab !== 'map' ? 'drawer-open' : ''}`}>
          {mobTab === 'list' && (
            <Sidebar candidates={candidates} selected={selected} onSelect={handleSelect} phase={phase} onPhaseChange={handlePhaseChange} mobile />
          )}
          {mobTab === 'detail' && (
            <DetailPanel candidate={selected} heightM={heightM} onHeightChange={setHeightM} mobile />
          )}
        </div>

        {/* 탭 바 */}
        <div className="mobile-tabbar">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`mobile-tab ${mobTab === t.key ? 'tab-active' : ''}`}
              onClick={() => setMobTab(mobTab === t.key && t.key !== 'map' ? 'map' : t.key)}
            >
              <span className="tab-icon">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
