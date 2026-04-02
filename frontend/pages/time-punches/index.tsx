import React, { useEffect, useState, useCallback, useRef } from 'react'
import { API_BASE, jsonAuthHeaders } from '../../config/api'
import {
  PALETTE, btnPrimary, btnCancel, btnDanger, btnSmall, btnSmallBlue, btnSmallRed,
  cardStyle, inputStyle, selectStyle, labelStyle, btnNav,
} from '../../styles/theme'
import { useToast } from '../../components/shared/ToastProvider'
import WorkersContent from '../../components/shared/WorkersContent'

/* ── Tipos ── */

type Worker = { id: number; name: string; active?: boolean; pontoSimplesUserId?: number | null }

type TimePunch = {
  id: number
  workerId: number | null
  worker?: Worker | null
  occurredAt: string
  type: 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END'
  source: 'MANUAL' | 'IMPORT_CSV' | 'PONTOSIMPLES'
  externalId?: string | null
  raw?: any
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

  // Vincular ponto pendente
  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [linkWorkerId, setLinkWorkerId] = useState('')
  const [showWorkersModal, setShowWorkersModal] = useState(false)

  // Teste webhook
  const [showTestModal, setShowTestModal] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; checks: { name: string; ok: boolean; detail: string }[] } | null>(null)

  // Simular webhook
  const [showSimModal, setShowSimModal] = useState(false)
  const [simLoading, setSimLoading] = useState(false)
  const [simForm, setSimForm] = useState({
    user_name: '',
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    time: `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`,
  })
  const [simResult, setSimResult] = useState<{ status: string; punchId?: number; workerName?: string; pending?: boolean } | null>(null)

  // Teste GET webhook
  const [getTestLoading, setGetTestLoading] = useState(false)
  const [getTestResult, setGetTestResult] = useState<{ ok: boolean; status: number; body: any } | null>(null)
  const [showGetTestModal, setShowGetTestModal] = useState(false)

  const [isAdmin, setIsAdmin] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  useEffect(() => {
    try {
      const isAdm = localStorage.getItem('shifts_isAdmin') === 'true'
      const perms: string[] = JSON.parse(localStorage.getItem('shifts_permissions') || '[]')
      setIsAdmin(isAdm)
      setCanEdit(isAdm || perms.includes('time_punches.edit'))
    } catch { setIsAdmin(false); setCanEdit(false) }
  }, [])

  /* ── Teste GET Webhook ── */

  const testGetWebhook = useCallback(async () => {
    setGetTestLoading(true)
    setGetTestResult(null)
    setShowGetTestModal(true)
    try {
      const r = await fetch(`${API_BASE}/pontosimples/webhook`, { method: 'GET' })
      const body = await r.json().catch(() => null)
      setGetTestResult({ ok: r.ok, status: r.status, body })
    } catch (err) {
      setGetTestResult({ ok: false, status: 0, body: { error: 'Não foi possível conectar ao backend' } })
    }
    setGetTestLoading(false)
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

  /* ── Polling: detectar novos pontos PontoSimples ── */
  const lastPunchIdsRef = useRef<Set<number>>(new Set())
  const [newPunchAlerts, setNewPunchAlerts] = useState<{ id: number; userName: string; time: string; date: string; dismissedAt?: number }[]>([])

  // Inicializar os IDs conhecidos no primeiro load
  useEffect(() => {
    if (punches.length > 0 && lastPunchIdsRef.current.size === 0) {
      lastPunchIdsRef.current = new Set(punches.map(p => p.id))
    }
  }, [punches])

  // Polling a cada 15s para detectar novos pontos
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams()
        if (filterWorker) params.set('workerId', filterWorker)
        if (filterFrom) params.set('from', new Date(filterFrom + 'T00:00:00').toISOString())
        if (filterTo) params.set('to', new Date(filterTo + 'T23:59:59').toISOString())
        const r = await fetch(`${API_BASE}/time-punches?${params}`, { headers: jsonAuthHeaders() })
        if (!r.ok) return
        const fresh: TimePunch[] = await r.json()

        const knownIds = lastPunchIdsRef.current
        const newPunches = fresh.filter(p => !knownIds.has(p.id) && p.source === 'PONTOSIMPLES')

        if (newPunches.length > 0) {
          // Atualizar a lista principal
          setPunches(fresh)
          // Registrar os novos IDs
          fresh.forEach(p => knownIds.add(p.id))

          // Criar alertas para cada novo ponto
          const alerts = newPunches.map(p => ({
            id: p.id,
            userName: p.raw?.data?.user_name || p.raw?.data?.user_id || 'Desconhecido',
            time: toTimeInput(p.occurredAt),
            date: formatDate(p.occurredAt),
          }))
          setNewPunchAlerts(prev => [...alerts, ...prev])

          // Toast para cada novo
          newPunches.forEach(p => {
            const name = p.raw?.data?.user_name || p.raw?.data?.user_id || 'Desconhecido'
            addToast(`Novo ponto PontoSimples: ${name} às ${toTimeInput(p.occurredAt)}`, 'success')
          })
        } else if (fresh.length !== punches.length) {
          // Atualizar mesmo sem novos do PontoSimples (ex: deletou algo)
          setPunches(fresh)
          fresh.forEach(p => knownIds.add(p.id))
        }
      } catch {}
    }, 15000)
    return () => clearInterval(interval)
  }, [filterWorker, filterFrom, filterTo, addToast])

  const dismissAlert = (id: number) => {
    setNewPunchAlerts(prev => prev.filter(a => a.id !== id))
  }

  /* ── Teste Webhook ── */

  const testWebhook = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    setShowTestModal(true)
    try {
      const r = await fetch(`${API_BASE}/pontosimples/test`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ verification_key: process.env.NEXT_PUBLIC_PONTOSIMPLES_KEY || '' }),
      })
      if (r.ok) {
        setTestResult(await r.json())
      } else {
        setTestResult({ ok: false, checks: [{ name: 'Conexão com backend', ok: false, detail: `Erro HTTP ${r.status}` }] })
      }
    } catch {
      setTestResult({ ok: false, checks: [{ name: 'Conexão com backend', ok: false, detail: 'Não foi possível conectar ao backend' }] })
    }
    setTestLoading(false)
  }, [])

  /* ── Simular Webhook ── */

  const simulateWebhook = async () => {
    if (!simForm.user_name && !simForm.user_id) {
      addToast('Informe o nome ou ID do usuário', 'error')
      return
    }
    setSimLoading(true)
    setSimResult(null)
    try {
      const datetime = `${simForm.date}T${simForm.time}:00.000Z`
      const r = await fetch(`${API_BASE}/pontosimples/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'success',
          verification_key: process.env.NEXT_PUBLIC_PONTOSIMPLES_KEY || '',
          data: {
            user_id: simForm.user_id ? Number(simForm.user_id) : undefined,
            user_name: simForm.user_name || undefined,
            date: simForm.date,
            time: simForm.time,
            source: 'MOBILE',
            datetime,
          },
        }),
      })
      const json = await r.json()
      setSimResult(json)
      if (json.status === 'received') {
        addToast('Webhook simulado com sucesso — ponto pendente criado', 'success')
        fetchPunches()
      } else {
        addToast(`Webhook retornou: ${json.status} — ${json.reason || ''}`, 'warning')
      }
    } catch {
      addToast('Erro ao enviar webhook simulado', 'error')
    }
    setSimLoading(false)
  }

  /* ── Vincular ponto pendente ── */

  const linkPunch = async (punchId: number) => {
    if (!linkWorkerId) {
      addToast('Selecione um trabalhador', 'error')
      return
    }
    try {
      const r = await fetch(`${API_BASE}/time-punches/${punchId}/link`, {
        method: 'PATCH',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ workerId: Number(linkWorkerId) }),
      })
      if (!r.ok) throw new Error()
      addToast('Ponto vinculado com sucesso', 'success')
      setLinkingId(null)
      setLinkWorkerId('')
      fetchPunches()
    } catch {
      addToast('Erro ao vincular ponto', 'error')
    }
  }

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

  /* ── Separar pontos pendentes e vinculados ── */

  const pendingPunches = punches.filter(p => p.workerId === null)
  const linkedPunches = punches.filter(p => p.workerId !== null)

  /* ── Agrupar por dia (apenas vinculados) ── */

  const grouped = linkedPunches.reduce<Record<string, TimePunch[]>>((acc, p) => {
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

        {canEdit && (
          <>
            <button onClick={openNew} style={{ ...btnNav, background: PALETTE.success, color: '#fff', border: 'none' }}>
              + Novo Ponto
            </button>
            <button onClick={() => setShowWorkersModal(true)} style={btnNav}>👷 Trabalhadores</button>
          </>
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
        <button
          onClick={testWebhook}
          title="Clique para testar a conexão"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 12px', borderRadius: 6,
            background: PALETTE.success + '18',
            border: `1px solid ${PALETTE.success}44`,
            cursor: 'pointer',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: PALETTE.success, display: 'inline-block' }} />
          <span style={{ color: PALETTE.success, fontSize: 11, fontWeight: 600 }}>
            PontoSimples — Testar Conexão
          </span>
        </button>

        {canEdit && (
          <button
            onClick={() => { setSimResult(null); setShowSimModal(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 6,
              background: PALETTE.warning + '18',
              border: `1px solid ${PALETTE.warning}44`,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12 }}>🧪</span>
            <span style={{ color: PALETTE.warning, fontSize: 11, fontWeight: 600 }}>
              Simular Webhook
            </span>
          </button>
        )}

        {canEdit && (
          <button
            onClick={testGetWebhook}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 6,
              background: PALETTE.info + '18',
              border: `1px solid ${PALETTE.info}44`,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 12 }}>🔗</span>
            <span style={{ color: PALETTE.info, fontSize: 11, fontWeight: 600 }}>
              GET Webhook
            </span>
          </button>
        )}

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
        ) : (
          <>
          {/* ── Alertas de novos pontos PontoSimples ── */}
          {newPunchAlerts.length > 0 && (
            <div style={{
              background: '#0D2818',
              border: `1px solid ${PALETTE.success}55`,
              borderRadius: 10,
              marginBottom: 16,
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 20px',
                background: PALETTE.success + '20',
                borderBottom: `1px solid ${PALETTE.success}33`,
              }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span style={{ fontWeight: 700, color: PALETTE.success, fontSize: 14 }}>
                  Novo(s) ponto(s) recebido(s) do PontoSimples
                </span>
                <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                  ({newPunchAlerts.length})
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setNewPunchAlerts([])}
                  style={{ background: 'none', border: 'none', color: PALETTE.textSecondary, cursor: 'pointer', fontSize: 12 }}
                >Limpar todos</button>
              </div>
              <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {newPunchAlerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 8,
                    background: PALETTE.cardBg,
                    border: `1px solid ${PALETTE.border}`,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: PALETTE.success, flexShrink: 0, boxShadow: `0 0 6px ${PALETTE.success}` }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.textPrimary }}>
                      {a.userName}
                    </span>
                    <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                      {a.date} às {a.time}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 4,
                      background: PALETTE.success + '22', color: PALETTE.success, fontWeight: 600,
                    }}>PENDENTE</span>
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => dismissAlert(a.id)}
                      style={{ background: 'none', border: 'none', color: PALETTE.textSecondary, cursor: 'pointer', fontSize: 14 }}
                    >✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Pontos Pendentes ── */}
          {pendingPunches.length > 0 && canEdit && (
            <div style={{
              background: PALETTE.warning + '12',
              border: `1px solid ${PALETTE.warning}44`,
              borderRadius: 10,
              marginBottom: 20,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 20px',
                background: PALETTE.warning + '18',
                borderBottom: `1px solid ${PALETTE.warning}33`,
              }}>
                <span style={{ fontSize: 16 }}>⏳</span>
                <span style={{ fontWeight: 700, color: PALETTE.warning, fontSize: 15 }}>
                  Pontos Pendentes — Vincular Trabalhador
                </span>
                <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                  ({pendingPunches.length} ponto{pendingPunches.length !== 1 ? 's' : ''})
                </span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...pendingPunches]
                  .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
                  .map(p => {
                    const rawName = p.raw?.data?.user_name || p.raw?.data?.user_id || '—'
                    const isLinking = linkingId === p.id
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 8,
                        background: PALETTE.cardBg,
                        border: `1px solid ${PALETTE.border}`,
                      }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: PALETTE.warning, flexShrink: 0 }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 140 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: PALETTE.textPrimary }}>
                            {formatDate(p.occurredAt)} — {toTimeInput(p.occurredAt)}
                          </span>
                          <span style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                            PontoSimples: <b>{rawName}</b>
                          </span>
                        </div>

                        {isLinking ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                            <select
                              style={{ ...selectStyle, flex: 1, fontSize: 13 }}
                              value={linkWorkerId}
                              onChange={e => setLinkWorkerId(e.target.value)}
                              autoFocus
                            >
                              <option value="">Selecione o trabalhador...</option>
                              {workers.filter(w => w.active !== false).map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                            </select>
                            <button
                              style={{ ...btnSmall, background: PALETTE.success, color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => linkPunch(p.id)}
                            >Vincular</button>
                            <button
                              style={{ ...btnSmall, padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                              onClick={() => { setLinkingId(null); setLinkWorkerId('') }}
                            >Cancelar</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                            <button
                              style={{ ...btnSmall, background: PALETTE.primary, color: '#fff', border: 'none', padding: '4px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              onClick={() => { setLinkingId(p.id); setLinkWorkerId('') }}
                            >Vincular</button>
                            <button
                              style={{ ...btnSmall, fontSize: 12, padding: '4px 8px', color: PALETTE.error, cursor: 'pointer' }}
                              onClick={() => remove(p.id)}
                              title="Remover"
                            >✕</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {sortedDays.length === 0 && pendingPunches.length === 0 ? (
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
              if (!byWorker[p.workerId!]) byWorker[p.workerId!] = []
              byWorker[p.workerId!].push(p)
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
                                {canEdit && (
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
        </>
        )}
      </div>

      {showWorkersModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowWorkersModal(false); fetchWorkers(); fetchPunches() } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Trabalhadores</h2>
              <button onClick={() => { setShowWorkersModal(false); fetchWorkers(); fetchPunches() }} style={btnSmall}>✕ Fechar</button>
            </div>
            <WorkersContent showTitle={false} onChange={() => { fetchWorkers(); fetchPunches(); }} />
          </div>
        </div>
      )}

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
      {/* ── Modal simular webhook ── */}
      {showSimModal && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setShowSimModal(false) }}>
          <div style={{ ...modalStyle, width: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: PALETTE.textPrimary, margin: '0 0 16px', fontSize: 18 }}>
              🧪 Simular Webhook PontoSimples
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Nome do usuário (user_name)</label>
              <input
                style={inputStyle}
                placeholder="Ex: Marcelo"
                value={simForm.user_name}
                onChange={e => setSimForm(f => ({ ...f, user_name: e.target.value }))}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>ID do usuário (user_id) — opcional</label>
              <input
                style={inputStyle}
                type="number"
                placeholder="Ex: 22375"
                value={simForm.user_id}
                onChange={e => setSimForm(f => ({ ...f, user_id: e.target.value }))}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Data</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={simForm.date}
                  onChange={e => setSimForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Hora</label>
                <input
                  type="time"
                  style={inputStyle}
                  value={simForm.time}
                  onChange={e => setSimForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
            </div>

            {simResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: simResult.status === 'received' ? PALETTE.success + '18' : PALETTE.warning + '18',
                border: `1px solid ${simResult.status === 'received' ? PALETTE.success : PALETTE.warning}44`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: simResult.status === 'received' ? PALETTE.success : PALETTE.warning }}>
                  {simResult.status === 'received'
                    ? `✅ Ponto #${simResult.punchId} criado (pendente)`
                    : `⚠️ ${simResult.status}`}
                </div>
                {simResult.pending && (
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 4 }}>
                    Ponto criado sem vínculo — vincule na seção "Pontos Pendentes"
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button style={btnCancel} onClick={() => setShowSimModal(false)}>Fechar</button>
              <button
                style={{ ...btnPrimary, padding: '8px 20px' }}
                onClick={simulateWebhook}
                disabled={simLoading}
              >
                {simLoading ? 'Enviando...' : 'Enviar Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal teste webhook ── */}
      {showTestModal && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setShowTestModal(false) }}>
          <div style={{ ...modalStyle, width: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: PALETTE.textPrimary, margin: '0 0 16px', fontSize: 18 }}>
              Teste de Conexão — PontoSimples
            </h3>

            {testLoading ? (
              <p style={{ color: PALETTE.textSecondary, textAlign: 'center', padding: '24px 0' }}>Testando conexão...</p>
            ) : testResult ? (
              <div>
                {/* Resultado geral */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                  background: testResult.ok ? PALETTE.success + '18' : PALETTE.error + '18',
                  border: `1px solid ${testResult.ok ? PALETTE.success : PALETTE.error}44`,
                }}>
                  <span style={{ fontSize: 20 }}>{testResult.ok ? '✅' : '⚠️'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: testResult.ok ? PALETTE.success : PALETTE.error }}>
                    {testResult.ok ? 'Webhook configurado corretamente!' : 'Há itens que precisam de atenção'}
                  </span>
                </div>

                {/* Checks individuais */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {testResult.checks.map((check, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '10px 14px', borderRadius: 6,
                      background: PALETTE.cardBg,
                      border: `1px solid ${PALETTE.border}`,
                    }}>
                      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                        {check.ok ? '✅' : '❌'}
                      </span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textPrimary }}>
                          {check.name}
                        </div>
                        <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>
                          {check.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnCancel} onClick={() => setShowTestModal(false)}>Fechar</button>
              <button style={{ ...btnPrimary, padding: '8px 20px' }} onClick={testWebhook} disabled={testLoading}>
                {testLoading ? 'Testando...' : 'Testar Novamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal GET Webhook ── */}
      {showGetTestModal && (
        <div style={overlay} onClick={e => { if (e.target === e.currentTarget) setShowGetTestModal(false) }}>
          <div style={{ ...modalStyle, width: 480 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: PALETTE.textPrimary, margin: '0 0 16px', fontSize: 18 }}>
              GET /pontosimples/webhook
            </h3>

            {getTestLoading ? (
              <p style={{ color: PALETTE.textSecondary, textAlign: 'center', padding: '24px 0' }}>Enviando GET...</p>
            ) : getTestResult ? (
              <div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', borderRadius: 8, marginBottom: 16,
                  background: getTestResult.ok ? PALETTE.success + '18' : PALETTE.error + '18',
                  border: `1px solid ${getTestResult.ok ? PALETTE.success : PALETTE.error}44`,
                }}>
                  <span style={{ fontSize: 20 }}>{getTestResult.ok ? '✅' : '❌'}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: getTestResult.ok ? PALETTE.success : PALETTE.error }}>
                    HTTP {getTestResult.status} — {getTestResult.ok ? 'Endpoint acessível' : 'Endpoint inacessível'}
                  </span>
                </div>

                <div style={{
                  padding: '12px 14px', borderRadius: 6,
                  background: '#0D1117', border: `1px solid ${PALETTE.border}`,
                  fontFamily: 'monospace', fontSize: 12, color: PALETTE.textSecondary,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {JSON.stringify(getTestResult.body, null, 2)}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnCancel} onClick={() => setShowGetTestModal(false)}>Fechar</button>
              <button style={{ ...btnPrimary, padding: '8px 20px' }} onClick={testGetWebhook} disabled={getTestLoading}>
                {getTestLoading ? 'Testando...' : 'Testar Novamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
