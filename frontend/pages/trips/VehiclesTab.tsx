import React from 'react'
import { PALETTE, btnPrimary, btnSmallBlue, btnSmallRed, cardStyle } from '../../styles/theme'
import { formatTwo } from '../../components/shared/formatUtils'

type Vehicle = { id: number; plate?: string; model?: string; notes?: string }
type ExpenseCategory = { id: number; name: string; description?: string }
type Expense = { id: number; date: string; category?: ExpenseCategory | null; notes?: string; amount?: any; currency?: string; odometer?: any; receiptUrl?: string; workerId?: any }

function toDateInput(iso: string | undefined) {
  if (!iso) return ''
  if (iso.includes('T')) return iso.split('T')[0]
  return iso.slice(0, 10)
}

function money(v: any) { const n = Number(String(v).replace(',', '.')); return isNaN(n) || n === 0 ? '' : `R$ ${n.toFixed(2)}` }
function truncate(s?: string, n = 80) { if (!s) return ''; return s.length > n ? s.slice(0, n) + '…' : s }

export default function VehiclesTab({
  vehicles,
  canEdit,
  openNewVehicle,
  openEditVehicle,
  handleDeleteVehicle,
  selectedVehicleId,
  setSelectedVehicleId,
  showCategories,
  setShowCategories,
  loadingExpenses,
  vehicleExpenses,
  setEditingExpense,
  setExpenseForm,
  setShowExpenseModal,
  handleDeleteExpense,
  expenseCategories,
  openNewCategory,
  openEditCategory,
  handleDeleteCategory,
}: {
  vehicles: Vehicle[]
  canEdit: boolean
  openNewVehicle: () => void
  openEditVehicle: (v: Vehicle) => void
  handleDeleteVehicle: (id: number) => void
  selectedVehicleId: number | null
  setSelectedVehicleId: (id: number | null) => void
  showCategories: boolean
  setShowCategories: React.Dispatch<React.SetStateAction<boolean>>
  loadingExpenses: boolean
  vehicleExpenses: Expense[]
  setEditingExpense: (e: Expense | null) => void
  setExpenseForm: (f: any) => void
  setShowExpenseModal: (s: boolean) => void
  handleDeleteExpense: (id: number) => void
  expenseCategories: ExpenseCategory[]
  openNewCategory: () => void
  openEditCategory: (c: ExpenseCategory) => void
  handleDeleteCategory: (id: number) => void
}) {
  return (
    <>
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
                <button onClick={() => setShowCategories(s => !s)} style={{ ...btnPrimary, marginLeft: 8 }}>{showCategories ? 'Ocultar Categorias' : 'Mostrar Categorias'}</button>
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
    </>
  )
}
