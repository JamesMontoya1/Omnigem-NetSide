import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, authHeaders, jsonAuthHeaders } from '../../config/api'
import {
  PALETTE, btnPrimary, btnCancel, btnDanger, btnSmallBlue, btnSmallRed,
  cardStyle, inputStyle, selectStyle, labelStyle, btnNav,
  btnSmall,
} from '../../styles/theme'
import { useToast } from '../../components/shared/ToastProvider'
import WorkersContent from '../../components/shared/WorkersContent'
import CurrencyInput from '../../components/shared/CurrencyInput'
import { num, formatTwo } from '../../components/shared/formatUtils'

type City = { id: number; name: string; state?: string; country?: string }
type Vehicle = { id: number; plate?: string; model?: string; notes?: string;
  odometer?: number | string; nextOilChange?: string | null; lastAlignment?: string | null;
  odometerAtLastAlignment?: number | string; lastMaintenance?: string | null }
type Worker = { id: number; name: string; doesTravel?: boolean; active?: boolean }
type Trip = {
  id: number; date: string; cityId: number; city?: City; vehicleId?: number; vehicle?: Vehicle
  startTime?: string
  odometer?: number | string; nextOilChange?: string | null; lastAlignment?: string | null; odometerAtLastAlignment?: number | string; lastMaintenance?: string | null
  client?: string; serviceTypeId: number
  serviceType?: { id: number; name: string; code?: string }
  price?: number
  clients?: { name: string; price?: number; info?: string }[]
  mealExpense?: number; fuelExpense?: number; extraExpense?: number; extraInfo?: string
  fuelInfo?: string
  kmDriven?: number; costPerKm?: number; profitPerKm?: number
  avgConsumption?: number; remainingAutonomy?: number
  travelers?: Worker[]; drivers?: Worker[]; note?: string
  completed?: boolean; endDate?: string
  createdAt: string; updatedAt?: string
}

type ExpenseCategory = { id: number; name: string; description?: string }

