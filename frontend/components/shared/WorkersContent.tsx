import { useEffect, useState } from 'react'
import { PALETTE, btnPrimary, btnSmall, inputStyle, cardStyle } from '../../styles/theme'
import { useToast } from './ToastProvider'
import { API_BASE, authHeaders, jsonAuthHeaders } from '../../config/api'

function parseLocalDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function computeTenure(hireDate?: string | null, termDate?: string | null) {
  if (!hireDate || !termDate) return '—'
  const h = parseLocalDate(hireDate.slice(0, 10))
  const t = parseLocalDate(termDate.slice(0, 10))

  let years = t.getFullYear() - h.getFullYear()
  let months = t.getMonth() - h.getMonth()
  let days = t.getDate() - h.getDate()

  if (days < 0) {
    const prevMonthLastDay = new Date(t.getFullYear(), t.getMonth(), 0).getDate()
    days += prevMonthLastDay
    months--
  }
  if (months < 0) {
    months += 12
    years--
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years}a`)
  if (months > 0) parts.push(`${months}m`)
  if (days > 0) parts.push(`${days}d`)
  return parts.length ? parts.join(' ') : '< 1d'
}

type Worker = {
  id: number
  name: string
  color?: string
  active: boolean
  hireDate?: string | null
  terminationDate?: string | null
  doesShifts?: boolean
  doesTravel?: boolean
}

const COLOR_PRESETS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0',
  '#F44336', '#00BCD4', '#FF5722', '#607D8B',
  '#E91E63', '#8BC34A', '#3F51B5', '#FFC107',
];

export default function WorkersContent({ readOnly = false, showTitle = true, onChange }: { readOnly?: boolean; showTitle?: boolean; onChange?: () => void }) {
  const [list, setList] = useState<Worker[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('')
  const [hireDate, setHireDate] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [terminationDate, setTerminationDate] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [sortActiveFirst, setSortActiveFirst] = useState(true)
  const [doesShifts, setDoesShifts] = useState(false)
  const [doesTravel, setDoesTravel] = useState(false)

  useEffect(() => { fetchWorkers() }, [])

  const { addToast } = useToast()

  function todayIso() {
    return new Date().toISOString().slice(0, 10)
  }

  async function fetchWorkers() {
    try {
      const res = await fetch(`${API_BASE}/workers`)
      const data = await res.json()
      setList(data || [])
    } catch (e) { console.error(e) }
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setColor('')
    setHireDate('')
    setTerminationDate('')
    setDoesShifts(false)
    setDoesTravel(false)
  }

  async function handleSubmit(e: any) {
    e.preventDefault()

    const payload: any = {
      name,
      color: color || null,
      hireDate: hireDate || null,
      terminationDate: terminationDate || null,
      doesShifts,
      doesTravel,
    }

    const isEdit = editingId != null
    const url = isEdit ? `${API_BASE}/workers/${editingId}` : `${API_BASE}/workers`
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: jsonAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const txt = await res.text()
      if (!res.ok) {
        let msg = isEdit ? 'Erro ao atualizar trabalhador' : 'Erro ao criar trabalhador'
        try { const j = JSON.parse(txt); if (j?.message) msg = j.message } catch {}
        addToast(msg, 'error')
        return
      }
      addToast(isEdit ? 'Trabalhador atualizado' : 'Trabalhador criado', 'success')
      resetForm()
      setIsModalOpen(false)
      await fetchWorkers()
      onChange?.()
    } catch (e) {
      console.error(e)
      addToast('Erro de rede ao salvar trabalhador', 'error')
    }
  }

  async function fireWorker(worker: Worker) {
    if (!worker.active) return
    if (!confirm('Demitir este trabalhador?')) return
    const termination = todayIso()

    // If worker already has a terminationDate, do not overwrite it.
    // clear color when marking inactive
    const payload: any = { active: false, color: null }

    try {
      const res = await fetch(`${API_BASE}/workers/${worker.id}`, {
        method: 'PUT',
        headers: jsonAuthHeaders(),
        body: JSON.stringify(payload),
      })
      const txt = await res.text()
      if (!res.ok) {
        let msg = 'Erro ao demitir trabalhador'
        try { const j = JSON.parse(txt); if (j?.message) msg = j.message } catch {}
        addToast(msg, 'error')
        return
      }
      addToast('Trabalhador demitido', 'success')
      // Se estiver editando este trabalhador no modal, atualiza a data localmente
      if (editingId === worker.id && !worker.terminationDate) {
        setTerminationDate(termination)
        // clear color in the modal immediately
        setColor('')
      }
      await fetchWorkers()
      onChange?.()
    } catch (e) {
      console.error(e)
      addToast('Erro de rede ao demitir trabalhador', 'error')
    }
  }

  async function remove(id: number) {
    if (!confirm('Apagar este trabalhador?')) return

    // ask whether also remove assignments and recurring patterns
    const removeDeps = confirm('Remover todas as atribuições e padrões recorrentes deste trabalhador?\n\nOK = Sim, Cancel = Não')

    try {
      const url = `${API_BASE}/workers/${id}` + (removeDeps ? '?removeAssignments=true' : '')
      const res = await fetch(url, { method: 'DELETE', headers: authHeaders() })
      const text = await res.text()
      if (!res.ok) {
        let msg = text || 'Erro ao apagar trabalhador'
        try { const j = JSON.parse(text); if (j?.message) msg = j.message } catch {}
        addToast(msg, 'error')
        return
      }
      addToast('Trabalhador apagado', 'success')
      await fetchWorkers()
      onChange?.()
    } catch (e) {
      console.error(e)
      addToast('Erro de rede ao apagar trabalhador', 'error')
    }
  }

  function openCreateModal() {
    resetForm()
    setHireDate(todayIso())
    setIsModalOpen(true)
  }

  function openEditModal(worker: Worker) {
    setEditingId(worker.id)
    setName(worker.name)
    setColor(worker.color || '')
    setHireDate(worker.hireDate ? worker.hireDate.slice(0, 10) : '')
    setTerminationDate(worker.terminationDate ? worker.terminationDate.slice(0, 10) : '')
    setDoesShifts(!!worker.doesShifts)
    setDoesTravel(!!worker.doesTravel)
    setIsModalOpen(true)
  }

  const displayed = list
    .filter(w => showInactive ? true : w.active)
    .slice()
    .sort((a, b) => (sortActiveFirst ? Number(b.active) - Number(a.active) : Number(a.active) - Number(b.active)))

  return (
    <>
      {showTitle && <h1 style={{ margin: '0 0 20px 0', fontSize: 22, color: PALETTE.textPrimary }}>Trabalhadores</h1>}

      <div style={{ maxWidth: 480, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {!readOnly && (
            <button onClick={openCreateModal} style={btnPrimary}>
              Adicionar Trabalhador
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: PALETTE.textSecondary, fontSize: 13 }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Mostrar demitidos
          </label>
          <select
            value={sortActiveFirst ? 'active' : 'inactive'}
            onChange={(e) => setSortActiveFirst(e.target.value === 'active')}
            style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, color: PALETTE.textPrimary, fontSize: 13 }}
          >
            <option value="active">Ativos primeiro</option>
            <option value="inactive">Inativos primeiro</option>
          </select>
        </div>
      </div>

      <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: PALETTE.textPrimary }}>Lista</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayed.map(w => (
          <div key={w.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: PALETTE.cardBg,
            borderRadius: 8,
            borderLeft: !w.active ? `4px solid ${PALETTE.error}` : (w.color ? `4px solid ${w.color}` : `4px solid ${PALETTE.border}`),
            border: `1px solid ${PALETTE.border}`,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: w.color || PALETTE.border,
              display: 'inline-block', flexShrink: 0,
            }} />
            <div style={{ flex: 1 }}>
              <strong style={{ color: PALETTE.textPrimary }}>{w.name}</strong>
              <div style={{ fontSize: 11, color: PALETTE.textSecondary, marginTop: 2 }}>
                {w.active ? 'Ativo' : 'Inativo'}
                {w.hireDate && ` · Contratado em ${parseLocalDate(w.hireDate).toLocaleDateString('pt-BR')}`}
                {w.terminationDate && ` · Demitido em ${parseLocalDate(w.terminationDate).toLocaleDateString('pt-BR')}`}
              </div>
            </div>

            {!readOnly && (
              <button
                onClick={() => openEditModal(w)}
                style={btnSmall}
              >
                Editar
              </button>
            )}
            {!readOnly && w.active && (
              <button
                onClick={() => fireWorker(w)}
                style={{
                  ...btnSmall,
                  color: PALETTE.warning,
                  background: `${PALETTE.warning}18`,
                  borderColor: PALETTE.warning,
                }}
              >
                Demitir
              </button>
            )}
            {!readOnly && (
              <button
                onClick={() => remove(w.id)}
                style={{
                  ...btnSmall,
                  color: PALETTE.error,
                  background: `${PALETTE.error}18`,
                  borderColor: PALETTE.error,
                }}
              >
                Apagar
              </button>
            )}
          </div>
        ))}
        {displayed.length === 0 && <div style={{ color: PALETTE.textDisabled, padding: 16 }}>Nenhum trabalhador cadastrado</div>}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: '#00000066', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ width: 520, maxWidth: '95%', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: PALETTE.textPrimary }}>
              {editingId ? 'Editar Trabalhador' : 'Adicionar Trabalhador'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 16 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary }}>
                                <input
                                  type="checkbox"
                                  checked={doesShifts}
                                  onChange={e => setDoesShifts(e.target.checked)}
                                />
                                Faz plantões?
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary }}>
                                <input
                                  type="checkbox"
                                  checked={doesTravel}
                                  onChange={e => setDoesTravel(e.target.checked)}
                                />
                                Faz viagens?
                              </label>
                            </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Nome</label>
                <input placeholder="Nome do trabalhador" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Data de contratação</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              {editingId && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Data de demissão</label>
                  <input
                    type="date"
                    value={terminationDate}
                    onChange={(e) => setTerminationDate(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              )}
              {editingId && terminationDate && hireDate && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Tempo trabalhado</label>
                  <div style={{ padding: '8px 10px', background: PALETTE.backgroundSecondary, borderRadius: 6, color: PALETTE.textPrimary }}>
                    {computeTenure(hireDate, terminationDate)}
                  </div>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 6 }}>Cor</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={color || '#000000'}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: 42, height: 32, padding: 0, borderRadius: 6, border: `1px solid ${PALETTE.border}` }}
                  />
                  <input
                    placeholder="#rrggbb"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ ...inputStyle, width: 110 }}
                  />
                  <button type="button" onClick={() => setColor('')} style={btnSmall}>Limpar</button>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: color || PALETTE.border, display: 'inline-block', flexShrink: 0 }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                {editingId && (() => {
                  const worker = list.find(w => w.id === editingId)
                  if (!worker || !worker.active || readOnly) return null
                  return (
                    <button
                      type="button"
                      onClick={() => fireWorker(worker)}
                      style={{
                        ...btnSmall,
                        color: PALETTE.warning,
                        background: `${PALETTE.warning}18`,
                        borderColor: PALETTE.warning,
                      }}
                    >
                      Demitir
                    </button>
                  )
                })()}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} style={btnSmall}>Cancelar</button>
                  <button type="submit" style={btnPrimary}>{editingId ? 'Salvar' : 'Criar'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
