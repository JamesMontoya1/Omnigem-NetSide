import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import {
  PALETTE, btnPrimary, btnSmall, btnSmallRed,
  inputStyle, selectStyle, cardStyle, labelStyle, btnNav,
} from '../styles/theme'
import { useToast } from '../components/ToastProvider'
import { API_BASE, jsonAuthHeaders, authHeaders } from '../config/api'
import WorkersContent from '../components/WorkersContent'
import HolidaysContent from '../components/HolidaysContent'

/* ── Types ── */
type Worker = {
  id: number; name: string; color?: string; active: boolean;
  hireDate?: string; terminationDate?: string;
}

type Vacation = {
  id: number; workerId: number; startDate: string; endDate: string;
  daysUsed: number; sold: boolean; active: boolean; note?: string;
  worker?: Worker;
}

type Summary = {
  id: number; name: string; color?: string;
  hireDate: string | null; terminationDate: string | null;
  yearsWorked: number; totalEarned: number; totalUsed: number;
  pendingDays: number; upcoming: Vacation[];
}

type Holiday = { id: number; date: string; name: string }

/* ── Helpers ── */
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
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
  // Compare using dates only (ignore time) so we can return 0 for today
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Use UTC methods because new Date('YYYY-MM-DD') is parsed as UTC midnight
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
    // borrow days from previous month
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    days += prevMonthLastDay
    months--
  }
  if (months < 0) { months += 12; years-- }

  const pad = (n: number) => String(Math.max(0, n)).padStart(2, '0')
  return `${years}a ${months}m ${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
}

/* ── Tab type ── */
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

  // Live tick to update tenure seconds/minutes display
  const [nowTick, setNowTick] = useState<number>(Date.now())

  // Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)
  const [showHolidaysModal, setShowHolidaysModal] = useState(false)

  // Calendar state
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  // Form state for scheduling
  const [formWorkerId, setFormWorkerId] = useState<number | ''>('')
  const [formStart, setFormStart] = useState('')
  const [formEnd, setFormEnd] = useState('')
  const [formDays, setFormDays] = useState<number | ''>('')
  const [formSold, setFormSold] = useState(false)
  const [formNote, setFormNote] = useState('')
  const [editId, setEditId] = useState<number | null>(null)

  // Worker filter
  const [filterWorkerId, setFilterWorkerId] = useState<number | ''>('')

  // Holiday info modal
  const [holidayModalData, setHolidayModalData] = useState<Holiday[] | null>(null)

  // Collapsible sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pending: true, upcoming: true, tenure: true, nextVac: true })
  function toggleSection(key: string) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })) }

  useEffect(() => {
    setIsAdmin(localStorage.getItem('plantoes_role') === 'ADMIN')
    load()
  }, [])

  // update every second so tenure display shows hh:mm:ss
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
      // holidays fetch may be last in array; handle separately to be safe
      try { const hRes = await fetch(`${API_BASE}/holidays`); setHolidays(await hRes.json()) } catch (e) { console.error('holidays load', e) }
    } catch (e) { console.error(e) }
  }

  /* ── Calendar helpers ── */
  const calendarDays = useMemo(() => {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay() // 0=Sun
    const days: { date: Date; current: boolean }[] = []

    // fill previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, current: false })
    }
    // fill current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), current: true })
    }
    // fill remaining to 42
    while (days.length < 42) {
      const last = days[days.length - 1].date
      const d = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1)
      days.push({ date: d, current: false })
    }
    return days
  }, [calMonth])

  function vacationsForDate(date: Date): Vacation[] {
    const iso = isoDate(date)
    return vacations.filter(v => {
      if (!v.active) return false
      if (v.sold) return false
      if (filterWorkerId && v.workerId !== filterWorkerId) return false
      const s = isoDate(new Date(v.startDate))
      const e = isoDate(new Date(v.endDate))
      return iso >= s && iso <= e
    })
  }

  /* ── CRUD ── */
  async function onSave(): Promise<boolean> {
    if (!formWorkerId || !formStart || !formEnd || !formDays) {
      addToast('Preencha todos os campos obrigatórios', 'error'); return false
    }

    // Check worker available days from summary
    const workerIdNum = Number(formWorkerId)
    const s = summary.find(x => x.id === workerIdNum)
    const pending = s ? Number(s.pendingDays || 0) : 0

    // If editing, include the existing booking's days back into allowance
    const existing = editId ? vacations.find(v => v.id === editId) : undefined
    const existingDays = existing ? Number(existing.daysUsed || 0) : 0
    const allowed = pending + existingDays

    if (Number(formDays) > allowed) {
      addToast(`Saldo insuficiente: disponível ${allowed} dias`, 'error')
      return false
    }

    const payload = {
      workerId: workerIdNum,
      startDate: formStart,
      endDate: formEnd,
      daysUsed: Number(formDays),
      sold: formSold,
      note: formNote || undefined,
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

  function startEdit(v: Vacation) {
    setEditId(v.id)
    setFormWorkerId(v.workerId)
    setFormStart(isoDate(new Date(v.startDate)))
    setFormEnd(isoDate(new Date(v.endDate)))
    setFormDays(v.daysUsed)
    setFormSold(v.sold)
    setFormNote(v.note || '')
    setShowScheduleModal(true)
  }

  function resetForm() {
    setEditId(null); setFormWorkerId(''); setFormStart(''); setFormEnd('')
    setFormDays(''); setFormSold(false); setFormNote('')
  }

  // Auto-calculate days when dates change
  useEffect(() => {
    if (formStart && formEnd) {
      const d = daysBetween(parseLocalDate(formStart), parseLocalDate(formEnd)) + 1
      if (d > 0) setFormDays(d)
    }
  }, [formStart, formEnd])

  /* ── Derived data ── */
  const filteredSummary = filterWorkerId ? summary.filter(s => s.id === filterWorkerId) : summary
  const pendingWorkers = filteredSummary
    .filter(s => s.pendingDays > 0)
    .slice()
    .sort((a, b) => (b.pendingDays || 0) - (a.pendingDays || 0))
  const upcomingAll = filteredSummary.flatMap(s => s.upcoming.filter(v => !v.sold).map(v => ({ ...v, workerName: s.name, workerColor: s.color })))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10)
  const filteredVacations = (filterWorkerId ? vacations.filter(v => v.workerId === filterWorkerId) : vacations)
    .slice().sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  /* ── Render ── */
  return (
    <main style={{ minHeight: '100vh', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif', color: PALETTE.textPrimary }}>
      {/* Header */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${PALETTE.border}` }}>
        <button onClick={() => router.push('/selection')} style={btnNav}>← Voltar</button>
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

      <div style={{ padding: 24 }}>
        {tab === 'dashboard' && renderDashboard()}
        {tab === 'list' && renderList()}
      </div>

      {/* Modal: Agendar Férias */}
      {showScheduleModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowScheduleModal(false); resetForm() } }}>
          <div style={{ width: 560, maxWidth: '95%', maxHeight: 'calc(100vh - 48px)', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            {renderSchedule()}
          </div>
        </div>
      )}

      {/* Modal: Trabalhadores */}
      {showWorkersModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowWorkersModal(false); load() } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Trabalhadores</h2>
              <button onClick={() => { setShowWorkersModal(false); load() }} style={btnSmall}>✕ Fechar</button>
            </div>
            <WorkersContent />
          </div>
        </div>
      )}

      {/* Modal: Info Feriado (star click) */}
      {holidayModalData && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setHolidayModalData(null) }}>
          <div style={{
            width: 380, maxWidth: '90%', background: PALETTE.cardBg, borderRadius: 12, padding: 0,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
            border: '1px solid #daa52066',
          }}>
            {/* Golden header */}
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
            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
              {holidayModalData.map(h => (
                <div key={h.id} style={{
                  padding: '14px 16px', background: '#ff8c00',
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

      {/* Modal: Feriados */}
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
    </main>
  )

  /* ================================================================
     TAB: Dashboard
     ================================================================ */
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

      // color for anniversary countdown badge
      const colorForAnniv = (d: number | null) => {
        if (d === null) return PALETTE.textDisabled
        if (d === 0) return '#00ff00'
        if (d > 30) return PALETTE.textDisabled
        if (d > 10) return '#9bc4e6'
        return '#5288b4' // 1-10 days
      }

    return (
      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch' }}>
        {/* LEFT – collapsible panels */}
        <div style={{ flex: 4, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Row: Pendentes + Próximas side by side */}
          <div style={{ display: 'flex', gap: 12 }}>

          {/* Férias Pendentes */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {sectionHeader('pending', '⏳', 'Férias Pendentes', PALETTE.warning)}
            {expanded.pending && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 220, overflowY: 'auto' }}>
                {pendingWorkers.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum saldo pendente</p>}
                {pendingWorkers.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13 }}>
                      <strong>{s.name}</strong>
                      <span style={{ fontSize: 11, color: PALETTE.textSecondary, marginLeft: 6 }}>({tenureText(s.hireDate)})</span>
                    </div>
                    <span style={{ fontWeight: 700, color: PALETTE.warning, fontSize: 13 }}>{s.pendingDays}d</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agendamento de férias */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {sectionHeader('upcoming', '📅', 'Agendamento de férias', PALETTE.info)}
            {expanded.upcoming && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 220, overflowY: 'auto' }}>
                {upcomingAll.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhuma férias agendada</p>}
                {upcomingAll.map((v: any) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${PALETTE.border}` }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: v.workerColor || PALETTE.border, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{v.workerName}</strong>
                      <div style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                        {fmtDate(v.startDate)} — {fmtDate(v.endDate)} ({v.daysUsed}d)
                      </div>
                    </div>
                    {isAdmin && <button onClick={() => startEdit(v)} style={btnSmall}>Editar</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          </div>{/* end row */}

          {/* Row: Tempo de Casa + Próximas Férias */}
          <div style={{ display: 'flex', gap: 12 }}>

          {/* Tempo de Casa */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {sectionHeader('tenure', '🏢', 'Tempo de Casa', PALETTE.success)}
            {expanded.tenure && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                {filteredSummary.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum trabalhador ativo</p>}
                {filteredSummary.slice().sort((a, b) => {
                  const da = daysUntilNextVacation(a.hireDate)
                  const db = daysUntilNextVacation(b.hireDate)
                  const na = da === null ? Number.MAX_SAFE_INTEGER : da
                  const nb = db === null ? Number.MAX_SAFE_INTEGER : db
                  return na - nb
                }).map(s => {
                  const daysLeft = daysUntilNextVacation(s.hireDate)
                  const showBadge = daysLeft !== null && daysLeft <= 30
                  return (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                      background: PALETTE.backgroundSecondary, borderRadius: 6, border: `1px solid ${PALETTE.border}`,
                    }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong style={{ fontSize: 13 }}>{s.name}</strong>
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
            )}
          </div>

          {/* Dias para Próximas Férias */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {sectionHeader('nextVac', '⏱️', 'Dias p/ Próximas Férias', PALETTE.info)}
            {expanded.nextVac && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                {filteredSummary.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum trabalhador ativo</p>}
                {filteredSummary.slice().sort((a, b) => {
                  const da = daysUntilNextVacation(a.hireDate)
                  const db = daysUntilNextVacation(b.hireDate)
                  const na = da === null ? Number.MAX_SAFE_INTEGER : da
                  const nb = db === null ? Number.MAX_SAFE_INTEGER : db
                  return na - nb
                }).map(s => {
                  const daysLeft = daysUntilNextVacation(s.hireDate)
                  // choose color by thresholds:
                  // >30d -> #9bc4e6, >10d -> #5288b4, =0 -> #00ff00, else -> warning
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
                        <strong style={{ fontSize: 13 }}>{s.name}</strong>
                      </div>
                      <div style={{ textAlign: 'center', flexShrink: 0 }}>
                        {daysLeft !== null ? (
                          <>
                            <div style={{ fontSize: 18, fontWeight: 700, color: colorForDays(daysLeft) }}>{daysLeft}</div>
                            <div style={{ fontSize: 10, color: PALETTE.textSecondary }}>dias</div>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: PALETTE.textDisabled }}>Sem data</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          </div>{/* end row tenure + next vac */}
        </div>

        {/* RIGHT – Calendar */}
        <div style={{ ...cardStyle, flex: 6, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} style={btnSmall}>◀</button>
            <h3 style={{ margin: 0, fontSize: 16 }}>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h3>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={btnSmall}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: PALETTE.textSecondary, padding: '4px 0' }}>{d}</div>
            ))}
            {calendarDays.map((d, i) => {
              const vacs = vacationsForDate(d.date)
              const hols = holidays.filter(h => isoDate(new Date(h.date)) === isoDate(d.date))
              const isToday = isoDate(d.date) === isoDate(new Date())
              const isHoliday = hols.length > 0 && d.current
              const baseBg = !d.current ? PALETTE.notCurrentBg : isToday ? PALETTE.todayBg : PALETTE.cardBg
              return (
                <div key={i} style={{
                  minHeight: 90, padding: 0, borderRadius: 6, fontSize: 12,
                  display: 'flex', flexDirection: 'column',
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
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  {/* Star badge for holidays */}
                  {isHoliday && (
                    <span
                      onClick={(e) => { e.stopPropagation(); setHolidayModalData(hols) }}
                      title={hols.map(h => h.name).join(', ')}
                      style={{
                        position: 'absolute', right: 3, top: 2, zIndex: 2,
                        fontSize: 17, cursor: 'pointer', lineHeight: 1,
                        filter: 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))',
                        transition: 'transform 0.2s ease, filter 0.2s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.35) rotate(15deg)'; e.currentTarget.style.filter = 'drop-shadow(0 2px 6px rgba(218,165,32,0.9))' }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))' }}
                    >⭐</span>
                  )}
                  {/* Date number */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 6px 2px' }}>
                    <span style={{ fontWeight: 600, fontSize: 20, color: isHoliday ? '#daa520' : undefined }}>{d.date.getDate()}</span>
                  </div>
                  {/* Holiday name label */}
                  {isHoliday && hols.map(h => (
                    <div key={`h-${h.id}`} title={h.name} style={{
                      fontSize: 11, fontWeight: 700, padding: '1px 4px', margin: '0 3px 2px',
                      borderRadius: 3, textAlign: 'center',
                      background: '#FF6A00', color: '#ffffff',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      letterSpacing: '0.03em', textTransform: 'uppercase',
                    }}>{h.name}</div>
                  ))}
                  {/* Vacations */}
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, padding: '2px 4px 4px', marginTop: 'auto' }}>
                    {vacs.slice(0, 3).map(v => {
                      const w = workers.find(w => w.id === v.workerId)
                      return (
                        <div
                          key={v.id}
                          onClick={isAdmin ? () => startEdit(v) : undefined}
                          role={isAdmin ? 'button' : undefined}
                          tabIndex={isAdmin ? 0 : undefined}
                          onKeyDown={isAdmin ? (e) => { if (e.key === 'Enter' || e.key === ' ') startEdit(v) } : undefined}
                          title={w?.name || '?'}
                          style={{
                            fontSize: 13, padding: '1px 4px', borderRadius: 3, marginBottom: 1,
                            background: w?.color ? `${w.color}33` : `${PALETTE.primary}33`,
                            color: PALETTE.textPrimary,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: isAdmin ? 'pointer' : 'default'
                          }}
                        >{w?.name || '?'}</div>
                      )
                    })}
                    {vacs.length > 3 && <div style={{ fontSize: 9, color: PALETTE.textDisabled }}>+{vacs.length - 3}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ================================================================
     TAB: Agendar
     ================================================================ */
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
            <select value={formWorkerId} onChange={e => setFormWorkerId(e.target.value ? Number(e.target.value) : '')} required style={selectStyle}>
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

        {/* Quick summary of selected worker */}
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

  /* ================================================================
     TAB: Lançamentos
     ================================================================ */
  function renderList() {
    return (
      <div>
        <h2 style={{ margin: '0 0 20px 0', fontSize: 18 }}>Lançamentos de Férias</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredVacations.length === 0 && <p style={{ color: PALETTE.textDisabled }}>Nenhum lançamento encontrado</p>}
          {filteredVacations.map(v => {
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
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <strong>{w?.name || '?'}</strong>
                    {v.sold && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.info}22`, color: PALETTE.info }}>Vendeu</span>}
                    {!v.active && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: `${PALETTE.error}22`, color: PALETTE.error }}>Inativo</span>}
                  </div>
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>
                    {fmtDate(v.startDate)} — {fmtDate(v.endDate)} · {v.daysUsed} dias
                    {v.note && <span style={{ marginLeft: 8, fontStyle: 'italic' }}>({v.note})</span>}
                  </div>
                </div>
                {isAdmin && <button onClick={() => startEdit(v)} style={btnSmall}>Editar</button>}
                {isAdmin && <button onClick={() => onDelete(v.id)} style={{ ...btnSmallRed }}>Apagar</button>}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
}
