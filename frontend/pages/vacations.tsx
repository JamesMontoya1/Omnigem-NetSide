import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/router'
import {
  PALETTE, btnPrimary, btnSmall, btnSmallRed,
  inputStyle, selectStyle, cardStyle, labelStyle, btnNav,
} from '../styles/theme'
import { useToast } from '../components/ToastProvider'
import { API_BASE, jsonAuthHeaders, authHeaders } from '../config/api'
import WorkersContent from '../components/WorkersContent'

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

/* ── Helpers ── */
function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
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

/* ── Tab type ── */
type Tab = 'dashboard' | 'list'

export default function VacationsPage() {
  const router = useRouter()
  const { addToast } = useToast()

  const isAdmin = typeof window !== 'undefined' && localStorage.getItem('plantoes_role') === 'ADMIN'

  const [tab, setTab] = useState<Tab>('dashboard')
  const [workers, setWorkers] = useState<Worker[]>([])
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [summary, setSummary] = useState<Summary[]>([])

  // Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showWorkersModal, setShowWorkersModal] = useState(false)

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

  // Collapsible sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pending: true, upcoming: true, tenure: true })
  function toggleSection(key: string) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })) }

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [wRes, vRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/workers`),
        fetch(`${API_BASE}/vacations`),
        fetch(`${API_BASE}/vacations/summary`),
      ])
      setWorkers(await wRes.json())
      setVacations(await vRes.json())
      setSummary(await sRes.json())
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
      const d = daysBetween(new Date(formStart), new Date(formEnd)) + 1
      if (d > 0) setFormDays(d)
    }
  }, [formStart, formEnd])

  /* ── Derived data ── */
  const filteredSummary = filterWorkerId ? summary.filter(s => s.id === filterWorkerId) : summary
  const pendingWorkers = filteredSummary.filter(s => s.pendingDays > 0)
  const upcomingAll = filteredSummary.flatMap(s => s.upcoming.map(v => ({ ...v, workerName: s.name, workerColor: s.color })))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 10)
  const filteredVacations = filterWorkerId ? vacations.filter(v => v.workerId === filterWorkerId) : vacations

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
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowScheduleModal(false); resetForm() } }}>
          <div style={{ width: 560, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
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

    return (
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* LEFT – collapsible panels */}
        <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Férias Pendentes */}
          <div>
            {sectionHeader('pending', '⏳', 'Férias Pendentes', PALETTE.warning)}
            {expanded.pending && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 200, overflowY: 'auto' }}>
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

          {/* Próximas Férias */}
          <div>
            {sectionHeader('upcoming', '📅', 'Próximas Férias', PALETTE.info)}
            {expanded.upcoming && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', maxHeight: 200, overflowY: 'auto' }}>
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

          {/* Tempo de Casa */}
          <div>
            {sectionHeader('tenure', '🏢', 'Tempo de Casa', PALETTE.success)}
            {expanded.tenure && (
              <div style={{ ...cardStyle, borderTop: 'none', borderRadius: '0 0 8px 8px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                {filteredSummary.length === 0 && <p style={{ color: PALETTE.textDisabled, margin: 0, fontSize: 13 }}>Nenhum trabalhador ativo</p>}
                {filteredSummary.map(s => (
                  <div key={s.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                    background: PALETTE.backgroundSecondary, borderRadius: 6, border: `1px solid ${PALETTE.border}`,
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: s.color || PALETTE.border, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ fontSize: 13 }}>{s.name}</strong>
                      <div style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                        {s.hireDate ? `Contrat.: ${fmtDate(s.hireDate)}` : 'Sem data'}
                      </div>
                      <div style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                        <strong style={{ color: PALETTE.success }}>{tenureText(s.hireDate)}</strong>
                        {' · '}{s.totalEarned}d acum. · {s.totalUsed}d usados
                        {' · '}<strong style={{ color: s.pendingDays > 0 ? PALETTE.warning : PALETTE.textSecondary }}>{s.pendingDays}d saldo</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT – Calendar */}
        <div style={{ ...cardStyle, flex: 1, minWidth: 0, minHeight: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} style={btnSmall}>◀</button>
            <h3 style={{ margin: 0, fontSize: 16 }}>{MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}</h3>
            <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} style={btnSmall}>▶</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: PALETTE.textSecondary, padding: '4px 0' }}>{d}</div>
            ))}
            {calendarDays.map((d, i) => {
              const vacs = vacationsForDate(d.date)
              const isToday = isoDate(d.date) === isoDate(new Date())
              return (
                <div key={i} style={{
                  minHeight: 90, padding: 6, borderRadius: 4, fontSize: 12,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                  background: !d.current ? PALETTE.notCurrentBg : isToday ? PALETTE.todayBg : PALETTE.cardBg,
                  border: isToday ? `2px solid ${PALETTE.primary}` : `1px solid ${PALETTE.border}`,
                  opacity: d.current ? 1 : 0.4,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 18, textAlign: 'center' }}>{d.date.getDate()}</div>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 0 }}>
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
              <input type="number" min={1} max={30} value={formDays} onChange={e => setFormDays(e.target.value ? Number(e.target.value) : '')} required style={inputStyle} />
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
                      <strong>{''}</strong>
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
