import React, { useState } from 'react'
import { useRouter } from 'next/router'
import { PALETTE, btnPrimary, inputStyle, labelStyle, cardStyle } from '../../styles/theme'
import { API_BASE } from '../../config/api'

export default function ReportsPage() {
  const router = useRouter()
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: PALETTE.background, color: PALETTE.textPrimary, height: '100%', overflow: 'auto' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <ReportsContent />
        </div>
      </div>
    </div>
  )
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type WorkerStats = {
  workerId: number
  workerName: string
  workerColor: string | null
  total: number
  holidays: number
  inactive?: boolean
}

type ReportData = {
  startDate: string
  endDate: string
  weekdays: number[]
  workers: WorkerStats[]
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function ReportsContent({ onClose }: { onClose?: () => void } = {}) {
  const today = new Date()
  const firstDay = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1))
  const lastDay = new Date(Date.UTC(today.getFullYear(), today.getMonth() + 1, 0))

  const [startDate, setStartDate] = useState(isoDate(firstDay))
  const [endDate, setEndDate] = useState(isoDate(lastDay))
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)

  function toggleWeekday(wd: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(wd) ? prev.filter((d) => d !== wd) : [...prev, wd].sort(),
    )
  }

  async function generateReport() {
    if (!startDate || !endDate) return
    if (selectedWeekdays.length === 0) {
      setError('Selecione ao menos um dia da semana.')
      return
    }

    setLoading(true)
    setError(null)
    setReport(null)

    try {
      const wdParam = selectedWeekdays.join(',')
      const incParam = includeInactive ? '&includeInactive=true' : ''
      const res = await fetch(
        `${API_BASE}/rotations/report?startDate=${startDate}&endDate=${endDate}&weekdays=${wdParam}${incParam}`,
      )
      if (!res.ok) {
        setError('Erro ao gerar relatório.')
        return
      }
      const data: ReportData = await res.json()
      setReport(data)
    } catch (e) {
      console.error(e)
      setError('Erro de rede ao gerar relatório.')
    } finally {
      setLoading(false)
    }
  }

  const totalShifts = report ? report.workers.reduce((sum, w) => sum + w.total, 0) : 0
  const totalHolidayShifts = report ? report.workers.reduce((sum, w) => sum + w.holidays, 0) : 0

  return (
    <>
      <h1 style={{ margin: '0 0 20px 0', fontSize: 22, color: PALETTE.textPrimary }}>
        Relatórios
      </h1>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Coluna esquerda: Filtros */}
        <div style={{ flex: '0 0 600px' }}>
          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 15, color: PALETTE.textPrimary }}>
              Filtros do Relatório
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Dias da Semana</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {WEEKDAY_LABELS.map((label, idx) => {
                  const isActive = selectedWeekdays.includes(idx)
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleWeekday(idx)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: isActive
                          ? `2px solid ${PALETTE.primary}`
                          : `1px solid ${PALETTE.border}`,
                        background: isActive ? `${PALETTE.primary}30` : PALETTE.backgroundSecondary,
                        color: isActive ? PALETTE.primary : PALETTE.textSecondary,
                        cursor: 'pointer',
                        fontWeight: isActive ? 700 : 400,
                        fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedWeekdays([0, 1, 2, 3, 4, 5, 6])}
                  style={{
                    background: 'transparent',
                    color: PALETTE.textSecondary,
                    border: `1px solid ${PALETTE.border}`,
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Todos os dias
                </button>
                <button
                  onClick={() => setSelectedWeekdays([1, 2, 3, 4, 5])}
                  style={{
                    background: 'transparent',
                    color: PALETTE.textSecondary,
                    border: `1px solid ${PALETTE.border}`,
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Dias úteis
                </button>
                <button
                  onClick={() => setSelectedWeekdays([5, 6])}
                  style={{
                    background: 'transparent',
                    color: PALETTE.textSecondary,
                    border: `1px solid ${PALETTE.border}`,
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Sex e Sáb
                </button>
                <button
                  onClick={() => setSelectedWeekdays([0, 6])}
                  style={{
                    background: 'transparent',
                    color: PALETTE.textSecondary,
                    border: `1px solid ${PALETTE.border}`,
                    padding: '8px 14px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Fins de semana
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <button
                    onClick={generateReport}
                    disabled={loading}
                    style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }}
                  >
                    {loading ? 'Gerando...' : 'Gerar Relatório'}
                  </button>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    <span style={{ color: PALETTE.textSecondary, fontSize: 13 }}>Incluir trabalhadores inativos</span>
                  </label>
                </div>
              </div>
            </div>
            
            {error && (
              <div style={{ marginTop: 12, color: PALETTE.error, fontSize: 13 }}>{error}</div>
            )}
          </div>
        </div>

        {/* Coluna direita: Resultado */}
        <div style={{ flex: 1 }}>
          <div style={{ ...cardStyle, padding: 16 }}>
            {report ? (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div style={{
                    ...cardStyle,
                    flex: '1 1 140px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: PALETTE.primary }}>{report.workers.length}</div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 4 }}>Trabalhadores</div>
                  </div>
                  <div style={{
                    ...cardStyle,
                    flex: '1 1 140px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: PALETTE.success }}>{totalShifts}</div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 4 }}>Total de Plantões</div>
                  </div>
                  <div style={{
                    ...cardStyle,
                    flex: '1 1 140px',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: PALETTE.warning }}>{totalHolidayShifts}</div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 4 }}>Plantões em Feriados</div>
                  </div>
                </div>

                <h3 style={{ margin: '0 0 12px 0', fontSize: 15, color: PALETTE.textPrimary }}>
                  Detalhamento por Trabalhador
                </h3>

                {report.workers.length === 0 ? (
                  <div style={{ color: PALETTE.textDisabled, padding: 16 }}>
                    Nenhum plantão encontrado no período selecionado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px 120px',
                      gap: 12,
                      padding: '8px 14px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: PALETTE.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                    }}>
                      <span>Trabalhador</span>
                      <span style={{ textAlign: 'center' }}>Plantões</span>
                      <span style={{ textAlign: 'center' }}>Em Feriados</span>
                    </div>

                    {report.workers.map((w) => {
                      const isInactive = !!((w as any).inactive === true || (w as any).active === false || (w as any).isActive === false)
                      return (
                        <div
                          key={w.workerId}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 120px 120px',
                            gap: 12,
                            alignItems: 'center',
                            padding: '10px 14px',
                            background: PALETTE.cardBg,
                            borderRadius: 8,
                            border: `1px solid ${PALETTE.border}`,
                            borderLeft: w.workerColor
                              ? `4px solid ${w.workerColor}`
                              : `4px solid ${PALETTE.border}`,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: w.workerColor || PALETTE.border,
                                display: 'inline-block',
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: 500, fontSize: 14, color: PALETTE.textPrimary, textDecoration: isInactive ? 'line-through' : undefined }}>
                              {w.workerName}
                            </span>
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16, color: PALETTE.textPrimary }}>
                            {w.total}
                          </div>
                          <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16, color: w.holidays > 0 ? PALETTE.warning : PALETTE.textSecondary }}>
                            {w.holidays}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: PALETTE.textDisabled,
                }}>
                  Período: {new Date(`${report.startDate}T00:00:00Z`).toLocaleDateString('pt-BR')} até{' '}
                  {new Date(`${report.endDate}T00:00:00Z`).toLocaleDateString('pt-BR')} — Dias:{' '}
                  {report.weekdays.map((d) => WEEKDAY_LABELS[d]).join(', ')}
                </div>
              </>
            ) : (
              <div style={{ color: PALETTE.textDisabled }}>
                Gere um relatório usando os filtros à esquerda.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
