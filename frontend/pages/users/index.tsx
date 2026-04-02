import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnPrimary, btnConfirm, btnCancel, btnDanger, btnSmall, inputStyle, cardStyle, labelStyle } from '../../styles/theme'
import { API_BASE, jsonAuthHeaders } from '../../config/api'
import WorkersContent from '../../components/shared/WorkersContent'

interface Permission { id: number; key: string; label: string }
interface PermissionGroup { id: number; name: string; description: string | null; isAdmin: boolean; permissions: Permission[]; _count: { users: number } }
interface User {
  id: number
  email: string
  name: string | null
  permissionGroupId: number | null
  permissionGroup: { id: number; name: string; isAdmin: boolean; permissions: Permission[] } | null
  workerId?: number | null
  worker?: { id: number; name: string } | null
  createdAt: string
}
interface Worker { id: number; name: string }

export default function Usuarios() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // User form
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formEmail, setFormEmail] = useState('')
  const [formName, setFormName] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formGroupId, setFormGroupId] = useState<number | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [formWorkerId, setFormWorkerId] = useState<number | null>(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Permission groups
  const [groups, setGroups] = useState<PermissionGroup[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [showGroupForm, setShowGroupForm] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [groupIsAdmin, setGroupIsAdmin] = useState(false)
  const [groupPermIds, setGroupPermIds] = useState<number[]>([])
  const [groupError, setGroupError] = useState('')
  const [savingGroup, setSavingGroup] = useState(false)

  // Misc
  const [showManageWorkers, setShowManageWorkers] = useState(false)
  const [tab, setTab] = useState<'users' | 'groups'>('users')
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    try {
      const isAdmin = localStorage.getItem('shifts_isAdmin') === 'true'
      const perms: string[] = JSON.parse(localStorage.getItem('shifts_permissions') || '[]')
      const hasAccess = isAdmin || perms.some(p => p.startsWith('users.'))
      if (!hasAccess) { router.push('/workspace'); return }
      setCanEdit(isAdmin || perms.includes('users.edit'))
    } catch { router.push('/workspace'); return }
    load()
    loadWorkers()
    loadGroups()
    loadPermissions()
  }, [])

  async function loadWorkers() {
    try {
      const res = await fetch(`${API_BASE}/workers`, { headers: jsonAuthHeaders() })
      if (res.ok) setWorkers(await res.json())
    } catch {}
  }
  async function load() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API_BASE}/users`, { headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao carregar usuários')
      setUsers(await res.json())
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  async function loadGroups() {
    try {
      const res = await fetch(`${API_BASE}/permission-groups`, { headers: jsonAuthHeaders() })
      if (res.ok) setGroups(await res.json())
    } catch {}
  }
  async function loadPermissions() {
    try {
      const res = await fetch(`${API_BASE}/permissions`, { headers: jsonAuthHeaders() })
      if (res.ok) setPermissions(await res.json())
    } catch {}
  }

  // User CRUD
  function openCreate() {
    setEditingId(null); setFormEmail(''); setFormName(''); setFormPassword('')
    setFormGroupId(null); setFormWorkerId(null); setFormError(''); setShowForm(true)
  }
  function openEdit(u: User) {
    setEditingId(u.id); setFormEmail(u.email); setFormName(u.name || ''); setFormPassword('')
    setFormGroupId(u.permissionGroupId); setFormWorkerId(u.workerId ?? null); setFormError(''); setShowForm(true)
  }
  async function handleSave() {
    setFormError('')
    if (!formEmail.trim()) { setFormError('Email é obrigatório'); return }
    if (!editingId && !formPassword) { setFormError('Senha é obrigatória para novos usuários'); return }
    setSaving(true)
    try {
      const body: any = { email: formEmail.trim(), name: formName.trim() || null, permissionGroupId: formGroupId }
      if (formPassword) body.password = formPassword
      if (formWorkerId !== null) body.workerId = formWorkerId
      const url = editingId ? `${API_BASE}/users/${editingId}` : `${API_BASE}/users`
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || 'Erro ao salvar') }
      setShowForm(false); await load()
    } catch (e: any) { setFormError(e.message) } finally { setSaving(false) }
  }
  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao excluir')
      await load()
    } catch (e: any) { setError(e.message) }
  }

  // Group CRUD
  function openCreateGroup() {
    setEditingGroupId(null); setGroupName(''); setGroupDesc(''); setGroupIsAdmin(false)
    setGroupPermIds([]); setGroupError(''); setShowGroupForm(true)
  }
  function openEditGroup(g: PermissionGroup) {
    setEditingGroupId(g.id); setGroupName(g.name); setGroupDesc(g.description || '')
    setGroupIsAdmin(g.isAdmin); setGroupPermIds(g.permissions.map(p => p.id))
    setGroupError(''); setShowGroupForm(true)
  }
  function togglePerm(pid: number) {
    setGroupPermIds(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid])
  }
  async function handleSaveGroup() {
    setGroupError('')
    if (!groupName.trim()) { setGroupError('Nome é obrigatório'); return }
    setSavingGroup(true)
    try {
      const body = { name: groupName.trim(), description: groupDesc.trim() || null, isAdmin: groupIsAdmin, permissionIds: groupPermIds }
      const url = editingGroupId ? `${API_BASE}/permission-groups/${editingGroupId}` : `${API_BASE}/permission-groups`
      const method = editingGroupId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(body) })
      if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.message || 'Erro ao salvar') }
      setShowGroupForm(false); await loadGroups()
    } catch (e: any) { setGroupError(e.message) } finally { setSavingGroup(false) }
  }
  async function handleDeleteGroup(id: number) {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return
    try {
      const res = await fetch(`${API_BASE}/permission-groups/${id}`, { method: 'DELETE', headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error('Erro ao excluir grupo')
      await loadGroups()
    } catch (e: any) { setError(e.message) }
  }

  return (
    <main style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: PALETTE.background, fontFamily: 'system-ui, sans-serif', color: PALETTE.textPrimary }}>
      <div style={{ padding: '16px 24px', paddingLeft: 80, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${PALETTE.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Gerenciar Usuários</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setShowManageWorkers(true)} style={btnSmall}>👷 Trabalhadores</button>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {canEdit && tab === 'users' && <button onClick={openCreate} style={btnPrimary}>+ Novo Usuário</button>}
          {canEdit && tab === 'groups' && <button onClick={openCreateGroup} style={btnPrimary}>+ Novo Grupo</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${PALETTE.border}`, paddingLeft: 80 }}>
        {(['users', 'groups'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'transparent', border: 'none', borderBottom: tab === t ? `2px solid ${PALETTE.primary}` : '2px solid transparent',
            color: tab === t ? PALETTE.primary : PALETTE.textSecondary, fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}>
            {t === 'users' ? 'Usuários' : 'Grupos de Permissão'}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>
          {error && <p style={{ color: PALETTE.error, fontSize: 13, padding: '8px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44`, marginBottom: 16 }}>{error}</p>}

          {/* ─── USER FORM MODAL ─── */}
          {showForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowForm(false)}>
              <div style={{ ...cardStyle, borderRadius: 12, padding: '28px 28px 20px', width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, color: PALETTE.textPrimary }}>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</h2>
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
                      {workers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{editingId ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</label>
                    <input type="password" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Grupo de Permissão</label>
                    <select value={formGroupId ?? ''} onChange={e => setFormGroupId(e.target.value ? Number(e.target.value) : null)} style={inputStyle}>
                      <option value="">Nenhum</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}{g.isAdmin ? ' (Admin)' : ''}</option>)}
                    </select>
                  </div>
                </div>
                {formError && <p style={{ color: PALETTE.error, fontSize: 13, marginTop: 12, padding: '6px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44` }}>{formError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowForm(false)} style={btnCancel}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving} style={{ ...btnConfirm, opacity: saving ? 0.6 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── GROUP FORM MODAL ─── */}
          {showGroupForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowGroupForm(false)}>
              <div style={{ ...cardStyle, borderRadius: 12, padding: '28px 28px 20px', width: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }} onClick={e => e.stopPropagation()}>
                <h2 style={{ margin: '0 0 20px', fontSize: 18, color: PALETTE.textPrimary }}>{editingGroupId ? 'Editar Grupo' : 'Novo Grupo de Permissão'}</h2>
                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome do Grupo</label>
                    <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="ex: Operador" style={inputStyle} autoFocus />
                  </div>
                  <div>
                    <label style={labelStyle}>Descrição</label>
                    <input value={groupDesc} onChange={e => setGroupDesc(e.target.value)} placeholder="Opcional" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
                      <input type="checkbox" checked={groupIsAdmin} onChange={e => setGroupIsAdmin(e.target.checked)} />
                      <span style={{ fontWeight: 600, color: groupIsAdmin ? PALETTE.error : PALETTE.textPrimary }}>
                        Administrador (acesso total)
                      </span>
                    </label>
                  </div>
                  {!groupIsAdmin && (
                    <div>
                      <label style={{ ...labelStyle, marginBottom: 8 }}>Permissões por tela</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(() => {
                          const screens: { base: string; label: string }[] = [
                            { base: 'shifts', label: 'Plantões' },
                            { base: 'vacations', label: 'Férias' },
                            { base: 'trips', label: 'Viagens' },
                            { base: 'sped_control', label: 'Controle SPED' },
                            { base: 'time_punches', label: 'Registro de Ponto' },
                            { base: 'users', label: 'Usuários' },
                            { base: 'workers', label: 'Trabalhadores' },
                            { base: 'holidays', label: 'Feriados' },
                            { base: 'vehicles', label: 'Veículos' },
                            { base: 'settings', label: 'Configurações' },
                          ]
                          return screens.map(s => {
                            const viewPerm = permissions.find(p => p.key === `${s.base}.view`)
                            const editPerm = permissions.find(p => p.key === `${s.base}.edit`)
                            const hasView = viewPerm ? groupPermIds.includes(viewPerm.id) : false
                            const hasEdit = editPerm ? groupPermIds.includes(editPerm.id) : false
                            return (
                              <div key={s.base} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${PALETTE.border}30`, borderRadius: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: PALETTE.textPrimary, minWidth: 130 }}>{s.label}</span>
                                {viewPerm && (
                                  <button type="button" onClick={() => togglePerm(viewPerm.id)} style={{
                                    padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${hasView ? '#3b82f6' : PALETTE.border}`,
                                    background: hasView ? '#3b82f6' : 'transparent',
                                    color: hasView ? '#fff' : PALETTE.textSecondary,
                                    transition: 'all 0.15s',
                                  }}>Visualizar</button>
                                )}
                                {editPerm && (
                                  <button type="button" onClick={() => togglePerm(editPerm.id)} style={{
                                    padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${hasEdit ? '#f59e0b' : PALETTE.border}`,
                                    background: hasEdit ? '#f59e0b' : 'transparent',
                                    color: hasEdit ? '#fff' : PALETTE.textSecondary,
                                    transition: 'all 0.15s',
                                  }}>Editar</button>
                                )}
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  )}
                </div>
                {groupError && <p style={{ color: PALETTE.error, fontSize: 13, marginTop: 12, padding: '6px 10px', background: `${PALETTE.error}18`, borderRadius: 6, border: `1px solid ${PALETTE.error}44` }}>{groupError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowGroupForm(false)} style={btnCancel}>Cancelar</button>
                  <button onClick={handleSaveGroup} disabled={savingGroup} style={{ ...btnConfirm, opacity: savingGroup ? 0.6 : 1 }}>{savingGroup ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </div>
            </div>
          )}

          {/* ─── WORKERS MODAL ─── */}
          {showManageWorkers && (
            <div style={{ position: 'fixed', inset: 0, background: '#00000088', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }} onClick={() => setShowManageWorkers(false)}>
              <div style={{ width: 920, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', background: PALETTE.cardBg, padding: 20, borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Trabalhadores</h3>
                  <button type="button" onClick={() => setShowManageWorkers(false)} style={btnSmall}>✕ Fechar</button>
                </div>
                <WorkersContent showTitle={false} onChange={() => { loadWorkers(); load(); }} />
              </div>
            </div>
          )}

          {/* ─── USERS TAB ─── */}
          {tab === 'users' && (
            <>
              <p style={{ margin: '0 0 12px', color: PALETTE.textSecondary, fontSize: 14 }}>Criar, editar e remover usuários do sistema</p>
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
                        <th style={thStyle}>Grupo</th>
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
                            {u.permissionGroup ? (
                              <span style={{
                                display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                background: u.permissionGroup.isAdmin ? `${PALETTE.error}30` : `${PALETTE.primary}20`,
                                color: u.permissionGroup.isAdmin ? PALETTE.error : PALETTE.primary,
                                border: `1px solid ${u.permissionGroup.isAdmin ? PALETTE.error : PALETTE.primary}50`,
                              }}>{u.permissionGroup.name}</span>
                            ) : <span style={{ color: PALETTE.textSecondary, fontSize: 12 }}>Sem grupo</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            {canEdit && (
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => openEdit(u)} style={btnSmall}>Editar</button>
                              <button onClick={() => handleDelete(u.id)} style={{ ...btnSmall, color: PALETTE.error, borderColor: PALETTE.error }}>Excluir</button>
                            </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ─── GROUPS TAB ─── */}
          {tab === 'groups' && (
            <>
              <p style={{ margin: '0 0 12px', color: PALETTE.textSecondary, fontSize: 14 }}>Criar e gerenciar grupos de permissão. Cada grupo define quais telas o usuário pode acessar.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {groups.map(g => (
                  <div key={g.id} style={{ ...cardStyle, padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 16, color: PALETTE.textPrimary }}>{g.name}</span>
                        {g.isAdmin && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: `${PALETTE.error}30`, color: PALETTE.error, border: `1px solid ${PALETTE.error}50` }}>ADMIN</span>}
                        <span style={{ fontSize: 12, color: PALETTE.textSecondary }}>{g._count.users} usuário(s)</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEdit && <button onClick={() => openEditGroup(g)} style={btnSmall}>Editar</button>}
                        {canEdit && <button onClick={() => handleDeleteGroup(g.id)} style={{ ...btnSmall, color: PALETTE.error, borderColor: PALETTE.error }}>Excluir</button>}
                      </div>
                    </div>
                    {g.description && <p style={{ margin: '0 0 8px', fontSize: 13, color: PALETTE.textSecondary }}>{g.description}</p>}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {g.isAdmin ? (
                        <span style={{ fontSize: 12, color: PALETTE.textSecondary, fontStyle: 'italic' }}>Acesso total a todas as telas</span>
                      ) : g.permissions.length === 0 ? (
                        <span style={{ fontSize: 12, color: PALETTE.textSecondary, fontStyle: 'italic' }}>Nenhuma permissão atribuída</span>
                      ) : g.permissions.map(p => {
                        const isEdit = p.key.endsWith('.edit')
                        return (
                          <span key={p.id} style={{
                            padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                            background: isEdit ? '#f59e0b20' : `${PALETTE.primary}20`,
                            color: isEdit ? '#f59e0b' : PALETTE.primary,
                            border: `1px solid ${isEdit ? '#f59e0b40' : `${PALETTE.primary}40`}`,
                          }}>{p.label}</span>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {groups.length === 0 && <p style={{ color: PALETTE.textSecondary, textAlign: 'center', marginTop: 20 }}>Nenhum grupo de permissão encontrado</p>}
              </div>
            </>
          )}
        </div>
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
