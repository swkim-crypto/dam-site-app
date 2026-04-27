import React from 'react'
import { PRIORITY_CONFIG } from '../data/candidates.js'

const REGION_ORDER  = ['Middle Basin','Upper Basin','Lower Valley','Xieng Khouang Highland']
const REGION_LABELS = { 'Middle Basin':'중부 유역','Upper Basin':'상류 유역','Lower Valley':'하류 계곡','Xieng Khouang Highland':'시엥쿠앙 고원' }

export default function Sidebar({ candidates, selected, onSelect }) {
  const grouped = REGION_ORDER.reduce((acc, r) => { acc[r] = candidates.filter(c => c.region === r); return acc }, {})

  return (
    <div style={{ width:220, background:'var(--bg-panel)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
      <div style={{ padding:'14px 16px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontSize:10, fontFamily:'var(--font-mono)', color:'var(--text-dim)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:2 }}>후보지 목록</div>
        <div style={{ fontSize:11, color:'var(--text-sec)' }}>총 {candidates.length}개 · 클릭하여 선택</div>
      </div>
      <div style={{ overflow:'auto', flex:1 }}>
        {REGION_ORDER.map(region => {
          const items = grouped[region]
          if (!items?.length) return null
          return (
            <div key={region}>
              <div style={{ padding:'10px 16px 6px', fontSize:10, color:'var(--text-dim)', fontFamily:'var(--font-mono)', letterSpacing:'0.1em', textTransform:'uppercase', borderTop:'1px solid var(--border)' }}>
                {REGION_LABELS[region]}
              </div>
              {items.map(c => {
                const cfg = PRIORITY_CONFIG[c.priority]
                const isSel = selected?.id === c.id
                return (
                  <div key={c.id} onClick={() => onSelect(c)} style={{ padding:'10px 16px', cursor:'pointer', background: isSel ? 'var(--bg-hover)' : 'transparent', borderLeft: isSel ? `3px solid ${cfg.color}` : '3px solid transparent', transition:'all 0.15s', display:'flex', flexDirection:'column', gap:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'var(--font-mono)', fontSize:13, fontWeight:700, color: isSel ? cfg.color : 'var(--text-pri)' }}>{c.id}</span>
                      <span style={{ fontSize:10, padding:'1px 7px', background:`${cfg.color}22`, color:cfg.color, border:`1px solid ${cfg.color}44`, borderRadius:10, fontFamily:'var(--font-mono)' }}>{c.priority}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-sec)', fontFamily:'var(--font-mono)' }}>
                      Bed {c.bed}m · V {c.baseV.toLocaleString()} Mm³
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
