import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, authHeaders } from '../../config/api'
import { PALETTE, btnNav } from '../../styles/theme'
import WorkersContent from '../shared/WorkersContent'
import HolidaysContent from '../shared/HolidaysContent'
import GeneralPanel from './GeneralPanel'
import { makeModalDraggable } from '../shared/draggableModal'

const WORKERS_POS_KEY = 'selection_workers_panel_pos_v1'
const HOLIDAYS_POS_KEY = 'selection_holidays_panel_pos_v1'

type Vacation = { id: number; request?: number | null }
type Trip = { id: number; date: string; completed?: boolean }
type Vehicle = { id: number; model?: string; plate?: string; nextOilChange?: string | null; lastMaintenance?: string | null; lastAlignment?: string | null }
type Rotation = { id: number; weekdays: number[]; startDate: string; endDate?: string | null; notifyUpcoming?: boolean }
type NotifItem = { id: string; label: string; detail: string | string[]; when?: string; route: string; severity: 'warning' | 'info' }
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
  const [isGuest, setIsGuest] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)
  const [minimized, setMinimized] = useState<boolean>(() => !embedded)
  

  const workersPanelRef = useRef<HTMLDivElement | null>(null)
  const [workersPanelPos, setWorkersPanelPos] = useState<{ top: number; left: number } | null>(null)

  const holidaysPanelRef = useRef<HTMLDivElement | null>(null)
  const [holidaysPanelPos, setHolidaysPanelPos] = useState<{ top: number; left: number } | null>(null)

  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [vacationSummary, setVacationSummary] = useState<any[]>([])
  const [rotations, setRotations] = useState<Rotation[]>([])
  const [shiftCalendar, setShiftCalendar] = useState<Record<string, any>>({})
  const [alignmentInterval, setAlignmentInterval] = useState(60)
  const [maintenanceInterval, setMaintenanceInterval] = useState(60)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(today)
        end.setDate(end.getDate() + 30)
        const startIso = isoDate(today)
        const endIso = isoDate(end)

        const [vRes, vsRes, tRes, vehRes, rotRes, mRes, aRes, calRes] = await Promise.all([
          fetch(`${API_BASE}/vacations`, { headers: authHeaders() }),
          fetch(`${API_BASE}/vacations/summary`, { headers: authHeaders() }),
          fetch(`${API_BASE}/trips`, { headers: authHeaders() }),
          fetch(`${API_BASE}/vehicles`, { headers: authHeaders() }),
          fetch(`${API_BASE}/rotations`, { headers: authHeaders() }),
          fetch(`${API_BASE}/settings/maintenanceInterval`, { headers: authHeaders() }),
          fetch(`${API_BASE}/settings/alignmentInterval`, { headers: authHeaders() }),
          fetch(`${API_BASE}/rotations/calendar?startDate=${startIso}&endDate=${endIso}`, { headers: authHeaders() }),
        ])

        if (vRes.ok) setVacations(await vRes.json())
        if (vsRes && vsRes.ok) setVacationSummary(await vsRes.json())
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
        if (calRes && calRes.ok) {
          try {
            const c = await calRes.json()
            setShiftCalendar(c || {})
          } catch (e) {
            setShiftCalendar({})
          }
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const wp = localStorage.getItem(WORKERS_POS_KEY)
      if (wp) setWorkersPanelPos(JSON.parse(wp))
      const hp = localStorage.getItem(HOLIDAYS_POS_KEY)
      if (hp) setHolidaysPanelPos(JSON.parse(hp))
    } catch (e) {
      // ignore
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

  function formatDateWithWeekday(d: Date) {
    const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const dayName = DAYS[d.getDay()]
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    return `${day}/${month} ${dayName}`
  }

  const nextTripItem = useMemo(() => {
    if (!trips || trips.length === 0) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const candidates = trips
      .filter(t => !t.completed)
      .map(t => ({
        raw: t,
        date: parseLocalDate(toDateInput((t as any).date)),
      }))
      .filter(x => x.date.getTime() >= today.getTime())
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (!candidates || candidates.length === 0) return null
    const t: any = candidates[0].raw
    const drivers = (t.drivers || []).map((w: any) => w.name)
    const travelers = (t.travelers || []).map((w: any) => w.name)
    const equipe = Array.from(new Set([...drivers, ...travelers])).join(', ') || '—'
    const startTime = t.startTime || ''
    const dateObj = parseLocalDate(toDateInput((t as any).date))
    const dateStr = formatDateWithWeekday(dateObj)
    const whenStr = startTime ? `${dateStr} - ${startTime}` : dateStr
    return {
      id: `next-trip-${t.id}`,
      label: 'Próxima viagem',
      detail: equipe,
      when: whenStr,
      route: '/trips',
      severity: 'info',
    } as NotifItem
  }, [trips])

  const upcomingShifts = useMemo(() => {
    try {
      const list: any[] = []
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const keys = Object.keys(shiftCalendar || {}).sort()
      for (const iso of keys) {
        try {
          const d = parseLocalDate(iso)
          if (d.getTime() < today.getTime()) continue
          const dayData = (shiftCalendar as any)[iso]
          const entries = Array.isArray(dayData?.entries) ? dayData.entries : []
          for (let i = 0; i < entries.length; i++) {
            const en = entries[i]
            const workerName = en.workerName || en.name || (en.worker && en.worker.name) || '—'
            const rotationName = en.rotationName || en.rotation || ''
            const workerColor = en.workerColor || en.color || (en.worker && en.worker.color) || null
            const holidayName = dayData && dayData.holiday && (dayData.holiday.name || null)
            const isHoliday = Boolean(dayData && dayData.holiday)
            list.push({ id: `${iso}-${i}-${en.workerId ?? workerName}`, date: iso, workerName, rotationName, workerId: en.workerId ?? null, workerColor, holidayName, isHoliday })
          }
        } catch (e) { /* ignore individual day parse errors */ }
      }
      return list.sort((a, b) => parseLocalDate(toDateInput(a.date)).getTime() - parseLocalDate(toDateInput(b.date)).getTime()).slice(0, 5)
    } catch (e) { return [] }
  }, [shiftCalendar])

  const nextShiftItem = useMemo(() => {
    if (!shiftCalendar || Object.keys(shiftCalendar).length === 0) return null
    const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i <= 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const iso = isoDate(d)
      const dayData = shiftCalendar[iso]
      if (!dayData || !Array.isArray(dayData.entries)) continue
      const entry = dayData.entries.find((en: any) => en.workerId != null || en.workerName)
      if (entry) {
        const name = entry.workerName || '—'
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const dateStr = `${day}/${month}`
        const dayName = DAYS[d.getDay()]
        const whenStr = `${dateStr} - ${dayName} - ${name}`
        return {
          id: `next-shift-${iso}`,
          label: 'Próximo plantão',
          detail: '',
          when: whenStr,
          route: '/shifts/calendar',
          severity: 'info',
        } as NotifItem
      }
    }
    return null
  }, [shiftCalendar])

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
    if (nextTripItem) {
      list.push(nextTripItem)
    } else if (counts.upcomingTrips > 0) {
      list.push({
        id: 'trip-upcoming',
        label: 'Viagens para hoje/amanhã',
        detail: `${counts.upcomingTrips} viagem(ns) pendente(s)`,
        route: '/trips',
        severity: 'info',
      })
    }

    const vehTotal = counts.oilDueSoon + counts.maintenanceDueSoon + counts.alignmentDueSoon
    if (vehTotal > 0) {
      const vehicleLines: string[] = []

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const msPerDay = 24 * 60 * 60 * 1000
      let earliestOverall: { date: Date; vehicle: Vehicle; type: string } | null = null

      for (const v of vehicles) {
        const linesForVehicle: string[] = []
        if (v.nextOilChange) {
          const d = parseLocalDate(toDateInput(String(v.nextOilChange)))
          const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
          if (diff >= 0 && diff <= 30) {
            linesForVehicle.push(`Troca de óleo - ${formatDateWithWeekday(d)}`)
            if (!earliestOverall || d.getTime() < earliestOverall.date.getTime()) earliestOverall = { date: d, vehicle: v, type: 'Troca de óleo' }
          }
        }
        if (v.lastMaintenance) {
          const d = parseLocalDate(toDateInput(String(v.lastMaintenance)))
          d.setDate(d.getDate() + maintenanceInterval)
          const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
          if (diff >= 0 && diff <= 30) {
            linesForVehicle.push(`Manutenção - ${formatDateWithWeekday(d)}`)
            if (!earliestOverall || d.getTime() < earliestOverall.date.getTime()) earliestOverall = { date: d, vehicle: v, type: 'Manutenção' }
          }
        }
        if (v.lastAlignment) {
          const d = parseLocalDate(toDateInput(String(v.lastAlignment)))
          d.setDate(d.getDate() + alignmentInterval)
          const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
          if (diff >= 0 && diff <= 30) {
            linesForVehicle.push(`Alinhamento - ${formatDateWithWeekday(d)}`)
            if (!earliestOverall || d.getTime() < earliestOverall.date.getTime()) earliestOverall = { date: d, vehicle: v, type: 'Alinhamento' }
          }
        }

        if (linesForVehicle.length > 0) {
          vehicleLines.push(`${v.plate || v.model || 'Veículo'}`)
          for (const ln of linesForVehicle) vehicleLines.push(ln)
        }
      }

      if (vehicleLines.length > 0) {
        list.push({
          id: 'vehicles',
          label: 'Veículos — ações próximas',
          detail: vehicleLines,
          route: '/trips/VehiclesTab',
          severity: 'warning',
        })
      }
    }

    if (nextShiftItem) {
      list.push(nextShiftItem)
    } else if (counts.shiftsAlerts > 0) {
      list.push({ id: 'shifts-alerts', label: 'Alertas de plantão na semana', detail: `${counts.shiftsAlerts} ocorrência(s) com notificação visual`, route: '/shifts/calendar', severity: 'info' })
    }
    return list
  }, [counts, vehicles, maintenanceInterval, alignmentInterval, nextTripItem, nextShiftItem])

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

  const upcomingVacations = useMemo(() => {
    try {
      const list: any[] = []
      for (const s of vacationSummary || []) {
        const ups = Array.isArray(s.upcoming) ? s.upcoming : []
        for (const v of ups) list.push({ ...v, workerName: s.name, workerColor: s.color })
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return list
        .filter(v => {
          try {
            const d = parseLocalDate(toDateInput(v.startDate))
            return d.getTime() >= today.getTime()
          } catch (e) { return false }
        })
        .sort((a, b) => parseLocalDate(toDateInput(a.startDate)).getTime() - parseLocalDate(toDateInput(b.startDate)).getTime())
        .slice(0, 5)
    } catch (e) { return [] }
  }, [vacationSummary])

  const upcomingTrips = useMemo(() => {
    try {
      const list: any[] = (trips || []).filter(t => !t.completed).map(t => {
        const date = toDateInput((t as any).date)
        const driverNames = (t as any).drivers && Array.isArray((t as any).drivers) ? (t as any).drivers.map((w: any) => w.name).filter(Boolean) : []
        const travelerNames = (t as any).travelers && Array.isArray((t as any).travelers) ? (t as any).travelers.map((w: any) => w.name).filter(Boolean) : []
        const workersArr = Array.from(new Set([...driverNames, ...travelerNames]))
        const workers = workersArr.join(', ')
        const drivers = driverNames.join(', ')
        const travelers = travelerNames.join(', ')
        const cityName = (t as any).city?.name || ''
        const startTime = (t as any).startTime || ''
        return { id: t.id, date, startTime, cityName, drivers, travelers, workers }
      })
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return list
        .filter(x => {
          try {
            const d = parseLocalDate(toDateInput(x.date))
            return d.getTime() >= today.getTime()
          } catch (e) { return false }
        })
        .sort((a, b) => parseLocalDate(toDateInput(a.date)).getTime() - parseLocalDate(toDateInput(b.date)).getTime())
        .slice(0, 5)
    } catch (e) { return [] }
  }, [trips])

  useEffect(() => {
    if (!showWorkersModal) return
    if (!workersPanelRef.current) return
    const rect = workersPanelRef.current.getBoundingClientRect()
    const margin = 8
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin)
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)
    if (!workersPanelPos) {
      let left = Math.max(margin, (window.innerWidth - rect.width) / 2)
      let top = Math.max(margin, (window.innerHeight - rect.height) / 2)
      left = Math.round(Math.max(margin, Math.min(left, maxLeft)))
      top = Math.round(Math.max(margin, Math.min(top, maxTop)))
      setWorkersPanelPos({ top, left })
    } else {
      let left = Math.round(Math.max(margin, Math.min(workersPanelPos.left, maxLeft)))
      let top = Math.round(Math.max(margin, Math.min(workersPanelPos.top, maxTop)))
      if (left !== workersPanelPos.left || top !== workersPanelPos.top) {
        setWorkersPanelPos({ top, left })
      }
    }
  }, [showWorkersModal, workersPanelPos])

  useEffect(() => {
    if (!showHolidaysModal) return
    if (!holidaysPanelRef.current) return
    const rect = holidaysPanelRef.current.getBoundingClientRect()
    const margin = 8
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin)
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin)
    if (!holidaysPanelPos) {
      let left = Math.max(margin, (window.innerWidth - rect.width) / 2)
      let top = Math.max(margin, (window.innerHeight - rect.height) / 2)
      left = Math.round(Math.max(margin, Math.min(left, maxLeft)))
      top = Math.round(Math.max(margin, Math.min(top, maxTop)))
      setHolidaysPanelPos({ top, left })
    } else {
      let left = Math.round(Math.max(margin, Math.min(holidaysPanelPos.left, maxLeft)))
      let top = Math.round(Math.max(margin, Math.min(holidaysPanelPos.top, maxTop)))
      if (left !== holidaysPanelPos.left || top !== holidaysPanelPos.top) {
        setHolidaysPanelPos({ top, left })
      }
    }
  }, [showHolidaysModal, holidaysPanelPos])

  useEffect(() => {
    if (!showWorkersModal) return
    if (!workersPanelRef.current) return
    const dispose = makeModalDraggable(workersPanelRef.current, {
      handleSelector: '[data-draggable-handle], h3',
      onPositionChange: pos => setWorkersPanelPos(pos),
    })
    return () => dispose()
  }, [showWorkersModal])

  useEffect(() => {
    if (!showHolidaysModal) return
    if (!holidaysPanelRef.current) return
    const dispose = makeModalDraggable(holidaysPanelRef.current, {
      handleSelector: '[data-draggable-handle], h3',
      onPositionChange: pos => setHolidaysPanelPos(pos),
    })
    return () => dispose()
  }, [showHolidaysModal])

  useEffect(() => {
    if (!workersPanelPos) return
    try {
      localStorage.setItem(WORKERS_POS_KEY, JSON.stringify(workersPanelPos))
    } catch (e) {
      // ignore
    }
  }, [workersPanelPos])

  useEffect(() => {
    if (!holidaysPanelPos) return
    try {
      localStorage.setItem(HOLIDAYS_POS_KEY, JSON.stringify(holidaysPanelPos))
    } catch (e) {
      // ignore
    }
  }, [holidaysPanelPos])

  

  if (embedded) {
    return (
      <div
        style={{
          padding: 12,
          width: '100%',
          height: '100vh',
          boxSizing: 'border-box',
            background: PALETTE.backgroundGradient,
          display: 'flex',
        }}
      >
        <GeneralPanel
          embedded={embedded}
          minimized={minimized}
          setMinimized={setMinimized}
          loading={loading}
          chartData={chartData}
          moduleCharts={moduleCharts}
          notifications={notifications}
          inconsistentCount={0}
          upcomingVacations={upcomingVacations}
          upcomingTrips={upcomingTrips}
          upcomingShifts={upcomingShifts}
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
      background: PALETTE.backgroundGradient,
      fontFamily: 'system-ui, sans-serif',
      color: PALETTE.textPrimary,
    }}>
      {!minimized && (
        <GeneralPanel
          embedded={embedded}
          minimized={minimized}
          setMinimized={setMinimized}
          loading={loading}
          chartData={chartData}
          moduleCharts={moduleCharts}
          notifications={notifications}
          inconsistentCount={0}
          upcomingVacations={upcomingVacations}
          upcomingTrips={upcomingTrips}
          upcomingShifts={upcomingShifts}
          onNavigate={(r) => router.push(r)}
        />
      )}

      {!isGuest && showWorkersModal && (
        <div
          ref={workersPanelRef}
          className="draggable-modal"
          style={{
            position: 'fixed',
            top: workersPanelPos ? workersPanelPos.top : '50%',
            left: workersPanelPos ? workersPanelPos.left : '50%',
            transform: workersPanelPos ? 'none' : 'translate(-50%, -50%)',
            width: 'min(640px, 86vw)',
            background: PALETTE.cardBg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            maxHeight: '86vh',
            overflowY: 'auto',
            zIndex: 1610,
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
          style={{
            position: 'fixed',
            top: holidaysPanelPos ? holidaysPanelPos.top : '50%',
            left: holidaysPanelPos ? holidaysPanelPos.left : '50%',
            transform: holidaysPanelPos ? 'none' : 'translate(-50%, -50%)',
            width: 'min(640px, 86vw)',
            background: PALETTE.cardBg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            maxHeight: '86vh',
            overflowY: 'auto',
            zIndex: 1610,
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

      <div style={{ position: 'fixed', top: 50, left: 300, zIndex: 1100, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setMinimized(prev => !prev)}
            title={minimized ? 'Abrir Painel Geral' : 'Minimizar/Restaurar Painel'}
            style={{
              width: 56,
              height: 56,
              borderRadius: 6,
              background: 'transparent',
              color: PALETTE.textPrimary,
              border: 'none',
              boxShadow: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
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
                background: 'transparent',
                color: PALETTE.textPrimary,
                border: 'none',
                boxShadow: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
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
                background: 'transparent',
                color: PALETTE.textPrimary,
                border: 'none',
                boxShadow: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
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
