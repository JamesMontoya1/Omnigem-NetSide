import React, { Dispatch, SetStateAction } from 'react'

type Pos = { top: number; left: number }

type Props = {
  showNotifications: boolean
  notifPos: Pos | null
  setShowNotifications: Dispatch<SetStateAction<boolean>>
  btnCancel: any
  PALETTE: any
  trips: any[]
  isoDate: (d: Date) => string
  toDateInput: (d: any) => string
  parseLocalDate: (s: string) => Date
  canEdit: boolean
  openEditTrip: (t: any) => void
  setTripsView: Dispatch<SetStateAction<'list' | 'calendar'>>
  setCalMonth: Dispatch<SetStateAction<Date>>
  setSelectedDay: Dispatch<SetStateAction<Date | null>>
  setPanelOpen: Dispatch<SetStateAction<boolean>>
  hoveredNotif: string | null
  setHoveredNotif: Dispatch<SetStateAction<string | null>>
  vehicles: any[]
  defaultMaintenanceInterval?: number
  defaultAlignmentInterval?: number
  openEditVehicle: (v: any) => void
}

export default function NotificationsPopover(props: Props) {
  const {
    setShowNotifications,
    btnCancel,
    PALETTE,
    trips,
    isoDate,
    toDateInput,
    parseLocalDate,
    canEdit,
    openEditTrip,
    setTripsView,
    setCalMonth,
    setSelectedDay,
    setPanelOpen,
    hoveredNotif,
    setHoveredNotif,
    vehicles,
    defaultMaintenanceInterval,
    defaultAlignmentInterval,
    openEditVehicle,
    notifPos,
  } = props

  return (
    <div id="notifications-popover" style={{ position: 'absolute', top: notifPos?.top, left: notifPos?.left, width: 520, zIndex: 2000 }}>
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
          <h3 style={{ margin: 0, fontSize: 16 }}>Notificações</h3>
          <button type="button" onClick={() => setShowNotifications(false)} style={btnCancel as any}>X</button>
        </div>

        {/* Próximas viagens */}
        <div style={{ marginTop: 8 }}>
          <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Próximas viagens</div>
          {(() => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            const tt = isoDate(tomorrow)
            const todayIso = isoDate(today)
            const items = trips.filter(tr => {
              const d = toDateInput(tr.date)
              return (d === todayIso || d === tt) && !tr.completed
            })
            if (items.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma viagem para hoje ou amanhã.</div>
            return (
              <div style={{ display: 'grid', gap: 8 }}>
                {items.map(t => {
                  const isTodayTrip = toDateInput(t.date) === todayIso
                  const itemBg = isTodayTrip ? `${PALETTE.success}33` : PALETTE.cardBg
                  const itemBorder = isTodayTrip ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                  return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setShowNotifications(false)
                      if (canEdit) {
                        openEditTrip(t)
                      } else {
                        const d = parseLocalDate(toDateInput(t.date))
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
                    {(() => {
                      const d = parseLocalDate(toDateInput(t.date))
                      const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                      const equipe = Array.from(new Set([...(t.drivers || []).map((w: any) => w.name), ...(t.travelers || []).map((w: any) => w.name)])).join(', ') || '—'
                      return (
                        <>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{t.serviceType?.name ?? 'Viagem'}</div>
                            <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')}{t.startTime ? ` - ${t.startTime}` : ''} — {t.city?.name ?? '—'}</div>
                          </div>
                          <div style={{ width: 120, textAlign: 'right', fontSize: 12, color: PALETTE.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipe}</div>
                        </>
                      )
                    })()}
                  </div>
                )
                })}
              </div>
            )
          })()}

          {/* Seção: Trocas de óleo */}
          <div style={{ marginTop: 12 }}>
            <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Trocas de óleo</div>
            {(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const msPerDay = 24 * 60 * 60 * 1000
              const oilItems = (vehicles || []).filter(v => v.nextOilChange).map(v => {
                const iso = toDateInput(String(v.nextOilChange))
                const d = parseLocalDate(iso)
                const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                return { v, d, diff }
              }).filter(x => x.diff >= 0 && x.diff <= 30)

              if (oilItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma troca de óleo próxima.</div>

              return (
                <div style={{ display: 'grid', gap: 8 }}>
                  {oilItems.map(({ v, d, diff }) => {
                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                    const rightInfo = v.model || v.notes || '—'
                    const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                    const isDueToday = diff === 0
                    const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                    const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setShowNotifications(false)
                          if (canEdit) openEditVehicle(v)
                        }}
                        onMouseEnter={() => setHoveredNotif(`vehicle-oil-${v.id}`)}
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
                          transform: hoveredNotif === `vehicle-oil-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                          filter: hoveredNotif === `vehicle-oil-${v.id}` ? 'brightness(1.12)' : undefined,
                          boxShadow: hoveredNotif === `vehicle-oil-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Troca de óleo — {daysText}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
          
          {/* Seção: Manutenção */}
          <div style={{ marginTop: 12 }}>
            <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Manutenção</div>
            {(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const msPerDay = 24 * 60 * 60 * 1000
              const maintItems = (vehicles || []).filter(v => v.lastMaintenance).map(v => {
                const iso = toDateInput(String(v.lastMaintenance))
                const d0 = parseLocalDate(iso)
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                d.setDate(d.getDate() + (defaultMaintenanceInterval ?? 60))
                const diff = Math.ceil((d.getTime() - today.getTime()) / msPerDay)
                return { v, d, diff }
              }).filter(x => x.diff >= 0 && x.diff <= 30)

              if (maintItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhuma manutenção próxima.</div>

              return (
                <div style={{ display: 'grid', gap: 8 }}>
                  {maintItems.map(({ v, d, diff }) => {
                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                    const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                    const isDueToday = diff === 0
                    const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                    const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                          setShowNotifications(false)
                          if (canEdit) openEditVehicle(v)
                        }}
                        onMouseEnter={() => setHoveredNotif(`vehicle-maint-${v.id}`)}
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
                          transform: hoveredNotif === `vehicle-maint-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                          filter: hoveredNotif === `vehicle-maint-${v.id}` ? 'brightness(1.12)' : undefined,
                          boxShadow: hoveredNotif === `vehicle-maint-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Manutenção — {daysText}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Seção: Alinhamentos */}
          <div style={{ marginTop: 12 }}>
            <div style={{ color: PALETTE.textSecondary, marginBottom: 8 }}>Alinhamentos</div>
            {(() => {
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const msPerDay = 24 * 60 * 60 * 1000
              const alignItems = (vehicles || []).filter(v => v.lastAlignment).map(v => {
                const iso = toDateInput(String(v.lastAlignment))
                const d0 = parseLocalDate(iso)
                const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())
                d.setDate(d.getDate() + (defaultAlignmentInterval ?? 60))
                const diff = Math.floor((d.getTime() - today.getTime()) / msPerDay)
                return { v, d, diff }
              }).filter(x => x.diff >= 0 && x.diff <= 30)

              if (alignItems.length === 0) return <div style={{ color: PALETTE.textSecondary }}>Nenhum alinhamento próximo.</div>

              return (
                <div style={{ display: 'grid', gap: 8 }}>
                  {alignItems.map(({ v, d, diff }) => {
                    const dow = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][d.getDay()]
                    const daysText = diff === 0 ? 'Hoje' : diff === 1 ? '1 dia' : `${diff} dias`
                    const isDueToday = diff === 0
                    const itemBg = isDueToday ? `${PALETTE.success}33` : PALETTE.cardBg
                    const itemBorder = isDueToday ? `1px solid ${PALETTE.success}88` : `1px solid ${PALETTE.border}`
                    return (
                      <div
                        key={v.id}
                        onClick={() => {
                              setShowNotifications(false)
                              if (canEdit) openEditVehicle(v)
                            }}
                            onMouseEnter={() => setHoveredNotif(`vehicle-align-${v.id}`)}
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
                          transform: hoveredNotif === `vehicle-align-${v.id}` ? 'translateY(-1px)' : 'translateY(0px)',
                          filter: hoveredNotif === `vehicle-align-${v.id}` ? 'brightness(1.12)' : undefined,
                          boxShadow: hoveredNotif === `vehicle-align-${v.id}` ? '0 2px 8px rgba(0,0,0,0.35)' : 'none',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{(v.model || v.plate) ? `${v.model ?? '—'} - ${v.plate ?? '—'}` : 'Veículo'}</div>
                          <div style={{ fontSize: 12, color: PALETTE.textSecondary, lineHeight: 1 }}>{dow} {d.toLocaleDateString('pt-BR')} - Alinhamento — {daysText}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginLeft: 8 }} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}
