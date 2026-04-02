import { useEffect, useRef, useState } from 'react'
import { PALETTE, btnNav } from '../../styles/theme'
import { makeModalDraggable } from '../shared/draggableModal'

type NotifItem = { id: string; label: string; detail: string | string[]; when?: string; route: string; severity: 'warning' | 'info' }
type ChartBar = { label: string; value: number; color: string }
type ChartItem = { key: string; label: string; value: number; color: string; route: string }
type UpcomingVacation = { id: number; workerName?: string; startDate?: string; endDate?: string; daysUsed?: number; workerColor?: string }
type UpcomingTrip = { id: number; date?: string; startTime?: string; cityName?: string; drivers?: string; travelers?: string; workers?: string; vehicle?: string; color?: string }
type UpcomingShift = { id: string; date?: string; workerName?: string; rotationName?: string; workerId?: number | null; workerColor?: string; holidayName?: string | null; isHoliday?: boolean }

export default function GeneralPanel(props: {
  embedded?: boolean
  minimized: boolean
  setMinimized: (v: boolean) => void
  loading: boolean
  chartData: ChartItem[]
  moduleCharts: { vacations: ChartBar[]; trips: ChartBar[]; shifts: ChartBar[] }
  notifications: NotifItem[]
  inconsistentCount?: number
  upcomingVacations?: UpcomingVacation[]
  upcomingTrips?: UpcomingTrip[]
  upcomingShifts?: UpcomingShift[]
  onNavigate: (route: string) => void
}) {
  const { embedded, minimized, setMinimized, loading, chartData, moduleCharts, notifications, inconsistentCount, upcomingVacations, onNavigate } = props
  const upcomingTrips = (props as any).upcomingTrips as UpcomingTrip[] | undefined
  const upcomingShifts = (props as any).upcomingShifts as UpcomingShift[] | undefined

  const panelRef = useRef<HTMLDivElement | null>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)

  const [showNotifications, setShowNotifications] = useState(false)
  const [notifPos, setNotifPos] = useState<{ top: number; left: number } | null>(null)
  const [hoveredNotif, setHoveredNotif] = useState<string | null>(null)
  const notifButtonRef = useRef<HTMLButtonElement | null>(null)
  const inconsistentRef = useRef<HTMLButtonElement | null>(null)
  const notifPopoverRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showNotifications) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null
      if (!target) return
      if (notifPopoverRef.current?.contains(target) || notifButtonRef.current?.contains(target)) return
      setShowNotifications(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showNotifications])

  useEffect(() => {
    if (embedded) return
    const el = panelRef.current
    if (!el) return
    const dispose = makeModalDraggable(el, {
      handleSelector: '[data-draggable-handle], h1',
      onPositionChange: pos => setPanelPos(pos),
    })
    return () => dispose()
  }, [embedded])

  useEffect(() => {
    if (embedded) return
    if (!panelRef.current) return
    if (panelPos) return
    const rect = panelRef.current.getBoundingClientRect()
    setPanelPos({
      top: Math.max(8, (window.innerHeight - rect.height) / 2),
      left: Math.max(8, (window.innerWidth - rect.width) / 2),
    })
  }, [embedded, panelPos])

  const maxValue = Math.max(1, ...chartData.map(i => i.value))
  const totalNotifications = notifications.length

  const basePanelStyle: any = {
    width: embedded ? '100%' : 'min(760px, 86vw)',
    height: embedded ? '100%' : undefined,
    minHeight: embedded ? '100%' : undefined,
    boxSizing: 'border-box',
    background: PALETTE.cardBg,
    border: `1px solid ${PALETTE.border}`,
    borderRadius: 12,
    padding: 20,
    boxShadow: '0 10px 35px rgba(0,0,0,0.25)',
    zIndex: 1200,
  }
  if (!embedded) {
    basePanelStyle.position = 'fixed'
    basePanelStyle.top = panelPos ? panelPos.top : '50%'
    basePanelStyle.left = panelPos ? panelPos.left : '50%'
    basePanelStyle.transform = panelPos ? 'none' : 'translate(-50%, -50%)'
  } else {
    basePanelStyle.position = 'relative'
  }

  const tileBackgrounds = [
    'linear-gradient(180deg,#c68600,#7c5200)',
    'linear-gradient(180deg,#134e9a,#0f3b6a)',
    'linear-gradient(180deg,#6b3e8a,#3e2a52)',
    'linear-gradient(180deg,#0f6b4f,#115c45)',
  ]

  const getIcon = (item: NotifItem | undefined, idx: number) => {
    if (!item) return '❔'
    const label = item.label.toLowerCase()
    const route = (item.route || '').toLowerCase()
    if (route.includes('vacation') || label.includes('férias') || route.includes('vacations')) return '⛱️'
    if (route.includes('vehicle') || route.includes('vehicles') || label.includes('veículo') || label.includes('veiculos') || label.includes('veiculo') || label.includes('manuten')) return '🚗'
    if (route.includes('trip') || label.includes('viagem') || route.includes('trips')) return '✈️'
    if (route.includes('shift') || label.includes('plantão') || route.includes('shifts')) return '📅'
    return '🔔'
  }

  function parseLocalDate(s: string) {
    const p = s.split('-').map(Number)
    return new Date(p[0], p[1] - 1, p[2])
  }

  function fmtDate(d: string | null | undefined) {
    if (!d) return '—'
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      const local = parseLocalDate(d.slice(0, 10))
      return local.toLocaleDateString('pt-BR')
    }
    return new Date(d).toLocaleDateString('pt-BR')
  }

  function weekdayNameFromIso(s?: string | null) {
    if (!s) return ''
    try {
      const d = parseLocalDate(String(s).slice(0, 10))
      const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
      return DAYS[d.getDay()]
    } catch (e) {
      return ''
    }
  }

  return (
    <div ref={panelRef} className="draggable-modal" style={basePanelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h1 data-draggable-handle style={{ margin: 0, fontSize: 22, flex: 1, cursor: embedded ? 'default' : 'grab', userSelect: 'none' }}>Painel Geral</h1>
        <button
          ref={inconsistentRef}
          type="button"
          onClick={() => onNavigate('/time-punches')}
          title="Pontos Inconsistentes"
          style={{
            ...btnNav,
            marginRight: 8,
            background: PALETTE.error,
            color: '#fff',
            border: `1px solid ${PALETTE.border}`,
            position: 'relative'
          }}
        >
          ⏱️
          {inconsistentCount && inconsistentCount > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>{inconsistentCount}</span>
          )}
        </button>

        <button
          ref={notifButtonRef}
          type="button"
          onClick={(e) => {
            if (showNotifications) { setShowNotifications(false); return }
            const rect = notifButtonRef.current?.getBoundingClientRect()
            if (rect) {
              const popWidth = 420
              const left = Math.max(8, Math.min(rect.right - popWidth, window.innerWidth - popWidth - 8))
              setNotifPos({ top: rect.bottom + 8, left })
            }
            setShowNotifications(true)
          }}
          style={{
            ...btnNav,
            background: totalNotifications > 0 ? PALETTE.success : PALETTE.hoverBg,
            border: `1px solid ${PALETTE.border}`,
            position: 'relative',
          }}
          title="Notificações"
        >
          🔔
          {totalNotifications > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, background: '#FF3B30', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, padding: '0 6px' }}>
              {totalNotifications}
            </span>
          )}
        </button>
        {!embedded && (
          <button type="button" onClick={() => { setMinimized(true); setShowNotifications(false) }} style={{ ...btnNav, marginRight: 6 }} title="Minimizar painel">X</button>
        )}
      </div>

      <p style={{ marginTop: 0, marginBottom: 18, color: PALETTE.textSecondary }}>
        {loading ? 'Carregando métricas...' : 'Resumo com informações das outras telas e ações necessárias.'}
      </p>

      {/* Top 4 notification tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 12, marginBottom: 18 }}>
        {[0, 1, 2, 3].map(i => {
          const item = notifications[i]
          const icon = getIcon(item, i)
          const rawDetail = item?.detail ?? ''
          const detail = Array.isArray(rawDetail) ? rawDetail.join(' ') : rawDetail
          let count: number | null = null
          if (!item?.when) {
            const countMatch = (detail as string).match(/\d+/)
            const isCountDetail = /\b(ve[ií]culo|veiculos|veículos|viagem|viagens|aguardando|pendente|pendentes|ocorr[eê]ncia|ocorrencias)\b/i.test(detail as string)
            count = (countMatch && isCountDetail) ? Number(countMatch[0]) : null
          }
          return (
            <div
              key={item?.id ?? `tile-${i}`}
              role="button"
              className="selection-tile"
              onClick={() => item && onNavigate(item.route)}
              style={{
                background: item ? tileBackgrounds[i] : PALETTE.backgroundSecondary,
                border: `1px solid ${PALETTE.border}`,
                borderRadius: 12,
                padding: 14,
                color: '#fff',
                cursor: item ? 'pointer' : 'default',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 64, height: 64, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                  {icon}
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{item?.label ?? 'Sem informação'}</div>
                  {item?.when ? (
                    <>
                      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>{item.when}</div>
                      <div style={{ marginTop: 6 }}>
                        {Array.isArray(item.detail) ? (
                          item.detail.map((line, idx) => {
                            const isEvent = String(line).includes(' - ')
                            return (
                              <div key={idx} style={{ fontSize: 13, fontWeight: isEvent ? 400 : 700, marginTop: isEvent ? 4 : 8 }}>{line}</div>
                            )
                          })
                        ) : (
                          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>{item.detail}</div>
                        )}
                      </div>
                    </>
                  ) : count ? (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 26, fontWeight: 700 }}>{count}</div>
                      {Array.isArray(item?.detail) ? (
                        <div style={{ marginTop: 6 }}>
                          {item!.detail.map((line, idx) => (
                            <div key={idx} style={{ fontSize: 12, opacity: 0.9, marginTop: idx === 0 ? 6 : 4 }}>{line}</div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, opacity: 0.9 }}>{item?.detail}</div>
                      )}
                    </div>
                  ) : (
                    Array.isArray(item?.detail) ? (
                      <div style={{ marginTop: 8 }}>
                        {item!.detail.map((line, idx) => (
                          <div key={idx} style={{ fontSize: 13, fontWeight: idx === 0 ? 700 : 400, marginTop: idx === 0 ? 8 : 4 }}>{line}</div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginTop: 8, fontSize: 13, opacity: 0.95 }}>{item?.detail}</div>
                    )
                  )}
                </div>
              </div>
              {i === 0 && item && (
                <div style={{ marginTop: 12 }}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigate(item.route)
                    }}
                    style={{ ...btnNav, background: '#ffd54d', border: 'none', color: '#000', display: 'inline-block' }}
                  >
                    Aprovar agora
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Row with three organized placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ background: PALETTE.cardAlt, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 20, minHeight: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Agendamento de Férias</div>
          {upcomingVacations && upcomingVacations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {upcomingVacations.slice(0, 5).map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderBottom: `1px solid ${PALETTE.border}`, background: v.workerColor ? `${v.workerColor}22` : PALETTE.backgroundSecondary }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: v.workerColor || PALETTE.border, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 17, display: 'block' }}>{v.workerName || '—'}</strong>
                    <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>{fmtDate(v.startDate)} — {fmtDate(v.endDate)} · {v.daysUsed ?? ''}d</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: PALETTE.textSecondary, fontSize: 14 }}>Nenhuma férias agendada</div>
          )}
        </div>
        <div style={{ background: PALETTE.cardAlt, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 20, minHeight: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Próximas Viagens</div>
          {upcomingTrips && upcomingTrips.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {upcomingTrips.slice(0, 5).map(t => (
                <div key={t.id} role={"button"} onClick={() => onNavigate('/trips')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderBottom: `1px solid ${PALETTE.border}`, cursor: 'pointer', background: `${PALETTE.primary}22` }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: t.color || PALETTE.primary, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 17, display: 'block' }}>{t.workers && t.workers.length > 0 ? t.workers : (t.cityName || '—')}</strong>
                    <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>{fmtDate(t.date)}{t.startTime ? ` - ${t.startTime}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: PALETTE.textSecondary, fontSize: 14 }}>Nenhuma viagem próxima</div>
          )}
        </div>
        <div style={{ background: PALETTE.cardAlt, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 20, minHeight: 220 }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Escala de Plantões</div>
          {upcomingShifts && upcomingShifts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {upcomingShifts.slice(0, 5).map(s => {
                const weekday = weekdayNameFromIso(s.date)
                return (
                  <div key={s.id} role="button" onClick={() => onNavigate('/shifts/calendar')} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px', borderBottom: `1px solid ${PALETTE.border}`, cursor: 'pointer', background: s.isHoliday ? '#ffd54d22' : (s.workerColor ? `${s.workerColor}22` : PALETTE.backgroundSecondary) }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: s.workerColor || PALETTE.info, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 17, display: 'block' }}>{s.workerName || '—'}</strong>
                      <div style={{ fontSize: 13, color: PALETTE.textSecondary }}>
                        {weekday ? `${weekday} ` : ''}{fmtDate(s.date)}
                        {s.rotationName ? ` · ${s.rotationName}` : ''}
                        {s.isHoliday ? (
                          <span style={{ marginLeft: 8, fontSize: 13, color: PALETTE.warning }}>Feriado{s.holidayName ? `: ${s.holidayName}` : ''}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: PALETTE.textSecondary, fontSize: 14 }}>Nenhuma escala próxima</div>
          )}
        </div>
      </div>

      {showNotifications && notifPos && (
        <div id="selection-notifications-popover" ref={notifPopoverRef} style={{ position: 'fixed', top: notifPos.top, left: notifPos.left, width: 420, zIndex: 2000 }}>
          <div style={{ background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`, borderRadius: 12, padding: 10, boxShadow: '0 20px 60px rgba(2,6,23,0.18), 0 8px 24px rgba(2,6,23,0.12)', maxHeight: '48vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Ações Necessárias</h3>
              <button type="button" onClick={() => setShowNotifications(false)} style={btnNav}>✕</button>
            </div>
            <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
              {notifications.length === 0 && <div style={{ color: PALETTE.textSecondary }}>Nenhuma ação pendente no momento.</div>}
              {notifications.map(item => (
                <button key={item.id} type="button" className="selection-notif-item" onClick={() => { setShowNotifications(false); onNavigate(item.route) }} onMouseEnter={() => setHoveredNotif(item.id)} onMouseLeave={() => setHoveredNotif(null)} style={{ textAlign: 'left', background: hoveredNotif === item.id ? `${PALETTE.primary}11` : PALETTE.cardBg, border: `1px solid ${item.severity === 'warning' ? `${PALETTE.warning}66` : PALETTE.border}`, borderRadius: 8, padding: 10, cursor: 'pointer', color: PALETTE.textPrimary }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</div>
                  {item.when && <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 6 }}>{item.when}</div>}
                  {Array.isArray(item.detail) ? (
                    <div style={{ marginTop: 6 }}>
                      {item.detail.map((line, idx) => (
                        <div key={idx} style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: idx === 0 ? 6 : 4 }}>{line}</div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>{item.detail}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
