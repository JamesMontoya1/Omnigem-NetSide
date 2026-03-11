import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { API_BASE, authHeaders, jsonAuthHeaders } from '../config/api'
import {
  PALETTE, btnPrimary, btnCancel, btnDanger, btnSmallBlue, btnSmallRed,
  cardStyle, inputStyle, selectStyle, labelStyle, btnNav,
} from '../styles/theme'
import { useToast } from '../components/shared/ToastProvider'
import WorkersContent from '../components/shared/WorkersContent'

type City = { id: number; name: string; state?: string; country?: string }
type Vehicle = { id: number; plate?: string; model?: string; notes?: string }
type Worker = { id: number; name: string; doesTravel?: boolean; active?: boolean }
type Trip = {
  id: number; date: string; cityId: number; city?: City; vehicleId?: number; vehicle?: Vehicle
  client?: string; installationTraining: number
  mealExpense?: number; fuelExpense?: number; extraExpense?: number; notesExtraExpense?: string
  kmDriven?: number; costPerKm?: number; profitPerKm?: number
  avgConsumption?: number; remainingAutonomy?: number
  travelers?: Worker[]; driverId?: number; driver?: Worker; note?: string
  createdAt: string; updatedAt?: string
}

const EMPTY_FORM = {
  date: '', cityId: '', vehicleId: '', client: '', installationTraining: 0,
  mealExpense: '', fuelExpense: '', extraExpense: '', notesExtraExpense: '',
  kmDriven: '', costPerKm: '', profitPerKm: '', avgConsumption: '', remainingAutonomy: '',
  travelerIds: [] as number[], driverId: '', note: '',
}

