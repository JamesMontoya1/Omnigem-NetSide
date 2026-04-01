import React, { useEffect, useState, useCallback } from 'react'
import { API_BASE, jsonAuthHeaders } from '../../config/api'
import {
  PALETTE, btnPrimary, btnCancel, btnDanger, btnSmall, btnSmallBlue, btnSmallRed,
  cardStyle, inputStyle, selectStyle, labelStyle, btnNav,
} from '../../styles/theme'
import { useToast } from '../../components/shared/ToastProvider'

/* ── Tipos ── */

type Worker = { id: number; name: string; active?: boolean }

type TimePunch = {
  id: number
  workerId: number
  worker?: Worker
  occurredAt: string
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END'
  source: 'MANUAL' | 'IMPORT_CSV' | 'PONTOSIMPLES'
  externalId?: string | null
  createdAt: string
}

const PUNCH_TYPES = [
  { value: 'IN', label: 'Entrada' },
  { value: 'OUT', label: 'Saída' },
  { value: 'BREAK_START', label: 'Início Intervalo' },
  { value: 'BREAK_END', label: 'Fim Intervalo' },
] as const

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  IMPORT_CSV: 'CSV',
  PONTOSIMPLES: 'PontoSimples',
}

const TYPE_COLORS: Record<string, string> = {
  IN: PALETTE.success,
  OUT: PALETTE.error,
  BREAK_START: PALETTE.warning,
  BREAK_END: PALETTE.info,
}

const TYPE_BG: Record<string, string> = {
  IN: '#14352C',
  OUT: '#35201E',
  BREAK_START: '#35301A',
  BREAK_END: '#1A2B3D',
}

const EMPTY_FORM = {
  workerId: '',
  date: '',
  time: '',
  type: 'IN' as string,
}

/* ── Helpers ── */

function toDateInput(iso: string) {
  if (!iso) return ''
  return iso.includes('T') ? iso.split('T')[0] : iso.slice(0, 10)
}

function toTimeInput(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${mon}/${d.getFullYear()}`
}

function weekdayName(iso: string) {
  const d = new Date(iso)
  return ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()]
}

/* ── Estilos ── */

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1100,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
}

const modalStyle: React.CSSProperties = {
  background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`,
  borderRadius: 10, padding: 24, width: 480, maxHeight: 'calc(100vh - 48px)',
  overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
}

/* ── Componente ── */

