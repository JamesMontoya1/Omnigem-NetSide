import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  PALETTE, btnPrimary, btnSmall, btnSmallRed,
  inputStyle, selectStyle, cardStyle, labelStyle, btnNav,
} from '../../styles/theme'
import { useToast } from '../../components/shared/ToastProvider'
import { API_BASE, jsonAuthHeaders, authHeaders } from '../../config/api'
import WorkersContent from '../../components/shared/WorkersContent'
import HolidaysContent from '../../components/shared/HolidaysContent'

type Worker = {
  id: number; name: string; color?: string; active: boolean;
  hireDate?: string; terminationDate?: string;
}

type Vacation = {
  id: number; workerId: number; startDate: string; endDate: string;
  daysUsed: number; sold: boolean; active: boolean; note?: string;
  worker?: Worker;
  request?: number | null
}

type Summary = {
  id: number; name: string; color?: string;
  hireDate: string | null; terminationDate: string | null;
  yearsWorked: number; totalEarned: number; totalUsed: number;
  pendingDays: number; upcoming: Vacation[];
}

type Holiday = { id: number; date: string; name: string; recurring?: boolean }

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const local = parseLocalDate(d.slice(0, 10))
    return local.toLocaleDateString('pt-BR')
  }
  return new Date(d).toLocaleDateString('pt-BR')
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseLocalDate(s: string) {
  const parts = s.split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2])
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function tenureText(hireDate: string | null) {
  if (!hireDate) return '—'
  const h = new Date(hireDate)
  const now = new Date()
  let years = now.getFullYear() - h.getFullYear()
  let months = now.getMonth() - h.getMonth()
  if (months < 0) { years--; months += 12 }
  if (now.getDate() < h.getDate()) {
    months--; if (months < 0) { years--; months += 12 }
  }
  const parts: string[] = []
  if (years > 0) parts.push(`${years}a`)
  if (months > 0) parts.push(`${months}m`)
  return parts.length ? parts.join(' ') : '< 1m'
}