const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
const modal: React.CSSProperties = {
  background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`,
  borderRadius: 10, padding: 16, width: 1000, maxHeight: '90vh', overflowY: 'auto',
}
const smallModal: React.CSSProperties = { ...modal, width: 400 }

const TYPE_LABELS: Record<number, string> = { 0: 'Instalação', 1: 'Treinamento' }

function num(v: any): number | undefined { const n = Number(v); return isNaN(n) ? undefined : n }
function toLocalInput(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60000)
  return local.toISOString().slice(0, 16)
}
function money(v: any) { const n = Number(v); return isNaN(n) || n === 0 ? '' : `R$ ${n.toFixed(2)}` }
function decimal(v: any) { const n = Number(v); return isNaN(n) || n === 0 ? '' : n.toFixed(2) }

export default function Viagens() {
  const router = useRouter()
  const { addToast } = useToast()

  const [trips, setTrips] = useState<Trip[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(false)

  const [filterStart, setFilterStart] = useState('')
  const [filterEnd, setFilterEnd] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterType, setFilterType] = useState<'' | '0' | '1'>('')

  const [showTripModal, setShowTripModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })

  const [showCityModal, setShowCityModal] = useState(false)
  const [cityForm, setCityForm] = useState({ name: '', state: '', country: 'BR' })
  const [editingCity, setEditingCity] = useState<City | null>(null)

  const [showVehicleModal, setShowVehicleModal] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ plate: '', model: '', notes: '' })
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [showManageCities, setShowManageCities] = useState(false)
  const [showManageVehicles, setShowManageVehicles] = useState(false)
  const [showManageWorkers, setShowManageWorkers] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState<Trip | null>(null)

  const [tab, setTab] = useState<'trips' | 'cities' | 'vehicles'>('trips')

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStart) params.set('startDate', filterStart)
      if (filterEnd) params.set('endDate', filterEnd)
      const res = await fetch(`${API_BASE}/trips?${params}`, { headers: authHeaders() })
      setTrips(await res.json())
    } catch { setTrips([]) } finally { setLoading(false) }
  }, [filterStart, filterEnd])

  const fetchCities = useCallback(async () => {
    try { const r = await fetch(`${API_BASE}/cities`, { headers: authHeaders() }); setCities(await r.json()) } catch { setCities([]) }
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

  useEffect(() => { fetchTrips() }, [fetchTrips])
  useEffect(() => { fetchCities(); fetchVehicles(); fetchWorkers() }, [fetchCities, fetchVehicles, fetchWorkers])

  function openNewTrip() {
    setEditingTrip(null)
    setForm({ ...EMPTY_FORM })
    setShowTripModal(true)
  }
  function openEditTrip(t: Trip) {
    setEditingTrip(t)
    setForm({
      date: toLocalInput(t.date),
      cityId: String(t.cityId),
      vehicleId: t.vehicleId ? String(t.vehicleId) : '',
      client: t.client ?? '',
      installationTraining: t.installationTraining ?? 0,
      mealExpense: t.mealExpense != null ? String(t.mealExpense) : '',
      fuelExpense: t.fuelExpense != null ? String(t.fuelExpense) : '',
      extraExpense: t.extraExpense != null ? String(t.extraExpense) : '',
      notesExtraExpense: t.notesExtraExpense ?? '',
      kmDriven: t.kmDriven != null ? String(t.kmDriven) : '',
      costPerKm: t.costPerKm != null ? String(t.costPerKm) : '',
      profitPerKm: t.profitPerKm != null ? String(t.profitPerKm) : '',
      avgConsumption: t.avgConsumption != null ? String(t.avgConsumption) : '',
      remainingAutonomy: t.remainingAutonomy != null ? String(t.remainingAutonomy) : '',
      travelerIds: t.travelers?.map(w => w.id) ?? [],
      driverId: t.driverId ? String(t.driverId) : '',
      note: t.note ?? '',
    })
    setShowTripModal(true)
  }

  async function handleSaveTrip(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      date: form.date, cityId: Number(form.cityId),
      vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
      client: form.client || null,
      installationTraining: Number(form.installationTraining),
      mealExpense: num(form.mealExpense), fuelExpense: num(form.fuelExpense),
      extraExpense: num(form.extraExpense), notesExtraExpense: form.notesExtraExpense || null,
      kmDriven: num(form.kmDriven), costPerKm: num(form.costPerKm), profitPerKm: num(form.profitPerKm),
      avgConsumption: num(form.avgConsumption), remainingAutonomy: num(form.remainingAutonomy),
      travelerIds: form.travelerIds, driverId: form.driverId ? Number(form.driverId) : null,
      note: form.note || null,
    }
    try {
      const url = editingTrip ? `${API_BASE}/trips/${editingTrip.id}` : `${API_BASE}/trips`
      const method = editingTrip ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message || 'Erro') }
      addToast(editingTrip ? 'Viagem atualizada' : 'Viagem criada', 'success')
      setShowTripModal(false)
      await fetchTrips()
    } catch (err: any) { addToast(err?.message || 'Erro ao salvar', 'error') }
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

  function openNewVehicle() { setEditingVehicle(null); setVehicleForm({ plate: '', model: '', notes: '' }); setShowVehicleModal(true) }
  function openEditVehicle(v: Vehicle) { setEditingVehicle(v); setVehicleForm({ plate: v.plate ?? '', model: v.model ?? '', notes: v.notes ?? '' }); setShowVehicleModal(true) }
  async function handleSaveVehicle(e: React.FormEvent) {
    e.preventDefault()
    try {
      const url = editingVehicle ? `${API_BASE}/vehicles/${editingVehicle.id}` : `${API_BASE}/vehicles`
      const method = editingVehicle ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: jsonAuthHeaders(), body: JSON.stringify(vehicleForm) })
      if (!res.ok) throw new Error('Erro')
      addToast(editingVehicle ? 'Veículo atualizado' : 'Veículo criado', 'success')
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

  const filtered = trips.filter(t => {
    if (filterCity && t.cityId !== Number(filterCity)) return false
    if (filterType !== '' && t.installationTraining !== Number(filterType)) return false
    return true
  })

  function toggleTraveler(wid: number) {
    setForm(f => {
      const removed = f.travelerIds.includes(wid)
      const travelerIds = removed ? f.travelerIds.filter(x => x !== wid) : [...f.travelerIds, wid]
      const driverId = removed && String(f.driverId) === String(wid) ? '' : f.driverId
      return { ...f, travelerIds, driverId }
    })
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24, background: PALETTE.background, color: PALETTE.textPrimary, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/selection')} style={{ ...btnNav, padding: '4px 10px', fontSize: 18 }}>←</button>
            <h2 style={{ margin: 0 }}>Viagens</h2>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, alignItems: 'center' }}>
          {(['trips', 'cities', 'vehicles'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              ...btnNav, fontWeight: tab === t ? 700 : 400,
              background: tab === t ? PALETTE.primary : PALETTE.hoverBg,
              color: tab === t ? '#fff' : PALETTE.textPrimary,
            }}>
              {t === 'trips' ? 'Viagens' : t === 'cities' ? 'Cidades' : 'Veículos'}
            </button>
          ))}
          <button type="button" onClick={() => setShowManageWorkers(true)} style={{ ...btnNav, marginLeft: 8 }}>Trabalhadores</button>
        </div>

        {tab === 'trips' && <>
          <div style={{ ...cardStyle, marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
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
              <label style={labelStyle}>Tipo</label>
              <select value={filterType} onChange={e => setFilterType(e.target.value as any)} style={{ ...selectStyle, width: 140 }}>
                <option value="">Todos</option>
                <option value="0">Instalação</option>
                <option value="1">Treinamento</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <button onClick={openNewTrip} style={btnPrimary as any}>+ Nova Viagem</button>
            </div>
          </div>

          {loading && <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Carregando...</div>}
          {!loading && filtered.length === 0 && <div style={{ color: PALETTE.textSecondary, padding: 12 }}>Nenhuma viagem encontrada.</div>}

          <div style={{ display: 'grid', gap: 8 }}>
            {filtered.map(t => {
              const totalExpense = (Number(t.mealExpense) || 0) + (Number(t.fuelExpense) || 0) + (Number(t.extraExpense) || 0)
              return (
                <div key={t.id} style={{ ...cardStyle, cursor: 'pointer' }} onClick={() => openEditTrip(t)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{t.city?.name ?? '—'}</span>
                        <span style={{
                          fontSize: 11, padding: '1px 7px', borderRadius: 4, fontWeight: 600,
                          background: t.installationTraining === 0 ? PALETTE.primary : PALETTE.warning,
                          color: '#fff',
                        }}>
                          {TYPE_LABELS[t.installationTraining] ?? '?'}
                        </span>
                        {t.vehicle && (
                          <span style={{ fontSize: 11, color: PALETTE.textSecondary }}>
                            🚗 {t.vehicle.model ?? ''} {t.vehicle.plate ? `(${t.vehicle.plate})` : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ color: PALETTE.textSecondary, fontSize: 13 }}>
                        📅 {new Date(t.date).toLocaleDateString('pt-BR')} {new Date(t.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {t.client ? ` — ${t.client}` : ''}
                      </div>
                      {(t.driver || (t.travelers && t.travelers.length > 0)) && (
                        <div style={{ color: PALETTE.textSecondary, fontSize: 13, marginTop: 2 }}>
                          {t.driver && <span>🧑‍✈️ {t.driver.name}</span>}
                          {t.travelers && t.travelers.length > 0 && (
                            <span>{t.driver ? ' · ' : ''}👥 {t.travelers.map((w: Worker) => w.name).join(', ')}</span>
                          )}
                        </div>
                      )}
                      {t.note && <div style={{ marginTop: 4, color: PALETTE.textSecondary, fontSize: 12, fontStyle: 'italic' }}>{t.note}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: PALETTE.textSecondary, minWidth: 100 }}>
                      {totalExpense > 0 && <div style={{ fontWeight: 600, color: PALETTE.warning }}>R$ {totalExpense.toFixed(2)}</div>}
                      {Number(t.kmDriven) > 0 && <div>{Number(t.kmDriven).toFixed(0)} km</div>}
                      <div style={{ marginTop: 4 }}>
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(t) }} style={btnSmallRed as any}>Excluir</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>}

        {tab === 'cities' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Cidades</h3>
            <button onClick={openNewCity} style={btnPrimary as any}>+ Nova Cidade</button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {cities.map(c => (
              <div key={c.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  {c.state && <span style={{ color: PALETTE.textSecondary, marginLeft: 6, fontSize: 13 }}>— {c.state}</span>}
                  {c.country && c.country !== 'BR' && <span style={{ color: PALETTE.textSecondary, marginLeft: 4, fontSize: 12 }}>({c.country})</span>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditCity(c)} style={btnSmallBlue as any}>Editar</button>
                  <button onClick={() => handleDeleteCity(c.id)} style={btnSmallRed as any}>Excluir</button>
                </div>
              </div>
            ))}
            {cities.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma cidade cadastrada.</div>}
          </div>
        </>}

        {tab === 'vehicles' && <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Veículos</h3>
            <button onClick={openNewVehicle} style={btnPrimary as any}>+ Novo Veículo</button>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {vehicles.map(v => (
              <div key={v.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{v.model ?? '—'}</span>
                  {v.plate && <span style={{ color: PALETTE.textSecondary, marginLeft: 8, fontSize: 13 }}>Placa: {v.plate}</span>}
                  {v.notes && <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>{v.notes}</div>}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => openEditVehicle(v)} style={btnSmallBlue as any}>Editar</button>
                  <button onClick={() => handleDeleteVehicle(v.id)} style={btnSmallRed as any}>Excluir</button>
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhum veículo cadastrado.</div>}
          </div>
        </>}

      </div>

      {showTripModal && (
        <div style={overlay} onClick={() => setShowTripModal(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingTrip ? 'Editar Viagem' : 'Nova Viagem'}</h3>
            <form onSubmit={handleSaveTrip}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Data *</label>
                  <input required type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Tipo *</label>
                  <select value={form.installationTraining} onChange={e => setForm({ ...form, installationTraining: Number(e.target.value) })} style={selectStyle}>
                    <option value={0}>Instalação</option>
                    <option value={1}>Treinamento</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Cidade *</label>
                  <select required value={form.cityId} onChange={e => setForm({ ...form, cityId: e.target.value })} style={selectStyle}>
                    <option value="">Selecione...</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}{c.state ? ` - ${c.state}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Veículo</label>
                  <select value={form.vehicleId} onChange={e => setForm({ ...form, vehicleId: e.target.value })} style={selectStyle}>
                    <option value="">Nenhum</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.model ?? '?'} {v.plate ? `(${v.plate})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Cliente</label>
                  <input type="text" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Motorista</label>
                  <select value={form.driverId} onChange={e => setForm({ ...form, driverId: e.target.value })} style={selectStyle} disabled={form.travelerIds.length === 0}>
                    <option value="">Nenhum</option>
                    {workers.filter(w => form.travelerIds.includes(w.id)).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
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
              </div>

                <div style={{ marginTop: 12, borderTop: `1px solid ${PALETTE.border}`, paddingTop: 10 }}>
                <label style={{ ...labelStyle, marginBottom: 8 }}>Despesas & Quilometragem</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Alimentação (R$)</label>
                    <input type="number" step="0.01" value={form.mealExpense} onChange={e => setForm({ ...form, mealExpense: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Combustível (R$)</label>
                    <input type="number" step="0.01" value={form.fuelExpense} onChange={e => setForm({ ...form, fuelExpense: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Extra (R$)</label>
                    <input type="number" step="0.01" value={form.extraExpense} onChange={e => setForm({ ...form, extraExpense: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Km Rodados</label>
                    <input type="number" step="0.01" value={form.kmDriven} onChange={e => setForm({ ...form, kmDriven: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Custo/km (R$)</label>
                    <input type="number" step="0.01" value={form.costPerKm} onChange={e => setForm({ ...form, costPerKm: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Lucro/km (R$)</label>
                    <input type="number" step="0.01" value={form.profitPerKm} onChange={e => setForm({ ...form, profitPerKm: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Consumo Médio (km/l)</label>
                    <input type="number" step="0.01" value={form.avgConsumption} onChange={e => setForm({ ...form, avgConsumption: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Autonomia Restante</label>
                    <input type="number" step="0.01" value={form.remainingAutonomy} onChange={e => setForm({ ...form, remainingAutonomy: e.target.value })} style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ ...labelStyle, fontSize: 11 }}>Notas da Despesa Extra</label>
                    <input type="text" value={form.notesExtraExpense} onChange={e => setForm({ ...form, notesExtraExpense: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={labelStyle}>Observações</label>
                <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={1} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowTripModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingTrip ? 'Salvar' : 'Criar'}</button>
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
        <div style={overlay} onClick={() => setShowVehicleModal(false)}>
          <div style={smallModal} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}</h3>
            <form onSubmit={handleSaveVehicle}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  <label style={labelStyle}>Modelo</label>
                  <input value={vehicleForm.model} onChange={e => setVehicleForm({ ...vehicleForm, model: e.target.value })} style={inputStyle} placeholder="Ex: Fiat Strada" />
                </div>
                <div>
                  <label style={labelStyle}>Placa</label>
                  <input value={vehicleForm.plate} onChange={e => setVehicleForm({ ...vehicleForm, plate: e.target.value })} style={inputStyle} placeholder="Ex: ABC-1234" />
                </div>
                <div>
                  <label style={labelStyle}>Notas</label>
                  <textarea value={vehicleForm.notes} onChange={e => setVehicleForm({ ...vehicleForm, notes: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowVehicleModal(false)} style={btnCancel as any}>Cancelar</button>
                <button type="submit" style={btnPrimary as any}>{editingVehicle ? 'Salvar' : 'Criar'}</button>
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
