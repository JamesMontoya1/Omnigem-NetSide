import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, authHeaders } from '../../config/api'
import { PALETTE, btnNav } from '../../styles/theme'
import WorkersContent from '../shared/WorkersContent'
import HolidaysContent from '../shared/HolidaysContent'
import GeneralPanel from './GeneralPanel'
import { makeModalDraggable } from '../shared/draggableModal'

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
  
  const [loading, setLoading] = useState(true)
  const [minimized, setMinimized] = useState<boolean>(() => !embedded)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)
  const [focusedModal, setFocusedModal] = useState<'workers' | 'holidays' | 'panel' | null>(null)
  const [isGuest, setIsGuest] = useState(false)

  const workersPanelRef = useRef<HTMLDivElement | null>(null)
  const [workersPanelPos, setWorkersPanelPos] = useState<{ top: number; left: number } | null>(null)

  const holidaysPanelRef = useRef<HTMLDivElement | null>(null)
  const [holidaysPanelPos, setHolidaysPanelPos] = useState<{ top: number; left: number } | null>(null)

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
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      setIsGuest(Array.isArray(roles) && roles.includes('GUEST'))
    } catch (e) {
      setIsGuest(false)
    }
  }, [])

  

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

  useEffect(() => {
    if (!showWorkersModal) return
    if (!workersPanelRef.current) return
    if (workersPanelPos) return
    const rect = workersPanelRef.current.getBoundingClientRect()
    setWorkersPanelPos({
      top: Math.max(8, (window.innerHeight - rect.height) / 2),
      left: Math.max(8, (window.innerWidth - rect.width) / 2),
    })
    setFocusedModal('workers')
  }, [showWorkersModal, workersPanelPos])

  useEffect(() => {
    if (!showHolidaysModal) return
    if (!holidaysPanelRef.current) return
    if (holidaysPanelPos) return
    const rect = holidaysPanelRef.current.getBoundingClientRect()
    setHolidaysPanelPos({
      top: Math.max(8, (window.innerHeight - rect.height) / 2),
      left: Math.max(8, (window.innerWidth - rect.width) / 2),
    })
    setFocusedModal('holidays')
  }, [showHolidaysModal, holidaysPanelPos])

  useEffect(() => {
    if (!showWorkersModal) return
    if (!workersPanelRef.current) return
    const dispose = makeModalDraggable(workersPanelRef.current, {
      handleSelector: '[data-draggable-handle], h3',
      onFocus: () => setFocusedModal('workers'),
      onPositionChange: pos => setWorkersPanelPos(pos),
    })
    return () => dispose()
  }, [showWorkersModal])

  useEffect(() => {
    if (!showHolidaysModal) return
    if (!holidaysPanelRef.current) return
    const dispose = makeModalDraggable(holidaysPanelRef.current, {
      handleSelector: '[data-draggable-handle], h3',
      onFocus: () => setFocusedModal('holidays'),
      onPositionChange: pos => setHolidaysPanelPos(pos),
    })
    return () => dispose()
  }, [showHolidaysModal])

  

  if (embedded) {
    return (
      <div style={{ padding: 12, width: '100%', height: '100%', boxSizing: 'border-box' }}>
        <GeneralPanel
          embedded={embedded}
          minimized={minimized}
          setMinimized={setMinimized}
          focusedModal={focusedModal}
          setFocusedModal={setFocusedModal}
          loading={loading}
          chartData={chartData}
          moduleCharts={moduleCharts}
          notifications={notifications}
          onNavigate={(r) => router.push(r)}
        />
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
      {!minimized && (
        <GeneralPanel
          embedded={embedded}
          minimized={minimized}
          setMinimized={setMinimized}
          focusedModal={focusedModal}
          setFocusedModal={setFocusedModal}
          loading={loading}
          chartData={chartData}
          moduleCharts={moduleCharts}
          notifications={notifications}
          onNavigate={(r) => router.push(r)}
        />
      )}

      {!isGuest && showWorkersModal && (
        <div
          ref={workersPanelRef}
          className="draggable-modal"
          onPointerDown={() => setFocusedModal('workers')}
          style={{
            position: 'fixed',
            top: workersPanelPos ? workersPanelPos.top : '50%',
            left: workersPanelPos ? workersPanelPos.left : '50%',
            transform: workersPanelPos ? 'none' : 'translate(-50%, -50%)',
            width: 'min(640px, 86vw)',
            background: PALETTE.cardBg,
            border: `1px solid ${focusedModal === 'workers' ? PALETTE.primary : PALETTE.border}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: focusedModal === 'workers' ? '0 18px 60px rgba(0,0,0,0.55)' : '0 12px 40px rgba(0,0,0,0.45)',
            maxHeight: '86vh',
            overflowY: 'auto',
            zIndex: focusedModal === 'workers' ? 1410 : 1310,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div data-draggable-handle style={{ cursor: 'grab', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Trabalhadores</h3>
            </div>
            <button type="button" onClick={() => setShowWorkersModal(false)} style={btnNav}>✕</button>
          </div>
          <WorkersContent onChange={() => {}} />
        </div>
      )}

      {!isGuest && showHolidaysModal && (
        <div
          ref={holidaysPanelRef}
          className="draggable-modal"
          onPointerDown={() => setFocusedModal('holidays')}
          style={{
            position: 'fixed',
            top: holidaysPanelPos ? holidaysPanelPos.top : '50%',
            left: holidaysPanelPos ? holidaysPanelPos.left : '50%',
            transform: holidaysPanelPos ? 'none' : 'translate(-50%, -50%)',
            width: 'min(640px, 86vw)',
            background: PALETTE.cardBg,
            border: `1px solid ${focusedModal === 'holidays' ? PALETTE.primary : PALETTE.border}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: focusedModal === 'holidays' ? '0 18px 60px rgba(0,0,0,0.55)' : '0 12px 40px rgba(0,0,0,0.45)',
            maxHeight: '86vh',
            overflowY: 'auto',
            zIndex: focusedModal === 'holidays' ? 1410 : 1310,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div data-draggable-handle style={{ cursor: 'grab', flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Feriados</h3>
            </div>
            <button type="button" onClick={() => setShowHolidaysModal(false)} style={btnNav}>✕</button>
          </div>
          <HolidaysContent />
        </div>
      )}

      <div style={{ position: 'fixed', top: 50, left: 300, zIndex: 1100, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMinimized(prev => !prev)}
            title={minimized ? 'Abrir Painel Geral' : 'Minimizar/Restaurar Painel'}
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              background: PALETTE.primary,
              color: '#fff',
              border: `1px solid ${PALETTE.border}`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            📊
          </button>
          <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Painel Geral</div>
        </div>

        {!isGuest && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => { setShowWorkersModal(true) }}
              title="Trabalhadores"
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                background: PALETTE.primary,
                color: '#fff',
                border: `1px solid ${PALETTE.border}`,
                boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              👥
            </button>
            <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Trabalhadores</div>
          </div>
        )}

        {!isGuest && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => { setShowHolidaysModal(true) }}
              title="Feriados"
              style={{
                width: 56,
                height: 56,
                borderRadius: 6,
                background: PALETTE.primary,
                color: '#fff',
                border: `1px solid ${PALETTE.border}`,
                boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              📅
            </button>
            <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Feriados</div>
          </div>
        )}
      </div>
    </main>
  )
}
