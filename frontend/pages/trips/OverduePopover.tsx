import React from 'react'

interface Props { [key: string]: any }

export default function OverduePopover(props: Props) {
  const {
    showOverdue, overduePos, setShowOverdue, btnCancel, PALETTE,
    isoDate, toDateInput, parseLocalDate, trips, vehicles,
    defaultMaintenanceInterval, defaultAlignmentInterval,
    canEdit, openEditTrip, setTripsView, setCalMonth, setSelectedDay, setPanelOpen,
    hoveredNotif, setHoveredNotif, openEditVehicle,
  } = props

  if (!showOverdue || !overduePos) return null

  return (
    <div id="overdue-popover" style={{ position: 'absolute', top: overduePos.top, left: overduePos.left, width: 520, zIndex: 2000 }}>
      <div style={{
          background: 'linear-gradient(rgb(22, 20, 20), rgb(53, 102, 151))',
          border: `1px solid ${PALETTE.border}`,
          borderRadius: 12,
          padding: 10,
          boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)',
          transform: 'translateY(0px)',
          transition: 'transform 180ms ease, box-shadow 180ms ease',
          willChange: 'transform, box-shadow',
          maxHeight: '48vh',
          overflowY: 'auto'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Atrasos</h3>
          <button type="button" onClick={() => setShowOverdue(false)} style={btnCancel as any}>X</button>
        </div>

        <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Viagens em atraso</div>
        <div style={{ marginTop: 8 }}>
          {(() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayIso = isoDate(today)
            const items = (trips || []).filter((tr: any) => {
              if (tr.completed) return false
              const iso = toDateInput(tr.date)
              const d = parseLocalDate(iso)
              return d.getTime() < today.getTime()
            })
            if (items.length === 0) {
              const today2 = new Date()
              today2.setHours(0, 0, 0, 0)
              const msPerDay2 = 24 * 60 * 60 * 1000
              const veh = vehicles || []
              const oilOverdue = (veh || []).filter((v: any) => v.nextOilChange).map((v: any) => {
                const iso = toDateInput(String(v.nextOilChange))
                const d = parseLocalDate(iso)
                const diff = Math.ceil((d.getTime() - today2.getTime()) / msPerDay2)
                return { v, d, diff }
              }).filter((x: any) => x.diff < 0)

              const maintOverdue = (veh || []).filter((v: any) => v.lastMaintenance).map((v: any) => {
                const iso = toDateInput(String(v.lastMaintenance))
                const d0 = parseLocalDate(iso)
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                const diff = Math.ceil((d.getTime() - today2.getTime()) / msPerDay2)
                return { v, d, diff }
              }).filter((x: any) => x.diff < 0)

              const alignOverdue = (veh || []).filter((v: any) => v.lastAlignment).map((v: any) => {
                const iso = toDateInput(String(v.lastAlignment))
                const d0 = parseLocalDate(iso)
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                const diff = Math.floor((d.getTime() - today2.getTime()) / msPerDay2)
                return { v, d, diff }
              }).filter((x: any) => x.diff < 0)

              if (oilOverdue.length === 0 && maintOverdue.length === 0 && alignOverdue.length === 0) {
                return <div style={{ color: PALETTE.textSecondary }}>Nenhuma viagem atrasada.</div>
              }
            }

            return (
              <div style={{ display: 'grid', gap: 8 }}>
                {items.map((t: any) => {
                  const d = parseLocalDate(toDateInput(t.date))
                  const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                  const equipe = Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'
                  const itemBg = `${PALETTE.error}33`
                  const itemBorder = `1px solid ${PALETTE.error}88`
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setShowOverdue(false)
                        if (canEdit) {
                          openEditTrip(t)
                        } else {
                          setTripsView('calendar')
                          setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1))
                          setSelectedDay(d)
                          setPanelOpen(true)
                        }
                      }}
                      onMouseEnter={() => setHoveredNotif(`trip-${t.id}`)}
                      onMouseLeave={() => setHoveredNotif(null)}
                      role="button"
                      tabIndex={0}
                      style={{
                        padding: 6,
                        borderRadius: 6,
                        background: itemBg,
                        border: itemBorder,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minHeight: 44,
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                        transform: hoveredNotif === `trip-${t.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                        filter: hoveredNotif === `trip-${t.id}` ? 'brightness(1.12)' : undefined,
                        boxShadow: hoveredNotif === `trip-${t.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{t.serviceType?.name ?? 'Viagem'}</div>
                        <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')}{t.startTime ? ` - ${t.startTime}` : ''} — {t.city?.name ?? '—'}</div>
                      </div>
                      <div style={{ width: 120, textAlign: 'right', fontSize: 12, color: PALETTE.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipe}</div>
                    </div>
                  )
                })}

                {/* Vehicles overdue sections */}
                {(() => {
                  const today = new Date()
                  today.setHours(0, 0, 0, 0)
                  const msPerDay = 24 * 60 * 60 * 1000
                  const veh = vehicles || []

                  const oilItems = (veh || []).filter((v: any) => v.nextOilChange).map((v: any) => {
                    const iso = toDateInput(String(v.nextOilChange))
                    const d = parseLocalDate(iso)
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter((x: any) => x.diff < 0)

                  const maintItems = (veh || []).filter((v: any) => v.lastMaintenance).map((v: any) => {
                    const iso = toDateInput(String(v.lastMaintenance))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                    const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter((x: any) => x.diff < 0)

                  const alignItems = (veh || []).filter((v: any) => v.lastAlignment).map((v: any) => {
                    const iso = toDateInput(String(v.lastAlignment))
                    const d0 = parseLocalDate(iso)
                    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                    d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                    const diff = Math.floor((d.getTime() - today.getTime()) / msPerDay)
                    return { v, d, diff }
                  }).filter((x: any) => x.diff < 0)

                  return (
                    <>
                      {oilItems.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Trocas de óleo em atraso</div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {oilItems.map(({ v, d, diff }: any) => {
                              const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                              const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                              return (
                                <div
                                  key={`oil-${v.id}`}
                                  onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                  onMouseEnter={() => setHoveredNotif(`vehicle-oil-${v.id}`)}
                                  onMouseLeave={() => setHoveredNotif(null)}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    padding: 6,
                                    borderRadius: 6,
                                    background: `${PALETTE.error}33`,
                                    border: `1px solid ${PALETTE.error}88`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    minHeight: 44,
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                    transform: hoveredNotif === `vehicle-oil-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                    filter: hoveredNotif === `vehicle-oil-${v.id}` ? 'brightness(1.12)' : undefined,
                                    boxShadow: hoveredNotif === `vehicle-oil-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Troca de óleo — {daysText}</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {maintItems.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Manutenção em atraso</div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {maintItems.map(({ v, d, diff }: any) => {
                              const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                              const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                              return (
                                <div
                                  key={`maint-${v.id}`}
                                  onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                  onMouseEnter={() => setHoveredNotif(`vehicle-maint-${v.id}`)}
                                  onMouseLeave={() => setHoveredNotif(null)}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    padding: 6,
                                    borderRadius: 6,
                                    background: `${PALETTE.error}33`,
                                    border: `1px solid ${PALETTE.error}88`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    minHeight: 44,
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                    transform: hoveredNotif === `vehicle-maint-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                    filter: hoveredNotif === `vehicle-maint-${v.id}` ? 'brightness(1.12)' : undefined,
                                    boxShadow: hoveredNotif === `vehicle-maint-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Manutenção — {daysText}</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {alignItems.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Alinhamentos em atraso</div>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {alignItems.map(({ v, d, diff }: any) => {
                              const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                              const daysText = Math.abs(diff) === 0 ? 'Hoje' : Math.abs(diff) === 1 ? '1 dia atrasado' : `${Math.abs(diff)} dias atrasados`
                              return (
                                <div
                                  key={`align-${v.id}`}
                                  onClick={() => { setShowOverdue(false); if (canEdit) openEditVehicle(v) }}
                                  onMouseEnter={() => setHoveredNotif(`vehicle-align-${v.id}`)}
                                  onMouseLeave={() => setHoveredNotif(null)}
                                  role="button"
                                  tabIndex={0}
                                  style={{
                                    padding: 6,
                                    borderRadius: 6,
                                    background: `${PALETTE.error}33`,
                                    border: `1px solid ${PALETTE.error}88`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    minHeight: 44,
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease',
                                    transform: hoveredNotif === `vehicle-align-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                                    filter: hoveredNotif === `vehicle-align-${v.id}` ? 'brightness(1.12)' : undefined,
                                    boxShadow: hoveredNotif === `vehicle-align-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                                  }}
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Alinhamento — {daysText}</div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