export default function TimePunchesPage() {
  const { addToast } = useToast()

  const [workers, setWorkers] = useState<Worker[]>([])
  const [punches, setPunches] = useState<TimePunch[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [filterWorker, setFilterWorker] = useState('')
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [filterTo, setFilterTo] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1, 0)
    return d.toISOString().split('T')[0]
  })

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  // Expandir dias
  const [collapsedDays, setCollapsedDays] = useState<Record<string, boolean>>({})

  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      setIsAdmin(Array.isArray(roles) && roles.includes('ADMIN'))
    } catch { setIsAdmin(false) }
  }, [])

  /* ── Fetch ── */

  const fetchWorkers = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/workers`, { headers: jsonAuthHeaders() })
      if (r.ok) setWorkers(await r.json())
    } catch {}
  }, [])

  const fetchPunches = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterWorker) params.set('workerId', filterWorker)
      if (filterFrom) params.set('from', new Date(filterFrom + 'T00:00:00').toISOString())
      if (filterTo) params.set('to', new Date(filterTo + 'T23:59:59').toISOString())
      const r = await fetch(`${API_BASE}/time-punches?${params}`, { headers: jsonAuthHeaders() })
      if (r.ok) setPunches(await r.json())
    } catch {}
    setLoading(false)
  }, [filterWorker, filterFrom, filterTo])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])
  useEffect(() => { fetchPunches() }, [fetchPunches])

  /* ── CRUD ── */

  const openNew = () => {
    setEditId(null)
    setForm({ ...EMPTY_FORM })
    setShowModal(true)
  }

  const openEdit = (p: TimePunch) => {
    setEditId(p.id)
    setForm({
      workerId: String(p.workerId),
      date: toDateInput(p.occurredAt),
      time: toTimeInput(p.occurredAt),
      type: p.type,
    })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.workerId || !form.date || !form.time || !form.type) {
      addToast('Preencha todos os campos', 'error')
      return
    }
    const occurredAt = new Date(`${form.date}T${form.time}:00`).toISOString()
    try {
      if (editId) {
        const r = await fetch(`${API_BASE}/time-punches/${editId}`, {
          method: 'PUT',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ occurredAt, type: form.type }),
        })
        if (!r.ok) throw new Error()
        addToast('Ponto atualizado', 'success')
      } else {
        const r = await fetch(`${API_BASE}/time-punches`, {
          method: 'POST',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ workerId: Number(form.workerId), occurredAt, type: form.type }),
        })
        if (!r.ok) throw new Error()
        addToast('Ponto registrado', 'success')
      }
      setShowModal(false)
      fetchPunches()
    } catch {
      addToast('Erro ao salvar ponto', 'error')
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Remover este ponto?')) return
    try {
      const r = await fetch(`${API_BASE}/time-punches/${id}`, {
        method: 'DELETE', headers: jsonAuthHeaders(),
      })
      if (!r.ok) throw new Error()
      addToast('Ponto removido', 'success')
      fetchPunches()
    } catch {
      addToast('Erro ao remover', 'error')
    }
  }

  /* ── Agrupar por dia ── */

  const grouped = punches.reduce<Record<string, TimePunch[]>>((acc, p) => {
    const day = toDateInput(p.occurredAt)
    if (!acc[day]) acc[day] = []
    acc[day].push(p)
    return acc
  }, {})

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  /* ── Calcular horas trabalhadas ── */

  function calcHours(dayPunches: TimePunch[]): { text: string; ms: number } {
    let totalMs = 0
    let lastIn: Date | null = null

    const sorted = [...dayPunches].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())

    for (const p of sorted) {
      const t = new Date(p.occurredAt)
      if (p.type === 'IN') {
        lastIn = t
      } else if (p.type === 'BREAK_START' && lastIn) {
        totalMs += t.getTime() - lastIn.getTime()
        lastIn = null
      } else if (p.type === 'BREAK_END') {
        lastIn = t
      } else if (p.type === 'OUT' && lastIn) {
        totalMs += t.getTime() - lastIn.getTime()
        lastIn = null
      }
    }

    if (totalMs === 0) return { text: '-', ms: 0 }
    const h = Math.floor(totalMs / 3600000)
    const m = Math.floor((totalMs % 3600000) / 60000)
    return { text: `${h}h${String(m).padStart(2, '0')}m`, ms: totalMs }
  }

  /* Totais do período */
  const totalMs = sortedDays.reduce((sum, day) => sum + calcHours(grouped[day]).ms, 0)
  const totalH = Math.floor(totalMs / 3600000)
  const totalM = Math.floor((totalMs % 3600000) / 60000)
  const totalText = totalMs > 0 ? `${totalH}h${String(totalM).padStart(2, '0')}m` : '-'

  /* ── Render ── */

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif', color: PALETTE.textPrimary }}>

      {/* ── Top bar ── */}
      <div style={{ padding: '16px 24px', paddingLeft: 80, display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${PALETTE.border}` }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>Registro de Ponto</h2>

        {isAdmin && (
          <button onClick={openNew} style={{ ...btnNav, background: PALETTE.success, color: '#fff', border: 'none' }}>
            + Novo Ponto
          </button>
        )}

        <select
          value={filterWorker}
          onChange={e => setFilterWorker(e.target.value)}
          style={{ ...selectStyle, width: 220, fontSize: 13 }}
        >
          <option value="">Todos os trabalhadores</option>
          {workers.filter(w => w.active !== false).map(w => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            style={{ ...inputStyle, width: 150, fontSize: 13 }}
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
          />
          <span style={{ color: PALETTE.textSecondary }}>—</span>
          <input
            type="date"
            style={{ ...inputStyle, width: 150, fontSize: 13 }}
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Banner PontoSimples */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 6,
          background: PALETTE.backgroundSecondary,
          border: `1px dashed ${PALETTE.border}`,
        }}>
          <span style={{ fontSize: 14 }}>🔗</span>
          <span style={{ color: PALETTE.textSecondary, fontSize: 11 }}>
            PontoSimples — Em breve
          </span>
        </div>

        {/* Resumo do período */}
        {totalMs > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 6,
            background: PALETTE.primary + '22',
            border: `1px solid ${PALETTE.primary}44`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: PALETTE.primary }}>Total: {totalText}</span>
            <span style={{ fontSize: 11, color: PALETTE.textSecondary }}>({sortedDays.length} dia{sortedDays.length !== 1 ? 's' : ''})</span>
          </div>
        )}
      </div>

      {/* ── Conteúdo ── */}
      <div style={{ padding: 24, flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ color: PALETTE.textSecondary, textAlign: 'center', marginTop: 60 }}>Carregando...</p>
        ) : sortedDays.length === 0 ? (
          <p style={{ color: PALETTE.textSecondary, textAlign: 'center', marginTop: 60, fontSize: 15 }}>
            Nenhum ponto encontrado no período selecionado.
          </p>
        ) : (
          sortedDays.map(day => {
            const dayPunches = grouped[day]
            const { text: dayHours } = calcHours(dayPunches)
            const collapsed = collapsedDays[day] ?? false

            // Agrupar por trabalhador
            const byWorker: Record<number, TimePunch[]> = {}
            for (const p of dayPunches) {
              if (!byWorker[p.workerId]) byWorker[p.workerId] = []
              byWorker[p.workerId].push(p)
            }
            const workerEntries = Object.entries(byWorker)

            return (
              <div key={day} style={{
                background: PALETTE.cardBg,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 10,
                marginBottom: 16,
                overflow: 'hidden',
              }}>
                {/* Cabeçalho do dia */}
                <div
                  onClick={() => setCollapsedDays(prev => ({ ...prev, [day]: !prev[day] }))}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 20px',
                    background: PALETTE.hoverBg,
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: PALETTE.textSecondary, transition: 'transform 150ms', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▼</span>
                    <span style={{ fontWeight: 700, color: PALETTE.textPrimary, fontSize: 16 }}>
                      {formatDate(day + 'T00:00:00')}
                    </span>
                    <span style={{ color: PALETTE.textSecondary, fontSize: 13 }}>
                      {weekdayName(day + 'T12:00:00')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: PALETTE.textSecondary, fontSize: 13 }}>
                      {workerEntries.length} trabalhador{workerEntries.length !== 1 ? 'es' : ''} · {dayPunches.length} registro{dayPunches.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontWeight: 700, color: PALETTE.primary, fontSize: 15 }}>
                      {dayHours}
                    </span>
                  </div>
                </div>

                {/* Conteúdo do dia */}
                {!collapsed && (
                  <div style={{ padding: '12px 20px' }}>
                    {workerEntries.map(([wId, wPunches]) => {
                      const workerName = wPunches[0]?.worker?.name || `#${wId}`
                      const { text: wHours } = calcHours(wPunches)
                      const sorted = [...wPunches].sort(
                        (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
                      )

                      return (
                        <div key={wId} style={{
                          background: PALETTE.backgroundSecondary,
                          borderRadius: 8,
                          padding: '12px 16px',
                          marginBottom: 10,
                          border: `1px solid ${PALETTE.border}`,
                        }}>
                          {/* Nome + horas */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontWeight: 600, color: PALETTE.textPrimary, fontSize: 15 }}>
                              {workerName}
                            </span>
                            <span style={{ fontWeight: 700, color: PALETTE.primary, fontSize: 14 }}>
                              {wHours}
                            </span>
                          </div>

                          {/* Batidas */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {sorted.map(p => (
                              <div
                                key={p.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  background: TYPE_BG[p.type] || PALETTE.background,
                                  borderRadius: 6,
                                  padding: '6px 12px',
                                  border: `1px solid ${TYPE_COLORS[p.type]}33`,
                                  fontSize: 13,
                                  transition: 'background 120ms ease',
                                  width: 300,
                                  boxSizing: 'border-box',
                                }}
                              >
                                <span style={{
                                  width: 10, height: 10, borderRadius: '50%',
                                  background: TYPE_COLORS[p.type] || PALETTE.textSecondary,
                                  display: 'inline-block',
                                  flexShrink: 0,
                                }} />
                                <span style={{ color: PALETTE.textPrimary, fontWeight: 600, fontSize: 15 }}>
                                  {toTimeInput(p.occurredAt)}
                                </span>
                                <span style={{ color: PALETTE.textSecondary, fontSize: 12 }}>
                                  {PUNCH_TYPES.find(t => t.value === p.type)?.label}
                                </span>
                                {p.source !== 'MANUAL' && (
                                  <span style={{
                                    fontSize: 10,
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    background: PALETTE.hoverBg,
                                    color: PALETTE.textSecondary,
                                    fontWeight: 500,
                                  }}>
                                    {SOURCE_LABELS[p.source] || p.source}
                                  </span>
                                )}
                                {isAdmin && (
                                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button
                                      style={{ ...btnSmall, fontSize: 12, padding: '2px 6px' }}
                                      onClick={() => openEdit(p)}
                                      title="Editar"
                                    >✎</button>
                                    <button
                                      style={{ ...btnSmall, fontSize: 12, padding: '2px 6px', color: PALETTE.error }}
                                      onClick={() => remove(p.id)}
                                      title="Remover"
                                    >✕</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* ── Modal criar/editar ── */}
      {showModal && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: PALETTE.textPrimary, margin: '0 0 16px', fontSize: 18 }}>
              {editId ? 'Editar Ponto' : 'Novo Ponto'}
            </h3>

            {!editId && (
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Trabalhador</label>
                <select
                  style={selectStyle}
                  value={form.workerId}
                  onChange={e => setForm(f => ({ ...f, workerId: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {workers.filter(w => w.active !== false).map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Data</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hora</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Tipo</label>
              <select
                style={selectStyle}
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {PUNCH_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnCancel} onClick={() => setShowModal(false)}>Cancelar</button>
              <button style={{ ...btnPrimary, padding: '8px 20px' }} onClick={save}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