const EMPTY_FORM = {
  date: '', startTime: '', cityId: '', vehicleId: '', client: '', serviceTypeId: '',
  odometer: '', nextOilChange: '', lastAlignment: '', odometerAtLastAlignment: '', lastMaintenance: '',
  clients: [{ name: '', price: '', info: '' }],
  cities: [{ cityId: '', clients: [{ name: '', price: '', info: '' }], notes: '' }],
  mealExpense: '', fuelExpense: '', fuelInfo: '', extraExpense: '', price: '',
  extraInfo: '',
  kmDriven: '', costPerKm: '', profitPerKm: '', avgConsumption: '', remainingAutonomy: '',
  total: '',
  travelerIds: [] as number[], driverIds: [] as number[], note: '', endDate: '',
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const modal: React.CSSProperties = {
  background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`,
  borderRadius: 8, padding: 12, width: 860, maxHeight: '88vh', overflowY: 'auto',
}
const smallModal: React.CSSProperties = { ...modal, width: 420 }
const moneyWrapper: React.CSSProperties = { position: 'relative' }

function toDateInput(iso: string) {
  if (!iso) return ''
  if (iso.includes('T')) return iso.split('T')[0]
  return iso.slice(0, 10)
}
function money(v: any) { const n = Number(String(v).replace(',', '.')); return isNaN(n) || n === 0 ? '' : `R$ ${n.toFixed(2)}` }
function decimal(v: any) { const n = Number(String(v).replace(',', '.')); return isNaN(n) || n === 0 ? '' : n.toFixed(2) }
function truncate(s: string | undefined, n = 80) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '…' : s }

function sumFuel(v: any): number {
  if (v == null) return 0
  if (Array.isArray(v)) return v.reduce((s: number, x: any) => s + (num(x) || 0), 0)
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const cellSingleLine: React.CSSProperties = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }

function parseLocalDate(s: string) {
  const parts = s.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const cellStyle: React.CSSProperties = {
  minHeight: 90,
  padding: 0,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 6,
  fontSize: 12,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  position: 'relative',
  transition: 'background 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease',
  WebkitTapHighlightColor: 'transparent',
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function Trips() {
  const router = useRouter()
  const { addToast } = useToast()

  const [trips, setTrips] = useState<Trip[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterVehicle, setFilterVehicle] = useState('')
  const [filterWorker, setFilterWorker] = useState('')
  const [filterType, setFilterType] = useState('')
  const [serviceTypes, setServiceTypes] = useState<{ id: number; name: string; code?: string }[]>([])

  const [showTripModal, setShowTripModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [mealEdited, setMealEdited] = useState(false)
  

  const [showCityModal, setShowCityModal] = useState(false)
  const [cityForm, setCityForm] = useState({ name: '', state: '', country: 'BR' })
  const [editingCity, setEditingCity] = useState<City | null>(null)

  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ plate: '', model: '', notes: '',
    odometer: '', nextOilChange: '', lastAlignment: '', odometerAtLastAlignment: '', lastMaintenance: '' })
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [vehicleModalFromTrip, setVehicleModalFromTrip] = useState(false)

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null)
  const [vehicleExpenses, setVehicleExpenses] = useState<any[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any | null>(null)
  const [expenseForm, setExpenseForm] = useState({ date: '', categoryId: '', amount: '', currency: 'BRL', odometer: '', receiptUrl: '', notes: '', workerId: '' })
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])

  const [showExtraNoteModal, setShowExtraNoteModal] = useState(false)
  const extraNoteInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [showFuelNoteModal, setShowFuelNoteModal] = useState(false)
  const fuelNoteInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [skipInitialCalc, setSkipInitialCalc] = useState(false)

  const [showManageCities, setShowManageCities] = useState(false)
  const [showManageVehicles, setShowManageVehicles] = useState(false)
  const [showManageWorkers, setShowManageWorkers] = useState(false)
  const [showCitiesClientsModal, setShowCitiesClientsModal] = useState(false)
  const [infoModal, setInfoModal] = useState<{ open: boolean; ci: number; idx: number; value: string } | null>(null)
  const [showCategories, setShowCategories] = useState(false)

  const [showClientInfoModal, setShowClientInfoModal] = useState(false)
  const [clientInfoContent, setClientInfoContent] = useState<{ title?: string; text: string } | null>(null)
  const [holidayModalData, setHolidayModalData] = useState<any[] | null>(null)
  const [pendingHolidayConfirm, setPendingHolidayConfirm] = useState<{ name?: string; date: string } | null>(null)
  const pendingPayloadRef = useRef<any | null>(null)
  const pendingEditingRef = useRef<Trip | null>(null)

  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<number[]>([])

  const [detailsTrip, setDetailsTrip] = useState<Trip | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false)
  const [serviceTypeForm, setServiceTypeForm] = useState({ name: '', code: '' })
  const [editingServiceType, setEditingServiceType] = useState<{ id: number; name: string; code?: string } | null>(null)

  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)

  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLButtonElement | null>(null)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)
  const [showOverdue, setShowOverdue] = useState(false)
  const overdueRef = useRef<HTMLButtonElement | null>(null)
  const [overduePos, setOverduePos] = useState<{ top: number; left: number } | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<Trip | null>(null)

  const [defaultMealExpense, setDefaultMealExpense] = useState<number | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [settingsMealValue, setSettingsMealValue] = useState('')
  const [defaultMaintenanceInterval, setDefaultMaintenanceInterval] = useState<number | null>(null)
  const [defaultAlignmentInterval, setDefaultAlignmentInterval] = useState<number | null>(null)
  const [settingsMaintenanceValue, setSettingsMaintenanceValue] = useState('')
  const [settingsAlignmentValue, setSettingsAlignmentValue] = useState('')

  const [tab, setTab] = useState<'trips' | 'cities' | 'vehicles' | 'serviceTypes'>('trips')
  const [showFilters, setShowFilters] = useState(false)
  const [tripsView, setTripsView] = useState<'list' | 'calendar'>('list')
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sidebarFilter, setSidebarFilter] = useState<'completed' | 'pending'>('completed')
  const [listViewMode, setListViewMode] = useState<'both' | 'pending' | 'completed'>('pending')
  const [canViewBoth, setCanViewBoth] = useState(false)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    if (selectedDay) {
      setPanelOpen(false)
      requestAnimationFrame(() => setPanelOpen(true))
    } else {
      setPanelOpen(false)
    }
  }, [selectedDay])

  const [showBurger, setShowBurger] = useState(false)
  const burgerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!burgerRef.current) return
      if (!(e.target instanceof Node)) return
      if (!burgerRef.current.contains(e.target)) setShowBurger(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!(e.target instanceof Node)) return
      const pop = document.getElementById('notifications-popover')
      const overduePop = document.getElementById('overdue-popover')
      if (notifRef.current && notifRef.current.contains(e.target)) return
      if (overdueRef.current && overdueRef.current.contains(e.target)) return
      if (pop && pop.contains(e.target)) return
      if (overduePop && overduePop.contains(e.target)) return
      setShowNotifications(false)
      setShowOverdue(false)
    }
    if (showNotifications || showOverdue) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [showNotifications, showOverdue])

  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay()
    const days: { date: Date; current: boolean }[] = []

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, current: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), current: true })
    }
    while (days.length < 42) {
      const last = days[days.length - 1].date
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
      days.push({ date: d, current: false })
    }

    const weeks: { date: Date; current: boolean }[][] = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    while (weeks.length > 0 && weeks[weeks.length - 1].every(d => !d.current)) weeks.pop()
    return weeks.flat()
  }, [calMonth])

  function tripsForDate(date: Date) {
    const iso = isoDate(date)
    return trips.filter(t => {
      const start = toDateInput(t.date)
      return iso === start && isTripVisible(t)
    })
  }

  function isTripVisible(t: Trip) {
    if (filterCity && t.cityId !== Number(filterCity)) return false
    if (filterVehicle && t.vehicleId !== Number(filterVehicle)) return false
    if (filterWorker) {
      const wid = Number(filterWorker)
      const inDrivers = (t.drivers || []).some((w: any) => w.id === wid)
      const inTravelers = (t.travelers || []).some((w: any) => w.id === wid)
      if (!inDrivers && !inTravelers) return false
    }
    if (filterType !== '' && t.serviceTypeId !== Number(filterType)) return false
    if (filterStart) {
      const s = new Date(filterStart); s.setHours(0,0,0,0)
      const td = parseLocalDate(toDateInput(t.date)); td.setHours(0,0,0,0)
      if (td.getTime() < s.getTime()) return false
    }
    if (filterEnd) {
      const e = new Date(filterEnd); e.setHours(0,0,0,0)
      const td = parseLocalDate(toDateInput(t.date)); td.setHours(0,0,0,0)
      if (td.getTime() > e.getTime()) return false
    }
    return true
  }

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      try {
        const hRes = await fetch(`${API_BASE}/holidays`, { headers: authHeaders() })
        if (hRes.ok) {
          const hList: any[] = await hRes.json()
          setHolidays(hList)
        }
      } catch (e) {
        console.error('Erro ao verificar feriados', e)
      }
      const params = new URLSearchParams()
      if (filterStart) params.set('startDate', filterStart)
      if (filterEnd) params.set('endDate', filterEnd)
      const res = await fetch(`${API_BASE}/trips?${params}`, { headers: authHeaders() })
      const raw = await res.json()
      const normalized = (raw || []).map((t: any) => {
        if (t.tripCities && Array.isArray(t.tripCities) && t.tripCities.length > 0) {
          const primary = t.tripCities[0]
          const clients = primary.clients && primary.clients.length ? primary.clients.map((name: any, idx: number) => ({ name, price: (primary.prices && primary.prices[idx]) ?? undefined, info: (primary.information && primary.information[idx]) ?? undefined })) : (t.clients || [])
          return { ...t, cityId: primary.cityId, city: primary.city, clients }
        }
        return t
      })
      setTrips(normalized)
    } catch { setTrips([]) } finally { setLoading(false) }
  }, [filterStart, filterEnd])

  const fetchCities = useCallback(async () => {
    try { const r = await fetch(`${API_BASE}/cities`, { headers: authHeaders() }); setCities(await r.json()) } catch { setCities([]) }
  }, [])

  const fetchServiceTypes = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/service-types`, { headers: authHeaders() })
      const list = await r.json()
      list.sort((a: any, b: any) => (a.code ?? '').toString().localeCompare((b.code ?? '').toString(), undefined, { numeric: true }))
      setServiceTypes(list)
    } catch {
      setServiceTypes([])
    }
  }, [])

  const fetchVehicles = useCallback(async () => {
    try { const r = await fetch(`${API_BASE}/vehicles`, { headers: authHeaders() }); setVehicles(await r.json()) } catch { setVehicles([]) }
  }, [])

  const fetchWorkers = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/workers`, { headers: authHeaders() })
      const all: Worker[] = await r.json()
      setWorkers(all.filter(w => w.active !== false && w.doesTravel === true))
    } catch { setWorkers([]) }
  }, [])

  const fetchVehicleExpenses = useCallback(async (vehicleId?: number) => {
    setLoadingExpenses(true)
    try {
      if (!vehicleId) { setVehicleExpenses([]); return }
      const r = await fetch(`${API_BASE}/vehicle-expenses?vehicleId=${vehicleId}`, { headers: authHeaders() })
      if (!r.ok) { setVehicleExpenses([]); return }
      setVehicleExpenses(await r.json())
    } catch { setVehicleExpenses([]) } finally { setLoadingExpenses(false) }
  }, [])

  const fetchExpenseCategories = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/vehicle-expense-categories`, { headers: authHeaders() })
      if (!r.ok) { setExpenseCategories([]); return }
      setExpenseCategories(await r.json())
    } catch { setExpenseCategories([]) }
  }, [])

  useEffect(() => { fetchTrips() }, [fetchTrips])

  const fetchSettings = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/settings/mealExpense`, { headers: authHeaders() })
      if (!r.ok) return
      const j = await r.json()
      setDefaultMealExpense(j.value)
      setSettingsMealValue(String(j.value ?? ''))
    } catch {
    }
    try {
      const r3 = await fetch(`${API_BASE}/settings/maintenanceInterval`, { headers: authHeaders() })
      if (r3.ok) {
        const j3 = await r3.json()
        setDefaultMaintenanceInterval(j3.value)
        setSettingsMaintenanceValue(String(j3.value ?? ''))
      }
    } catch {}
    try {
      const r4 = await fetch(`${API_BASE}/settings/alignmentInterval`, { headers: authHeaders() })
      if (r4.ok) {
        const j4 = await r4.json()
        setDefaultAlignmentInterval(j4.value)
        setSettingsAlignmentValue(String(j4.value ?? ''))
      }
    } catch {
    }
  }, [])

  useEffect(() => { fetchCities(); fetchVehicles(); fetchWorkers(); fetchSettings(); fetchServiceTypes() }, [fetchCities, fetchVehicles, fetchWorkers, fetchSettings, fetchServiceTypes])
  useEffect(() => { fetchExpenseCategories() }, [fetchExpenseCategories])

  useEffect(() => {
    fetchVehicleExpenses(selectedVehicleId ?? undefined)
  }, [selectedVehicleId, fetchVehicleExpenses])

  useEffect(() => {
    if (showExtraNoteModal) extraNoteInputRef.current?.focus()
  }, [showExtraNoteModal])

  useEffect(() => {
    if (showFuelNoteModal) fuelNoteInputRef.current?.focus()
  }, [showFuelNoteModal])

  function openNewTrip() {
    setEditingTrip(null)
    setForm({ ...EMPTY_FORM, startTime: '', mealExpense: defaultMealExpense != null ? formatTwo(defaultMealExpense) : '' })
    setMealEdited(false)
    setSkipInitialCalc(true)
    setShowTripModal(true)
  }
  
  function openEditTrip(t: Trip) {
    setEditingTrip(t)
    const kmDriven = t.kmDriven ?? 0
    const totalExp = (num(t.mealExpense) || 0) + sumFuel((t as any).fuelExpense) + (num(t.extraExpense) || 0)
    let clientsForForm: any[] = []
    if ((t as any).client && Array.isArray((t as any).client)) {
      const names = (t as any).client as any[]
      const prices = Array.isArray((t as any).price) ? (t as any).price as any[] : []
      const infos = Array.isArray((t as any).informationPrice) ? (t as any).informationPrice as any[] : []
      clientsForForm = names.map((name: any, idx: number) => ({
        name: name ?? '',
        price: prices[idx] != null ? String(prices[idx]) : '',
        info: infos[idx] ?? ''
      }))
    } else if ((t as any).clients && Array.isArray((t as any).clients)) {
      clientsForForm = (t as any).clients.map((c: any) => ({ name: c.name ?? '', price: c.price != null ? String(c.price) : '', info: c.info ?? '' }))
    } else {
      clientsForForm = [{ name: typeof (t as any).client === 'string' ? (t as any).client : '', price: t.price != null ? String(t.price) : '', info: '' }]
    }

    let computedPriceVal = 0
      if ((t as any).tripCities && Array.isArray((t as any).tripCities) && (t as any).tripCities.length > 0) {
      computedPriceVal = (t as any).tripCities.reduce((sum: number, tc: any) => {
        if (Array.isArray(tc.clients) && tc.clients.length > 0) {
          for (let idx = 0; idx < tc.clients.length; idx++) {
            const p = tc.prices && tc.prices[idx] != null ? num(tc.prices[idx]) || 0 : 0
            sum += (p || 0)
          }
        }
        return sum
      }, 0)
    } else {
      computedPriceVal = clientsForForm.length > 0
        ? clientsForForm.reduce((s: number, c: any) => s + (num(c.price) || 0), 0)
        : (num(t.price) || 0)
    }
      const computedCost = kmDriven > 0 ? (totalExp / kmDriven) : undefined
    const computedProfit = kmDriven > 0 ? ((computedPriceVal - totalExp) / kmDriven) : undefined
    const computedTotalValue = computedPriceVal - totalExp

    const travelerCount = t.travelers?.length ?? 0
    const mealExpenseForForm = t.mealExpense != null
      ? formatTwo(t.mealExpense)
      : (defaultMealExpense != null && travelerCount > 0 ? formatTwo(defaultMealExpense * travelerCount) : '')

    setForm({
      date: toDateInput(t.date),
      startTime: (t as any).startTime ?? '',
      cityId: String(t.cityId),
      cities: ((t as any).tripCities && Array.isArray((t as any).tripCities)) ? (t as any).tripCities.map((tc: any) => ({ cityId: String(tc.cityId), clients: (Array.isArray(tc.clients) ? tc.clients.map((name: any, idx: number) => ({ name: name ?? '', price: (tc.prices && tc.prices[idx]) != null ? String(tc.prices[idx]) : '', info: (tc.information && tc.information[idx]) ?? '' })) : []), notes: tc.notes ?? '' })) : [{ cityId: String(t.cityId ?? ''), clients: clientsForForm, notes: t.extraInfo ?? '' }],
      vehicleId: t.vehicleId ? String(t.vehicleId) : '',
      odometer: t.odometer != null ? String(t.odometer) : '',
      nextOilChange: t.nextOilChange ? toDateInput(String(t.nextOilChange)) : '',
      lastAlignment: t.lastAlignment ? toDateInput(String(t.lastAlignment)) : '',
      odometerAtLastAlignment: t.odometerAtLastAlignment != null ? String(t.odometerAtLastAlignment) : '',
      lastMaintenance: t.lastMaintenance ? toDateInput(String(t.lastMaintenance)) : '',
      client: t.client ?? '',
      clients: clientsForForm,
      serviceTypeId: t.serviceTypeId ? String(t.serviceTypeId) : '',
      price: t.price != null ? String(t.price) : '',
      mealExpense: mealExpenseForForm,
      fuelExpense: t.fuelExpense != null ? formatTwo(sumFuel((t as any).fuelExpense)) : '',
      fuelInfo: (t as any).fuelInfo ?? '',
      extraExpense: t.extraExpense != null ? formatTwo(t.extraExpense) : '',
      extraInfo: t.extraInfo ?? '',
      kmDriven: t.kmDriven != null ? formatTwo(t.kmDriven) : '',
      costPerKm: t.costPerKm != null ? formatTwo(t.costPerKm) : (computedCost != null ? formatTwo(Number(computedCost)) : ''),
      profitPerKm: t.profitPerKm != null ? formatTwo(t.profitPerKm) : (computedProfit != null ? formatTwo(Number(computedProfit)) : ''),
      avgConsumption: t.avgConsumption != null ? formatTwo(t.avgConsumption) : '',
      remainingAutonomy: t.remainingAutonomy != null ? formatTwo(t.remainingAutonomy) : '',
      total: formatTwo(Number(computedTotalValue)),
      travelerIds: t.travelers?.map(w => w.id) ?? [],
      driverIds: t.drivers?.map(w => w.id) ?? [],
      note: t.note ?? '',
      endDate: t.endDate ? toDateInput(t.endDate) : '',
    })

    setMealEdited(t.mealExpense != null)
    setSkipInitialCalc(true)
    setShowTripModal(true)
  }

  function handleRecalculate() {
    if (!editingTrip?.completed) return
    const meal = num(form.mealExpense) || 0
      const fuel = num(form.fuelExpense) || 0
    const extra = num(form.extraExpense) || 0
    const km = num(form.kmDriven) || 0
    let price = 0
    if ((form as any).cities && Array.isArray((form as any).cities) && (form as any).cities.length > 0) {
      price = (form as any).cities.reduce((s: number, cb: any) => {
        if (Array.isArray(cb.clients) && cb.clients.length > 0) {
          return s + cb.clients.reduce((ss: number, c: any) => ss + (num(c.price) || 0), 0)
        }
        return s
      }, 0)
    } else if ((form as any).clients && Array.isArray((form as any).clients)) {
      price = (form as any).clients.reduce((s: number, c: any) => s + (num(c.price) || 0), 0)
    } else {
      price = num(form.price) || 0
    }
    const computedTotal = price - (meal + fuel + extra)
    const totalDisplay = String(Number(computedTotal).toFixed(2))
    let costDisplay = ''
    let profitDisplay = ''
    if (km > 0) {
      const computedCost = (meal + fuel + extra) / km
      const computedProfit = computedTotal / km
      costDisplay = String(Number(computedCost).toFixed(2))
      profitDisplay = String(Number(computedProfit).toFixed(2))
    }
    setForm(f => ({ ...f, total: totalDisplay, costPerKm: costDisplay, profitPerKm: profitDisplay }))
  }

  useEffect(() => {
    if (!showTripModal) return
    if (skipInitialCalc) { setSkipInitialCalc(false); return }
    if (!editingTrip?.completed) return
    const meal = num(form.mealExpense) || 0
    const fuel = num(form.fuelExpense) || 0
    const extra = num(form.extraExpense) || 0
    const km = num(form.kmDriven) || 0
    let price = 0
    if ((form as any).cities && Array.isArray((form as any).cities) && (form as any).cities.length > 0) {
      price = (form as any).cities.reduce((s: number, cb: any) => {
        if (Array.isArray(cb.clients) && cb.clients.length > 0) return s + cb.clients.reduce((ss: number, c: any) => ss + (num(c.price) || 0), 0)
        return s
      }, 0)
    } else if ((form as any).clients && Array.isArray((form as any).clients)) {
      price = (form as any).clients.reduce((s: number, c: any) => s + (num(c.price) || 0), 0)
    } else {
      price = num(form.price) || 0
    }
    const computedTotal = price - (meal + fuel + extra)
    const displayTotal = String(Number(computedTotal).toFixed(2))
    if ((form.total || '') !== displayTotal) setForm(f => ({ ...f, total: displayTotal }))
    if (km <= 0) return
    const computedCost = (meal + fuel + extra) / km
    const displayCost = String(Number(computedCost).toFixed(2))
    if (form.costPerKm !== displayCost) setForm(f => ({ ...f, costPerKm: displayCost }))
    const computedProfit = computedTotal / km
    const displayProfit = String(Number(computedProfit).toFixed(2))
    if (form.profitPerKm !== displayProfit) setForm(f => ({ ...f, profitPerKm: displayProfit }))
  }, [form.mealExpense, form.fuelExpense, form.extraExpense, form.kmDriven, showTripModal, editingTrip?.completed, JSON.stringify((form as any).clients)])

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault()
    const meal = num(form.mealExpense) || 0
    const fuel = num(form.fuelExpense) || 0
    const extra = num(form.extraExpense) || 0
    const km = num(form.kmDriven) || 0
    const computedCostPerKm = km > 0 ? (meal + fuel + extra) / km : undefined
    let totalPriceForCalc = 0
    if ((form as any).cities && Array.isArray((form as any).cities) && (form as any).cities.length > 0) {
      totalPriceForCalc = (form as any).cities.reduce((s: number, cb: any) => {
        if (Array.isArray(cb.clients) && cb.clients.length > 0) return s + cb.clients.reduce((ss: number, c: any) => ss + (num(c.price) || 0), 0)
        return s
      }, 0)
    } else if ((form as any).clients && Array.isArray((form as any).clients)) {
      totalPriceForCalc = (form as any).clients.reduce((s: number, c: any) => s + (num(c.price) || 0), 0)
    } else {
      totalPriceForCalc = (num(form.price) || 0)
    }
    const computedProfitPerKm = km > 0 ? ((totalPriceForCalc - (meal + fuel + extra)) / km) : undefined
    const toIsoSafe = (v: any) => {
      if (!v) return null
      const candidate = (typeof v === 'string' && !v.includes('T')) ? `${v}T00:00:00` : v
      const d = new Date(candidate)
      return isNaN(d.getTime()) ? null : d.toISOString()
    }

    const payload: any = {
      date: form.date,
      vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
      serviceTypeId: Number(form.serviceTypeId),
      travelerIds: form.travelerIds, driverIds: form.driverIds,
      note: form.note || null,
      endDate: toIsoSafe(form.endDate),
    }

    if ((form as any).startTime) payload.startTime = (form as any).startTime

    if ((form as any).cities && Array.isArray((form as any).cities) && (form as any).cities.length > 0) {
      payload.cities = (form as any).cities.map((cb: any) => ({
        cityId: Number(cb.cityId),
        clients: Array.isArray(cb.clients) ? cb.clients.map((cl: any) => ({ name: cl.name || null, price: num(cl.price) ?? null, info: cl.info || null })) : [],
        notes: cb.notes || null,
      }))
    } else {
      payload.cityId = Number(form.cityId)
      payload.client = form.client || null
    }

    const clients = (form as any).clients && Array.isArray((form as any).clients)
      ? (form as any).clients.map((c: any) => ({
        name: Array.isArray(c.name) ? c.name.join(', ') : (c.name ?? null),
        price: num(c.price) ?? null,
        info: Array.isArray(c.info) ? c.info.join(', ') : (c.info ?? null),
      }))
      : (form.client ? [{ name: form.client || null, price: num(form.price) ?? null, info: (form as any).informationPrice || null }] : [])
    if (clients.length) {
      if (!payload.cities) {
        payload.clients = clients
        payload.price = clients.reduce((s: number, c: any) => s + (c.price || 0), 0)
      }
    } else {
      if (!payload.cities) payload.price = num(form.price) ?? null
    }

    if (!editingTrip || editingTrip?.completed || (form.mealExpense !== '' && form.mealExpense != null)) {
      payload.mealExpense = num(form.mealExpense)
    }

    if (editingTrip?.completed) {
      payload.fuelExpense = (form.fuelExpense !== '' && form.fuelExpense != null) ? num(form.fuelExpense) : null
      payload.fuelInfo = form.fuelInfo || null
      payload.extraExpense = num(form.extraExpense)
      payload.extraInfo = form.extraInfo || null
      payload.kmDriven = num(form.kmDriven)
      payload.costPerKm = (num(form.costPerKm) ?? computedCostPerKm) ?? null
      payload.profitPerKm = (num(form.profitPerKm) ?? computedProfitPerKm) ?? null
      payload.avgConsumption = num(form.avgConsumption)
      payload.remainingAutonomy = num(form.remainingAutonomy)
    }
    try {
      try {
        let hList = holidays
        if (!hList || (Array.isArray(hList) && hList.length === 0)) {
          const hRes = await fetch(`${API_BASE}/holidays`, { headers: authHeaders() })
          if (hRes.ok) {
            hList = await hRes.json()
            setHolidays(hList)
          }
        }
        const found = (hList || []).find(h => {
          const hd = toDateInput(h.date)
          if (h.recurring) return hd.slice(5) === (form.date || '').slice(5)
          return hd === (form.date || '')
        })
        if (found) {
          pendingPayloadRef.current = payload
          pendingEditingRef.current = editingTrip ?? null
          setPendingHolidayConfirm({ name: found.name, date: form.date })
          return
        }
      } catch (e) {
        console.error('Erro ao verificar feriados antes de salvar', e)
      }
      await performSave(payload, editingTrip ?? null)
    } catch (err: any) { addToast(err?.message || 'Erro ao salvar', 'error') }
  }

  async function performSave(payload: any, editing: Trip | null) {
    try {
      const url = editing ? `${API_BASE}/trips/${editing.id}` : `${API_BASE}/trips`
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message || 'Erro') }
      addToast(editing ? 'Viagem atualizada' : 'Viagem criada', 'success')
      setShowTripModal(false)
      setPendingHolidayConfirm(null)
      pendingPayloadRef.current = null
      pendingEditingRef.current = null
      await fetchTrips()
    } catch (err: any) {
      addToast(err?.message || 'Erro ao salvar', 'error')
    }
  }

  async function handleDeleteTrip() {
    if (!confirmDelete) return
    try {
      const res = await fetch(`${API_BASE}/trips/${confirmDelete.id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Viagem excluída', 'success')
      setConfirmDelete(null)
      await fetchTrips()
    } catch { addToast('Erro ao excluir', 'error') }
  }

  async function handleMarkComplete(t: Trip) {
    try {
      const dateOnly = toDateInput(t.date)
      const endDateIso = new Date(parseLocalDate(dateOnly)).toISOString()
      const res = await fetch(`${API_BASE}/trips/${t.id}`, {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ completed: true, endDate: endDateIso })
      })
      if (!res.ok) throw new Error('Erro')
      addToast('Viagem marcada como completa', 'success')
      await fetchTrips()
    } catch { addToast('Erro ao marcar completa', 'error') }
  }

  async function handleMarkIncomplete(t: Trip) {
    try {
      const res = await fetch(`${API_BASE}/trips/${t.id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ completed: false, endDate: null }) })
      if (!res.ok) throw new Error('Erro')
      addToast('Viagem marcada como pendente', 'success')
      await fetchTrips()
    } catch { addToast('Erro ao marcar pendente', 'error') }
  }

  function openNewCity() { setEditingCity(null); setCityForm({ name: '', state: '', country: 'BR' }); setShowCityModal(true) }
  function openEditCity(c: City) { setEditingCity(c); setCityForm({ name: c.name, state: c.state ?? '', country: c.country ?? 'BR' }); setShowCityModal(true) }
  async function handleSaveCity(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingCity ? `${API_BASE}/cities/${editingCity.id}` : `${API_BASE}/cities`
      const method = editingCity ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(cityForm) })
      if (!res.ok) throw new Error('Erro')
      addToast(editingCity ? 'Cidade atualizada' : 'Cidade criada', 'success')
      setShowCityModal(false); await fetchCities()
    } catch { addToast('Erro ao salvar cidade', 'error') }
  }
  async function handleDeleteCity(id: number) {
    if (!confirm('Excluir cidade?')) return
    try {
      const res = await fetch(`${API_BASE}/cities/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Cidade excluída', 'success'); await fetchCities()
    } catch { addToast('Erro ao excluir (pode ter viagens vinculadas)', 'error') }
  }

  function openNewVehicle() { setEditingVehicle(null); setVehicleForm({ plate: '', model: '', notes: '', odometer: '', nextOilChange: '', lastAlignment: '', odometerAtLastAlignment: '', lastMaintenance: '' }); setVehicleModalFromTrip(false); setShowVehicleModal(true) }
  function openEditVehicle(v: Vehicle, fromTrip?: boolean) {
    setEditingVehicle(v)
    const useFromTrip = Boolean(fromTrip)
    setVehicleModalFromTrip(useFromTrip)
    setVehicleForm({
      plate: v.plate ?? '', model: v.model ?? '', notes: v.notes ?? '',
      odometer: useFromTrip ? ((form as any).odometer ?? (v.odometer != null ? String(v.odometer) : '')) : (v.odometer != null ? String(v.odometer) : ''),
      nextOilChange: useFromTrip ? ((form as any).nextOilChange ? toDateInput(String((form as any).nextOilChange)) : (v.nextOilChange ? toDateInput(String(v.nextOilChange)) : '')) : (v.nextOilChange ? toDateInput(String(v.nextOilChange)) : ''),
      odometerAtLastAlignment: useFromTrip ? ((form as any).odometerAtLastAlignment ?? (v.odometerAtLastAlignment != null ? String(v.odometerAtLastAlignment) : '')) : (v.odometerAtLastAlignment != null ? String(v.odometerAtLastAlignment) : ''),
      lastAlignment: useFromTrip ? ((form as any).lastAlignment ? toDateInput(String((form as any).lastAlignment)) : (v.lastAlignment ? toDateInput(String(v.lastAlignment)) : '')) : (v.lastAlignment ? toDateInput(String(v.lastAlignment)) : ''),
      lastMaintenance: useFromTrip ? ((form as any).lastMaintenance ? toDateInput(String((form as any).lastMaintenance)) : (v.lastMaintenance ? toDateInput(String(v.lastMaintenance)) : '')) : (v.lastMaintenance ? toDateInput(String(v.lastMaintenance)) : ''),
    })
    setShowVehicleModal(true)
  }
  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault()
    try {
      let shouldUpdateMaster = true
      if (vehicleModalFromTrip && editingTrip) {
        const vehicleIdCandidate = editingVehicle ? editingVehicle.id : ((editingTrip as any).vehicleId ?? null)
        if (vehicleIdCandidate != null) {
          if (editingTrip.completed) {
            const vehicleTrips = trips.filter(t => (t as any).vehicleId === vehicleIdCandidate)
            if (vehicleTrips.length > 0) {
              const ts = (t: any) => t.completed && t.endDate ? new Date(t.endDate).getTime() : new Date(t.date).getTime()
              const latest = vehicleTrips.reduce((a, b) => ts(a) >= ts(b) ? a : b)
              shouldUpdateMaster = latest.id === editingTrip.id
            } else {
              shouldUpdateMaster = true
            }
          } else {
            shouldUpdateMaster = false
          }
        } else {
          shouldUpdateMaster = true
        }
      }

      const payload: any = { plate: vehicleForm.plate || null, model: vehicleForm.model || null, notes: vehicleForm.notes || null }
      if (shouldUpdateMaster) {
        if (vehicleForm.odometer !== '') payload.odometer = Number(String(vehicleForm.odometer).replace(',', '.'))
        if (vehicleForm.nextOilChange) payload.nextOilChange = new Date(vehicleForm.nextOilChange).toISOString()
        if (vehicleForm.odometerAtLastAlignment !== '') payload.odometerAtLastAlignment = Number(String(vehicleForm.odometerAtLastAlignment).replace(',', '.'))
        if (vehicleForm.lastAlignment) payload.lastAlignment = new Date(vehicleForm.lastAlignment).toISOString()
        if (vehicleForm.lastMaintenance) payload.lastMaintenance = new Date(vehicleForm.lastMaintenance).toISOString()
      }

      const url = editingVehicle ? `${API_BASE}/vehicles/${editingVehicle.id}` : `${API_BASE}/vehicles`
      const method = editingVehicle ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Erro')
      addToast(editingVehicle ? 'Veículo atualizado' : 'Veículo criado', 'success')

      if (vehicleModalFromTrip && editingTrip) {
        try {
          const tripPayload: any = {}
          if (editingVehicle) tripPayload.vehicleId = editingVehicle.id
          if (vehicleForm.odometer !== '') tripPayload.odometer = Number(String(vehicleForm.odometer).replace(',', '.'))
          if (vehicleForm.nextOilChange) tripPayload.nextOilChange = new Date(vehicleForm.nextOilChange).toISOString()
          if (vehicleForm.odometerAtLastAlignment !== '') tripPayload.odometerAtLastAlignment = Number(String(vehicleForm.odometerAtLastAlignment).replace(',', '.'))
          if (vehicleForm.lastAlignment) tripPayload.lastAlignment = new Date(vehicleForm.lastAlignment).toISOString()
          if (vehicleForm.lastMaintenance) tripPayload.lastMaintenance = new Date(vehicleForm.lastMaintenance).toISOString()

          if (Object.keys(tripPayload).length) {
            const tres = await fetch(`${API_BASE}/trips/${editingTrip.id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify(tripPayload) })
            if (!tres.ok) throw new Error('Erro ao atualizar viagem')
            addToast('Informações da viagem atualizadas', 'success')
            await fetchTrips()
          }
        } catch (err) {
          addToast('Veículo salvo, mas falha ao atualizar viagem', 'error')
        }
      }

      setVehicleModalFromTrip(false)
      setShowVehicleModal(false); await fetchVehicles()
    } catch { addToast('Erro ao salvar veículo', 'error') }
  }
  async function handleDeleteVehicle(id: number) {
    if (!confirm('Excluir veículo?')) return
    try {
      const res = await fetch(`${API_BASE}/vehicles/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Veículo excluído', 'success'); await fetchVehicles()
    } catch { addToast('Erro ao excluir (pode ter viagens vinculadas)', 'error') }
  }

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVehicleId) return
    try {
      const payload: any = { vehicleId: selectedVehicleId, workerId: expenseForm.workerId ? Number(expenseForm.workerId) : null }
      if (expenseForm.amount) payload.amount = num(expenseForm.amount)
      if (expenseForm.odometer) payload.odometer = Number(expenseForm.odometer)
      if (expenseForm.date) payload.date = expenseForm.date
      if (expenseForm.notes) payload.notes = expenseForm.notes
      if (expenseForm.currency) payload.currency = expenseForm.currency
      if (expenseForm.categoryId) payload.categoryId = Number(expenseForm.categoryId)
      const url = editingExpense ? `${API_BASE}/vehicle-expenses/${editingExpense.id}` : `${API_BASE}/vehicle-expenses`
      const method = editingExpense ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Erro')
      addToast(editingExpense ? 'Despesa atualizada' : 'Despesa criada', 'success')
      setShowExpenseModal(false)
      await fetchVehicleExpenses(selectedVehicleId)
    } catch (err) { addToast('Erro ao salvar despesa', 'error') }
  }

  async function handleDeleteExpense(id: number) {
    if (!confirm('Excluir despesa?')) return
    try {
      const res = await fetch(`${API_BASE}/vehicle-expenses/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Despesa excluída', 'success')
      await fetchVehicleExpenses(selectedVehicleId ?? undefined)
    } catch { addToast('Erro ao excluir despesa', 'error') }
  }

  function openNewServiceType() { setEditingServiceType(null); setServiceTypeForm({ name: '', code: '' }); setShowServiceTypeModal(true) }
  function openEditServiceType(s: { id: number; name: string; code?: string }) { setEditingServiceType(s); setServiceTypeForm({ name: s.name, code: s.code ?? '' }); setShowServiceTypeModal(true) }

  async function handleSaveServiceType(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingServiceType ? `${API_BASE}/service-types/${editingServiceType.id}` : `${API_BASE}/service-types`
      const method = editingServiceType ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(serviceTypeForm) })
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.message || 'Erro') }
      addToast(editingServiceType ? 'Tipo atualizado' : 'Tipo criado', 'success')
      setShowServiceTypeModal(false)
      await fetchServiceTypes()
    } catch (err: any) { addToast(err?.message || 'Erro ao salvar', 'error') }
  }

  async function handleDeleteServiceType(id: number) {
    if (!confirm('Excluir tipo de serviço?')) return
    try {
      const res = await fetch(`${API_BASE}/service-types/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Tipo excluído', 'success')
      await fetchServiceTypes()
    } catch { addToast('Erro ao excluir (pode ter viagens vinculadas)', 'error') }
  }

  function openNewCategory() { setEditingCategory(null); setCategoryForm({ name: '', description: '' }); setShowCategoryModal(true) }
  function openEditCategory(c: ExpenseCategory) { setEditingCategory(c); setCategoryForm({ name: c.name, description: c.description ?? '' }); setShowCategoryModal(true) }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingCategory ? `${API_BASE}/vehicle-expense-categories/${editingCategory.id}` : `${API_BASE}/vehicle-expense-categories`
      const method = editingCategory ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(categoryForm) })
      if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(j?.message || 'Erro') }
      addToast(editingCategory ? 'Categoria atualizada' : 'Categoria criada', 'success')
      setShowCategoryModal(false)
      await fetchExpenseCategories()
    } catch (err: any) { addToast(err?.message || 'Erro ao salvar', 'error') }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Excluir categoria?')) return
    try {
      const res = await fetch(`${API_BASE}/vehicle-expense-categories/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro')
      addToast('Categoria excluída', 'success')
      await fetchExpenseCategories()
    } catch { addToast('Erro ao excluir (pode estar em uso)', 'error') }
  }

  const filtered = (() => {
    const base = trips.filter(isTripVisible)
    return base.sort((a, b) => parseLocalDate(toDateInput(a.date)).getTime() - parseLocalDate(toDateInput(b.date)).getTime())
  })()

  function toggleTraveler(wid: number) {
    setForm(f => {
      const removed = f.travelerIds.includes(wid)
      const travelerIds = removed ? f.travelerIds.filter(x => x !== wid) : [...f.travelerIds, wid]
      const driverIds = removed ? (f.driverIds || []).filter(x => x !== wid) : f.driverIds
      let mealExpense = f.mealExpense
      if (defaultMealExpense != null) {
        const total = defaultMealExpense * travelerIds.length
        mealExpense = total ? String(total) : ''
      }
      return { ...f, travelerIds, driverIds, mealExpense }
    })
    setMealEdited(false)
  }

  function toggleDriver(wid: number) {
    setForm(f => {
      const ids: number[] = f.driverIds || []
      const removed = ids.includes(wid)
      const driverIds = removed ? ids.filter(x => x !== wid) : [...ids, wid]
      return { ...f, driverIds }
    })
  }

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      const hasControl = Array.isArray(roles) && (roles.includes('ADMIN') || roles.includes('Controla viagem') || roles.includes('adm/controla viagens') || roles.includes('adm'))
      setCanViewBoth(hasControl)
      setCanEdit(hasControl)
      if (!hasControl) {
        setListViewMode('pending')
      }
    } catch {
      setCanViewBoth(false)
      setCanEdit(false)
      setListViewMode('pending')
    }
  }, [])

  const renderTripsTable = (list: Trip[], title?: string) => (
    <div style={{ ...cardStyle, padding: 12, marginLeft: 24, marginRight: 24, overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto', borderRadius: 8 }}>
      {title && <h3 style={{ margin: '6px 0 10px 0' }}>{title}</h3>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: `2px solid ${PALETTE.border}` }}>
              <th style={{ padding: '10px 8px', width: 360, position: 'sticky', top: 0, background: PALETTE.cardBg, zIndex: 3 }}>Dia / Data / Tipo</th>
              <th style={{ padding: '10px 8px', position: 'sticky', top: 0, background: PALETTE.cardBg, zIndex: 3 }}>Destino</th>
              <th style={{ padding: '10px 8px', position: 'sticky', top: 0, background: PALETTE.cardBg, zIndex: 3 }}>Veículo</th>
              <th style={{ padding: '10px 8px', position: 'sticky', top: 0, background: PALETTE.cardBg, zIndex: 3 }}>Equipe</th>
              <th style={{ padding: '10px 8px', width: 120, position: 'sticky', top: 0, background: PALETTE.cardBg, zIndex: 3, textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((t, i) => {
              const totalExpense = (num(t.mealExpense) || 0) + sumFuel((t as any).fuelExpense) + (num(t.extraExpense) || 0)
              const expenseStr = money(totalExpense)
              const km = num(t.kmDriven) || 0
              const clientsArr: { name: string; price: number; info?: string }[] = ((): any[] => {
                if (Array.isArray((t as any).tripCities) && (t as any).tripCities.length > 0) {
                  const agg: any[] = []
                  for (const tc of (t as any).tripCities) {
                    if (Array.isArray(tc.clients) && tc.clients.length > 0) {
                      const prices = Array.isArray(tc.prices) ? tc.prices : []
                      const infos = Array.isArray(tc.information) ? tc.information : []
                      for (let idx = 0; idx < tc.clients.length; idx++) {
                        agg.push({ name: tc.clients[idx] ?? '', price: prices[idx] != null ? num(prices[idx]) || 0 : 0, info: infos[idx] ?? '' })
                      }
                    }
                  }
                  if (agg.length > 0) return agg
                }
                if ((t as any).clients && Array.isArray((t as any).clients)) {
                  return (t as any).clients.map((c: any) => ({ name: c.name ?? '', price: num(c.price) || 0, info: c.info ?? '' }))
                }
                if ((t as any).client && Array.isArray((t as any).client)) {
                  const names = (t as any).client as any[]
                  const prices = Array.isArray((t as any).price) ? (t as any).price as any[] : []
                  const infos = Array.isArray((t as any).informationPrice) ? (t as any).informationPrice as any[] : []
                  return names.map((name: any, idx: number) => ({ name: name ?? '', price: prices[idx] != null ? num(prices[idx]) || 0 : 0, info: infos[idx] ?? '' }))
                }
                return [{ name: typeof (t as any).client === 'string' ? (t as any).client : '', price: num(t.price) || 0, info: '' }]
              })()
              const routeStr = (() => {
                if (Array.isArray((t as any).tripCities) && (t as any).tripCities.length > 0) {
                  const names = (t as any).tripCities.map((tc: any) => tc.city?.name ?? '—')
                  return names.join(' -> ')
                }
                return t.city?.name ?? '—'
              })()
              let priceVal = 0
              if (Array.isArray((t as any).tripCities) && (t as any).tripCities.length > 0) {
                priceVal = (t as any).tripCities.reduce((sum: number, tc: any) => {
                  if (Array.isArray(tc.clients) && tc.clients.length > 0) {
                    for (let idx = 0; idx < tc.clients.length; idx++) {
                      const p = tc.prices && tc.prices[idx] != null ? num(tc.prices[idx]) || 0 : 0
                      sum += (p || 0)
                    }
                  }
                  return sum
                }, 0)
              } else {
                priceVal = clientsArr.reduce((s: number, c: any) => s + (num(c.price) || 0), 0)
              }
              const computedCostPerKm = t.costPerKm != null ? num(t.costPerKm) || 0 : (km > 0 ? totalExpense / km : 0)
              const costPerKmStr = money(computedCostPerKm)
              const computedProfitPerKm = t.profitPerKm != null ? num(t.profitPerKm) || 0 : (km > 0 ? ((priceVal - totalExpense) / km) : 0)
              const profitPerKmStr = money(computedProfitPerKm)
              const computedTotalValue = priceVal - totalExpense
              const totalCostStr = money(computedTotalValue)
              const rowBg = expandedIds.includes(t.id)
                ? PALETTE.rowOpen
                : (hoveredRow === t.id ? PALETTE.rowHover : (i % 2 === 0 ? PALETTE.cardBg : PALETTE.hoverBg))
              return (
                <React.Fragment key={t.id}>
                <tr onClick={() => canEdit ? openEditTrip(t) : undefined} onMouseEnter={() => setHoveredRow(t.id)} onMouseLeave={() => setHoveredRow(null)} style={{ cursor: canEdit ? 'pointer' : 'default', borderBottom: `1px solid ${PALETTE.border}`, background: rowBg, transition: 'background 120ms ease' }}>
                  <td style={{ padding: 10, verticalAlign: 'top', color: PALETTE.textSecondary, width: 260, ...cellSingleLine }}>
                    <div style={{ fontWeight: 700 }}>
                      {WEEKDAYS[parseLocalDate(toDateInput(t.date)).getDay()]} - {parseLocalDate(toDateInput(t.date)).toLocaleDateString('pt-BR')}{t.startTime ? ` ${t.startTime}` : ''} - {t.serviceType?.name ?? 'Viagem'}
                    </div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 6 }}>
                      {clientsArr.length === 0 ? '—' : (() => {
                        const c = clientsArr[0]
                        return (
                          <span style={{ display: 'inline-block', marginRight: 8 }}>
                            <strong style={{ fontWeight: 600 }}>{c.name || '—'}</strong>
                            {c.price ? <span style={{ marginLeft: 6, color: PALETTE.textSecondary }}>— {money(c.price)}</span> : null}
                            {c.info ? <span style={{ marginLeft: 6, color: PALETTE.textSecondary }}>({truncate(c.info, 40)})</span> : null}
                            {clientsArr.length > 1 ? <span style={{ marginLeft: 8, color: PALETTE.textSecondary }}>+{clientsArr.length - 1}</span> : null}
                          </span>
                        )
                      })()}
                    </div>
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top', maxWidth: 300, ...cellSingleLine }}>
                    <div style={{ fontWeight: 700, minWidth: 140, ...cellSingleLine }}>{routeStr}</div>
                  </td>
                  <td style={{ padding: 10, verticalAlign: 'top', color: PALETTE.textSecondary, maxWidth: 220, ...cellSingleLine }}>{t.vehicle ? `${t.vehicle.model ?? '—'} ${t.vehicle.plate ? `(${t.vehicle.plate})` : ''}` : '—'}</td>
                  <td style={{ padding: 10, verticalAlign: 'top', color: PALETTE.textSecondary, maxWidth: 420, ...cellSingleLine }}>{Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'}</td>
                  
                  <td style={{ padding: 10, verticalAlign: 'top', textAlign: 'right', width: 120 }} onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedIds(ids => ids.includes(t.id) ? ids.filter(x => x !== t.id) : [...ids, t.id]) }}
                      style={btnSmall as any}
                    >
                      {expandedIds.includes(t.id) ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  </td>
                </tr>
                {expandedIds.includes(t.id) && (
                  <tr key={`exp-${t.id}`} style={{ background: PALETTE.backgroundSecondary }}>
                    <td colSpan={5} style={{ padding: 12, borderBottom: `1px solid ${PALETTE.border}` }}>
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Array.isArray((t as any).tripCities) && (t as any).tripCities.length > 0 ? (
                            (t as any).tripCities.map((tc: any, tcIdx: number) => (
                              <div key={tcIdx} style={{ padding: '6px 0', borderBottom: tcIdx < ((t as any).tripCities.length - 1) ? `1px dashed ${PALETTE.border}` : 'none' }}>
                                <div style={{ fontWeight: 700 }}>{tc.city?.name ?? '—'}</div>
                                <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {Array.isArray(tc.clients) && tc.clients.length > 0 ? (
                                    tc.clients.map((name: any, cidx: number) => {
                                      const price = tc.prices && tc.prices[cidx] != null ? num(tc.prices[cidx]) || 0 : 0
                                      const info = tc.information && tc.information[cidx] ? tc.information[cidx] : ''
                                      return (
                                        <div key={cidx} style={{ display: 'flex', gap: 12 }}>
                                          <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <strong>{name || '—'}</strong>
                                            <span style={{ color: PALETTE.textSecondary }}>{money(price) || '-'}</span>
                                            {info ? (
                                              <span style={{ color: PALETTE.textSecondary }}>
                                                — {truncate(info, 80)}
                                                {info.length > 80 ? (
                                                  <button type="button" onClick={(e) => { e.stopPropagation(); setClientInfoContent({ title: name, text: info }); setShowClientInfoModal(true) }} style={{ ...(btnSmallBlue as any), marginLeft: 8, padding: '6px 8px', fontSize: 12 }}>🔍</button>
                                                ) : null}
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                      )
                                    })
                                  ) : (
                                    clientsArr.map((c, idx) => (
                                      <div key={idx} style={{ display: 'flex', gap: 12 }}>
                                        <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                                          <strong>{c.name || '—'}</strong>
                                          <span style={{ color: PALETTE.textSecondary }}>{money(c.price) || '-'}</span>
                                          {c.info ? <span style={{ color: PALETTE.textSecondary }}>— {truncate(c.info, 80)}</span> : null}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                  {tc.notes ? <div style={{ color: PALETTE.textSecondary }}>Notas: {tc.notes}</div> : null}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {clientsArr.map((c, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 12 }}>
                                  <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <strong>{c.name || '—'}</strong>
                                    <span style={{ color: PALETTE.textSecondary }}>{money(c.price) || '-'}</span>
                                    {c.info ? (
                                      <span style={{ color: PALETTE.textSecondary }}>
                                        — {truncate(c.info, 80)}
                                        {c.info.length > 80 ? (
                                          <button type="button" onClick={(e) => { e.stopPropagation(); setClientInfoContent({ title: c.name, text: c.info }); setShowClientInfoModal(true) }} style={{ ...(btnSmallBlue as any), marginLeft: 8, padding: '6px 8px', fontSize: 12 }}>🔍</button>
                                        ) : null}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ height: 1, background: PALETTE.border, margin: '8px 0' }} />

                      {canViewBoth && t.completed && (
                        <div style={{ marginTop: 8 }}>
                          <strong>Valores por km:</strong>
                          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ fontSize: 13 }}><strong>Custo/km (R$):</strong> {costPerKmStr || '-'}</div>
                            <div style={{ fontSize: 13 }}><strong>Lucro/km (R$):</strong> {profitPerKmStr || '-'}</div>
                            <div style={{ fontSize: 13 }}><strong>Custo total:</strong> {totalCostStr || expenseStr || '-'}</div>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <main style={{ height: '100vh', background: PALETTE.background, color: PALETTE.textPrimary, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ margin: '0 auto', flex: 1, boxSizing: 'border-box', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${PALETTE.border}`, marginBottom: 12 }}>
          <button onClick={() => router.push('/selection')} style={{
            ...btnNav,
            background: 'transparent',
            color: '#FF3B30',
            border: '2px solid #FF3B30',
            fontWeight: 700,
          }}>← Voltar</button>
          <h2 style={{ margin: 0, fontSize: 22 }}>Viagens</h2>
          {canEdit && <button type="button" onClick={() => setShowManageWorkers(true)} style={btnNav}>👷 Trabalhadores</button>}
          <button
            type="button"
            onClick={() => setTripsView(v => {
              const next = v === 'list' ? 'calendar' : 'list'
              if (next === 'calendar') {
                setFilterWorker('')
                setFilterStart('')
                setFilterEnd('')
                setFilterCity('')
                setFilterVehicle('')
                setFilterType('')
                setShowFilters(false)
              }
              return next
            })}
            style={{
              ...btnNav,
              background: tripsView === 'calendar' ? PALETTE.primary : PALETTE.hoverBg,
              color: tripsView === 'calendar' ? '#ffffff' : PALETTE.textSecondary,
              border: tripsView === 'calendar' ? 'none' : `1px solid ${PALETTE.border}`,
              fontWeight: tripsView === 'calendar' ? 700 : 500,
              opacity: tripsView === 'calendar' ? 1 : 0.85,
              transition: 'background 160ms ease, color 160ms ease, opacity 120ms ease',
              marginRight: 6,
            }}
          >
            📅 Calendário
          </button>
          {canEdit && <button onClick={openNewTrip} style={{ ...btnNav, background: PALETTE.success, color: '#fff', border: 'none' }}>+ Nova Viagem</button>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
            <select
              value={filterWorker}
              onChange={e => setFilterWorker(e.target.value)}
              style={{ padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 6, minWidth: 220 }}
            >
              <option value="">Todos os trabalhadores</option>
              {workers.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          
          {/* Notificações de viagens e manutenção */}
          {(() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayIso = isoDate(today)
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tt = isoDate(tomorrow)
            const tripCount = trips.filter(tr => {
              const d = toDateInput(tr.date)
              return (d === todayIso || d === tt) && !tr.completed
            }).length
            const msPerDay = 24 * 60 * 60 * 1000
            const oilItems = (vehicles || []).filter(v => v.nextOilChange).map(v => {
              const iso = toDateInput(String(v.nextOilChange))
              const d = parseLocalDate(iso)
              const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
              return { v, d, diff }
            }).filter(x => x.diff >= 0 && x.diff <= 30)
            const oilCount = oilItems.length

            const alignmentItems = (vehicles || []).filter(v => v.lastAlignment).map(v => {
              const iso = toDateInput(String(v.lastAlignment))
              const d0 = parseLocalDate(iso)
              const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
              d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
              const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
              return { v, d, diff }
            }).filter(x => x.diff >= 0 && x.diff <= 30)
            const alignmentCount = alignmentItems.length

            const maintenanceItems = (vehicles || []).filter(v => v.lastMaintenance).map(v => {
              const iso = toDateInput(String(v.lastMaintenance))
              const d0 = parseLocalDate(iso)
              const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
              d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
              const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
              return { v, d, diff }
            }).filter(x => x.diff >= 0 && x.diff <= 30)
            const maintenanceCount = maintenanceItems.length

            const count = tripCount + oilCount + alignmentCount + maintenanceCount

            return (
              <>
                {(() => {
                  const tripOverdueCount = (trips || []).filter(tr => {
                    if (tr.completed) return false
                    const iso = toDateInput(tr.date)
                    const d = parseLocalDate(iso)
                    return d.getTime() < today.getTime()
                  }).length

                  const msPerDay = 24 * 60 * 60 * 1000
                  const veh = vehicles || []
                  const oilOverdueCount = (veh || []).filter(v => v.nextOilChange).map(v => {
                    const iso = toDateInput(String(v.nextOilChange))
                    const d = parseLocalDate(iso)
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return diff
                  }).filter(diff => diff < 0).length

                  const maintOverdueCount = (veh || []).filter(v => v.lastMaintenance).map(v => {
                    const iso = toDateInput(String(v.lastMaintenance))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return diff
                  }).filter(diff => diff < 0).length

                  const alignOverdueCount = (veh || []).filter(v => v.lastAlignment).map(v => {
                    const iso = toDateInput(String(v.lastAlignment))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                    const diff = Math.floor((d.getTime() - today.getTime()) / msPerDay)
                    return diff
                  }).filter(diff => diff < 0).length

                  const overdueCount = tripOverdueCount + oilOverdueCount + maintOverdueCount + alignOverdueCount
                  if (!overdueCount) return null
                  return (
                    <button
                      ref={overdueRef}
                      type="button"
                      onClick={() => {
                        if (showOverdue) { setShowOverdue(false); return }
                        setShowNotifications(false)
                        const rect = overdueRef.current?.getBoundingClientRect()
                        const popWidth = 520
                        if (rect) {
                          const left = Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8))
                          setOverduePos({ top: rect.bottom + 8 + window.scrollY, left })
                        }
                        setShowOverdue(true)
                      }}
                      title="Atrasos"
                      style={{
                        ...btnNav,
                        marginRight: 8,
                        background: PALETTE.error,
                        color: '#fff',
                        border: `1px solid ${PALETTE.border}`,
                        position: 'relative'
                      }}
                    >
                      ⚠️
                      <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>{overdueCount}</span>
                    </button>
                  )
                })()}
                <button
                ref={notifRef}
                type="button"
                onClick={() => {
                  if (showNotifications) { setShowNotifications(false); return }
                  setShowOverdue(false)
                  const rect = notifRef.current?.getBoundingClientRect()
                  const popWidth = 520
                  if (rect) {
                    const left = Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8))
                    setNotifPos({ top: rect.bottom + 8 + window.scrollY, left })
                  }
                  setShowNotifications(true)
                }}
                title="Notificações"
                style={{
                  ...btnNav,
                  marginRight: 8,
                  background: count > 0 ? PALETTE.success : PALETTE.hoverBg,
                  color: PALETTE.textPrimary,
                  border: `1px solid ${PALETTE.border}`,
                  position: 'relative'
                }}
              >
                🔔
                {count > 0 && (
                  <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>{count}</span>
                )}
              </button>
              </>
            )
          })()}
          <button onClick={() => setTab('trips')} style={{
            ...btnNav,
            background: tab === 'trips' ? PALETTE.primary : PALETTE.hoverBg,
            color: tab === 'trips' ? '#fff' : PALETTE.textPrimary,
            border: tab === 'trips' ? 'none' : `1px solid ${PALETTE.border}`,
            fontWeight: tab === 'trips' ? 700 : 400,
            marginRight: 8,
          }}>📅 Viagens</button>
          <div style={{ position: 'relative' }} ref={burgerRef as any}>
            <button
              type="button"
              onClick={() => setShowBurger(s => !s)}
              aria-expanded={showBurger}
              style={{ ...btnNav, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              ☰ Cadastros adicionais
            </button>
            {showBurger && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`, boxShadow: '0 8px 20px rgba(0,0,0,0.08)', borderRadius: 8, padding: 8, zIndex: 2000 }}>
                <button
                  onClick={() => { setTab('cities'); setShowBurger(false) }}
                  style={{
                    ...btnNav,
                    display: 'block',
                    width: 220,
                    textAlign: 'left',
                    marginBottom: 6,
                    background: tab === 'cities' ? PALETTE.primary : PALETTE.hoverBg,
                    color: tab === 'cities' ? '#ffffff' : PALETTE.textPrimary,
                    border: tab === 'cities' ? 'none' : `1px solid ${PALETTE.border}`,
                    fontWeight: tab === 'cities' ? 700 : 400,
                  }}
                >🏙️ Cidades</button>

                <button
                  onClick={() => { setTab('vehicles'); setShowBurger(false) }}
                  style={{
                    ...btnNav,
                    display: 'block',
                    width: 220,
                    textAlign: 'left',
                    marginBottom: 6,
                    background: tab === 'vehicles' ? PALETTE.primary : PALETTE.hoverBg,
                    color: tab === 'vehicles' ? '#ffffff' : PALETTE.textPrimary,
                    border: tab === 'vehicles' ? 'none' : `1px solid ${PALETTE.border}`,
                    fontWeight: tab === 'vehicles' ? 700 : 400,
                  }}
                >🚗 Veículos</button>

                <button
                  onClick={() => { setTab('serviceTypes'); setShowBurger(false) }}
                  style={{
                    ...btnNav,
                    display: 'block',
                    width: 220,
                    textAlign: 'left',
                    background: tab === 'serviceTypes' ? PALETTE.primary : PALETTE.hoverBg,
                    color: tab === 'serviceTypes' ? '#ffffff' : PALETTE.textPrimary,
                    border: tab === 'serviceTypes' ? 'none' : `1px solid ${PALETTE.border}`,
                    fontWeight: tab === 'serviceTypes' ? 700 : 400,
                  }}
                >🛠️ Tipos</button>

                {canEdit && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      onClick={() => { setShowSettingsModal(true); setShowBurger(false) }}
                      style={{
                        ...btnNav,
                        display: 'block',
                        width: 220,
                        textAlign: 'left',
                        background: showSettingsModal ? PALETTE.primary : PALETTE.hoverBg,
                        color: showSettingsModal ? '#ffffff' : PALETTE.textPrimary,
                        border: showSettingsModal ? 'none' : `1px solid ${PALETTE.border}`,
                        fontWeight: showSettingsModal ? 700 : 400,
                      }}
                    >⚙️ Padrões</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {tripsView !== 'calendar' && (
          <div style={{ marginBottom: 12, padding: '0 24px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={() => setShowFilters(s => !s)} style={{ ...btnNav }}>
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>

            <div style={{ width: 8 }} />

            {canViewBoth && (
              <button type="button" onClick={() => setListViewMode('both')} style={{
                ...btnNav,
                background: listViewMode === 'both' ? PALETTE.primary : PALETTE.hoverBg,
                color: listViewMode === 'both' ? '#fff' : PALETTE.textPrimary,
                border: listViewMode === 'both' ? 'none' : `1px solid ${PALETTE.border}`,
              }}>Ambas</button>
            )}

            <button type="button" onClick={() => setListViewMode('pending')} style={{
              ...btnNav,
              background: listViewMode === 'pending' ? PALETTE.primary : PALETTE.hoverBg,
              color: listViewMode === 'pending' ? '#fff' : PALETTE.textPrimary,
              border: listViewMode === 'pending' ? 'none' : `1px solid ${PALETTE.border}`,
            }}>Pendentes</button>

            <button type="button" onClick={() => setListViewMode('completed')} style={{
              ...btnNav,
              background: listViewMode === 'completed' ? PALETTE.primary : PALETTE.hoverBg,
              color: listViewMode === 'completed' ? '#fff' : PALETTE.textPrimary,
              border: listViewMode === 'completed' ? 'none' : `1px solid ${PALETTE.border}`,
            }}>Concluídas</button>
          </div>
        )}

        {/* Tab de viagens */}
        {tab === 'trips' && (
          tripsView === 'calendar' ? (
            <div style={{ ...cardStyle, marginLeft: 24, marginRight: 24, padding: 12, height: '85%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} style={btnSmall}>◀</button>
                <h3 style={{ margin: 0, fontSize: 16, minWidth: 120 }}>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={calMonth.getMonth()}
                    onChange={e => setCalMonth(new Date(calMonth.getFullYear(), Number(e.target.value), 1))}
                    style={{ padding: 6, width: 150, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 6 }}
                  >
                    {MONTHS.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
                  </select>
                  <select
                    value={calMonth.getFullYear()}
                    onChange={e => setCalMonth(new Date(Number(e.target.value), calMonth.getMonth(), 1))}
                    style={{ padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 6 }}
                  >
                    {(() => {
                      const cur = calMonth.getFullYear()
                      const arr: number[] = []
                      for (let y = cur - 5; y <= cur + 5; y++) arr.push(y)
                      return arr.map(y => <option key={y} value={y}>{y}</option>)
                    })()}
                  </select>
                  </div>
                <button
                  onClick={() => setCalMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}
                  style={{ ...btnSmall, minWidth: 72 }}
                  title="Ir para o mês atual"
                >
                  Hoje
                </button>
                <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={btnSmall}>▶</button>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 12 }} title="Legenda de cores">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: PALETTE.success }} />
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Concluída</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: PALETTE.warning }} />
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Programada</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: PALETTE.error }} />
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Não concluído</div>
                    </div>
                  </div>
                <div style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, height: '92%' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
                    {WEEKDAYS.map(d => (
                      <div key={d} style={{ textAlign: 'center', padding: '8px 6px', height: 44, maxHeight: 44, borderBottom: `2px solid ${PALETTE.border}`, background: PALETTE.backgroundSecondary, fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{d}</div>
                    ))}
                    {calendarDays.map((d, i) => {
                      const tlist = tripsForDate(d.date)
                      const isToday = isoDate(d.date) === isoDate(new Date())
                      const hols = holidays.filter(h => isoDate(parseLocalDate(h.date.slice(0, 10))) === isoDate(d.date))
                      const isHoliday = hols.length > 0
                      const baseBg = isHoliday
                        ? 'linear-gradient(135deg, #b8860b22 0%, #daa52044 50%, #b8860b22 100%)'
                        : (!d.current ? PALETTE.notCurrentBg : isToday ? PALETTE.todayBg : PALETTE.cardBg)
                      return (
                        <div
                          key={i}
                          style={{
                            ...cellStyle,
                            background: baseBg,
                            border: isToday ? `2px solid ${PALETTE.primary}` : isHoliday ? '1px solid #daa520' : `1px solid ${PALETTE.border}`,
                            boxShadow: isHoliday ? '0 0 8px #daa52033, inset 0 0 12px #daa52011' : undefined,
                            opacity: d.current ? 1 : 0.4,
                            cursor: 'pointer',
                            transition: 'transform 200ms ease, box-shadow 200ms ease',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                          onClick={() => { setSelectedDay(d.date) }}
                        >
                          {isHoliday && (
                            <span
                              onClick={(e) => { e.stopPropagation(); setHolidayModalData(hols) }}
                              title={hols.map(h => h.name).join(', ')}
                              style={{
                                position: 'absolute', right: 3, top: 2, zIndex: 2,
                                fontSize: 17, cursor: 'pointer', lineHeight: 1,
                                filter: 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))',
                                opacity: d.current ? 1 : 0.6,
                                transition: 'transform 0.2s ease, filter 0.2s ease',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.35) rotate(15deg)'; e.currentTarget.style.filter = 'drop-shadow(0 2px 6px rgba(218,165,32,0.9))' }}
                              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))' }}
                            >⭐</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px 2px' }}>
                            <span style={{ fontWeight: 600, fontSize: 20, color: isHoliday ? '#daa520' : undefined }}>{d.date.getDate()}</span>
                          </div>
                          {isHoliday && hols.map(h => (
                            <div key={`h-${h.id}`} title={h.name} style={{
                              fontSize: 11, fontWeight: 700, padding: '1px 4px', margin: '0 3px 2px',
                              borderRadius: 3, textAlign: 'center',
                              background: '#FF6A00', color: '#ffffff',
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                              letterSpacing: '0.03em', textTransform: 'uppercase',
                              opacity: d.current ? 1 : 0.65,
                            }}>{h.name}</div>
                          ))}
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 4px 4px', marginTop: 'auto' }}>
                            {tlist.slice(0, 2).map((t, idx) => {
                              const displayed = Math.min(tlist.length, 2)
                              const showMore = idx === displayed - 1 && tlist.length > displayed
                              const moreCount = tlist.length - displayed
                              return (
                                <div
                                  key={t.id}
                                  onClick={(e) => { e.stopPropagation(); setSelectedDay(d.date); setPanelOpen(true) }}
                                  title={t.serviceType?.name ?? 'Viagem'}
                                  style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontSize: 13, padding: '1px 4px', borderRadius: 3, marginBottom: 1,
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer'
                                  }}
                                >
                                  {
                                    (() => {
                                      const today = new Date()
                                      today.setHours(0, 0, 0, 0)
                                      const tripDay = parseLocalDate(toDateInput(t.date))
                                      tripDay.setHours(0, 0, 0, 0)
                                      const eventColor = t.completed ? PALETTE.success : (tripDay.getTime() >= today.getTime() ? PALETTE.warning : PALETTE.error)
                                      const textColor = eventColor === PALETTE.warning ? '#000000' : '#ffffff'
                                      return (
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: eventColor, color: textColor, borderRadius: 3, padding: '2px 6px' }}>
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 'calc(100% - 24px)' }}>{t.serviceType?.name ?? 'Viagem'}</span>
                                          {showMore && (
                                            <span style={{ marginLeft: 6, fontSize: 11, color: textColor, flexShrink: 0 }}>+{moreCount}</span>
                                          )}
                                        </div>
                                      )
                                    })()
                                  }
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* viagens concluidas/pendentes */}
                <div style={{ width: 420, minWidth: 240, maxHeight: '100%', overflowY: 'auto' }}>
                  {(() => {
                    const base = trips.filter(isTripVisible)
                    const list = sidebarFilter === 'completed' ? base.filter(t => t.completed) : base.filter(t => !t.completed)
                    return (
                      <div style={{ padding: 8, height: '100%', borderRadius: 8, background: PALETTE.backgroundSecondary, border: `1px solid ${PALETTE.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <strong>{sidebarFilter === 'completed' ? 'Viagens concluídas' : 'Viagens pendentes'}</strong>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setSidebarFilter('completed')} style={{ ...(btnSmallBlue as any), ...(sidebarFilter === 'completed' ? { background: PALETTE.primary, color: '#fff', border: 'none' } : {}) }}>Completas</button>
                            <button type="button" onClick={() => setSidebarFilter('pending')} style={{ ...(btnSmallBlue as any), ...(sidebarFilter === 'pending' ? { background: PALETTE.primary, color: '#fff', border: 'none' } : {}) }}>Pendentes</button>
                          </div>
                        </div>
                        {list.length === 0 && <div style={{ color: PALETTE.textSecondary }}>{sidebarFilter === 'completed' ? 'Nenhuma viagem marcada como concluída.' : 'Nenhuma viagem pendente.'}</div>}
                          {list.slice().sort((a, b) => parseLocalDate(toDateInput(b.date)).getTime() - parseLocalDate(toDateInput(a.date)).getTime()).map(t => {
                          const equipe = Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'
                          return (
                            <div
                              key={t.id}
                              onClick={() => canEdit ? openEditTrip(t) : undefined}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderRadius: 6, background: PALETTE.cardBg, marginBottom: 6, cursor: canEdit ? 'pointer' : 'default', border: `1px solid ${PALETTE.border}`, transition: 'transform 200ms ease, box-shadow 200ms ease' }}
                            >
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{(t.serviceType?.name ?? 'Viagem')}{(t as any).clients && Array.isArray((t as any).clients) ? ` - ${(t as any).clients.map((c: any) => c.name).join(', ')}` : (t.client ? ` - ${t.client}` : '')}</div>
                                <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>{parseLocalDate(toDateInput(t.date)).toLocaleDateString('pt-BR')} — {t.city?.name ?? '—'}</div>
                                <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Equipe: {equipe}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* detalhes do dia */}
              {selectedDay && (() => {
                const dayTrips = tripsForDate(selectedDay)
                const dayOfWeek = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][selectedDay.getDay()]
                return (
                  <div style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1000 }}
                    onClick={e => { if (e.target === e.currentTarget) { setPanelOpen(false); setTimeout(() => setSelectedDay(null), 300) } }}>
                    <div style={{
                      width: 420, maxWidth: '95%', height: '100vh', overflow: 'auto',
                      background: PALETTE.cardBg, padding: 0,
                      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
                      display: 'flex', flexDirection: 'column',
                      transform: panelOpen ? 'translateX(0%)' : 'translateX(100%)',
                      transition: 'transform 280ms cubic-bezier(.2,.9,.2,1)',
                      willChange: 'transform',
                    }}>
                      <div style={{ padding: '20px 24px', borderBottom: `1px solid ${PALETTE.border}`, background: PALETTE.backgroundSecondary }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <h2 style={{ margin: 0, fontSize: 18 }}>{new Date(selectedDay).toLocaleDateString('pt-BR')}</h2>
                            <div style={{ fontSize: 13, color: PALETTE.textSecondary, marginTop: 4 }}>{dayOfWeek}</div>
                          </div>
                          <button onClick={() => { setPanelOpen(false); setTimeout(() => setSelectedDay(null), 300) }} style={{ background: PALETTE.hoverBg, border: `1px solid ${PALETTE.border}`, borderRadius: 6, color: PALETTE.textPrimary, cursor: 'pointer', padding: '6px 12px', fontSize: 14, fontWeight: 600 }}>✕</button>
                        </div>
                      </div>

                      <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {dayTrips.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma viagem neste dia.</div>}
                        {dayTrips.map(t => {
                          const displayDate = parseLocalDate(toDateInput(t.date))
                          const tripDateStr = displayDate.toLocaleDateString('pt-BR')
                          const tripDayOfWeek = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][displayDate.getDay()]
                          const typeName = t.serviceType?.name ?? 'Viagem'
                          const destino = t.city?.name ?? '—'
                          const veiculo = t.vehicle ? `${t.vehicle.model ?? '—'}${t.vehicle.plate ? ` (${t.vehicle.plate})` : ''}` : '—'
                          const drivers = (t.drivers || []).map((w: any) => w.name)
                          const travelers = (t.travelers || []).map((w: any) => w.name)
                          const equipeNames = Array.from(new Set([...drivers, ...travelers]))
                          const equipeStr = equipeNames.length ? equipeNames.join(', ') : '—'
                          const today = new Date()
                          today.setHours(0,0,0,0)
                          const tripDay = parseLocalDate(toDateInput(t.date))
                          tripDay.setHours(0,0,0,0)
                          const eventColor = t.completed ? PALETTE.success : (tripDay.getTime() >= today.getTime() ? PALETTE.warning : PALETTE.error)
                          const textOnWarning = '#000000'
                          const textColor = eventColor === PALETTE.warning ? textOnWarning : '#ffffff'
                          return (
                            <div
                              key={t.id}
                              onClick={() => canEdit ? openEditTrip(t) : undefined}
                              style={{ padding: '10px 12px', borderRadius: 8, background: PALETTE.backgroundSecondary, border: `1px solid ${PALETTE.border}`, cursor: canEdit ? 'pointer' : 'default', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: `6px solid ${eventColor}` }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 700 }}>{`${tripDayOfWeek} - ${tripDateStr} - ${typeName}`}</div>
                                <div style={{ width: 10, height: 10, borderRadius: 6, background: eventColor }} />
                              </div>
                              <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>Destino: {destino}</div>
                              <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>Veículo: {veiculo}</div>
                              <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>Equipe: {equipeStr}</div>
                            </div>
                          )
                        })}
                      </div>

                        <div style={{ padding: '12px 20px', borderTop: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, position: 'sticky', bottom: 0 }}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTrip(null)
                              setForm({ ...EMPTY_FORM, date: selectedDay.toISOString().slice(0, 10), startTime: '', endDate: selectedDay.toISOString().slice(0, 10), mealExpense: defaultMealExpense != null ? formatTwo(defaultMealExpense) : '' })
                              setMealEdited(false)
                              
                              setSkipInitialCalc(true)
                              setShowTripModal(true)
                            }}
                            style={{ ...(btnPrimary as any), width: '100%' }}
                          >
                            Agendar viagem neste dia
                          </button>
                        ) : (
                          <button type="button" disabled style={{ ...(btnPrimary as any), width: '100%', opacity: 0.6, cursor: 'not-allowed' }}>Sem permissão</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <>
          <div
            aria-hidden={!showFilters}
            style={{
              ...cardStyle,
              marginBottom: 12,
              overflow: 'hidden',
              marginLeft: 24, marginRight: 24,
              maxHeight: showFilters ? 520 : 0,
              transition: 'max-height 320ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease',
              opacity: showFilters ? 1 : 0,
              pointerEvents: showFilters ? 'auto' : 'none',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end', padding: 8 }}>
              <div>
                <label style={labelStyle}>Data Início</label>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ ...inputStyle, width: 150 }} />
              </div>
              <div>
                <label style={labelStyle}>Data Fim</label>
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} style={{ ...inputStyle, width: 150 }} />
              </div>
              <div>
                <label style={labelStyle}>Cidade</label>
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} style={{ ...selectStyle, width: 160 }}>
                  <option value="">Todas</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Veículo</label>
                <select value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)} style={{ ...selectStyle, width: 180 }}>
                  <option value="">Todos</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.model ?? '—'}{v.plate ? ` (${v.plate})` : ''}</option>)}
                </select>
              </div>
              <div>
                      <label style={labelStyle}>Tipo</label>
                      <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...selectStyle, width: 140 }}>
                        <option value="">Todos</option>
                        {serviceTypes.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
              </div>
              
            </div>
          </div>

          {loading && <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Carregando...</div>}
          {!loading && filtered.length === 0 && <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Nenhuma viagem encontrada.</div>}

          {(() => {
            const completedList = filtered.filter(t => t.completed)
            const pendingList = filtered.filter(t => !t.completed)

            if (loading) return <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Carregando...</div>
            if (!loading && filtered.length === 0) return <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Nenhuma viagem encontrada.</div>

            if (listViewMode === 'both') {
              return (
                <>
                  {renderTripsTable(pendingList, 'Viagens Pendentes')}
                  <div style={{ height: 12 }} />
                  {renderTripsTable(completedList, 'Viagens Concluídas')}
                </>
              )
            }

            if (listViewMode === 'pending') return renderTripsTable(pendingList)
            if (listViewMode === 'completed') return renderTripsTable(completedList)

            return null
          })()}
          </>
          )
        )}

        {/* Tab de cidades */}
        {tab === 'cities' && <>
          <div style={{ display: 'flex', padding: '0 24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Cidades</h3>
            {canEdit && <button onClick={openNewCity} style={btnPrimary as any}>+ Nova Cidade</button>}
          </div>
          <div style={{ display: 'grid', padding: '0 24px', gap: 6 }}>
            {cities.map(c => (
              <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.state && <span style={{ color: PALETTE.textSecondary, marginLeft: 6, fontSize: 13 }}>— {c.state}</span>}
                  {c.country && c.country !== 'BR' && <span style={{ color: PALETTE.textSecondary, marginLeft: 4, fontSize: 12 }}>({c.country})</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {canEdit ? (
                    <>
                      <button onClick={() => openEditCity(c)} style={btnSmallBlue as any}>Editar</button>
                      <button onClick={() => handleDeleteCity(c.id)} style={btnSmallRed as any}>Excluir</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {cities.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma cidade cadastrada.</div>}
          </div>
        </>}

        {/* Tab de veiculos */}
        {tab === 'vehicles' && <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '0 24px' }}>
            {/* Lista de veículos */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>Veículos</h3>
                {canEdit && <button onClick={openNewVehicle} style={btnPrimary as any}>+ Novo Veículo</button>}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {vehicles.map(v => (
                  <div key={v.id} onClick={() => setSelectedVehicleId(v.id)} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: selectedVehicleId === v.id ? PALETTE.hoverBg : undefined }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{v.model ?? '—'}</span>
                      {v.plate && <span style={{ color: PALETTE.textSecondary, marginLeft: 8, fontSize: 13 }}>Placa: {v.plate}</span>}
                      {v.notes && <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>{v.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {canEdit ? (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); openEditVehicle(v); setSelectedVehicleId(v.id) }} style={btnSmallBlue as any}>Editar</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteVehicle(v.id); if (selectedVehicleId === v.id) setSelectedVehicleId(null) }} style={btnSmallRed as any}>Excluir</button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
                {vehicles.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhum veículo cadastrado.</div>}
              </div>
            </div>

            <div style={{ width: 1, background: PALETTE.border, alignSelf: 'stretch', margin: '0 8px' }} />

            {/* Lista de despesas do veículo selecionado */}
            <div style={{ width: 560, minWidth: 320 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0 }}>{selectedVehicleId ? 'Despesas do Veículo' : 'Despesas (selecione um veículo)'}</h3>
                {selectedVehicleId && (
                  <div>
                    {canEdit && <button onClick={() => { setEditingExpense(null); setExpenseForm({ date: '', categoryId: '', amount: '', currency: 'BRL', odometer: '', receiptUrl: '', notes: '', workerId: '' }); setShowExpenseModal(true) }} style={btnPrimary as any}>+ Nova Despesa</button>}
                    <button onClick={() => setShowCategories(s => !s)} style={{ ...btnNav, marginLeft: 8 }}>{showCategories ? 'Ocultar Categorias' : 'Mostrar Categorias'}</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {!selectedVehicleId && <div style={{ color: PALETTE.textSecondary }}>Selecione um veículo à esquerda.</div>}
                {selectedVehicleId && loadingExpenses && <div style={{ color: PALETTE.textSecondary }}>Carregando despesas...</div>}
                {selectedVehicleId && !loadingExpenses && vehicleExpenses.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma despesa registrada.</div>}
                {selectedVehicleId && vehicleExpenses.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(e => (
                  <div key={e.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{new Date(e.date).toLocaleDateString('pt-BR')} {e.category ? `— ${e.category.name}` : ''}</div>
                      {e.notes && <div style={{ color: PALETTE.textSecondary, marginTop: 6 }}>{truncate(e.notes, 120)}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <div style={{ fontWeight: 700 }}>{money(e.amount)}</div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {canEdit ? (
                            <>
                              <button onClick={() => { setEditingExpense(e); setExpenseForm({ date: toDateInput(e.date), categoryId: e.category ? String(e.category.id) : '', amount: formatTwo(e.amount ?? ''), currency: e.currency ?? 'BRL', odometer: e.odometer ?? '', receiptUrl: e.receiptUrl ?? '', notes: e.notes ?? '', workerId: e.workerId ?? '' }); setShowExpenseModal(true) }} style={btnSmallBlue as any}>Editar</button>
                              <button onClick={() => handleDeleteExpense(e.id)} style={btnSmallRed as any}>Excluir</button>
                            </>
                          ) : null}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showCategories && <div style={{ width: 1, background: PALETTE.border, alignSelf: 'stretch', margin: '0 8px' }} />}

            {showCategories && (
              <div style={{ width: 420, minWidth: 260 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Categorias de Despesa</h3>
                  {canEdit && <button onClick={openNewCategory} style={btnPrimary as any}>+ Nova Categoria</button>}
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {expenseCategories.map(c => (
                    <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        {c.description && <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>{truncate(c.description, 80)}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit ? (
                          <>
                            <button onClick={() => openEditCategory(c)} style={btnSmallBlue as any}>Editar</button>
                            <button onClick={() => handleDeleteCategory(c.id)} style={btnSmallRed as any}>Excluir</button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {expenseCategories.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma categoria cadastrada.</div>}
                </div>
              </div>
            )}
          </div>
        </>}

        {/* Tab de tipos de serviço */}
        {tab === 'serviceTypes' && <>
          <div style={{ display: 'flex', padding: '0 24px', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Tipos</h3>
            {canEdit && <button onClick={openNewServiceType} style={btnPrimary as any}>+ Novo Tipo</button>}
          </div>
          <div style={{ display: 'grid', padding: '0 24px', gap: 6 }}>
            {serviceTypes.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  {s.code && <span style={{ color: PALETTE.textSecondary, marginLeft: 6, fontSize: 13 }}>— {s.code}</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {canEdit ? (
                    <>
                      <button onClick={() => openEditServiceType(s)} style={btnSmallBlue as any}>Editar</button>
                      <button onClick={() => handleDeleteServiceType(s.id)} style={btnSmallRed as any}>Excluir</button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
            {serviceTypes.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhum tipo cadastrado.</div>}
          </div>
        </>}

      </div>

      {showTripModal && (
        <div style={overlay} onClick={() => setShowTripModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingTrip ? 'Editar Viagem' : 'Nova Viagem'}</h3>
            <form onSubmit={handleSaveTrip}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr 1fr 1fr', gap: 8 }}>
                    <div>
                      <label style={labelStyle}>Data *</label>
                      <input
                        required
                        type="date"
                        value={form.date}
                        onChange={e => {
                          const newDate = e.target.value
                          setForm(f => {
                            const prevDate = f.date
                            const shouldSyncEnd = !f.endDate || f.endDate === prevDate
                            return { ...f, date: newDate, endDate: shouldSyncEnd ? newDate : f.endDate }
                          })
                        }}
                        style={ inputStyle }
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Hora Saída</label>
                      <input
                        type="time"
                        value={(form as any).startTime || ''}
                        onChange={e => setForm({ ...form, startTime: e.target.value })}
                        style={inputStyle}
                      />
                    </div>                    
                    <div>
                      <label style={labelStyle}>Veículo</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <select
                          value={(form as any).vehicleId || ''}
                          onChange={e => {
                            const val = e.target.value
                            setForm(f => {
                              const newForm: any = { ...f, vehicleId: val }
                              const vid = Number(val)
                              const v = vehicles.find(x => x.id === vid)
                              if (v) {
                                if (!newForm.odometer && v.odometer != null) newForm.odometer = String(v.odometer)
                                if (!newForm.nextOilChange && v.nextOilChange) newForm.nextOilChange = toDateInput(String(v.nextOilChange))
                                if (!newForm.lastAlignment && v.lastAlignment) newForm.lastAlignment = toDateInput(String(v.lastAlignment))
                                if (!newForm.odometerAtLastAlignment && v.odometerAtLastAlignment != null) newForm.odometerAtLastAlignment = String(v.odometerAtLastAlignment)
                                if (!newForm.lastMaintenance && v.lastMaintenance) newForm.lastMaintenance = toDateInput(String(v.lastMaintenance))
                              }
                              return newForm
                            })
                          }}
                          style={{ ...selectStyle, flex: 1 }}
                        >
                          <option value="">Selecione...</option>
                          {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.model ?? v.plate ?? v.id}</option>
                          ))}
                        </select>

                        {editingTrip?.completed && (
                          <button
                            type="button"
                            onClick={() => {
                              const vid = Number((form as any).vehicleId)
                              if (!vid) { addToast('Selecione um veículo primeiro', 'error'); return }
                              const v = vehicles.find(x => x.id === vid)
                              if (!v) { addToast('Veículo não encontrado', 'error'); return }
                              openEditVehicle(v, true)
                            }}
                            style={{ ...(btnSmall as any), padding: '6px 8px' }}
                          >Editar</button>
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Tipo *</label>
                      <select value={form.serviceTypeId} onChange={e => setForm({ ...form, serviceTypeId: e.target.value })} style={selectStyle}>
                        <option value="">Selecione...</option>
                        {serviceTypes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={labelStyle}>Cidades & Clientes *</label>
                        </div>
                        <div>
                          <button type="button" onClick={() => setShowCitiesClientsModal(true)} style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}>Cidades/Clientes</button>
                        </div>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        {((form as any).cities || []).length === 0 ? (
                          <div style={{ color: PALETTE.textSecondary }}>Nenhuma cidade adicionada. Abra Cidades/Clientes para adicionar.</div>
                        ) : (
                          (form as any).cities.map((cityBlock: any, ci: number) => (
                            <div key={ci} style={{ marginTop: 8, padding: 8, border: `1px dashed ${PALETTE.border}`, borderRadius: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontWeight: 600 }}>
                                  {cities.find((c: any) => String(c.id) === String(cityBlock.cityId))?.name || 'Cidade não selecionada'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ color: PALETTE.textSecondary, fontSize: 12 }}>{(cityBlock.clients || []).length} cliente(s)</div>
                                  {((form as any).cities || []).length > 1 ? (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button
                                        type="button"
                                        onClick={() => setForm(f => {
                                          const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                          if (ci <= 0) return f
                                          const tmp = cities[ci - 1]
                                          cities[ci - 1] = cities[ci]
                                          cities[ci] = tmp
                                          return { ...f, cities }
                                        })}
                                        style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                                        title="Mover para cima"
                                      >▲</button>

                                      <button
                                        type="button"
                                        onClick={() => setForm(f => {
                                          const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                          if (ci >= cities.length - 1) return f
                                          const tmp = cities[ci + 1]
                                          cities[ci + 1] = cities[ci]
                                          cities[ci] = tmp
                                          return { ...f, cities }
                                        })}
                                        style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                                        title="Mover para baixo"
                                      >▼</button>

                                      <button
                                        type="button"
                                        onClick={() => setForm(f => {
                                          const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                          cities.splice(ci, 1)
                                          return { ...f, cities }
                                        })}
                                        style={{ ...(btnSmallRed as any), padding: '6px 8px' }}
                                      >Remover</button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div>
                    <label style={labelStyle}>Passageiros</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {workers.map(w => (
                        <button key={w.id} type="button" onClick={() => toggleTraveler(w.id)} style={{
                          fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
                          background: form.travelerIds.includes(w.id) ? PALETTE.primary : PALETTE.hoverBg,
                          color: form.travelerIds.includes(w.id) ? '#fff' : PALETTE.textPrimary,
                          fontWeight: form.travelerIds.includes(w.id) ? 600 : 400,
                        }}>
                          {w.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <label style={labelStyle}>Motorista</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {workers.filter(w => form.travelerIds.includes(w.id)).map(w => (
                        <button key={w.id} type="button" onClick={() => toggleDriver(w.id)} style={{
                          fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
                          background: (form.driverIds || []).includes(w.id) ? PALETTE.primary : PALETTE.hoverBg,
                          color: (form.driverIds || []).includes(w.id) ? '#fff' : PALETTE.textPrimary,
                          fontWeight: (form.driverIds || []).includes(w.id) ? 600 : 400,
                        }}>
                          {w.name}
                        </button>
                      ))}
                      {form.travelerIds.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Selecione passageiros primeiro.</div>}
                    </div>
                  </div>

                  {!editingTrip?.completed && (
                    <div style={{ marginTop: 12 }}>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>Alimentação (R$)</label>
                      <div style={moneyWrapper}>
                        <CurrencyInput
                          value={form.mealExpense}
                          onChange={v => setForm({ ...form, mealExpense: v })}
                          inputStyle={inputStyle}
                          onRawChange={() => setMealEdited(true)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {editingTrip?.completed ? (
                <div style={{ marginTop: 12, borderTop: `1px solid ${PALETTE.border}`, paddingTop: 10 }}>
                  <label style={{ ...labelStyle, marginBottom: 8 }}>Despesas & Quilometragem</label>

                  <div style={{ display: 'grid', gap: 12 }}>
                    {/* Grupo: Despesas */}
                    <div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Alimentação (R$)</label>
                            <div style={moneyWrapper}>
                              <CurrencyInput
                                value={form.mealExpense}
                                onChange={v => setForm({ ...form, mealExpense: v })}
                                inputStyle={inputStyle}
                                onRawChange={() => setMealEdited(true)}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Combustível (R$)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1 }}>
                                <CurrencyInput
                                  value={form.fuelExpense}
                                  onChange={v => setForm({ ...form, fuelExpense: v })}
                                  inputStyle={inputStyle}
                                  rightButton={num(form.fuelExpense) > 0 ? (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowFuelNoteModal(true) }} style={{ ...(btnSmallBlue as any), padding: '6px 8px', fontSize: 12 }}>📝</button>
                                  ) : undefined}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Extra (R$)</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ flex: 1 }}>
                                <CurrencyInput
                                  value={form.extraExpense}
                                  onChange={v => setForm({ ...form, extraExpense: v })}
                                  inputStyle={inputStyle}
                                  rightButton={num(form.extraExpense) > 0 ? (
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowExtraNoteModal(true) }} style={{ ...(btnSmallBlue as any), padding: '6px 8px', fontSize: 12 }}>📝</button>
                                  ) : undefined}
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Km Rodados</label>
                            <CurrencyInput
                              value={form.kmDriven}
                              onChange={v => setForm({ ...form, kmDriven: v })}
                              inputStyle={inputStyle}
                              showPrefix={false}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Consumo Médio (km/l)</label>
                            <CurrencyInput
                              value={form.avgConsumption}
                              onChange={v => setForm({ ...form, avgConsumption: v })}
                              inputStyle={inputStyle}
                              showPrefix={false}
                            />
                          </div>
                          <div>
                            <label style={{ ...labelStyle, fontSize: 11 }}>Autonomia Restante (Km)</label>
                            <div style={moneyWrapper}>
                              <CurrencyInput
                                value={form.remainingAutonomy}
                                onChange={v => setForm({ ...form, remainingAutonomy: v })}
                                inputStyle={inputStyle}
                                showPrefix={false}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Cálculos</label>
                    </div>
                    <div />
                  </div>

                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Custo/km (R$)</label>
                        <div style={moneyWrapper}>
                        <CurrencyInput
                          value={form.costPerKm}
                          onChange={v => setForm({ ...form, costPerKm: v })}
                          inputStyle={inputStyle}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Lucro/km (R$)</label>
                      <div style={moneyWrapper}>
                        <CurrencyInput
                          value={form.profitPerKm}
                          onChange={v => setForm({ ...form, profitPerKm: v })}
                          inputStyle={inputStyle}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ ...labelStyle, fontSize: 11 }}>Total (R$)</label>
                      <div style={moneyWrapper}>
                        <CurrencyInput
                          value={form.total}
                          onChange={v => setForm({ ...form, total: v })}
                          inputStyle={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={1} style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} />
              </div>

              {editingTrip && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={async () => {
                      if (!editingTrip) return
                      if (!editingTrip.completed) {
                        const dateOnly = toDateInput(editingTrip.date)
                        const endIso = new Date(parseLocalDate(dateOnly)).toISOString()
                        await handleMarkComplete(editingTrip)
                        setEditingTrip(et => et ? { ...et, completed: true, endDate: endIso } : et)
                        setForm(f => ({ ...f, endDate: endIso }))
                      } else {
                        await handleMarkIncomplete(editingTrip)
                        setEditingTrip(et => et ? { ...et, completed: false, endDate: null } : et)
                        setForm(f => ({ ...f, endDate: null }))
                      }
                    }}
                      style={editingTrip.completed ? { ...(btnSmallBlue as any), padding: '8px 12px', fontSize: 14, background: '#2ecc71', color: '#fff' } : { ...(btnSmallBlue as any), padding: '8px 12px', fontSize: 14 }}>
                      {!editingTrip.completed ? 'Marcar como completa' : 'Marcar como pendente'}
                    </button>
                    {editingTrip.completed && (
                      <input
                        type="date"
                        value={form.endDate ? form.endDate.slice(0, 10) : ''}
                        onChange={e => setForm(f => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                        style={{ ...inputStyle, width: 160, alignSelf: 'center' }}
                      />
                    )}
                    <button type="button" onClick={() => { setConfirmDelete(editingTrip); setShowTripModal(false) }} style={{ ...(btnSmallRed as any), padding: '8px 12px', fontSize: 14 }}>Excluir viagem</button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => setShowTripModal(false)} style={btnCancel as any}>Cancelar</button>
                    <button type="submit" style={btnPrimary as any}>{editingTrip ? 'Salvar' : 'Criar'}</button>
                  </div>
                </div>
              )}
              {!editingTrip && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowTripModal(false)} style={btnCancel as any}>Cancelar</button>
                  <button type="submit" style={btnPrimary as any}>{editingTrip ? 'Salvar' : 'Criar'}</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showNotifications && notifPos && (
        <div id="notifications-popover" style={{ position: 'absolute', top: notifPos.top, left: notifPos.left, width: 520, zIndex: 2000 }}>
          <div style={{
              background: 'linear-gradient(rgb(22, 20, 20), rgb(53, 102, 151))',
              border: `1px solid ${PALETTE.border}`,
              borderRadius: 12,
              padding: 10,
              boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)',
              transform: 'translateY(0px)',
              transition: 'transform 180ms ease, box-shadow 180ms ease',
              willChange: 'transform, box-shadow',
              maxHeight: '48vh',
              overflowY: 'auto'
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Notificações</h3>
              <button type="button" onClick={() => setShowNotifications(false)} style={btnCancel as any}>X</button>
            </div>

            {/* Próximas viagens */}
            <div style={{ marginTop: 8 }}>
              <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Próximas viagens</div>
              {(() => {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                const tt = isoDate(tomorrow)
                const todayIso = isoDate(today)
                const items = trips.filter(tr => {
                  const d = toDateInput(tr.date)
                  return (d === todayIso || d === tt) && !tr.completed
                })
                if (items.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma viagem para hoje ou amanhã.</div>
                return (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {items.map(t => {
                      const isTodayTrip = toDateInput(t.date) === todayIso
                      const itemBg = isTodayTrip ? `${PALETTE.success}33` : PALETTE.cardBg
                      const itemBorder = isTodayTrip ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                      return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setShowNotifications(false)
                          if (canEdit) {
                            openEditTrip(t)
                          } else {
                            const d = parseLocalDate(toDateInput(t.date))
                            setTripsView('calendar')
                            setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                            setSelectedDay(d)
                            setPanelOpen(true)
                          }
                        }}
                        onMouseEnter={() => setHoveredNotif(`trip-${t.id}`)}
                        onMouseLeave={() => setHoveredNotif(null)}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: itemBg,
                          border: itemBorder,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 44,
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                          transform: hoveredNotif === `trip-${t.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                          filter: hoveredNotif === `trip-${t.id}` ? 'brightness(1.12)' : undefined,
                          boxShadow: hoveredNotif === `trip-${t.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                        }}
                      >
                        {(() => {
                          const d = parseLocalDate(toDateInput(t.date))
                          const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                          const equipe = Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'
                          return (
                            <>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{t.serviceType?.name ?? 'Viagem'}</div>
                                <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')}{t.startTime ? ` - ${t.startTime}` : ''} — {t.city?.name ?? '—'}</div>
                              </div>
                              <div style={{ width: 120, textAlign: 'right', fontSize: 12, color: PALETTE.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipe}</div>
                            </>
                          )
                        })()}
                      </div>
                    )
                    })}
                  </div>
                )
              })()}

              {/* Seção: Trocas de óleo */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Trocas de óleo</div>
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const msPerDay = 24 * 60 * 60 * 1000
                  const oilItems = (vehicles || []).filter(v => v.nextOilChange).map(v => {
                    const iso = toDateInput(String(v.nextOilChange))
                    const d = parseLocalDate(iso)
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter(x => x.diff >= 0 && x.diff <= 30)

                  if (oilItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma troca de óleo próxima.</div>

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {oilItems.map(({ v, d, diff }) => {
                        const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                        const rightInfo = v.model || v.notes || '—'
                        const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                        const isDueToday = diff === 0
                        const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                        const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              setShowNotifications(false)
                              if (canEdit) openEditVehicle(v)
                            }}
                            onMouseEnter={() => setHoveredNotif(`vehicle-oil-${v.id}`)}
                            onMouseLeave={() => setHoveredNotif(null)}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: itemBg,
                              border: itemBorder,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 44,
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                              transform: hoveredNotif === `vehicle-oil-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                              filter: hoveredNotif === `vehicle-oil-${v.id}` ? 'brightness(1.12)' : undefined,
                              boxShadow: hoveredNotif === `vehicle-oil-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                              <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Troca de óleo — {daysText}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
              
              {/* Seção: Manutenção */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Manutenção</div>
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const msPerDay = 24 * 60 * 60 * 1000
                  const maintItems = (vehicles || []).filter(v => v.lastMaintenance).map(v => {
                    const iso = toDateInput(String(v.lastMaintenance))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter(x => x.diff >= 0 && x.diff <= 30)

                  if (maintItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma manutenção próxima.</div>

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {maintItems.map(({ v, d, diff }) => {
                        const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                        const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                        const isDueToday = diff === 0
                        const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                        const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                              setShowNotifications(false)
                              if (canEdit) openEditVehicle(v)
                            }}
                            onMouseEnter={() => setHoveredNotif(`vehicle-maint-${v.id}`)}
                            onMouseLeave={() => setHoveredNotif(null)}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: itemBg,
                              border: itemBorder,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 44,
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                              transform: hoveredNotif === `vehicle-maint-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                              filter: hoveredNotif === `vehicle-maint-${v.id}` ? 'brightness(1.12)' : undefined,
                              boxShadow: hoveredNotif === `vehicle-maint-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                              <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Manutenção — {daysText}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Seção: Alinhamentos */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Alinhamentos</div>
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const msPerDay = 24 * 60 * 60 * 1000
                  const alignItems = (vehicles || []).filter(v => v.lastAlignment).map(v => {
                    const iso = toDateInput(String(v.lastAlignment))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                    const diff = Math.floor((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter(x => x.diff >= 0 && x.diff <= 30)

                  if (alignItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhum alinhamento próximo.</div>

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {alignItems.map(({ v, d, diff }) => {
                        const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                        const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                        const isDueToday = diff === 0
                        const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                        const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                        return (
                          <div
                            key={v.id}
                            onClick={() => {
                                  setShowNotifications(false)
                                  if (canEdit) openEditVehicle(v)
                                }}
                                onMouseEnter={() => setHoveredNotif(`vehicle-align-${v.id}`)}
                                onMouseLeave={() => setHoveredNotif(null)}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: itemBg,
                              border: itemBorder,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 44,
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                              transform: hoveredNotif === `vehicle-align-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                              filter: hoveredNotif === `vehicle-align-${v.id}` ? 'brightness(1.12)' : undefined,
                              boxShadow: hoveredNotif === `vehicle-align-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                              <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Alinhamento — {daysText}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Popover de atrasos */}
        {showOverdue && overduePos && (
          <div id="overdue-popover" style={{ position: 'absolute', top: overduePos.top, left: overduePos.left, width: 520, zIndex: 2000 }}>
            <div style={{
                background: 'linear-gradient(rgb(22, 20, 20), rgb(53, 102, 151))',
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 12,
                padding: 10,
                boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)',
                transform: 'translateY(0px)',
                transition: 'transform 180ms ease, box-shadow 180ms ease',
                willChange: 'transform, box-shadow',
                maxHeight: '48vh',
                overflowY: 'auto'
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Atrasos</h3>
                <button type="button" onClick={() => setShowOverdue(false)} style={btnCancel as any}>X</button>
              </div>

              <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Viagens em atraso</div>
              <div style={{ marginTop: 8 }}>
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const todayIso = isoDate(today)
                  const items = (trips || []).filter(tr => {
                    if (tr.completed) return false
                    const iso = toDateInput(tr.date)
                    const d = parseLocalDate(iso)
                    return d.getTime() < today.getTime()
                  })
                  if (items.length === 0) {
                    const today2 = new Date()
                    today2.setHours(0, 0, 0, 0)
                    const msPerDay2 = 24 * 60 * 60 * 1000
                    const veh = vehicles || []
                    const oilOverdue = (veh || []).filter(v => v.nextOilChange).map(v => {
                      const iso = toDateInput(String(v.nextOilChange))
                      const d = parseLocalDate(iso)
                      const diff = Math.ceil((d.getTime() - today2.getTime()) / msPerDay2)
                      return { v, d, diff }
                    }).filter(x => x.diff < 0)

                    const maintOverdue = (veh || []).filter(v => v.lastMaintenance).map(v => {
                      const iso = toDateInput(String(v.lastMaintenance))
                      const d0 = parseLocalDate(iso)
                      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                      d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                      const diff = Math.ceil((d.getTime() - today2.getTime()) / msPerDay2)
                      return { v, d, diff }
                    }).filter(x => x.diff < 0)

                    const alignOverdue = (veh || []).filter(v => v.lastAlignment).map(v => {
                      const iso = toDateInput(String(v.lastAlignment))
                      const d0 = parseLocalDate(iso)
                      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                      d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                      const diff = Math.floor((d.getTime() - today2.getTime()) / msPerDay2)
                      return { v, d, diff }
                    }).filter(x => x.diff < 0)

                    if (oilOverdue.length === 0 && maintOverdue.length === 0 && alignOverdue.length === 0) {
                      return <div style={{ color: PALETTE.textSecondary }}>Nenhuma viagem atrasada.</div>
                    }
                  }

                  return (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {items.map(t => {
                        const d = parseLocalDate(toDateInput(t.date))
                        const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                        const equipe = Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'
                        const itemBg = `${PALETTE.error}33`
                        const itemBorder = `1px solid ${PALETTE.error}88`
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              setShowOverdue(false)
                              if (canEdit) {
                                openEditTrip(t)
                              } else {
                                setTripsView('calendar')
                                setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                                setSelectedDay(d)
                                setPanelOpen(true)
                              }
                            }}
                            onMouseEnter={() => setHoveredNotif(`trip-${t.id}`)}
                            onMouseLeave={() => setHoveredNotif(null)}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: 6,
                              borderRadius: 6,
                              background: itemBg,
                              border: itemBorder,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              minHeight: 44,
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                              transform: hoveredNotif === `trip-${t.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                              filter: hoveredNotif === `trip-${t.id}` ? 'brightness(1.12)' : undefined,
                              boxShadow: hoveredNotif === `trip-${t.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{t.serviceType?.name ?? 'Viagem'}</div>
                              <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')}{t.startTime ? ` - ${t.startTime}` : ''} — {t.city?.name ?? '—'}</div>
                            </div>
                            <div style={{ width: 120, textAlign: 'right', fontSize: 12, color: PALETTE.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipe}</div>
                          </div>
                        )
                      })}

                      {/* Vehicles overdue sections */}
                      {(() => {
                        const today = new Date()
                        today.setHours(0, 0, 0, 0)
                        const msPerDay = 24 * 60 * 60 * 1000
                        const veh = vehicles || []

                        const oilItems = (veh || []).filter(v => v.nextOilChange).map(v => {
                          const iso = toDateInput(String(v.nextOilChange))
                          const d = parseLocalDate(iso)
                          const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                          return { v, d, diff }
                        }).filter(x => x.diff < 0)

                        const maintItems = (veh || []).filter(v => v.lastMaintenance).map(v => {
                          const iso = toDateInput(String(v.lastMaintenance))
                          const d0 = parseLocalDate(iso)
                          const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                          d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                          const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                          return { v, d, diff }
                        }).filter(x => x.diff < 0)

                        const alignItems = (veh || []).filter(v => v.lastAlignment).map(v => {
                          const iso = toDateInput(String(v.lastAlignment))
                          const d0 = parseLocalDate(iso)
                          const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                          d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                          const diff = Math.floor((d.getTime() - today.getTime()) / msPerDay)
                          return { v, d, diff }
                        }).filter(x => x.diff < 0)

                        return (
                          <>
                            {oilItems.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Trocas de óleo em atraso</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {oilItems.map(({ v, d, diff }) => {
                                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                                    const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                                    return (
                                      <div
                                        key={`oil-${v.id}`}
                                        onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                        onMouseEnter={() => setHoveredNotif(`vehicle-oil-${v.id}`)}
                                        onMouseLeave={() => setHoveredNotif(null)}
                                        role="button"
                                        tabIndex={0}
                                        style={{
                                          padding: 6,
                                          borderRadius: 6,
                                          background: `${PALETTE.error}33`,
                                          border: `1px solid ${PALETTE.error}88`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          minHeight: 44,
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                          transform: hoveredNotif === `vehicle-oil-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                          filter: hoveredNotif === `vehicle-oil-${v.id}` ? 'brightness(1.12)' : undefined,
                                          boxShadow: hoveredNotif === `vehicle-oil-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                        }}
                                      >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Troca de óleo — {daysText}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {maintItems.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Manutenção em atraso</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {maintItems.map(({ v, d, diff }) => {
                                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                                    const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                                    return (
                                      <div
                                        key={`maint-${v.id}`}
                                        onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                        onMouseEnter={() => setHoveredNotif(`vehicle-maint-${v.id}`)}
                                        onMouseLeave={() => setHoveredNotif(null)}
                                        role="button"
                                        tabIndex={0}
                                        style={{
                                          padding: 6,
                                          borderRadius: 6,
                                          background: `${PALETTE.error}33`,
                                          border: `1px solid ${PALETTE.error}88`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          minHeight: 44,
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                          transform: hoveredNotif === `vehicle-maint-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                          filter: hoveredNotif === `vehicle-maint-${v.id}` ? 'brightness(1.12)' : undefined,
                                          boxShadow: hoveredNotif === `vehicle-maint-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                        }}
                                      >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Manutenção — {daysText}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {alignItems.length > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Alinhamentos em atraso</div>
                                <div style={{ display: 'grid', gap: 8 }}>
                                  {alignItems.map(({ v, d, diff }) => {
                                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                                    const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                                    return (
                                      <div
                                        key={`align-${v.id}`}
                                        onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                        onMouseEnter={() => setHoveredNotif(`vehicle-align-${v.id}`)}
                                        onMouseLeave={() => setHoveredNotif(null)}
                                        role="button"
                                        tabIndex={0}
                                        style={{
                                          padding: 6,
                                          borderRadius: 6,
                                          background: `${PALETTE.error}33`,
                                          border: `1px solid ${PALETTE.error}88`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          minHeight: 44,
                                          cursor: 'pointer',
                                          transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                          transform: hoveredNotif === `vehicle-align-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                          filter: hoveredNotif === `vehicle-align-${v.id}` ? 'brightness(1.12)' : undefined,
                                          boxShadow: hoveredNotif === `vehicle-align-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                        }}
                                      >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Alinhamento — {daysText}</div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}

        {pendingHolidayConfirm && (
        <div style={overlay} onClick={() => { setPendingHolidayConfirm(null); pendingPayloadRef.current = null; pendingEditingRef.current = null }}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: 0, marginBottom: 8 }}>Confirmar viagem para feriado{pendingHolidayConfirm.name ? ` — ${pendingHolidayConfirm.name}` : ''}?</h2>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 15, marginBottom: 6 }}>A data <strong>{pendingHolidayConfirm.date}</strong> é feriado{pendingHolidayConfirm.name ? ` — ${pendingHolidayConfirm.name}` : ''}.</div>
              <div style={{ color: '#666' }}>Deseja mesmo agendar a viagem nessa data?</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => { setPendingHolidayConfirm(null); pendingPayloadRef.current = null; pendingEditingRef.current = null }} style={btnCancel as any}>Cancelar</button>
              <button onClick={async () => { const p = pendingPayloadRef.current; const ed = pendingEditingRef.current; if (p) await performSave(p, ed); }} style={btnPrimary as any}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {showClientInfoModal && clientInfoContent && (
        <div style={overlay} onClick={() => setShowClientInfoModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{clientInfoContent.title ?? 'Informação'}</h3>
              <button type="button" onClick={() => setShowClientInfoModal(false)} style={btnCancel as any}>Fechar</button>
            </div>
            <div style={{ marginTop: 12, whiteSpace: 'pre-wrap', color: PALETTE.textSecondary }}>{clientInfoContent.text}</div>
          </div>
        </div>
      )}

      {infoModal && infoModal.open && (
        <div style={{ ...overlay, zIndex: 99999 }} onClick={() => setInfoModal(null)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Info do Cliente</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              const im = infoModal
              if (!im) return
              const { ci, idx, value } = im
              setForm((f: any) => {
                const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                const block = cities[ci] || { clients: [] }
                const clients = Array.isArray(block.clients) ? [...block.clients] : []
                clients[idx] = { ...(clients[idx] || {}), info: value }
                cities[ci] = { ...(cities[ci] || {}), clients }
                return { ...f, cities }
              })
              setInfoModal(null)
            }}>
              <div>
                <textarea value={infoModal.value} onChange={e => setInfoModal(im => im ? { ...im, value: e.target.value } : im)} rows={4} style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }} />
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setInfoModal(null)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCitiesClientsModal && (
        <div style={overlay} onClick={() => setShowCitiesClientsModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Cidades & Clientes</h3>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <div style={{ color: PALETTE.textSecondary, fontSize: 12 }}>Selecione uma cidade e adicione clientes para ela.</div>
                <div>
                  <button type="button" onClick={() => setForm(f => {
                    const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                    cities.push({ cityId: '', clients: [{ name: '', price: '', info: '' }], notes: '' })
                    return { ...f, cities }
                  })} style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}>+ Adicionar cidade</button>
                </div>
              </div>

              {(form as any).cities?.map((cityBlock: any, ci: number) => (
                <div
                  key={ci}
                  style={{
                    marginTop: 12,
                    marginBottom: 8,
                    padding: 12,
                    borderRadius: 8,
                    background: PALETTE.cardBg,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
                    border: `1px solid ${PALETTE.border}`,
                    transition: 'transform 160ms ease, box-shadow 160ms ease',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select required value={cityBlock.cityId} onChange={e => setForm(f => {
                      const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                      cities[ci] = { ...cities[ci], cityId: e.target.value }
                      return { ...f, cities }
                    })} style={{ ...selectStyle, flex: 1 }}>
                      <option value="">Selecione cidade...</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}{c.state ? ` - ${c.state}` : ''}</option>)}
                    </select>
                    {((form as any).cities || []).length > 1 ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setForm(f => {
                            const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                            if (ci <= 0) return f
                            const tmp = cities[ci - 1]
                            cities[ci - 1] = cities[ci]
                            cities[ci] = tmp
                            return { ...f, cities }
                          })}
                          style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                          title="Mover para cima"
                        >▲</button>

                        <button
                          type="button"
                          onClick={() => setForm(f => {
                            const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                            if (ci >= cities.length - 1) return f
                            const tmp = cities[ci + 1]
                            cities[ci + 1] = cities[ci]
                            cities[ci] = tmp
                            return { ...f, cities }
                          })}
                          style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}
                          title="Mover para baixo"
                        >▼</button>

                        <button type="button" onClick={() => setForm(f => {
                          const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                          cities.splice(ci, 1)
                          return { ...f, cities }
                        })} style={{ ...(btnSmallRed as any), padding: '6px 8px' }}>Remover</button>
                      </div>
                    ) : <div style={{ width: 120 }} />}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={labelStyle}>Clientes</label>
                      <button type="button" onClick={() => setForm(f => {
                        const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                        const block = cities[ci] || { clients: [] }
                        const clients = Array.isArray(block.clients) ? [...block.clients] : []
                        clients.push({ name: '', price: '', info: '' })
                        cities[ci] = { ...(cities[ci] || {}), clients }
                        return { ...f, cities }
                      })} style={{ ...(btnSmallBlue as any), padding: '6px 8px' }}>+</button>
                    </div>

                    {/* Header labels for client fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 8, marginTop: 8 }}>
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Nome</div>
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Valor (serviço)</div>
                      <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>Info</div>
                      <div />
                    </div>

                    {(cityBlock.clients || []).map((c: any, idx: number) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 40px', gap: 8, marginTop: 8 }}>
                        <input type="text" placeholder="Nome do cliente" value={c.name} onChange={e => setForm(f => {
                          const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                          const clients = Array.isArray(cities[ci].clients) ? [...cities[ci].clients] : []
                          clients[idx] = { ...clients[idx], name: e.target.value }
                          cities[ci] = { ...cities[ci], clients }
                          return { ...f, cities }
                        })} style={inputStyle} />
                        <div style={{ position: 'relative' }}>
                          <CurrencyInput
                            value={c.price}
                            onChange={v => setForm(f => {
                              const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                              const clients = Array.isArray(cities[ci].clients) ? [...cities[ci].clients] : []
                              clients[idx] = { ...clients[idx], price: v }
                              cities[ci] = { ...cities[ci], clients }
                              return { ...f, cities }
                            })}
                            inputStyle={inputStyle}
                          />
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => setInfoModal({ open: true, ci, idx, value: c.info || '' })}
                            style={{ ...(c.info ? (btnSmallBlue as any) : (btnSmall as any)), padding: '6px 8px', textAlign: 'left', width: '100%' }}
                          >
                            {c.info ? 'Editar info' : 'Adicionar info'}
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {idx === 0 ? (
                            <div style={{ width: 32 }} />
                          ) : (
                            <button type="button" onClick={() => setForm(f => {
                              const cities = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                              const clients = Array.isArray(cities[ci].clients) ? [...cities[ci].clients] : []
                              clients.splice(idx, 1)
                              cities[ci] = { ...cities[ci], clients }
                              return { ...f, cities }
                            })} style={{ ...(btnSmallRed as any), padding: '6px 8px' }}>✖</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCitiesClientsModal(false)} style={btnCancel as any}>Fechar</button>
              <button type="button" onClick={() => setShowCitiesClientsModal(false)} style={btnPrimary as any}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {holidayModalData && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setHolidayModalData(null) }}>
          <div style={{
            width: 380, maxWidth: '90%', background: PALETTE.cardBg, borderRadius: 12, padding: 0,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
            border: '1px solid #daa52066',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #b8860b 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <h2 style={{ margin: 0, fontSize: 17, color: '#fff', fontWeight: 700 }}>Feriado</h2>
              </div>
              <button onClick={() => setHolidayModalData(null)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
                color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: 13, fontWeight: 600,
              }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              {holidayModalData.map(h => (
                <div key={h.id} style={{
                  padding: '14px 16px', background: '#FF6A00',
                  border: '1px solid #ff8c0333', borderRadius: 8, marginBottom: 8,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{h.name}</div>
                  <div style={{ fontSize: 15, color: '#ffffff', marginTop: 6 }}>📅 {new Date(h.date).toLocaleDateString('pt-BR')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && (
        <div style={overlay} onClick={() => setShowCategoryModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
            <form onSubmit={handleSaveCategory}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input required value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Descrição</label>
                  <input value={categoryForm.description} onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCategoryModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingCategory ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showServiceTypeModal && (
        <div style={overlay} onClick={() => setShowServiceTypeModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingServiceType ? 'Editar Tipo' : 'Novo Tipo'}</h3>
            <form onSubmit={handleSaveServiceType}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input required value={serviceTypeForm.name} onChange={e => setServiceTypeForm({ ...serviceTypeForm, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Código</label>
                  <input value={serviceTypeForm.code} onChange={e => setServiceTypeForm({ ...serviceTypeForm, code: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowServiceTypeModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingServiceType ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showManageWorkers && (
        <div style={overlay} onClick={() => setShowManageWorkers(false)}>
          <div style={{ ...modal, width: 720 }} onClick={e => e.stopPropagation()}>
            <WorkersContent showTitle={false} onChange={fetchWorkers} />
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowManageWorkers(false)} style={btnCancel as any}>Fechar</button>
            </div>
          </div>
        </div>
      )}

            {showExpenseModal && (
              <div style={overlay} onClick={() => setShowExpenseModal(false)}>
                <div style={smallModal} onClick={e => e.stopPropagation()}>
                  <h3 style={{ marginTop: 0 }}>{editingExpense ? 'Editar Despesa' : 'Nova Despesa'}</h3>
                  <form onSubmit={handleSaveExpense}>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div>
                        <label style={labelStyle}>Data *</label>
                        <input required type="date" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Categoria</label>
                        <select value={expenseForm.categoryId} onChange={e => setExpenseForm({ ...expenseForm, categoryId: e.target.value })} style={selectStyle}>
                          <option value="">Selecione</option>
                          {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Valor (R$)</label>
                        <div style={moneyWrapper}>
                          <CurrencyInput
                            value={expenseForm.amount}
                            onChange={v => setExpenseForm({ ...expenseForm, amount: v })}
                            inputStyle={inputStyle}
                          />
                        </div>
                      </div>
                      {/* Fornecedor removed */}
                      <div>
                        <label style={labelStyle}>Trabalhador responsável</label>
                        <select required value={expenseForm.workerId} onChange={e => setExpenseForm({ ...expenseForm, workerId: e.target.value })} style={selectStyle}>
                          <option value="">Selecione</option>
                          {workers.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                      </div>
                      {/* tags removed */}
                      <div>
                        <label style={labelStyle}>Notas</label>
                        <textarea value={expenseForm.notes} onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                      </div>
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowExpenseModal(false)} style={btnCancel as any}>Cancelar</button>
                      <button type="submit" style={btnPrimary as any}>{editingExpense ? 'Salvar' : 'Criar'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

      {showCityModal && (
        <div style={overlay} onClick={() => setShowCityModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingCity ? 'Editar Cidade' : 'Nova Cidade'}</h3>
            <form onSubmit={handleSaveCity}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Nome *</label>
                  <input required value={cityForm.name} onChange={e => setCityForm({ ...cityForm, name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <input value={cityForm.state} onChange={e => setCityForm({ ...cityForm, state: e.target.value })} style={inputStyle} placeholder="Ex: SP" />
                </div>
                <div>
                  <label style={labelStyle}>País</label>
                  <input value={cityForm.country} onChange={e => setCityForm({ ...cityForm, country: e.target.value })} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCityModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingCity ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showVehicleModal && (
        <div style={overlay} onClick={() => { setShowVehicleModal(false); setVehicleModalFromTrip(false) }}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h3>
            <form onSubmit={handleSaveVehicle}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Modelo</label>
                    <input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} style={inputStyle} placeholder="Ex: Fiat Strada" />
                  </div>
                  <div>
                    <label style={labelStyle}>Placa</label>
                    <input value={vehicleForm.plate} onChange={e => setVehicleForm({ ...vehicleForm, plate: e.target.value })} style={inputStyle} placeholder="Ex: ABC-1234" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Odômetro</label>
                    <input type="number" step="0.01" value={vehicleForm.odometer as any} onChange={e => setVehicleForm({ ...vehicleForm, odometer: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Próxima troca de óleo</label>
                    <input type="date" value={vehicleForm.nextOilChange as any} onChange={e => setVehicleForm({ ...vehicleForm, nextOilChange: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={labelStyle}>Odômetro na última alinhamento</label>
                    <input type="number" step="0.01" value={vehicleForm.odometerAtLastAlignment as any} onChange={e => setVehicleForm({ ...vehicleForm, odometerAtLastAlignment: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Última manutenção</label>
                    <input type="date" value={vehicleForm.lastMaintenance as any} onChange={e => setVehicleForm({ ...vehicleForm, lastMaintenance: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Último alinhamento</label>
                  <input type="date" value={vehicleForm.lastAlignment as any} onChange={e => setVehicleForm({ ...vehicleForm, lastAlignment: e.target.value })} style={inputStyle} />
                </div>

                <div>
                  <label style={labelStyle}>Notas</label>
                  <textarea value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setShowVehicleModal(false); setVehicleModalFromTrip(false) }} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingVehicle ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div style={overlay} onClick={() => setShowSettingsModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Padrões - Valores</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              try {
                const meal = Number(settingsMealValue)
                const maintenance = Number(settingsMaintenanceValue)
                const alignment = Number(settingsAlignmentValue)

                const resMeal = await fetch(`${API_BASE}/settings/mealExpense`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ value: meal }) })
                if (!resMeal.ok) throw new Error('Erro ao salvar alimentação')

                const resMaint = await fetch(`${API_BASE}/settings/maintenanceInterval`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ value: maintenance }) })
                if (!resMaint.ok) throw new Error('Erro ao salvar intervalo de manutenção')

                const resAlign = await fetch(`${API_BASE}/settings/alignmentInterval`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ value: alignment }) })
                if (!resAlign.ok) throw new Error('Erro ao salvar intervalo de alinhamento')

                setDefaultMealExpense(meal)
                setDefaultMaintenanceInterval(maintenance)
                setDefaultAlignmentInterval(alignment)
                setShowSettingsModal(false)
                addToast('Padrões salvos', 'success')
              } catch (err: any) { addToast(err?.message || 'Erro ao salvar', 'error') }
            }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Alimentação (R$)</label>
                  <input value={settingsMealValue} onChange={e => setSettingsMealValue(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Intervalo Manutenção (dias)</label>
                  <input value={settingsMaintenanceValue} onChange={e => setSettingsMaintenanceValue(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Intervalo Alinhamento (dias)</label>
                  <input value={settingsAlignmentValue} onChange={e => setSettingsAlignmentValue(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowSettingsModal(false)} style={btnCancel as any}>Fechar</button>
                <button type="submit" style={btnPrimary as any}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExtraNoteModal && (
        <div style={overlay} onClick={() => setShowExtraNoteModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Nota - Despesa Extra</h3>
            <form onSubmit={(e) => { e.preventDefault(); setShowExtraNoteModal(false) }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <textarea ref={extraNoteInputRef} placeholder="Digite a nota" value={form.extraInfo} onChange={e => setForm({ ...form, extraInfo: e.target.value })} style={{ ...inputStyle, height: 100, minHeight:50 }} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowExtraNoteModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFuelNoteModal && (
        <div style={overlay} onClick={() => setShowFuelNoteModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Nota - Combustível</h3>
            <form onSubmit={(e) => { e.preventDefault(); setShowFuelNoteModal(false) }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <textarea ref={fuelNoteInputRef} placeholder="Digite a nota" value={form.fuelInfo} onChange={e => setForm({ ...form, fuelInfo: e.target.value })} style={{ ...inputStyle, height: 100, minHeight:50 }} />
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowFuelNoteModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={overlay} onClick={() => setConfirmDelete(null)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: PALETTE.error }}>Confirmar Exclusão</h3>
            <p>Excluir viagem para <strong>{confirmDelete.city?.name ?? '—'}</strong> em {new Date(confirmDelete.date).toLocaleDateString('pt-BR')}?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDelete(null)} style={btnCancel as any}>Cancelar</button>
              <button onClick={handleDeleteTrip} style={btnDanger as any}>Excluir</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}