import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, authHeaders } from '../../config/api'
import { PALETTE, btnNav } from '../../styles/theme'

type Vacation = { id: number; request?: number | null }
type Trip = { id: number; date: string; completed?: boolean }
type Vehicle = { id: number; model?: string; plate?: string; nextOilChange?: string | null; lastMaintenance?: string | null; lastAlignment?: string | null }
type Rotation = { id: number; weekdays: number[]; startDate: string; endDate?: string | null; notifyUpcoming?: boolean }
type NotifItem = { id: string; label: string; detail: string; route: string; severity: 'warning' | 'info' }
type ChartBar = { label: string; value: number; color: string }

function toDateInput(iso: string) {
  if (!iso) return ''
  if (iso.includes('T')) return iso.split('T')[0]
  return iso.slice(0, 10)
}

function parseLocalDate(s: string) {
  const p = s.split('-').map(Number)
  return new Date(p[0], p[1] - 1, p[2])
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isRotationActiveInDate(rotation: Rotation, date: Date) {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const start = parseLocalDate(toDateInput(rotation.startDate))
  if (dayStart < start) return false
  if (rotation.endDate) {
    const end = parseLocalDate(toDateInput(rotation.endDate))
    if (dayStart > end) return false
  }
  return rotation.weekdays.includes(dayStart.getDay())
}

export default function SelectionPanel({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const notifRef = useRef<HTMLButtonElement | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Draggable panel state
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)
  const draggingRef = useRef<{ startX: number; startY: number; startLeft: number; startTop: number; panelWidth: number; panelHeight: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [minimized, setMinimized] = useState<boolean>(() => !embedded)

  const [vacations, setVacations] = useState<Vacation[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [rotations, setRotations] = useState<Rotation[]>([])
  const [maintenanceInterval, setMaintenanceInterval] = useState(60)
  const [alignmentInterval, setAlignmentInterval] = useState(60)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const [vRes, tRes, vehRes, rotRes, mRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/vacations`, { headers: authHeaders() }),
          fetch(`${API_BASE}/trips`, { headers: authHeaders() }),
          fetch(`${API_BASE}/vehicles`, { headers: authHeaders() }),
          fetch(`${API_BASE}/rotations`, { headers: authHeaders() }),
          fetch(`${API_BASE}/settings/maintenanceInterval`, { headers: authHeaders() }),
          fetch(`${API_BASE}/settings/alignmentInterval`, { headers: authHeaders() }),
        ])

        if (vRes.ok) setVacations(await vRes.json())
        if (tRes.ok) setTrips(await tRes.json())
        if (vehRes.ok) setVehicles(await vehRes.json())
        if (rotRes.ok) setRotations(await rotRes.json())
        if (mRes.ok) {
          const j = await mRes.json()
          if (typeof j?.value === 'number' && j.value > 0) setMaintenanceInterval(j.value)
        }
        if (aRes.ok) {
          const j = await aRes.json()
          if (typeof j?.value === 'number' && j.value > 0) setAlignmentInterval(j.value)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Node)) return
      const pop = document.getElementById('selection-notifications-popover')
      if (notifRef.current && notifRef.current.contains(e.target)) return
      if (pop && pop.contains(e.target)) return
      setShowNotifications(false)
    }
    if (showNotifications) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showNotifications])

  // Initialize panel position centered on first mount (runs when panel mounts)
  useEffect(() => {
    if (embedded) return
    if (!panelRef.current) return
    if (panelPos) return
    const rect = panelRef.current.getBoundingClientRect()
    setPanelPos({
      top: Math.max(8, (window.innerHeight - rect.height) / 2),
      left: Math.max(8, (window.innerWidth - rect.width) / 2),
    })
  }, [embedded, minimized, panelPos])

  function startDrag(e: React.PointerEvent) {
    if (embedded) return
    if (e.button !== 0) return
    e.preventDefault()
    const rect = panelRef.current?.getBoundingClientRect()
    draggingRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startLeft: panelPos?.left ?? (rect ? rect.left : 0),
      startTop: panelPos?.top ?? (rect ? rect.top : 0),
      panelWidth: rect?.width ?? 0,
      panelHeight: rect?.height ?? 0,
    }
    setDragging(true)

    function onPointerMove(ev: PointerEvent) {
      if (!draggingRef.current) return
      const dx = ev.clientX - draggingRef.current.startX
      const dy = ev.clientY - draggingRef.current.startY
      let newLeft = Math.round(draggingRef.current.startLeft + dx)
      let newTop = Math.round(draggingRef.current.startTop + dy)
      const maxLeft = window.innerWidth - draggingRef.current.panelWidth - 8
      const maxTop = window.innerHeight - draggingRef.current.panelHeight - 8
      newLeft = Math.max(8, Math.min(newLeft, maxLeft))
      newTop = Math.max(8, Math.min(newTop, maxTop))
      setPanelPos({ left: newLeft, top: newTop })
    }

    function onPointerUp() {
      draggingRef.current = null
      setDragging(false)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  }

  const counts = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const todayIso = isoDate(today)
    const tomorrowIso = isoDate(tomorrow)

    const pendingVacationRequests = vacations.filter(v => v.request === 0).length
    const upcomingTrips = trips.filter(t => {
      const d = toDateInput(t.date)
      return (d === todayIso || d === tomorrowIso) && !t.completed
    }).length

    const msPerDay = 24 * 60 * 60 * 1000
    const oilDueSoon = vehicles
      .filter(v => v.nextOilChange)
      .map(v => Math.ceil((parseLocalDate(toDateInput(String(v.nextOilChange))).getTime() - today.getTime()) / msPerDay))
      .filter(diff => diff >= 0 && diff <= 30).length

    const maintenanceDueSoon = vehicles
      .filter(v => v.lastMaintenance)
      .map(v => {
        const d = parseLocalDate(toDateInput(String(v.lastMaintenance)))
        d.setDate(d.getDate() + maintenanceInterval)
        return Math.ceil((d.getTime() - today.getTime()) / msPerDay)
      })
      .filter(diff => diff >= 0 && diff <= 30).length

    const alignmentDueSoon = vehicles
      .filter(v => v.lastAlignment)
      .map(v => {
        const d = parseLocalDate(toDateInput(String(v.lastAlignment)))
        d.setDate(d.getDate() + alignmentInterval)
        return Math.ceil((d.getTime() - today.getTime()) / msPerDay)
      })
      .filter(diff => diff >= 0 && diff <= 30).length

    let shiftsAlerts = 0
    for (let i = 0; i <= 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      shiftsAlerts += rotations.filter(r => r.notifyUpcoming && isRotationActiveInDate(r, d)).length
    }

    return {
      pendingVacationRequests,
      upcomingTrips,
      oilDueSoon,
      maintenanceDueSoon,
      alignmentDueSoon,
      shiftsAlerts,
    }
  }, [vacations, trips, vehicles, rotations, maintenanceInterval, alignmentInterval])

  const notifications: NotifItem[] = useMemo(() => {
    const list: NotifItem[] = []
    if (counts.pendingVacationRequests > 0) {
      list.push({
        id: 'vac-requests',
        label: 'Solicitações de férias pendentes',
        detail: `${counts.pendingVacationRequests} aguardando aprovação`,
        route: '/vacations',
        severity: 'warning',
      })
    }
    if (counts.upcomingTrips > 0) {
      list.push({
        id: 'trip-upcoming',
        label: 'Viagens para hoje/amanhã',
        detail: `${counts.upcomingTrips} viagem(ns) pendente(s)`,
        route: '/trips',
        severity: 'info',
      })
    }
    if (counts.oilDueSoon > 0) {
      list.push({ id: 'oil-due', label: 'Trocas de óleo próximas', detail: `${counts.oilDueSoon} veículo(s) nos próximos 30 dias`, route: '/trips', severity: 'warning' })
    }
    if (counts.maintenanceDueSoon > 0) {
      list.push({ id: 'maintenance-due', label: 'Manutenções próximas', detail: `${counts.maintenanceDueSoon} veículo(s) nos próximos 30 dias`, route: '/trips', severity: 'warning' })
    }
    if (counts.alignmentDueSoon > 0) {
      list.push({ id: 'align-due', label: 'Alinhamentos próximos', detail: `${counts.alignmentDueSoon} veículo(s) nos próximos 30 dias`, route: '/trips', severity: 'warning' })
    }
    if (counts.shiftsAlerts > 0) {
      list.push({ id: 'shifts-alerts', label: 'Alertas de plantão na semana', detail: `${counts.shiftsAlerts} ocorrência(s) com notificação visual`, route: '/shifts/calendar', severity: 'info' })
    }
    return list
  }, [counts])

  const chartData = useMemo(() => ([
    { key: 'vac', label: 'Férias (aprovação)', value: counts.pendingVacationRequests, color: PALETTE.warning, route: '/vacations' },
    { key: 'trip', label: 'Viagens (hoje/amanhã)', value: counts.upcomingTrips, color: PALETTE.primary, route: '/trips' },
    { key: 'veh', label: 'Veículos (ações)', value: counts.oilDueSoon + counts.maintenanceDueSoon + counts.alignmentDueSoon, color: PALETTE.error, route: '/trips' },
    { key: 'shift', label: 'Plantões (alertas)', value: counts.shiftsAlerts, color: PALETTE.info, route: '/shifts/calendar' },
  ]), [counts])

  const maxValue = Math.max(1, ...chartData.map(i => i.value))
  const totalNotifications = notifications.length
  const moduleCharts = useMemo(() => {
    const vacationApproved = vacations.filter(v => v.request === 1).length
    const vacationRejected = vacations.filter(v => v.request === 2).length
    const vacationPending = counts.pendingVacationRequests

    const tripsCompleted = trips.filter(t => !!t.completed).length
    const tripsPending = trips.filter(t => !t.completed).length

    const activeRotations = rotations.filter(r => {
      if (!r.endDate) return true
      return parseLocalDate(toDateInput(r.endDate)) >= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())
    }).length
    const notifyEnabled = rotations.filter(r => !!r.notifyUpcoming).length
    const notifyDisabled = Math.max(0, rotations.length - notifyEnabled)

    return {
      vacations: [
        { label: 'Pendentes', value: vacationPending, color: PALETTE.warning },
        { label: 'Aprovadas', value: vacationApproved, color: PALETTE.success },
        { label: 'Recusadas', value: vacationRejected, color: PALETTE.error },
      ] as ChartBar[],
      trips: [
        { label: 'Pendentes', value: tripsPending, color: PALETTE.primary },
        { label: 'Concluídas', value: tripsCompleted, color: PALETTE.success },
      ] as ChartBar[],
      shifts: [
        { label: 'Rodízios ativos', value: activeRotations, color: PALETTE.info },
        { label: 'Notif. ligadas', value: notifyEnabled, color: PALETTE.warning },
        { label: 'Notif. desligadas', value: notifyDisabled, color: PALETTE.textSecondary },
      ] as ChartBar[],
    }
  }, [vacations, trips, rotations, counts.pendingVacationRequests])

  const basePanelStyle: any = {
    width: embedded ? '100%' : 'min(920px, 94vw)',
    background: PALETTE.cardBg,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 10px 35px rgba(0,0,0,0.25)',
    zIndex: 1000,
  }
  if (!embedded) {
    basePanelStyle.position = 'fixed'
    basePanelStyle.top = panelPos ? panelPos.top : '50%'
    basePanelStyle.left = panelPos ? panelPos.left : '50%'
    basePanelStyle.transform = panelPos ? 'none' : 'translate(-50%, -50%)'
  } else {
    basePanelStyle.position = 'relative'
  }

  const panelContent = (
    <div ref={panelRef} style={basePanelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1
          style={{ margin: 0, fontSize: 22, flex: 1, cursor: embedded ? 'default' : dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          onPointerDown={!embedded ? startDrag : undefined}
        >Painel Geral</h1>
        <button
          ref={notifRef}
          type="button"
          onClick={() => {
            if (showNotifications) { setShowNotifications(false); return }
            const rect = notifRef.current?.getBoundingClientRect()
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
          <button
            type="button"
            onClick={() => { setMinimized(true); setShowNotifications(false); setDragging(false) }}
            style={{ ...btnNav, marginRight: 6 }}
            title="Minimizar painel"
          >
            X
          </button>
        )}
      </div>

      <p style={{ marginTop: 0, marginBottom: 18, color: PALETTE.textSecondary }}>
        {loading ? 'Carregando métricas...' : 'Resumo com informações das outras telas e ações necessárias.'}
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        {chartData.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => router.push(item.route)}
            style={{
              textAlign: 'left',
              background: PALETTE.backgroundSecondary,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 8,
              padding: 12,
              color: PALETTE.textPrimary,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: PALETTE.textSecondary }}>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: PALETTE.hoverBg, overflow: 'hidden' }}>
              <div style={{
                width: `${(item.value / maxValue) * 100}%`,
                height: '100%',
                background: item.color,
                transition: 'width 260ms ease',
              }} />
            </div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: 16 }}>Gráficos por módulo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            { title: 'Férias', route: '/vacations', bars: moduleCharts.vacations },
            { title: 'Viagens', route: '/trips', bars: moduleCharts.trips },
            { title: 'Plantões', route: '/shifts/calendar', bars: moduleCharts.shifts },
          ].map(module => {
            const localMax = Math.max(1, ...module.bars.map(b => b.value))
            return (
              <button
                key={module.title}
                type="button"
                onClick={() => router.push(module.route)}
                style={{
                  textAlign: 'left',
                  background: PALETTE.backgroundSecondary,
                  border: `1px solid ${PALETTE.border}`,
                  borderRadius: 8,
                  padding: 12,
                  color: PALETTE.textPrimary,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 10 }}>{module.title}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {module.bars.map(bar => (
                    <div key={`${module.title}-${bar.label}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>{bar.label}</span>
                        <strong style={{ fontSize: 12 }}>{bar.value}</strong>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, background: PALETTE.hoverBg, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(bar.value / localMax) * 100}%`,
                          height: '100%',
                          background: bar.color,
                          transition: 'width 240ms ease',
                        }} />
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
        <div id="selection-notifications-popover" style={{ position: 'fixed', top: notifPos.top, left: notifPos.left, width: 420, zIndex: 2000 }}>
          <div style={{
            background: PALETTE.cardBg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)',
            maxHeight: '48vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ações Necessárias</h3>
              <button type="button" onClick={() => setShowNotifications(false)} style={btnNav}>✕</button>
            </div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {notifications.length === 0 && (
                <div style={{ color: PALETTE.textSecondary }}>Nenhuma ação pendente no momento.</div>
              )}
              {notifications.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setShowNotifications(false); router.push(item.route) }}
                  onMouseEnter={() => setHoveredNotif(item.id)}
                  onMouseLeave={() => setHoveredNotif(null)}
                  style={{
                    textAlign: 'left',
                    background: hoveredNotif === item.id ? `${PALETTE.primary}11` : PALETTE.cardBg,
                    border: `1px solid ${item.severity === 'warning' ? `${PALETTE.warning}66` : PALETTE.border}`,
                    borderRadius: 8,
                    padding: 10,
                    cursor: 'pointer',
                    color: PALETTE.textPrimary,
                  }}
                >
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

  if (embedded) {
    return (
      <div style={{ padding: 12, width: '100%', height: '100%', boxSizing: 'border-box' }}>
        {panelContent}
      </div>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: PALETTE.background,
      fontFamily: 'system-ui, sans-serif',
      color: PALETTE.textPrimary,
    }}>
      {!minimized && panelContent}

      <button
        type="button"
        onClick={() => setMinimized(prev => !prev)}
        title={minimized ? 'Abrir Painel Geral' : 'Minimizar/Restaurar Painel'}
        style={{
          position: 'fixed',
          top: 50,
          left: 320,
          width: 56,
          height: 56,
          borderRadius: 6,
          background: PALETTE.primary,
          color: '#fff',
          border: `1px solid ${PALETTE.border}`,
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          zIndex: 1100,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        📊
      </button>
    </main>
  )
}
