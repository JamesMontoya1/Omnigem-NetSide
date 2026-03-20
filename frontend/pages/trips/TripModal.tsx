import React from 'react'
import {
  PALETTE as THEME_PALETTE,
  btnPrimary as THEME_BTN_PRIMARY,
  btnCancel as THEME_BTN_CANCEL,
  btnSmallBlue as THEME_BTN_SMALL_BLUE,
  btnSmallRed as THEME_BTN_SMALL_RED,
  btnSmall as THEME_BTN_SMALL,
  inputStyle as THEME_INPUT_STYLE,
  labelStyle as THEME_LABEL_STYLE,
  selectStyle as THEME_SELECT_STYLE,
} from '../../styles/theme'

export default function TripModal(props: any) {
  const {
    showTripModal,
    setShowTripModal,
    overlay,
    modal,
    editingTrip,
    setEditingTrip,
    handleSaveTrip,
    form,
    setForm,
    setShowCitiesClientsModal,
    vehicles,
    addToast,
    openEditVehicle,
    serviceTypes,
    cities,
    workers,
    toggleTraveler,
    toggleDriver,
    CurrencyInput,
    moneyWrapper,
    btnSmallBlue,
    btnSmallRed,
    btnSmall,
    btnCancel,
    btnPrimary,
    PALETTE,
    toDateInput,
    parseLocalDate,
    handleMarkComplete,
    handleMarkIncomplete,
    setConfirmDelete,
    setShowFuelNoteModal,
    setShowExtraNoteModal,
    setMealEdited,
    num,
  } = props

  if (!showTripModal) return null

  const overlayStyle = overlay ?? { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const modalStyle = modal ?? { background: (PALETTE ?? THEME_PALETTE).cardBg, border: `1px solid ${(PALETTE ?? THEME_PALETTE).border}`, borderRadius: 8, padding: 12, width: 860, maxHeight: '88vh', overflowY: 'auto' }
  const inputStyleLocal = (props.inputStyle ?? THEME_INPUT_STYLE)
  const labelStyleLocal = (props.labelStyle ?? THEME_LABEL_STYLE)
  const selectStyleLocal = (props.selectStyle ?? THEME_SELECT_STYLE)
  const moneyWrapperLocal = (moneyWrapper ?? { position: 'relative' })
  const btnSmallBlueLocal = (btnSmallBlue ?? THEME_BTN_SMALL_BLUE)
  const btnSmallRedLocal = (btnSmallRed ?? THEME_BTN_SMALL_RED)
  const btnSmallLocal = (btnSmall ?? THEME_BTN_SMALL)
  const btnCancelLocal = (btnCancel ?? THEME_BTN_CANCEL)
  const btnPrimaryLocal = (btnPrimary ?? THEME_BTN_PRIMARY)
  const PALETTELocal = (PALETTE ?? THEME_PALETTE)

  return (
    <div style={overlayStyle} onClick={() => setShowTripModal(false)}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{editingTrip ? 'Editar Viagem' : 'Nova Viagem'}</h3>
        <form onSubmit={handleSaveTrip}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.4fr 1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ ...labelStyleLocal }}>{'Data *'}</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={e => {
                      const newDate = e.target.value
                      setForm((f: any) => {
                        const prevDate = f.date
                        const shouldSyncEnd = !f.endDate || f.endDate === prevDate
                        return { ...f, date: newDate, endDate: shouldSyncEnd ? newDate : f.endDate }
                      })
                    }}
                    style={inputStyleLocal}
                  />
                </div>
                <div>
                  <label style={labelStyleLocal}>Hora Saída</label>
                  <input
                    type="time"
                    value={(form as any).startTime || ''}
                    onChange={e => setForm({ ...form, startTime: e.target.value })}
                    style={inputStyleLocal}
                  />
                </div>
                <div>
                  <label style={labelStyleLocal}>Veículo</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <select
                      value={(form as any).vehicleId || ''}
                      onChange={e => {
                        const val = e.target.value
                        setForm((f: any) => {
                          const newForm: any = { ...f, vehicleId: val }
                          const vid = Number(val)
                          const v = vehicles.find((x: any) => x.id === vid)
                          if (v) {
                            if (!newForm.odometer && v.odometer != null) newForm.odometer = String(v.odometer)
                            if (!newForm.nextOilChange && v.nextOilChange) newForm.nextOilChange = toDateInput(String(v.nextOilChange))
                            if (!newForm.lastAlignment && v.lastAlignment) newForm.lastAlignment = toDateInput(String(v.lastAlignment))
                            if (!newForm.odometerAtLastAlignment && v.odometerAtLastAlignment != null) newForm.odometerAtLastAlignment = String(v.odometerAtLastAlignment)
                            if (!newForm.lastMaintenance && v.lastMaintenance) newForm.lastMaintenance = toDateInput(String(v.lastMaintenance))
                          }
                          return newForm
                        })
                      }}
                      style={{ ...selectStyleLocal, flex: 1 }}
                    >
                      <option value="">Selecione...</option>
                      {vehicles.map((v: any) => (
                        <option key={v.id} value={v.id}>{v.model ?? v.plate ?? v.id}</option>
                      ))}
                    </select>

                    {editingTrip?.completed && (
                      <button
                        type="button"
                        onClick={() => {
                          const vid = Number((form as any).vehicleId)
                          if (!vid) { addToast('Selecione um veículo primeiro', 'error'); return }
                          const v = vehicles.find((x: any) => x.id === vid)
                          if (!v) { addToast('Veículo não encontrado', 'error'); return }
                          openEditVehicle(v, true)
                        }}
                        style={{ ...(btnSmallLocal as any), padding: '6px 8px' }}
                      >Editar</button>
                    )}
                  </div>
                </div>
                <div>
                  <label style={labelStyleLocal}>Tipo *</label>
                  <select value={form.serviceTypeId} onChange={e => setForm({ ...form, serviceTypeId: e.target.value })} style={selectStyleLocal}>
                    <option value="">Selecione...</option>
                    {serviceTypes.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <label style={labelStyleLocal}>Cidades & Clientes *</label>
                    </div>
                    <div>
                      <button type="button" onClick={() => setShowCitiesClientsModal(true)} style={{ ...(btnSmallBlueLocal as any), padding: '6px 8px' }}>Cidades/Clientes</button>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {((form as any).cities || []).length === 0 ? (
                      <div style={{ color: PALETTELocal.textSecondary }}>Nenhuma cidade adicionada. Abra Cidades/Clientes para adicionar.</div>
                    ) : (
                      (form as any).cities.map((cityBlock: any, ci: number) => (
                        <div key={ci} style={{ marginTop: 8, padding: 8, border: `1px dashed ${PALETTELocal.border}`, borderRadius: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontWeight: 600 }}>
                              {cities.find((c: any) => String(c.id) === String(cityBlock.cityId))?.name || 'Cidade não selecionada'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ color: PALETTELocal.textSecondary, fontSize: 12 }}>{(cityBlock.clients || []).length} cliente(s)</div>
                              {((form as any).cities || []).length > 1 ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => setForm((f: any) => {
                                      const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                      if (ci <= 0) return f
                                      const tmp = citiesArr[ci - 1]
                                      citiesArr[ci - 1] = citiesArr[ci]
                                      citiesArr[ci] = tmp
                                      return { ...f, cities: citiesArr }
                                    })}
                                    style={{ ...(btnSmallBlueLocal as any), padding: '6px 8px' }}
                                    title="Mover para cima"
                                  >▲</button>

                                  <button
                                    type="button"
                                    onClick={() => setForm((f: any) => {
                                      const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                      if (ci >= citiesArr.length - 1) return f
                                      const tmp = citiesArr[ci + 1]
                                      citiesArr[ci + 1] = citiesArr[ci]
                                      citiesArr[ci] = tmp
                                      return { ...f, cities: citiesArr }
                                    })}
                                    style={{ ...(btnSmallBlueLocal as any), padding: '6px 8px' }}
                                    title="Mover para baixo"
                                  >▼</button>

                                  <button
                                    type="button"
                                    onClick={() => setForm((f: any) => {
                                      const citiesArr = Array.isArray((f as any).cities) ? [...(f as any).cities] : []
                                      citiesArr.splice(ci, 1)
                                      return { ...f, cities: citiesArr }
                                    })}
                                    style={{ ...(btnSmallRedLocal as any), padding: '6px 8px' }}
                                  >Remover</button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div>
                <label style={labelStyleLocal}>Passageiros</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {workers.map((w: any) => (
                    <button key={w.id} type="button" onClick={() => toggleTraveler(w.id)} style={{
                      fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
                      background: form.travelerIds.includes(w.id) ? PALETTELocal.primary : PALETTELocal.hoverBg,
                      color: form.travelerIds.includes(w.id) ? '#fff' : PALETTELocal.textPrimary,
                      fontWeight: form.travelerIds.includes(w.id) ? 600 : 400,
                    }}>
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={labelStyleLocal}>Motorista</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {workers.filter((w: any) => form.travelerIds.includes(w.id)).map((w: any) => (
                    <button key={w.id} type="button" onClick={() => toggleDriver(w.id)} style={{
                      fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: 'none',
                      background: (form.driverIds || []).includes(w.id) ? PALETTELocal.primary : PALETTELocal.hoverBg,
                      color: (form.driverIds || []).includes(w.id) ? '#fff' : PALETTELocal.textPrimary,
                      fontWeight: (form.driverIds || []).includes(w.id) ? 600 : 400,
                    }}>
                      {w.name}
                    </button>
                  ))}
                  {form.travelerIds.length === 0 && <div style={{ color: PALETTELocal.textSecondary }}>Selecione passageiros primeiro.</div>}
                </div>
              </div>

              {!editingTrip?.completed && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ ...labelStyleLocal, marginBottom: 8 }}>Alimentação (R$)</label>
                  <div style={moneyWrapperLocal}>
                    <CurrencyInput
                      value={form.mealExpense}
                      onChange={v => setForm({ ...form, mealExpense: v })}
                      inputStyle={inputStyleLocal}
                      onRawChange={() => setMealEdited(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {editingTrip?.completed ? (
            <div style={{ marginTop: 12, borderTop: `1px solid ${PALETTELocal.border}`, paddingTop: 10 }}>
              <label style={{ ...labelStyleLocal, marginBottom: 8 }}>Despesas & Quilometragem</label>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Alimentação (R$)</label>
                        <div style={moneyWrapperLocal}>
                          <CurrencyInput
                            value={form.mealExpense}
                            onChange={v => setForm({ ...form, mealExpense: v })}
                            inputStyle={inputStyleLocal}
                            onRawChange={() => setMealEdited(true)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Combustível (R$)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1 }}>
                            <CurrencyInput
                              value={form.fuelExpense}
                              onChange={v => setForm({ ...form, fuelExpense: v })}
                              inputStyle={inputStyleLocal}
                              rightButton={num(form.fuelExpense) > 0 ? (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowFuelNoteModal(true) }} style={{ ...(btnSmallBlueLocal as any), padding: '6px 8px', fontSize: 12 }}>📝</button>
                              ) : undefined}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Extra (R$)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1 }}>
                            <CurrencyInput
                              value={form.extraExpense}
                              onChange={v => setForm({ ...form, extraExpense: v })}
                              inputStyle={inputStyleLocal}
                              rightButton={num(form.extraExpense) > 0 ? (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowExtraNoteModal(true) }} style={{ ...(btnSmallBlueLocal as any), padding: '6px 8px', fontSize: 12 }}>📝</button>
                              ) : undefined}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Km Rodados</label>
                        <CurrencyInput
                          value={form.kmDriven}
                          onChange={v => setForm({ ...form, kmDriven: v })}
                          inputStyle={inputStyleLocal}
                          showPrefix={false}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Consumo Médio (km/l)</label>
                        <CurrencyInput
                          value={form.avgConsumption}
                          onChange={v => setForm({ ...form, avgConsumption: v })}
                          inputStyle={inputStyleLocal}
                          showPrefix={false}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyleLocal, fontSize: 11 }}>Autonomia Restante (Km)</label>
                        <div style={moneyWrapperLocal}>
                          <CurrencyInput
                            value={form.remainingAutonomy}
                            onChange={v => setForm({ ...form, remainingAutonomy: v })}
                            inputStyle={inputStyleLocal}
                            showPrefix={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <label style={{ ...labelStyleLocal, marginBottom: 0 }}>Cálculos</label>
                </div>
                <div />
              </div>

              <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                <div>
                  <label style={{ ...labelStyleLocal, fontSize: 11 }}>Custo/km (R$)</label>
                  <div style={moneyWrapperLocal}>
                    <CurrencyInput
                      value={form.costPerKm}
                      onChange={v => setForm({ ...form, costPerKm: v })}
                      inputStyle={inputStyleLocal}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyleLocal, fontSize: 11 }}>Lucro/km (R$)</label>
                  <div style={moneyWrapperLocal}>
                    <CurrencyInput
                      value={form.profitPerKm}
                      onChange={v => setForm({ ...form, profitPerKm: v })}
                      inputStyle={inputStyleLocal}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyleLocal, fontSize: 11 }}>Total (R$)</label>
                  <div style={moneyWrapperLocal}>
                    <CurrencyInput
                      value={form.total}
                      onChange={v => setForm({ ...form, total: v })}
                      inputStyle={inputStyleLocal}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <label style={labelStyleLocal}>Observações</label>
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} rows={1} style={{ ...inputStyleLocal, resize: 'vertical', minHeight: 100 }} />
          </div>

          {editingTrip && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={async () => {
                  if (!editingTrip) return
                  if (!editingTrip.completed) {
                    const dateOnly = toDateInput(editingTrip.date)
                    const endIso = new Date(parseLocalDate(dateOnly)).toISOString()
                    await handleMarkComplete(editingTrip)
                    setEditingTrip((et: any) => et ? { ...et, completed: true, endDate: endIso } : et)
                    setForm((f: any) => ({ ...f, endDate: endIso }))
                  } else {
                    await handleMarkIncomplete(editingTrip)
                    setEditingTrip((et: any) => et ? { ...et, completed: false, endDate: null } : et)
                    setForm((f: any) => ({ ...f, endDate: null }))
                  }
                }}
                style={editingTrip.completed ? { ...(btnSmallBlueLocal as any), padding: '8px 12px', fontSize: 14, background: '#2ecc71', color: '#fff' } : { ...(btnSmallBlueLocal as any), padding: '8px 12px', fontSize: 14 }}>
                  {!editingTrip.completed ? 'Marcar como completa' : 'Marcar como pendente'}
                </button>
                {editingTrip.completed && (
                  <input
                    type="date"
                    value={form.endDate ? form.endDate.slice(0, 10) : ''}
                    onChange={e => setForm((f: any) => ({ ...f, endDate: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                    style={{ ...inputStyleLocal, width: 160, alignSelf: 'center' }}
                  />
                )}
                <button type="button" onClick={() => { setConfirmDelete(editingTrip); setShowTripModal(false) }} style={{ ...(btnSmallRedLocal as any), padding: '8px 12px', fontSize: 14 }}>Excluir viagem</button>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setShowTripModal(false)} style={btnCancelLocal as any}>Cancelar</button>
                <button type="submit" style={btnPrimaryLocal as any}>{editingTrip ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
          )}
          {!editingTrip && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowTripModal(false)} style={btnCancelLocal as any}>Cancelar</button>
              <button type="submit" style={btnPrimaryLocal as any}>{editingTrip ? 'Salvar' : 'Criar'}</button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
