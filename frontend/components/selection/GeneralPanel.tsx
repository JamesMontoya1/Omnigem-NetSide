import { useEffect, useRef, useState } from 'react'
import { PALETTE, btnNav } from '../../styles/theme'
import { makeModalDraggable } from '../shared/draggableModal'

type NotifItem = { id: string; label: string; detail: string; route: string; severity: 'warning' | 'info' }
type ChartBar = { label: string; value: number; color: string }
type ChartItem = { key: string; label: string; value: number; color: string; route: string }

export default function GeneralPanel(props: {
  embedded?: boolean
  minimized: boolean
  setMinimized: (v: boolean) => void
  focusedModal: 'workers' | 'holidays' | 'panel' | null
  setFocusedModal: (m: 'workers' | 'holidays' | 'panel' | null) => void
  loading: boolean
  chartData: ChartItem[]
  moduleCharts: { vacations: ChartBar[]; trips: ChartBar[]; shifts: ChartBar[] }
  notifications: NotifItem[]
  onNavigate: (route: string) => void
}) {
  const { embedded, minimized, setMinimized, focusedModal, setFocusedModal, loading, chartData, moduleCharts, notifications, onNavigate } = props

  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const notifPopoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showNotifications) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null
      if (!target) return
      if (notifPopoverRef.current?.contains(target) || notifButtonRef.current?.contains(target)) return
      setShowNotifications(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showNotifications])

  useEffect(() => {
    if (embedded) return
    const el = panelRef.current
    if (!el) return
    const dispose = makeModalDraggable(el, {
      handleSelector: '[data-draggable-handle], h1',
      onFocus: () => setFocusedModal('panel'),
      onPositionChange: pos => setPanelPos(pos),
    })
    return () => dispose()
  }, [embedded, setFocusedModal])

  useEffect(() => {
    if (embedded) return
    if (!panelRef.current) return
    if (panelPos) return
    const rect = panelRef.current.getBoundingClientRect()
    setPanelPos({
      top: Math.max(8, (window.innerHeight - rect.height) / 2),
      left: Math.max(8, (window.innerWidth - rect.width) / 2),
    })
  }, [embedded, panelPos])

  const maxValue = Math.max(1, ...chartData.map(i => i.value))
  const totalNotifications = notifications.length

  const isPanelFocused = focusedModal === 'panel'
  const basePanelStyle: any = {
    width: embedded ? '100%' : 'min(760px, 86vw)',
    height: embedded ? '100%' : undefined,
    minHeight: embedded ? '100%' : undefined,
    boxSizing: 'border-box',
    background: PALETTE.cardBg,
    border: `1px solid ${isPanelFocused ? PALETTE.primary : PALETTE.border}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: isPanelFocused ? '0 18px 60px rgba(0,0,0,0.55)' : '0 10px 35px rgba(0,0,0,0.25)',
    zIndex: isPanelFocused ? 1510 : 1200,
  }
  if (!embedded) {
    basePanelStyle.position = 'fixed'
    basePanelStyle.top = panelPos ? panelPos.top : '50%'
    basePanelStyle.left = panelPos ? panelPos.left : '50%'
    basePanelStyle.transform = panelPos ? 'none' : 'translate(-50%, -50%)'
  } else {
    basePanelStyle.position = 'relative'
  }

  return (
    <div ref={panelRef} className="draggable-modal" onPointerDown={() => setFocusedModal('panel')} style={basePanelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 data-draggable-handle style={{ margin: 0, fontSize: 22, flex: 1, cursor: embedded ? 'default' : 'grab', userSelect: 'none' }}>Painel Geral</h1>
        <button
          ref={notifButtonRef}
          type="button"
          onClick={(e) => {
            if (showNotifications) { setShowNotifications(false); return }
            const rect = notifButtonRef.current?.getBoundingClientRect()
            if (rect) {
              const popWidth = 420
              const left = Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8))
              setNotifPos({ top: rect.bottom + 8, left })
            }
            setShowNotifications(true)
          }}
          style={{
            ...btnNav,
            background: totalNotifications > 0 ? PALETTE.success : PALETTE.hoverBg,
            border: `1px solid ${PALETTE.border}`,
            position: 'relative',
          }}
          title="Notificações"
        >
          🔔
          {totalNotifications > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>
              {totalNotifications}
            </span>
          )}
        </button>
        {!embedded && (
          <button type="button" onClick={() => { setMinimized(true); setShowNotifications(false) }} style={{ ...btnNav, marginRight: 6 }} title="Minimizar painel">X</button>
        )}
      </div>

      <p style={{ marginTop: 0, marginBottom: 18, color: PALETTE.textSecondary }}>{loading ? 'Carregando métricas...' : 'Resumo com informações das outras telas e ações necessárias.'}</p>

      <div style={{ display: 'grid', gap: 12 }}>
        {chartData.map(item => (
          <button key={item.key} type="button" onClick={() => onNavigate(item.route)} style={{ textAlign: 'left', background: PALETTE.backgroundSecondary, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 12, color: PALETTE.textPrimary, cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: PALETTE.textSecondary }}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: PALETTE.hoverBg, overflow: 'hidden' }}>
              <div style={{ width: `${(item.value / maxValue) * 100}%`, height: '100%', background: item.color, transition: 'width 260ms ease' }} />
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: 16 }}>Gráficos por módulo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: 12 }}>
          {[
            { title: 'Férias', route: '/vacations', bars: moduleCharts.vacations },
            { title: 'Viagens', route: '/trips', bars: moduleCharts.trips },
            { title: 'Plantões', route: '/shifts/calendar', bars: moduleCharts.shifts },
          ].map(module => {
            const localMax = Math.max(1, ...module.bars.map(b => b.value))
            return (
              <button key={module.title} type="button" onClick={() => onNavigate(module.route)} style={{ textAlign: 'left', background: PALETTE.backgroundSecondary, border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 12, color: PALETTE.textPrimary, cursor: 'pointer' }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{module.title}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {module.bars.map(bar => (
                    <div key={`${module.title}-${bar.label}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>{bar.label}</span>
                        <strong style={{ fontSize: 12 }}>{bar.value}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: PALETTE.hoverBg, overflow: 'hidden' }}>
                        <div style={{ width: `${(bar.value / localMax) * 100}%`, height: '100%', background: bar.color, transition: 'width 240ms ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {showNotifications && notifPos && (
        <div id="selection-notifications-popover" ref={notifPopoverRef} style={{ position: 'fixed', top: notifPos.top, left: notifPos.left, width: 420, zIndex: 2000 }}>
          <div style={{ background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 10, boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)', maxHeight: '48vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ações Necessárias</h3>
              <button type="button" onClick={() => setShowNotifications(false)} style={btnNav}>✕</button>
            </div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {notifications.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma ação pendente no momento.</div>}
              {notifications.map(item => (
                <button key={item.id} type="button" onClick={() => { setShowNotifications(false); onNavigate(item.route) }} onMouseEnter={() => setHoveredNotif(item.id)} onMouseLeave={() => setHoveredNotif(null)} style={{ textAlign: 'left', background: hoveredNotif === item.id ? `${PALETTE.primary}11` : PALETTE.cardBg, border: `1px solid ${item.severity === 'warning' ? `${PALETTE.warning}66` : PALETTE.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', color: PALETTE.textPrimary }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>{item.detail}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
