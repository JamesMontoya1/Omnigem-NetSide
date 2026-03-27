import React, { useState } from 'react'
import { PALETTE, btnNav } from '../../styles/theme'
import SelectionPanel from '../selection/SelectionPanel'

type AppItem = { id: string; title: string; icon: string; route: string }

export default function Workspace() {
  const apps: AppItem[] = [
  { id: 'general', title: 'Painel Geral', icon: '📊', route: '/workspace' },
    { id: 'trips', title: 'Viagens', icon: '🧭', route: '/trips' },
    { id: 'vacations', title: 'Férias', icon: '🏖️', route: '/vacations' },
  ]

  const [openTabs, setOpenTabs] = useState<AppItem[]>([])
  const [active, setActive] = useState<string | null>(null)

  function openApp(app: AppItem) {
    setOpenTabs(prev => (prev.some(t => t.id === app.id) ? prev : [...prev, app]))
    setActive(app.id)
  }

  function closeTab(id: string) {
    setOpenTabs(prev => prev.filter(t => t.id !== id))
    if (active === id) {
      const idx = openTabs.findIndex(t => t.id === id)
      const next = openTabs[idx + 1] || openTabs[idx - 1]
      setActive(next ? next.id : null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: PALETTE.background, color: PALETTE.textPrimary, fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{ width: 260, padding: 16, borderRight: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg }}>
        <h2 style={{ margin: '0 0 12px 0' }}>Área de Trabalho</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {apps.map(app => (
            <button key={app.id} onClick={() => openApp(app)} style={{ ...btnNav, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12 }}>
              <div style={{ fontSize: 22 }}>{app.icon}</div>
              <div style={{ fontSize: 12 }}>{app.title}</div>
            </button>
          ))}
        </div>
      </aside>

      <main style={{ flex: 1, padding: 16 }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {openTabs.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma aba aberta. Clique em um ícone à esquerda.</div>}
          {openTabs.map(tab => (
            <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, padding: '6px 8px', background: active === tab.id ? PALETTE.backgroundSecondary : 'transparent', border: `1px solid ${PALETTE.border}` }}>
              <button onClick={() => setActive(tab.id)} style={{ background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }}>{tab.title}</button>
              <button onClick={() => closeTab(tab.id)} style={{ ...btnNav, padding: '4px 6px' }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 12, background: PALETTE.cardBg, height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
          {active ? (
            (() => {
              const activeTab = openTabs.find(t => t.id === active)
              if (!activeTab) return <div style={{ padding: 28, color: PALETTE.textSecondary }}>Selecione um app para abrir.</div>
              if (activeTab.id === 'general') return <SelectionPanel embedded />
              return <iframe key={active} src={activeTab.route} style={{ width: '100%', height: '100%', border: 0 }} />
            })()
          ) : (
            <div style={{ padding: 28, color: PALETTE.textSecondary }}>Selecione um app para abrir.</div>
          )}
        </div>
      </main>
    </div>
  )
}
