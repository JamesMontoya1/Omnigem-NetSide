import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnPrimary, btnConfirm, btnCancel, btnDanger, btnSmall, inputStyle, cardStyle, labelStyle } from '../styles/theme'
import { API_BASE, jsonAuthHeaders } from '../config/api'

const ALL_ROLES = ['ADMIN', 'GUEST', 'TRAVELER', 'SPED_MANAGER'] as const

interface User {
  id: number
  email: string
  name: string | null
  roles: string[]
  workerId?: number | null
  worker?: { id: number; name: string } | null
  createdAt: string
}

interface Worker {
  id: number
  name: string
}

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRoles, setFormRoles] = useState<string[]>(['GUEST'])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [formWorkerId, setFormWorkerId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const roles = JSON.parse(localStorage.getItem('shifts_roles') || '[]')
      if (!Array.isArray(roles) || !roles.includes('ADMIN')) {
        router.push('/workspace')
        return
      }
    } catch {
      router.push('/workspace')
      return
    }
    load()
    loadWorkers()
  }, [])

  async function loadWorkers() {
    try {
      const res = await fetch(`${API_BASE}/workers`, { headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao carregar trabalhadores')
      setWorkers(await res.json())
    } catch (e) {
    }
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao carregar usuários')
      setUsers(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditingId(null)
    setFormEmail('')
    setFormName('')
    setFormPassword('')
    setFormRoles(['GUEST'])
    setFormWorkerId(null)
    setFormError('')
    setShowForm(true)
  }

  function openEdit(u: User) {
    setEditingId(u.id)
    setFormEmail(u.email)
    setFormName(u.name || '')
    setFormPassword('')
    setFormRoles(u.roles.length ? [...u.roles] : ['GUEST'])
    setFormWorkerId(u.workerId ?? null)
    setFormError('')
    setShowForm(true)
  }

  function toggleRole(role: string) {
    setFormRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  async function handleSave() {
    setFormError('')
    if (!formEmail.trim()) { setFormError('Email é obrigatório'); return }
    if (!editingId && !formPassword) { setFormError('Senha é obrigatória para novos usuários'); return }
    if (formRoles.length === 0) { setFormError('Selecione ao menos uma role'); return }

    setSaving(true)
    try {
      const body: any = { email: formEmail.trim(), roles: formRoles, name: formName.trim() || null }
      if (formPassword) body.password = formPassword
      if (formWorkerId !== null) body.workerId = formWorkerId

      const url = editingId ? `${API_BASE}/users/${editingId}` : `${API_BASE}/users`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message || 'Erro ao salvar')
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      setFormError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao excluir')
      await load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const roleColors: Record<string, string> = {
    ADMIN: PALETTE.error,
    GUEST: PALETTE.textSecondary,
    TRAVELER: PALETTE.info,
    SPED_MANAGER: PALETTE.warning,
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
              <h1 style={{ margin: 0, fontSize: 22, color: PALETTE.textPrimary }}>Gerenciar Usuários</h1>
              <p style={{ margin: '4px 0 0', color: PALETTE.textSecondary, fontSize: 14 }}>Criar, editar e remover usuários do sistema</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={openCreate} style={btnPrimary}>+ Novo Usuário</button>
          </div>
        </div>

        {error && <p style={{ color: PALETTE.error, fontSize: 13, padding: '8px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44`, marginBottom: 16 }}>{error}</p>}

        {/* Modal de criação/edição */}
        {showForm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          }} onClick={() => setShowForm(false)}>
            <div style={{ ...cardStyle, borderRadius: 12, padding: '28px 28px 20px', width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, color: PALETTE.textPrimary }}>
                {editingId ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>

              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Email (identificador)</label>
                  <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="ex: joao" style={inputStyle} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Nome</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Nome completo" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Trabalhador relacionado</label>
                  <select value={formWorkerId ?? ''} onChange={e => setFormWorkerId(e.target.value ? Number(e.target.value) : null)} style={inputStyle}>
                    <option value="">Nenhum</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>
                    {editingId ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                  </label>
                  <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>Roles</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ALL_ROLES.map(role => {
                      const active = formRoles.includes(role)
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => toggleRole(role)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 16,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            border: `1px solid ${roleColors[role] || PALETTE.border}`,
                            background: active ? (roleColors[role] || PALETTE.primary) : 'transparent',
                            color: active ? '#fff' : (roleColors[role] || PALETTE.textSecondary),
                            transition: 'all 0.15s',
                          }}
                        >
                          {role}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {formError && <p style={{ color: PALETTE.error, fontSize: 13, marginTop: 12, padding: '6px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44` }}>{formError}</p>}

              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowForm(false)} style={btnCancel}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ ...btnConfirm, opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabela de usuários */}
        {loading ? (
          <p style={{ color: PALETTE.textSecondary, textAlign: 'center', marginTop: 40 }}>Carregando...</p>
        ) : (
          <div style={{ ...cardStyle, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${PALETTE.border}` }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Roles</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: PALETTE.textSecondary }}>Nenhum usuário encontrado</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${PALETTE.border}` }}>
                    <td style={tdStyle}>{u.id}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}>{u.name || '—'}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.roles.map(r => (
                          <span key={r} style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: `${roleColors[r] || PALETTE.border}30`,
                            color: roleColors[r] || PALETTE.textSecondary,
                            border: `1px solid ${roleColors[r] || PALETTE.border}50`,
                          }}>{r}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => openEdit(u)} style={btnSmall}>Editar</button>
                        <button onClick={() => handleDelete(u.id)} style={{ ...btnSmall, color: PALETTE.error, borderColor: PALETTE.error }}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: PALETTE.textSecondary,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: 14,
  color: PALETTE.textPrimary,
}