function daysUntilNextVacation(hireDate: string | null) {
  if (!hireDate) return null
  const h = new Date(hireDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let anniv = new Date(now.getFullYear(), h.getUTCMonth(), h.getUTCDate())
  let diff = Math.round((anniv.getTime() - today.getTime()) / 86400000)
  if (diff < 0) {
    anniv = new Date(now.getFullYear() + 1, h.getUTCMonth(), h.getUTCDate())
    diff = Math.round((anniv.getTime() - today.getTime()) / 86400000)
  }
  return diff
}

function tenureFull(hireDate: string | null, nowMs?: number) {
  if (!hireDate) return '—'
  const h = new Date(hireDate)
  const now = nowMs ? new Date(nowMs) : new Date()

  let years = now.getFullYear() - h.getFullYear()
  let months = now.getMonth() - h.getMonth()
  let days = now.getDate() - h.getDate()
  let hours = now.getHours() - h.getHours()
  let minutes = now.getMinutes() - h.getMinutes()
  let seconds = now.getSeconds() - h.getSeconds()

  if (seconds < 0) { seconds += 60; minutes-- }
  if (minutes < 0) { minutes += 60; hours-- }
  if (hours < 0) { hours += 24; days-- }
  if (days < 0) {
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    days += prevMonthLastDay
    months--
  }
  if (months < 0) { months += 12; years-- }

  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')
  return `${years}a ${months}m ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

type Tab = 'dashboard' | 'list'

export default function VacationsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const [isAdmin, setIsAdmin] = useState(false)

  const [tab, setTab] = useState<Tab>('dashboard')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [summary, setSummary] = useState<Summary[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])

  const [nowTick, setNowTick] = useState<number>(Date.now())

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [currentUserWorkerId, setCurrentUserWorkerId] = useState<number | null>(null)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)

  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  const [formWorkerId, setFormWorkerId] = useState<number | ''>('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formDays, setFormDays] = useState<number | ''>('')
  const [formSold, setFormSold] = useState(false)
  const [formNote, setFormNote] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  const [filterWorkerId, setFilterWorkerId] = useState<number | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [filterSearchText, setFilterSearchText] = useState('')
  const [filterSearchField, setFilterSearchField] = useState<'any' | 'worker' | 'note'>('any')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterSoldStatus, setFilterSoldStatus] = useState<'any' | 'sold' | 'not_sold'>('any')
  const [filterActiveStatus, setFilterActiveStatus] = useState<'any' | 'active' | 'inactive'>('active')
  const [filterMinDays, setFilterMinDays] = useState<number | ''>('')
  const [filterMaxDays, setFilterMaxDays] = useState<number | ''>('')

  const [holidayModalData, setHolidayModalData] = useState<Holiday[] | null>(null)
  const [editingHolidayId, setEditingHolidayId] = useState<number | null>(null)
  const [editingHolidayName, setEditingHolidayName] = useState('')
  const [editingHolidayRecurring, setEditingHolidayRecurring] = useState(false)

  const [showCreateHoliday, setShowCreateHoliday] = useState(false)
  const [createHolidayName, setCreateHolidayName] = useState('')
  const [createHolidayRecurring, setCreateHolidayRecurring] = useState(false)
  const [createHolidayDate, setCreateHolidayDate] = useState('')

  const [shownAnniv, setShownAnniv] = useState<number[]>([])

  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Notifications (admin-only): pending vacation requests
  const notifRef = useRef<HTMLButtonElement | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null)

  useEffect(() => {
    if (selectedDay) {
      setPanelOpen(false)
      requestAnimationFrame(() => setPanelOpen(true))
    } else {
      setPanelOpen(false)
    }
  }, [selectedDay])

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pending: true, upcoming: true, tenure: true, nextVac: true })
  function toggleSection(key: string) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })) }

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      setIsAdmin(Array.isArray(roles) && roles.includes('ADMIN'))
    } catch { setIsAdmin(false) }
    load();
    // try to load current user info (may be unauthorized for guest/no-token)
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() })
        if (res.ok) {
          const j = await res.json()
          setCurrentUserWorkerId(j?.workerId ?? null)
        }
      } catch (e) { /* ignore */ }
    })()
  }, [])

  useEffect(() => {
    if (!summary || summary.length === 0) return
    summary.forEach(s => {
      const days = daysUntilNextVacation(s.hireDate)
      if (days !== null && days <= 30 && !shownAnniv.includes(s.id)) {
        const name = s.name
        const msg = days === 0 ? `Hoje é aniversário de contratação de ${name}!` : `Faltam ${days} dias para o aniversário de contratação de ${name}`
        addToast(msg, 'info', 8000, 'bottom-right')
        setShownAnniv(prev => [...prev, s.id])
      }
    })
  }, [summary, shownAnniv, addToast])

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    try {
      const [wRes, vRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/workers`),
        fetch(`${API_BASE}/vacations`),
        fetch(`${API_BASE}/vacations/summary`),
        fetch(`${API_BASE}/holidays`),
      ])
      setWorkers(await wRes.json())
      setVacations(await vRes.json())
      setSummary(await sRes.json())
      try { const hRes = await fetch(`${API_BASE}/holidays`); setHolidays(await hRes.json()) } catch (e) { console.error('holidays load', e) }
    } catch (e) { console.error(e) }
  }

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

  function vacationsForDate(date: Date): Vacation[] {
    const iso = isoDate(date)
    return vacations.filter(v => {
      if (!v.active) return false
      if (v.sold) return false
      if (v.request === 2) return false
      if (filterWorkerId && v.workerId !== filterWorkerId) return false
      const s = isoDate(parseLocalDate(v.startDate.slice(0, 10)))
      const e = isoDate(parseLocalDate(v.endDate.slice(0, 10)))
      return iso >= s && iso <= e
    })
  }

  async function onSave(): Promise<boolean> {
    if (!formWorkerId || !formStart || !formEnd || !formDays) {
      addToast('Preencha todos os campos obrigatórios', 'error'); return false
    }

    const workerIdNum = Number(formWorkerId)
    const s = summary.find(x => x.id === workerIdNum)
    const pending = s ? Number(s.pendingDays || 0) : 0

    const existing = editId ? vacations.find(v => v.id === editId) : undefined
    const existingDays = existing ? Number(existing.daysUsed || 0) : 0
    const allowed = pending + existingDays

    if (Number(formDays) > allowed) {
      addToast(`Aviso: saldo insuficiente (disponível ${allowed} dias) — salvando assim mesmo.`, 'warning')
    }

    const payload = {
      workerId: workerIdNum,
      startDate: formStart,
      endDate: formEnd,
      daysUsed: Number(formDays),
      sold: formSold,
        note: editId ? (formNote === '' ? null : formNote) : (formNote || undefined),
        request: isAdmin ? undefined : 0,
    }
    try {
      const url = editId ? `${API_BASE}/vacations/${editId}` : `${API_BASE}/vacations`
      const method = editId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) {
        const t = await res.text()
        let msg = 'Erro ao salvar'
        try { const j = JSON.parse(t); if (j?.message) msg = j.message } catch {}
        addToast(msg, 'error'); return false
      }
      addToast(editId ? 'Férias atualizadas' : 'Férias agendadas', 'success')
      resetForm()
      load()
      return true
    } catch { addToast('Erro de rede', 'error'); return false }
  }

  async function onDelete(id: number) {
    if (!confirm('Apagar este lançamento de férias?')) return
    try {
      await fetch(`${API_BASE}/vacations/${id}`, { method: 'DELETE', headers: authHeaders() })
      addToast('Lançamento removido', 'success')
      load()
    } catch { addToast('Erro de rede', 'error') }
  }

  async function changeRequest(id: number, value: number) {
    try {
      const res = await fetch(`${API_BASE}/vacations/${id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ request: value }) })
      if (!res.ok) {
        const t = await res.text()
        let msg = 'Erro ao alterar status'
        try { const j = JSON.parse(t); if (j?.message) msg = j.message } catch {}
        addToast(msg, 'error'); return
      }
      addToast(value === 1 ? 'Solicitação aprovada' : 'Solicitação recusada', 'success')
      load()
    } catch (err) { console.error(err); addToast('Erro de rede', 'error') }
  }

  function approveVacation(id: number) { changeRequest(id, 1) }
  function rejectVacation(id: number) { if (!confirm('Recusar esta solicitação?')) return; changeRequest(id, 2) }

  function startEdit(v: Vacation) {
    setEditId(v.id)
    setFormWorkerId(v.workerId)
    setFormStart(isoDate(parseLocalDate(v.startDate.slice(0, 10))))
    setFormEnd(isoDate(parseLocalDate(v.endDate.slice(0, 10))))
    setFormDays(v.daysUsed)
    setFormSold(v.sold)
    setFormNote(v.note || '')
    setShowScheduleModal(true)
  }

  function openScheduleModal(prefillDate?: string) {
    resetForm()
    if (prefillDate) setFormStart(prefillDate)
    if (currentUserWorkerId && !isAdmin) setFormWorkerId(currentUserWorkerId)
    setShowScheduleModal(true)
  }

  function resetForm() {
    setEditId(null); setFormWorkerId(''); setFormStart(''); setFormEnd('')
    setFormDays(''); setFormSold(false); setFormNote('')
  }

  useEffect(() => {
    if (formStart && formEnd) {
      const d = daysBetween(parseLocalDate(formStart), parseLocalDate(formEnd)) + 1
      if (d > 0) setFormDays(d)
    }
  }, [formStart, formEnd])

  const filteredSummary = filterWorkerId ? summary.filter(s => s.id === filterWorkerId) : summary
  const pendingWorkers = filteredSummary
    .filter(s => s.pendingDays !== 0)
    .slice()
    .sort((a, b) => (b.pendingDays || 0) - (a.pendingDays || 0))
  const upcomingAll = filteredSummary.flatMap(s => s.upcoming.filter(v => !v.sold).map(v => ({ ...v, workerName: s.name, workerColor: s.color })))
    .sort((a, b) => parseLocalDate(a.startDate.slice(0, 10)).getTime() - parseLocalDate(b.startDate.slice(0, 10)).getTime())
    .slice(0, 10)
  const baseFilteredVacations = (filterWorkerId ? vacations.filter(v => v.workerId === filterWorkerId) : vacations)
    .slice().sort((a, b) => parseLocalDate(b.startDate.slice(0, 10)).getTime() - parseLocalDate(a.startDate.slice(0, 10)).getTime())

  const displayedVacations = baseFilteredVacations.filter(v => {
    if (v.request === 2) return false
    if (filterActiveStatus === 'active' && !v.active) return false
    if (filterActiveStatus === 'inactive' && v.active) return false

    if (filterSoldStatus === 'sold' && !v.sold) return false
    if (filterSoldStatus === 'not_sold' && v.sold) return false

    if (filterMinDays !== '' && Number(v.daysUsed) < Number(filterMinDays)) return false
    if (filterMaxDays !== '' && Number(v.daysUsed) > Number(filterMaxDays)) return false

    if (filterStartDate) {
      const fStart = isoDate(parseLocalDate(filterStartDate))
      const vEnd = isoDate(parseLocalDate(v.endDate.slice(0, 10)))
      if (vEnd < fStart) return false
    }
    if (filterEndDate) {
      const fEnd = isoDate(parseLocalDate(filterEndDate))
      const vStart = isoDate(parseLocalDate(v.startDate.slice(0, 10)))
      if (vStart > fEnd) return false
    }

    if (filterSearchText) {
      const text = filterSearchText.toLowerCase()
      if (filterSearchField === 'worker') {
        const w = workers.find(x => x.id === v.workerId)
        if (!w || !w.name.toLowerCase().includes(text)) return false
      } else if (filterSearchField === 'note') {
        if (!v.note || !v.note.toLowerCase().includes(text)) return false
      } else {
        const w = workers.find(x => x.id === v.workerId)
        const wn = w ? w.name.toLowerCase() : ''
        const nn = v.note ? v.note.toLowerCase() : ''
        if (!wn.includes(text) && !nn.includes(text)) return false
      }
    }

    return true
  })

  const pendingRequests = vacations.filter(v => v.request === 0)

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif', color: PALETTE.textPrimary }}>
      <div style={{ padding: '16px 24px', paddingLeft: 80, display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${PALETTE.border}` }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Férias</h1>
        {isAdmin && <button onClick={() => setShowWorkersModal(true)} style={btnNav}>👷 Trabalhadores</button>}
        {isAdmin && <button onClick={() => setShowHolidaysModal(true)} style={btnNav}>🎉 Feriados</button>}
        {isAdmin && <button onClick={() => { resetForm(); setShowScheduleModal(true) }} style={{ ...btnNav, background: PALETTE.success, color: '#fff', border: 'none' }}>+ Agendar</button>}
        <select
          value={filterWorkerId}
          onChange={e => setFilterWorkerId(e.target.value ? Number(e.target.value) : '')}
          style={{ ...selectStyle, width: 200, fontSize: 13 }}
        >
          <option value="">Todos os trabalhadores</option>
          {workers.filter(w => w.active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        {!isAdmin && (
          <button onClick={() => openScheduleModal()} style={{ ...btnNav, background: PALETTE.primary, color: '#fff', border: 'none' }}>+ Agendar</button>
        )}

        {isAdmin && (
          <button
            ref={notifRef}
            type="button"
            onClick={() => {
              if (showNotifications) { setShowNotifications(false); return }
              const rect = notifRef.current?.getBoundingClientRect()
              const popWidth = 420
              if (rect) {
                const left = Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8))
                setNotifPos({ top: rect.bottom + 8 + window.scrollY, left })
              }
              setShowNotifications(true)
            }}
            title="Solicitações"
            style={{
              ...btnNav,
              marginLeft: 8,
              background: pendingRequests.length > 0 ? PALETTE.success : PALETTE.hoverBg,
              color: PALETTE.textPrimary,
              border: `1px solid ${PALETTE.border}`,
              position: 'relative'
            }}
          >
            🔔
            {pendingRequests.length > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>{pendingRequests.length}</span>
            )}
          </button>
        )}
        
        {(['dashboard', 'list'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...btnNav,
            background: tab === t ? PALETTE.primary : PALETTE.hoverBg,
            color: tab === t ? '#fff' : PALETTE.textPrimary,
            border: tab === t ? 'none' : `1px solid ${PALETTE.border}`,
          }}>
            {t === 'dashboard' ? 'Painel' : 'Lançamentos'}
          </button>
        ))}
      
      </div>

      <div style={{ padding: 24, flex: 1, minHeight: 0 }}>
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'list' && renderList()}
      </div>

      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowScheduleModal(false); resetForm() } }}>
          <div style={{ width: 560, maxWidth: '95%', maxHeight: 'calc(100vh - 48px)', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            {renderSchedule()}
          </div>
        </div>
      )}

      {showWorkersModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowWorkersModal(false); load() } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Trabalhadores</h2>
              <button onClick={() => { setShowWorkersModal(false); load() }} style={btnSmall}>✕ Fechar</button>
            </div>
            <WorkersContent showTitle={false} />
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
                  <div style={{ fontSize: 15, color: '#ffffff', marginTop: 6 }}>📅 {fmtDate(h.date)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedDay && (() => {
        const dayVacs = vacations.filter(v => {
          if (!v.active) return false
          if (v.request === 2) return false
          const s = isoDate(parseLocalDate(v.startDate.slice(0, 10)))
          const e = isoDate(parseLocalDate(v.endDate.slice(0, 10)))
          const iso = isoDate(selectedDay)
          return iso >= s && iso <= e
        })
        const dayHols = holidays.filter(h => isoDate(parseLocalDate(h.date.slice(0, 10))) === isoDate(selectedDay))
        const dayOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][selectedDay.getDay()]
        const isWeekend = selectedDay.getDay() === 0 || selectedDay.getDay() === 6
        return (
          <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1000 }}
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
              <div style={{
                padding: '20px 24px', borderBottom: `1px solid ${PALETTE.border}`,
                background: PALETTE.backgroundSecondary,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, color: PALETTE.textPrimary }}>
                      {selectedDay.getDate()} de {MONTHS[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                    </h2>
                    <div style={{ fontSize: 13, color: isWeekend ? PALETTE.warning : PALETTE.textSecondary, marginTop: 4 }}>
                      {dayOfWeek}{isWeekend ? ' (fim de semana)' : ''}
                    </div>
                  </div>
                  <button onClick={() => { setPanelOpen(false); setTimeout(() => setSelectedDay(null), 300) }} style={{
                    background: PALETTE.hoverBg, border: `1px solid ${PALETTE.border}`, borderRadius: 6,
                    color: PALETTE.textPrimary, cursor: 'pointer', padding: '6px 12px', fontSize: 14, fontWeight: 600,
                  }}>✕</button>
                </div>
              </div>

              <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {dayHols.length > 0 && (
                  <div>
                    {dayHols.map(h => (
                      <div key={h.id} style={{ background: `${PALETTE.warning}18`, border: `1px solid ${PALETTE.warning}44`, borderRadius: 6, padding: '8px 10px', marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Feriado</div>
                        {editingHolidayId === h.id ? (
                          <form onSubmit={async (e) => {
                            e.preventDefault()
                            try {
                              await fetch(`${API_BASE}/holidays/${h.id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ name: editingHolidayName || undefined, recurring: editingHolidayRecurring }) })
                              setEditingHolidayId(null)
                              setEditingHolidayName('')
                              setEditingHolidayRecurring(false)
                              await load()
                            } catch (err) { console.error(err) }
                          }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <input value={editingHolidayName} onChange={e => setEditingHolidayName(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, color: PALETTE.textPrimary }} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="checkbox" checked={editingHolidayRecurring} onChange={e => setEditingHolidayRecurring(e.target.checked)} /> Recorrente
                            </label>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                              <button type="button" onClick={() => { setEditingHolidayId(null); setEditingHolidayName(''); setEditingHolidayRecurring(false) }} style={{ background: 'transparent', border: `1px solid rgba(255,255,255,0.12)`, color: PALETTE.textPrimary, padding: '6px 8px', borderRadius: 6 }}>Cancelar</button>
                              <button type="submit" style={{ background: PALETTE.primary, border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Salvar</button>
                            </div>
                          </form>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, background: '#FF6A00', color: '#fff', padding: '6px 8px', borderRadius: 4 }}>{h.name ?? 'Feriado'}</div>
                              <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>📅 {fmtDate(h.date)}</div>
                            </div>
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => { setEditingHolidayId(h.id); setEditingHolidayName(h.name || ''); setEditingHolidayRecurring(!!h.recurring) }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: PALETTE.textPrimary, padding: '6px 8px', borderRadius: 6 }}>Editar</button>
                                <button onClick={async () => { if (!confirm('Apagar este feriado?')) return; try { await fetch(`${API_BASE}/holidays/${h.id}`, { method: 'DELETE', headers: authHeaders() }); await load() } catch (err) { console.error(err) } }} style={{ background: PALETTE.error, color: '#fff', border: 'none', padding: '6px 8px', borderRadius: 6 }}>Apagar</button>
                              </div>
                            )}
                          </div>
                        )}
                        {h.recurring && <div style={{ fontSize: 11, color: PALETTE.textSecondary, marginTop: 6 }}>Recorrente (anual)</div>}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 16 }}>🏖️</span>
                    <h3 style={{ margin: 0, fontSize: 15, color: PALETTE.primary }}>Férias</h3>
                    <span style={{
                      fontSize: 11, background: `${PALETTE.primary}33`, color: PALETTE.primary,
                      padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                    }}>{dayVacs.length}</span>
                  </div>
                  {dayVacs.length === 0 && (
                    <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhuma férias neste dia</p>
                  )}
                  {dayVacs.map(v => {
                    const w = workers.find(w => w.id === v.workerId)
                    return (
                      <div key={v.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                        background: PALETTE.backgroundSecondary, borderRadius: 8, marginBottom: 6,
                        border: `1px solid ${PALETTE.border}`,
                        borderLeft: `4px solid ${w?.color || PALETTE.border}`,
                      }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: w?.color || PALETTE.border, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <strong style={{ fontSize: 14, display: 'block', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w?.name || '?'}</strong>
                            {v.sold && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.info}22`, color: PALETTE.info }}>Vendeu</span>}
                            {typeof v.request !== 'undefined' && v.request !== null && v.request === 0 && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.warning}22`, color: PALETTE.warning }}>Solicitação</span>
                            )}
                            {typeof v.request !== 'undefined' && v.request !== null && v.request === 1 && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.success}22`, color: PALETTE.success }}>Aprovado</span>
                            )}
                            {typeof v.request !== 'undefined' && v.request !== null && v.request === 2 && (
                              <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.error}22`, color: PALETTE.error }}>Recusado</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 4 }}>
                            {fmtDate(v.startDate)} — {fmtDate(v.endDate)} · {v.daysUsed} dias
                          </div>
                          {v.note && <div style={{ fontSize: 11, color: PALETTE.textSecondary, marginTop: 2, fontStyle: 'italic' }}>({v.note})</div>}
                        </div>
                        {isAdmin && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <button onClick={() => { startEdit(v) }} style={btnSmall}>Editar</button>
                            <button onClick={() => { setPanelOpen(false); setTimeout(() => onDelete(v.id), 300) }} style={{ ...btnSmallRed }}>Apagar</button>
                            {v.request === 0 && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => approveVacation(v.id)} style={{ ...btnSmall, background: PALETTE.success, color: '#fff', border: 'none' }}>Aprovar</button>
                                <button onClick={() => rejectVacation(v.id)} style={{ ...btnSmallRed }}>Recusar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {dayVacs.length > 0 && (
                  <div style={{
                    padding: '12px 14px', background: PALETTE.backgroundSecondary, borderRadius: 8,
                    border: `1px solid ${PALETTE.border}`,
                  }}>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginBottom: 6 }}>Resumo do dia</div>
                    <div style={{ fontSize: 13, color: PALETTE.textPrimary }}>
                      <strong>{dayVacs.filter(v => !v.sold).length}</strong> colaborador(es) em férias
                      {dayVacs.some(v => v.sold) && <span> · <strong>{dayVacs.filter(v => v.sold).length}</strong> férias vendidas</span>}
                    </div>
                  </div>
                )}
              </div>

                {isAdmin && (
                <div style={{ padding: '16px 24px', borderTop: `1px solid ${PALETTE.border}`, background: PALETTE.backgroundSecondary }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        const sel = isoDate(selectedDay)
                        setCreateHolidayDate(sel)
                        setCreateHolidayName('')
                        setCreateHolidayRecurring(false)
                        setShowCreateHoliday(true)
                      }}
                      style={{ ...btnSmall, minWidth: 140 }}
                    >+ Feriado</button>

                    <button
                      onClick={() => {
                        const sel = isoDate(selectedDay)
                        setPanelOpen(false)
                        setTimeout(() => {
                          setSelectedDay(null)
                          // use helper so guest users get their worker prefilled and locked
                          openScheduleModal(sel)
                        }, 300)
                      }}
                      style={{ ...btnPrimary, flex: 1, textAlign: 'center' }}
                    >+ Agendar férias neste dia</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {showCreateHoliday && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateHoliday(false) }}>
          <div style={{ width: 420, maxWidth: '95%', background: PALETTE.cardBg, borderRadius: 10, padding: 20, boxShadow: '0 12px 48px rgba(0,0,0,0.4)' }}>
            <h3 style={{ margin: 0, marginBottom: 12, fontSize: 16, color: PALETTE.textPrimary }}>Adicionar feriado</h3>
            <form onSubmit={async (e) => {
              e.preventDefault()
              try {
                await fetch(`${API_BASE}/holidays`, {
                  method: 'POST', headers: jsonAuthHeaders(),
                  body: JSON.stringify({ date: createHolidayDate, name: createHolidayName, recurring: createHolidayRecurring }),
                })
                setShowCreateHoliday(false)
                setCreateHolidayName('')
                setCreateHolidayRecurring(false)
                setCreateHolidayDate('')
                await load()
                addToast('Feriado criado', 'success')
              } catch (err) { console.error(err); addToast('Erro ao criar feriado', 'error') }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input type="date" value={createHolidayDate} onChange={e => setCreateHolidayDate(e.target.value)} style={inputStyle} />
              <input value={createHolidayName} onChange={e => setCreateHolidayName(e.target.value)} placeholder="Nome do feriado" style={inputStyle} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={createHolidayRecurring} onChange={e => setCreateHolidayRecurring(e.target.checked)} /> Recorrente
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateHoliday(false)} style={btnSmall}>Cancelar</button>
                <button type="submit" style={btnPrimary}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHolidaysModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowHolidaysModal(false) } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Feriados</h2>
              <button onClick={() => setShowHolidaysModal(false)} style={btnSmall}>✕ Fechar</button>
            </div>
            <HolidaysContent compact />
          </div>
        </div>
      )}
      {showNotifications && notifPos && (
        <div id="vacations-notif-popover" style={{ position: 'absolute', top: notifPos.top, left: notifPos.left, width: 420, zIndex: 2000 }}>
          <div style={{
            background: PALETTE.cardBg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)',
            maxHeight: '48vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Solicitações de Férias</h3>
              <button type="button" onClick={() => setShowNotifications(false)} style={btnNav as any}>✕</button>
            </div>

            <div style={{ marginTop: 8 }}>
              {pendingRequests.length === 0 ? (
                <div style={{ color: PALETTE.textSecondary }}>Nenhuma solicitação.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {pendingRequests.map(v => {
                    const w = workers.find(x => x.id === v.workerId)
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setShowNotifications(false)
                          const d = parseLocalDate(v.startDate.slice(0, 10))
                          setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                          setSelectedDay(d)
                          requestAnimationFrame(() => setPanelOpen(true))
                        }}
                        onMouseEnter={() => setHoveredNotif(`vac-${v.id}`)}
                        onMouseLeave={() => setHoveredNotif(null)}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: 6,
                          borderRadius: 6,
                          background: hoveredNotif === `vac-${v.id}` ? `${PALETTE.primary}11` : PALETTE.cardBg,
                          border: `1px solid ${PALETTE.border}`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          minHeight: 44,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: w?.color || PALETTE.border }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{w?.name || '?'}</div>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>{fmtDate(v.startDate)} — {fmtDate(v.endDate)} · {v.daysUsed} dias</div>
                        </div>
                        <div style={{ fontSize: 12, color: PALETTE.warning }}>Solicitação</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )

    function renderDashboard() {
    const sectionHeader = (key: string, icon: string, title: string, color: string) => (
      <div
        onClick={() => toggleSection(key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          padding: '10px 14px', background: PALETTE.backgroundSecondary,
          borderRadius: expanded[key] ? '8px 8px 0 0' : 8,
          border: `1px solid ${PALETTE.border}`, userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14, transition: 'transform .2s', transform: expanded[key] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 14, color, flex: 1 }}>{title}</h3>
      </div>
    )

      const colorForAnniv = (d: number | null) => {
        if (d === null) return PALETTE.textDisabled
        if (d === 0) return '#00ff00'
        if (d > 30) return PALETTE.textDisabled
        if (d > 10) return '#9bc4e6'
        return '#5288b4'
      }

    return (
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', height: '100%' }}>
        {/* Calendario de ferias */}
        <div style={{ ...cardStyle, width: '60%', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
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
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
            {WEEKDAYS.map(d => (
              <div
                key={d}
                style={{
                  textAlign: 'center',
                  padding: '8px 6px',
                  height: 44,
                  maxHeight: 44,
                  borderBottom: `2px solid ${PALETTE.border}`,
                  background: PALETTE.backgroundSecondary,
                  fontWeight: 600,
                  fontSize: 13,
                  color: PALETTE.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {d}
              </div>
            ))}
            {calendarDays.map((d, i) => {
              const vacs = vacationsForDate(d.date)
              const hols = holidays.filter(h => isoDate(parseLocalDate(h.date.slice(0, 10))) === isoDate(d.date))
              const isToday = isoDate(d.date) === isoDate(new Date())
              const isHoliday = hols.length > 0
              const isHolidayCurrent = hols.length > 0 && d.current
              const baseBg = !d.current ? PALETTE.notCurrentBg : isToday ? PALETTE.todayBg : PALETTE.cardBg
              return (
                <div
                  key={i}
                  style={{
                    ...cellStyle,
                    background: isHoliday
                      ? 'linear-gradient(135deg, #b8860b22 0%, #daa52044 50%, #b8860b22 100%)'
                      : baseBg,
                    border: isToday
                      ? `2px solid ${PALETTE.primary}`
                      : isHoliday
                        ? '1px solid #daa520'
                        : `1px solid ${PALETTE.border}`,
                    boxShadow: isHoliday ? '0 0 8px #daa52033, inset 0 0 12px #daa52011' : undefined,
                    opacity: d.current ? 1 : 0.4,
                    cursor: 'pointer',
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
                    {vacs.slice(0, 2).map((v, idx) => {
                      const w = workers.find(w => w.id === v.workerId)
                      const displayed = Math.min(vacs.length, 2)
                      const showMore = idx === displayed - 1 && vacs.length > displayed
                      const moreCount = vacs.length - displayed
                      return (
                        <div
                          key={v.id}
                          onClick={isAdmin ? (e) => { e.stopPropagation(); startEdit(v) } : undefined}
                          role={isAdmin ? 'button' : undefined}
                          tabIndex={isAdmin ? 0 : undefined}
                          onKeyDown={isAdmin ? (e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === ' ') startEdit(v) } : undefined}
                          title={w?.name || '?'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: 13, padding: '1px 4px', borderRadius: 3, marginBottom: 1,
                            background: w?.color ? `${w.color}33` : `${PALETTE.primary}33`,
                            color: PALETTE.textPrimary,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 'calc(100% - 24px)' }}>{w?.name || '?'}</span>
                          {showMore && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: '#ffffff', flexShrink: 0 }}>+{moreCount}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ width: '40%', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {sectionHeader('pending', '⏳', 'Férias Pendentes', PALETTE.warning)}
              <div style={{
                ...cardStyle,
                borderTop: 'none',
                borderRadius: expanded.pending ? '0 0 8px 8px' : 8,
                maxHeight: expanded.pending ? 220 : 0,
                overflowY: 'auto',
                transition: 'max-height 320ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease',
                opacity: expanded.pending ? 1 : 0,
              }}>
                {pendingWorkers.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum saldo pendente</p>}
                {pendingWorkers.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, minWidth: 0 }}>
                      <strong style={{ display: 'block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</strong>
                    </div>
                    <span style={{ fontWeight: 700, color: PALETTE.warning, fontSize: 13 }}>{s.pendingDays}d</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {sectionHeader('upcoming', '📅', 'Agendamento de férias', PALETTE.info)}
              <div style={{
                ...cardStyle,
                borderTop: 'none',
                borderRadius: expanded.upcoming ? '0 0 8px 8px' : 8,
                maxHeight: expanded.upcoming ? 220 : 0,
                overflowY: 'auto',
                transition: 'max-height 320ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease',
                opacity: expanded.upcoming ? 1 : 0,
              }}>
                {upcomingAll.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhuma férias agendada</p>}
                {upcomingAll.map((v: any) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: v.workerColor || PALETTE.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 13, display: 'block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.workerName}</strong>
                      <div style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                        {fmtDate(v.startDate)} — {fmtDate(v.endDate)} ({v.daysUsed}d)
                      </div>
                    </div>
                    {isAdmin && <button onClick={() => startEdit(v)} style={btnSmall}>Editar</button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {sectionHeader('tenure', '🏢', 'Tempo de Casa', PALETTE.success)}
              <div style={{
                ...cardStyle,
                borderTop: 'none',
                borderRadius: expanded.tenure ? '0 0 8px 8px' : 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: expanded.tenure ? 340 : 0,
                overflowY: 'auto',
                transition: 'max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease',
                opacity: expanded.tenure ? 1 : 0,
                flex: 1,
              }}>
                {filteredSummary.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum trabalhador ativo</p>}
                {filteredSummary.slice().sort((a, b) => {
                    const aMs = a.hireDate ? (nowTick - new Date(a.hireDate).getTime()) : Number.NEGATIVE_INFINITY
                    const bMs = b.hireDate ? (nowTick - new Date(b.hireDate).getTime()) : Number.NEGATIVE_INFINITY
                    if (bMs !== aMs) return bMs - aMs
                    return a.name.localeCompare(b.name)
                  }).map(s => {
                    const daysLeft = daysUntilNextVacation(s.hireDate)
                    const nextVacationDate = (() => {
                      if (!s.hireDate) return null
                      const h = new Date(s.hireDate)
                      const now = new Date()
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                      let anniv = new Date(now.getFullYear(), h.getUTCMonth(), h.getUTCDate())
                      if (anniv.getTime() - today.getTime() < 0) anniv = new Date(now.getFullYear() + 1, h.getUTCMonth(), h.getUTCDate())
                      return fmtDate(isoDate(anniv))
                    })()
                    const showBadge = daysLeft !== null && daysLeft <= 30
                    return (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        background: PALETTE.backgroundSecondary, borderRadius: 6, border: `1px solid ${PALETTE.border}`,
                      }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <strong style={{ fontSize: 13, display: 'block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</strong>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                            {s.hireDate ? (
                              <strong style={{ color: PALETTE.success }}>{tenureFull(s.hireDate, nowTick)}</strong>
                            ) : (
                              <span style={{ color: PALETTE.textDisabled }}>Sem data</span>
                            )}
                          </div>
                        </div>
                        {showBadge && (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: colorForAnniv(daysLeft) }}>{daysLeft}</div>
                            <div style={{ fontSize: 10, color: PALETTE.textSecondary }}>dias</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
            </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {sectionHeader('nextVac', '⏱️', 'Dias p/ Próximas Férias', PALETTE.info)}
            <div style={{
              ...cardStyle,
              borderTop: 'none',
              borderRadius: expanded.nextVac ? '0 0 8px 8px' : 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: expanded.nextVac ? 340 : 0,
              overflowY: 'auto',
              transition: 'max-height 360ms cubic-bezier(.2,.9,.2,1), opacity 220ms ease',
              opacity: expanded.nextVac ? 1 : 0,
              flex: 1,
            }}>
              {filteredSummary.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum trabalhador ativo</p>}
              {filteredSummary.slice().sort((a, b) => {
                  const da = daysUntilNextVacation(a.hireDate)
                  const db = daysUntilNextVacation(b.hireDate)
                  const na = da === null ? Number.MAX_SAFE_INTEGER : da
                  const nb = db === null ? Number.MAX_SAFE_INTEGER : db
                  return na - nb
                }).map(s => {
                  const daysLeft = daysUntilNextVacation(s.hireDate)
                  const nextVacationDate = (() => {
                    if (daysLeft === null) return null
                    const now = new Date()
                    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysLeft)
                    return fmtDate(isoDate(target))
                  })()
                  const colorForDays = (d: number | null) => {
                    if (d === null) return PALETTE.textDisabled
                    if (d === 0) return '#00ff00'
                    if (d > 30) return '#9bc4e6'
                    if (d > 10) return '#5288b4'
                    return PALETTE.warning
                  }

                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px',
                      background: PALETTE.backgroundSecondary, borderRadius: 6, border: `1px solid ${PALETTE.border}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                        <strong style={{ fontSize: 13, display: 'block', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</strong>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        {daysLeft !== null ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {nextVacationDate && (
                              <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>{nextVacationDate}</div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                              <div style={{ minWidth: 30, fontSize: 18, fontWeight: 700, color: colorForDays(daysLeft) }}>{daysLeft}</div>
                              <div style={{ fontSize: 10, color: PALETTE.textSecondary }}>dias</div>
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: PALETTE.textDisabled }}>Sem data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
          </div>

          </div>
        </div>
      </div>
    )
  }

  function renderSchedule() {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{editId ? 'Editar Férias' : 'Agendar Férias'}</h2>
          <button onClick={() => { setShowScheduleModal(false); resetForm() }} style={btnSmall}>✕ Fechar</button>
        </div>
        <div style={{ ...cardStyle, display: 'grid', gap: 14 }}>
          <div>
            <label style={labelStyle}>Colaborador *</label>
            <select
              value={formWorkerId}
              onChange={e => setFormWorkerId(e.target.value ? Number(e.target.value) : '')}
              required
              style={selectStyle}
              disabled={!isAdmin && currentUserWorkerId !== null && !editId}
            >
              <option value="">Selecione...</option>
              {workers.filter(w => w.active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Data Início *</label>
              <input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Data Final *</label>
              <input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} required style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Dias Usados *</label>
              <input
                type="text"
                value={formDays}
                style={inputStyle}
                readOnly
                tabIndex={-1}
                onFocus={e => e.currentTarget.blur()}
                onMouseDown={e => e.preventDefault()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 10, paddingBottom: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: PALETTE.textSecondary, fontSize: 14 }}>
                <input type="checkbox" checked={formSold} onChange={e => setFormSold(e.target.checked)} />
                Vendeu férias?
              </label>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Observações</label>
            <input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Opcional" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {editId && <button onClick={resetForm} style={btnSmall}>Cancelar edição</button>}
            <button onClick={async () => { const ok = await onSave(); if (ok) setShowScheduleModal(false) }} style={btnPrimary}>{editId ? 'Salvar' : 'Agendar'}</button>
          </div>
        </div>

        {formWorkerId && (() => {
          const s = summary.find(s => s.id === formWorkerId)
          if (!s) return null
          return (
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: PALETTE.textSecondary }}>Resumo – {s.name}</h4>
              <div style={{ fontSize: 13, color: PALETTE.textSecondary, lineHeight: 1.8 }}>
                Contratação: <strong style={{ color: PALETTE.textPrimary }}>{fmtDate(s.hireDate)}</strong><br />
                Tempo de casa: <strong style={{ color: PALETTE.success }}>{tenureText(s.hireDate)}</strong><br />
                Dias acumulados: <strong style={{ color: PALETTE.textPrimary }}>{s.totalEarned}</strong><br />
                Dias usados: <strong style={{ color: PALETTE.textPrimary }}>{s.totalUsed}</strong><br />
                Saldo pendente: <strong style={{ color: s.pendingDays > 0 ? PALETTE.warning : PALETTE.textSecondary }}>{s.pendingDays} dias</strong>
              </div>
            </div>
          )
        })()}
      </div>
    )
  }

  function renderList() {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px 0' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Lançamentos de Férias</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setShowFilters(s => !s)} style={btnSmall}>🔎 Filtrar</button>
            <button onClick={() => {
              setFilterSearchText(''); setFilterSearchField('any'); setFilterStartDate(''); setFilterEndDate('')
              setFilterSoldStatus('any'); setFilterActiveStatus('any'); setFilterMinDays(''); setFilterMaxDays('')
              setShowFilters(false)
            }} style={btnSmall}>Limpar</button>
          </div>
        </div>

        {showFilters && (
          <div style={{ ...cardStyle, marginBottom: 12, padding: 12, display: 'grid', gap: 10 }}>
            {/* <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Pesquisar..." value={filterSearchText} onChange={e => setFilterSearchText(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 360 }} />
              <select value={filterSearchField} onChange={e => setFilterSearchField(e.target.value as any)} style={selectStyle}>
                <option value="any">Qualquer campo</option>
                <option value="worker">Trabalhador</option>
                <option value="note">Observações</option>
              </select>
            </div> */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 12, color: PALETTE.textSecondary, marginBottom: 6 }}>Venda</label>
                <select id="filterSoldStatus" value={filterSoldStatus} onChange={e => setFilterSoldStatus(e.target.value as any)} style={{ ...selectStyle, width: 160 }}>
                  <option value="any">Todos</option>
                  <option value="sold">Só vendidas</option>
                  <option value="not_sold">Só não vendidas</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 12, color: PALETTE.textSecondary, marginBottom: 6 }}>Status</label>
                <select value={filterActiveStatus} onChange={e => setFilterActiveStatus(e.target.value as any)} style={{ ...selectStyle, width: 160 }}>
                  <option value="any">Todos</option>
                  <option value="active">Ativas</option>
                  <option value="inactive">Inativas</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 12, color: PALETTE.textSecondary, marginBottom: 6 }}>Trabalhador</label>
                <select id="filterWorkerId" value={filterWorkerId} onChange={e => setFilterWorkerId(e.target.value ? Number(e.target.value) : '')} style={{ ...selectStyle, width: 220 }}>
                  <option value="">Todos</option>
                  {workers.filter(w => w.active).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: PALETTE.textSecondary }}>Data Início (&gt;=)</label>
                <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: PALETTE.textSecondary }}>Data Final (&lt;=)</label>
                <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <input type="number" placeholder="Mín dias" value={filterMinDays as any} onChange={e => setFilterMinDays(e.target.value === '' ? '' : Number(e.target.value))} style={{ ...inputStyle, width: 110 }} />
                <input type="number" placeholder="Máx dias" value={filterMaxDays as any} onChange={e => setFilterMaxDays(e.target.value === '' ? '' : Number(e.target.value))} style={{ ...inputStyle, width: 110 }} />
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayedVacations.length === 0 && <p style={{ color: PALETTE.textDisabled }}>Nenhum lançamento encontrado</p>}
          {displayedVacations.map(v => {
            const w = workers.find(w => w.id === v.workerId)
            return (
              <div key={v.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: PALETTE.cardBg, borderRadius: 8, border: `1px solid ${PALETTE.border}`,
                borderLeft: w?.color ? `4px solid ${w.color}` : `4px solid ${PALETTE.border}`,
                opacity: v.active ? 1 : 0.5,
              }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: w?.color || PALETTE.border, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
                      <strong style={{ display: 'block' }}>{w?.name || '?'}</strong>
                    {v.sold && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.info}22`, color: PALETTE.info }}>Vendeu</span>}
                    {typeof v.request !== 'undefined' && v.request !== null && v.request === 0 && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.warning}22`, color: PALETTE.warning }}>Solicitação</span>
                    )}
                    {typeof v.request !== 'undefined' && v.request !== null && v.request === 1 && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.success}22`, color: PALETTE.success }}>Aprovado</span>
                    )}
                    {typeof v.request !== 'undefined' && v.request !== null && v.request === 2 && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.error}22`, color: PALETTE.error }}>Recusado</span>
                    )}
                    {!v.active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.error}22`, color: PALETTE.error }}>Inativo</span>}
                  </div>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>
                    {fmtDate(v.startDate)} — {fmtDate(v.endDate)} · {v.daysUsed} dias
                    {v.note && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>({v.note})</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => startEdit(v)} style={btnSmall}>Editar</button>
                    <button onClick={() => onDelete(v.id)} style={{ ...btnSmallRed }}>Apagar</button>
                    {v.request === 0 && (
                      <>
                        <button onClick={() => approveVacation(v.id)} style={{ ...btnSmall, background: PALETTE.success, color: '#fff', border: 'none' }}>Aprovar</button>
                        <button onClick={() => rejectVacation(v.id)} style={{ ...btnSmallRed }}>Recusar</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
