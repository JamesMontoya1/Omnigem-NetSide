import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { API_BASE as API } from '../../config/api';
import { authHeaders, jsonAuthHeaders } from '../../config/api';
import { PALETTE, btnPrimary, btnSmall, btnSmallRed, btnSmallBlue, btnNav, btnConfirm, btnCancel, btnDanger, inputStyle, selectStyle, cardStyle, labelStyle } from '../../styles/theme'
import WorkersContent from '../../components/shared/WorkersContent';
import HolidaysContent from '../../components/shared/HolidaysContent';
import AssignmentsContent from '../../components/plantoes/AssignmentsContent';
import { ReportsContent } from './reports';

function startOfMonth(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function endOfMonth(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)); }
function addDays(d: Date, n: number) { const c = new Date(d); c.setUTCDate(c.getUTCDate() + n); return c; }
function toISO(d: Date) { return d.toISOString().slice(0, 10); }

function toUTCMidnightRotation(value: Date | string): Date {
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00Z`);
  }
  return new Date(s);
}

function weekStartUTC(d: Date): Date {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  copy.setUTCDate(copy.getUTCDate() - copy.getUTCDay());
  return copy;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type Worker = { id: number; name: string; active?: boolean };
type Rotation = { id: number; name: string | null; weekdays: number[]; workerIds: number[]; startDate: string; endDate?: string | null; notifyUpcoming?: boolean };
type Holiday = { id: number; name: string | null; recurring: boolean };
type CalendarEntryItem = { workerId: number | null; workerName: string | null; workerColor?: string | null; source: string; rotationId?: number; rotationName?: string; note?: string; notifyUpcoming?: boolean };
type DayData = { entries: CalendarEntryItem[]; holiday?: Holiday };

function findRotationForDate(date: Date, rotations: Rotation[]): Rotation | null {
  const weekday = date.getUTCDay();
  let chosen: Rotation | null = null;

  for (const rot of rotations) {
    if (!rot.weekdays.includes(weekday)) continue;
    const rotStart = new Date(rot.startDate);
    if (date < rotStart) continue;
    if (rot.endDate && date > new Date(rot.endDate)) continue;
    if (!chosen || rotStart > new Date(chosen.startDate)) {
      chosen = rot;
    }
  }

  return chosen;
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
  });
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('plantoes_role') : null;
    setIsAdmin(role === 'ADMIN');
  }, []);
  const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const [selMonth, setSelMonth] = useState<number>(viewDate.getUTCMonth());
  const [selYear, setSelYear] = useState<number>(viewDate.getUTCFullYear());

  useEffect(() => {
    setSelMonth(viewDate.getUTCMonth());
    setSelYear(viewDate.getUTCFullYear());
  }, [viewDate]);
  const [calendar, setCalendar] = useState<Record<string, DayData>>({});
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);

  const [showAllRotations, setShowAllRotations] = useState(false);
  const visibleRotations = showAllRotations
    ? rotations
    : rotations.filter(rot => {
      try {
        const today = toUTCMidnightRotation(new Date());
        if (rot.endDate && toUTCMidnightRotation(rot.endDate) < today) return false;
        return true;
      } catch { return false; }
    });



  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (selectedDay) {
      setModalOpen(false);
      requestAnimationFrame(() => setModalOpen(true));
    } else {
      setModalOpen(false);
    }
  }, [selectedDay]);

  const [editDate, setEditDate] = useState<string | null>(null);
  const [editWorkerIds, setEditWorkerIds] = useState<number[]>([]);
  const [editNote, setEditNote] = useState<string>('');

  const [rotModal, setRotModal] = useState<Rotation | 'new' | null>(null);
  const [rotScheduleFrom, setRotScheduleFrom] = useState<string | null>(null);

  const [holidayModalData, setHolidayModalData] = useState<{ name: string | null; date: string; recurring: boolean } | null>(null);

  const router = useRouter();
  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [showHolidaysModal, setShowHolidaysModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  type Tab = 'panel' | 'reports'
  const [tab, setTab] = useState<Tab>('panel')

  const loadWorkers = useCallback(async () => {
    try { const r = await fetch(`${API}/workers`); setWorkers(await r.json()); } catch { setWorkers([]); }
  }, []);

  const loadRotations = useCallback(async () => {
    try {
      const r = await fetch(`${API}/rotations`);
      const data = await r.json();
      data.sort((a: Rotation, b: Rotation) => {
        const ta = a.startDate ? new Date(a.startDate).getTime() : 0;
        const tb = b.startDate ? new Date(b.startDate).getTime() : 0;
        return tb - ta;
      });
      setRotations(data);
    } catch {
      setRotations([]);
    }
  }, []);

  const loadCalendar = useCallback(async (d: Date) => {
    // Fetch the full visible grid range so days from adjacent months
    // (shown in the calendar matrix) also have their workers/entries.
    const gridStart = weekStartUTC(startOfMonth(d));
    const gridEnd = addDays(gridStart, 6 * 7 - 1); // 6 weeks visible (42 days)
    const s = toISO(gridStart);
    const e = toISO(gridEnd);
    try {
      const r = await fetch(`${API}/rotations/calendar?startDate=${s}&endDate=${e}`);
      setCalendar(await r.json());
    } catch {
      setCalendar({});
    }
  }, []);

  useEffect(() => { loadWorkers(); loadRotations(); }, []);
  useEffect(() => { loadCalendar(viewDate); }, [viewDate, loadCalendar]);

  const upcomingNotifiedThisWeek = useMemo(() => {
    const start = weekStartUTC(new Date());
    const map = new Map<number, { name: string | null; color?: string | null; dates: string[] }>();
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i);
      const iso = toISO(day);
      const dayData = calendar[iso];
      const entries = dayData?.entries ?? [];

      for (const e of entries) {
        if (e.notifyUpcoming && e.workerId != null) {
          const cur = map.get(e.workerId) ?? { name: e.workerName ?? workers.find(w => w.id === e.workerId)?.name ?? null, color: e.workerColor, dates: [] };
          cur.dates.push(iso);
          map.set(e.workerId, cur);
        }
      }

      const rot = findRotationForDate(day, rotations);
      if (rot?.notifyUpcoming) {
        const rotEntry = entries.find(en => en.source === 'ROTATION' && en.workerId != null);
        if (rotEntry) {
          const cur = map.get(rotEntry.workerId!) ?? { name: rotEntry.workerName ?? workers.find(w => w.id === rotEntry.workerId)?.name ?? null, color: rotEntry.workerColor, dates: [] };
          cur.dates.push(iso);
          map.set(rotEntry.workerId!, cur);
        }
      }
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [calendar, rotations, workers]);

  const prevMonth = () => { const c = new Date(viewDate); c.setUTCMonth(c.getUTCMonth() - 1); setViewDate(c); };
  const nextMonth = () => { const c = new Date(viewDate); c.setUTCMonth(c.getUTCMonth() + 1); setViewDate(c); };

  function matrixForMonth(d: Date) {
    const start = startOfMonth(d);
    const currentMonth = d.getUTCMonth();
    const firstWeekday = start.getUTCDay();
    const rows: (Date | null)[][] = [];
    let cur = addDays(start, -firstWeekday);
    for (let r = 0; r < 6; r++) {
      const row: (Date | null)[] = [];
      for (let c = 0; c < 7; c++) { row.push(new Date(cur)); cur = addDays(cur, 1); }
      rows.push(row);
    }
    while (rows.length > 0 && rows[rows.length - 1].every(day => day && day.getUTCMonth() !== currentMonth)) {
      rows.pop();
    }
    return rows;
  }
  const rows = matrixForMonth(viewDate);

  async function saveManualOverride() {
    if (!editDate) return;
    try {
      const res = await fetch(`${API}/assignments?startDate=${editDate}&endDate=${editDate}`);
      const existing = await res.json();
      for (const a of existing) {
        if (a.date?.slice(0, 10) === editDate && a.source === 'MANUAL') {
          await fetch(`${API}/assignments/${a.id}`, { method: 'DELETE', headers: authHeaders() });
        }
      }
    } catch { }
    if (editWorkerIds.length === 0) {
      await fetch(`${API}/assignments`, {
        method: 'POST',
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ date: editDate, workerId: null, note: editNote || undefined }),
      });
    } else {
      for (const wId of editWorkerIds) {
        await fetch(`${API}/assignments`, {
          method: 'POST',
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ date: editDate, workerId: wId, note: editNote || undefined }),
        });
      }
    }
    await loadCalendar(viewDate);
    setEditDate(null);
    setEditNote('');
    setEditWorkerIds([]);
  }

  async function removeOverride(dateStr: string) {
    try {
      const res = await fetch(`${API}/assignments?startDate=${dateStr}&endDate=${dateStr}`);
      const existing = await res.json();
      for (const a of existing) {
        if (a.date?.slice(0, 10) === dateStr && a.source === 'MANUAL') {
          await fetch(`${API}/assignments/${a.id}`, { method: 'DELETE', headers: authHeaders() });
        }
      }
    } catch { }
    await loadCalendar(viewDate);
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: PALETTE.background, color: PALETTE.textPrimary, height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: `1px solid ${PALETTE.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => router.push('/selection')} style={btnNav}>← Voltar</button>
          <h1 style={{ margin: 0, fontSize: 22, marginLeft: 8 }}>Plantões</h1>
          {isAdmin && <button onClick={() => setShowWorkersModal(true)} style={btnNav}>👷 Trabalhadores</button>}
          {isAdmin && <button onClick={() => setShowHolidaysModal(true)} style={btnNav}>🎉 Feriados</button>}
          {isAdmin && <button onClick={() => setShowAssignmentsModal(true)} style={btnNav}>📋 Atribuições</button>}
        </div>
        <div style={{ flex: 1 }} />
        {(['panel', 'reports'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            ...btnNav,
            background: tab === t ? PALETTE.primary : PALETTE.hoverBg,
            color: tab === t ? '#fff' : PALETTE.textPrimary,
            border: tab === t ? 'none' : `1px solid ${PALETTE.border}`,
          }}>
            {t === 'panel' ? 'Painel' : '📊 Relatórios'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0, padding: 16 }}>
        {tab !== 'reports' && (
          <aside style={{ width: 400, backgroundColor: PALETTE.backgroundSecondary, borderRadius: 8, padding: 10, border: `1px solid ${PALETTE.border}`, overflow: 'hidden', flexShrink: 0, order: 2, display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: 16, color: PALETTE.textPrimary }}>Rodízios</strong>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isAdmin && <button onClick={() => setRotModal('new')} style={btnPrimary}>+ Novo</button>}
                <button onClick={() => setShowAllRotations(s => !s)} style={btnSmall}>{showAllRotations ? 'Mostrar apenas sem final' : 'Exibir todos'}</button>
              </div>
            </div>

            {visibleRotations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'auto', paddingBottom: 12 }}>
                {visibleRotations.map(rot => (
                  <div key={rot.id} style={{ border: `1px solid ${PALETTE.border}`, borderRadius: 8, padding: 12, background: PALETTE.cardBg }}>
                    <div style={{ fontWeight: 600, marginBottom: 4, color: PALETTE.textPrimary }}>{rot.name || `Rodízio #${rot.id}`}</div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                      Dias: {rot.weekdays.map(w => WEEKDAY_LABELS[w]).join(', ')}
                    </div>
                    <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>
                      Ordem: {rot.workerIds.map(id => workers.find(w => w.id === id)?.name ?? `#${id}`).join(' → ')}
                    </div>
                    {rot.endDate && (
                      <div style={{ fontSize: 11, color: PALETTE.warning, marginTop: 4 }}>
                        Finalizado em: {new Date(rot.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      {isAdmin && <button onClick={() => setRotModal(rot)} style={btnSmallBlue}>Editar</button>}
                      {isAdmin && <button onClick={async () => { if (confirm('Apagar este rodízio?')) { await fetch(`${API}/rotations/${rot.id}`, { method: 'DELETE', headers: authHeaders() }); await loadRotations(); await loadCalendar(viewDate); } }} style={btnSmallRed}>Apagar</button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: PALETTE.textSecondary }}>Nenhum rodízio ativo</div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px dashed ${PALETTE.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PALETTE.textSecondary }}>Notificações (esta semana)</div>
              {upcomingNotifiedThisWeek.length === 0 ? (
                <div style={{ fontSize: 13, color: PALETTE.textDisabled, marginTop: 8 }}>Nenhuma notificação ativa esta semana</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {upcomingNotifiedThisWeek.map(u => (
                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: PALETTE.cardBg, borderRadius: 8, border: `1px solid ${PALETTE.border}` }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: u.color ?? '#888', flexShrink: 0 }} />
                      <div style={{ fontSize: 13, color: PALETTE.textPrimary, fontWeight: 600 }}>{u.name ?? `#${u.id}`}</div>
                      <div style={{ marginLeft: 'auto', fontSize: 12, color: PALETTE.textSecondary }}>{u.dates.length} dia(s)</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </aside>
        )}

        <div style={{ flex: 1, backgroundColor: PALETTE.backgroundSecondary, borderRadius: 8, padding: 12, border: `1px solid ${PALETTE.border}`, display: tab === 'panel' ? 'flex' : 'none', flexDirection: 'column', minHeight: 0, overflow: 'hidden', order: 1 }}>
          <div style={{ height: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexShrink: 0 }}>
            <button onClick={prevMonth} style={btnNav}>◀ Anterior</button>
            <strong style={{ fontSize: 18, width: '160px', color: PALETTE.textPrimary }}>
              {viewDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            </strong>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={selMonth}
                onChange={e => {
                  const m = Number(e.target.value);
                  setSelMonth(m);
                  setViewDate(new Date(Date.UTC(selYear, m, 1)));
                }}
                style={{ padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 6 }}
              >
                {MONTH_NAMES.map((mn, i) => <option key={i} value={i}>{mn}</option>)}
              </select>

              <select
                value={selYear}
                onChange={e => {
                  const y = Number(e.target.value);
                  setSelYear(y);
                  setViewDate(new Date(Date.UTC(y, selMonth, 1)));
                }}
                style={{ padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 6 }}
              >
                {(() => {
                  const cur = viewDate.getUTCFullYear();
                  const range = 5;
                  const arr = [] as number[];
                  for (let y = cur - range; y <= cur + range; y++) arr.push(y);
                  return arr.map(y => <option key={y} value={y}>{y}</option>);
                })()}
              </select>
            </div>

            <button onClick={nextMonth} style={btnNav}>Próximo ▶</button>
          </div>

          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', height: '90%', borderCollapse: 'separate', borderSpacing: 6, tableLayout: 'fixed', borderRadius: 10, overflow: 'hidden', boxShadow: '0 6px 18px rgba(0,0,0,0.06)', background: PALETTE.background }}>
            <thead>
              <tr>
                {WEEKDAY_LABELS.map((d, i) => (
                  <th
                    key={d}
                    style={{
                      textAlign: 'center',
                      padding: '12px 8px',
                      borderBottom: `1px solid ${PALETTE.border}`,
                      background: i === 0 || i === 6 ? PALETTE.background : PALETTE.backgroundSecondary,
                      fontWeight: 700,
                      fontSize: 13,
                      color: PALETTE.textSecondary,
                      letterSpacing: '0.02em'
                    }}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => {
                    if (!cell) return <td key={ci} style={cellStyle} />;
                    const iso = toISO(cell);
                    const dayData = calendar[iso];
                    const entries = dayData?.entries ?? [];
                    const holiday = dayData?.holiday;
                    const hasManual = entries.some(e => e.source === 'MANUAL');
                    const hasRotation = entries.some(e => e.source === 'ROTATION');
                    const firstEntry = entries[0];
                    const isCurrentMonth = cell.getUTCMonth() === viewDate.getUTCMonth();
                    const isToday = iso === toISO(new Date());

                    const todayDate = new Date();
                    const cellDate = new Date(cell);
                    const diffMs = cellDate.getTime() - todayDate.getTime();
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                    const isHoliday = !!holiday;
                    const rotationForDay = findRotationForDate(cell, rotations);
                    const hasNotifyRotation = !isHoliday && (
                      entries.some(e => e.source === 'ROTATION' && e.notifyUpcoming) ||
                      !!rotationForDay?.notifyUpcoming
                    );
                    const isUpcomingSoon = hasNotifyRotation && diffDays >= 0 && diffDays <= 7 && !isToday;

                    const baseBg = !isCurrentMonth ? PALETTE.notCurrentBg : isToday ? PALETTE.todayBg : PALETTE.cardBg;
                    const borderStyle = isToday
                      ? `2px solid ${PALETTE.primary}`
                      : isUpcomingSoon
                        ? `2px solid ${PALETTE.error}`
                        : isHoliday && isCurrentMonth
                          ? '1px solid #daa520'
                          : `1px solid ${PALETTE.border}`;
                    const opacity = isCurrentMonth ? 1 : 0.4;

                    const hasHighlight = isToday || isHoliday;
                    const headerBg = isHoliday ? PALETTE.warning : 'transparent';

                    return (
                      <td
                        key={ci}
                        style={{
                          ...cellStyle,
                          background: isHoliday && isCurrentMonth
                            ? 'linear-gradient(135deg, #b8860b22 0%, #daa52044 50%, #b8860b22 100%)'
                            : (isUpcomingSoon && isCurrentMonth
                              ? 'linear-gradient(135deg, #ff6a0022 0%, #ff4a0044 50%, #ff6a0022 100%)'
                              : baseBg),
                          border: borderStyle,
                          boxShadow: isHoliday && isCurrentMonth
                            ? '0 0 8px #daa52033, inset 0 0 12px #daa52011'
                            : (isUpcomingSoon && isCurrentMonth ? '0 0 8px #ff000033, inset 0 0 12px #ff000011' : undefined),
                          borderRadius: (isHoliday && isCurrentMonth) || (isUpcomingSoon && isCurrentMonth) ? 8 : 6,
                          outline: undefined,
                          cursor: 'pointer',
                          opacity,
                          transition: 'transform 0.12s ease, box-shadow 0.12s ease, outline 0.12s ease'
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button')) return;
                          if ((e.target as HTMLElement).closest('[data-holiday-star]')) return;
                          setSelectedDay(prev => prev === iso ? null : iso);
                        }}
                      >
                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                            {holiday && isCurrentMonth && (
                              <span
                                data-holiday-star
                                onClick={(e) => { e.stopPropagation(); setHolidayModalData({ name: holiday.name, date: iso, recurring: holiday.recurring }) }}
                                title={holiday.name ?? 'Feriado'}
                                style={{
                                  position: 'absolute', right: 4, top: 3, zIndex: 3,
                                  fontSize: 15, cursor: 'pointer', lineHeight: 1,
                                  filter: 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))',
                                  transition: 'transform 0.2s ease, filter 0.2s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.35) rotate(15deg)'; e.currentTarget.style.filter = 'drop-shadow(0 2px 6px rgba(218,165,32,0.9))' }}
                                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.filter = 'drop-shadow(0 1px 3px rgba(218,165,32,0.6))' }}
                              >⭐</span>
                            )}
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: hasHighlight ? '6px 8px' : undefined, background: isHoliday ? 'transparent' : headerBg, borderTopLeftRadius: hasHighlight ? 6 : undefined, borderTopRightRadius: hasHighlight ? 6 : undefined, color: hasHighlight && !isHoliday ? '#fff' : undefined, flexGrow: hasHighlight ? 1 : 0 }}>
                              <span style={{ display: 'block', fontSize: 25, fontWeight: hasHighlight ? 700 : 600, color: isHoliday && isCurrentMonth ? '#daa520' : (hasHighlight ? '#fff' : (isCurrentMonth ? PALETTE.textPrimary : PALETTE.textDisabled)) }}>
                                {cell.getUTCDate()}
                              </span>
                            </div>
                          {holiday && isCurrentMonth && (
                            <div style={{
                              padding: '1px 4px', margin: '1px 2px 0',
                              borderRadius: 3, textAlign: 'center',
                              background: '#FF6A00',
                              overflow: 'hidden',
                            }}>
                            <div title={holiday.name ?? 'Feriado'} style={{
                              fontWeight: 700,
                              fontSize: 11,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              color: '#fff',
                              paddingBottom: '1px',
                              letterSpacing: '0.03em',
                              textTransform: 'uppercase',
                            }}>{holiday.name ?? 'Feriado'}</div>
                            </div>
                          )}
                          <div style={{ paddingTop: 2, marginTop: 'auto', flexGrow: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', gap: 2 }}>
                            {entries.length === 0 ? null : (() => {
                              const first = entries[0];
                              const extra = entries.length - 1;
                              return (
                                  <div style={{
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    background: first.workerColor
                                      ? `${first.workerColor}22`
                                      : first.source === 'MANUAL' ? `${PALETTE.success}22` : `${PALETTE.info}22`,
                                    borderLeft: first.workerColor ? `3px solid ${first.workerColor}` : undefined,
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                  }}>
                                    <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: PALETTE.textPrimary, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                                      {first.source === 'MANUAL' && (
                                        <span title="Atribuição manual" style={{ color: PALETTE.success, fontSize: 12, flexShrink: 0 }}>●</span>
                                      )}
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{first.workerName ?? first.workerId ?? '—'}</span>
                                      {extra > 0 && (
                                        <span style={{ fontSize: 11, color: PALETTE.primary, fontWeight: 700, marginLeft: '8px', marginRight: 2, flexShrink: 0, textAlign: 'right' }}>+{extra}</span>
                                      )}
                                    </div>
                                  </div>
                              );
                            })()}
                          </div>

                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

          </div>

          {tab === 'reports' && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', gap: 16 }}>
              <div style={{ flex: 1, backgroundColor: PALETTE.backgroundSecondary, borderRadius: 8, padding: 16, border: `1px solid ${PALETTE.border}`, minHeight: 0 }}>
                <ReportsContent onClose={() => setTab('panel')} />
              </div>
            </div>
          )}

        {selectedDay && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end', zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <div
              style={{
                width: 420,
                maxWidth: '95%',
                height: '100%',
                maxHeight: '100vh',
                overflow: 'auto',
                background: PALETTE.cardBg,
                borderRadius: '8px 0 0 8px',
                padding: 20,
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
                boxSizing: 'border-box',
                transform: modalOpen ? 'translateX(0)' : 'translateX(100%)',
                opacity: modalOpen ? 1 : 0,
                transition: 'transform 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms ease',
                display: 'flex',
                flexDirection: 'column',
              }}
              onTransitionEnd={() => {
                if (!modalOpen && !selectedDay) return;
                if (!modalOpen) {
                  setSelectedDay(null);
                }
              }}
            >
              <DayInfoPanel
                date={selectedDay}
                dayData={calendar[selectedDay] ?? null}
                workers={workers}
                rotations={rotations}
                isAdmin={isAdmin}
                onCreateRotation={(d) => { setRotModal('new'); setRotScheduleFrom(d); }}
                onClose={() => setModalOpen(false)}
                onHolidayUpdated={async () => { await loadCalendar(viewDate) }}
                onEditDay={(d, workerIds, note) => {
                  setEditDate(d);
                  setEditWorkerIds(workerIds);
                  setEditNote(note);
                }}
                onEditRotation={(rot, d) => {
                  setRotModal(rot);
                  setRotScheduleFrom(d);
                }}
                onRemoveOverride={async (d) => {
                  await removeOverride(d);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {editDate && (
        <Modal onClose={() => setEditDate(null)}>
          <h3 style={{ marginTop: 0 }}>Editar dia {editDate}</h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Trabalhadores</div>
            {editWorkerIds.length === 0 && <div style={{ fontSize: 12, color: PALETTE.textDisabled, marginBottom: 4 }}>Nenhum trabalhador selecionado</div>}
            {editWorkerIds.map((wId, idx) => {
              const w = workers.find(x => x.id === wId);
              return (
                <div key={wId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 4, background: PALETTE.hoverBg, borderRadius: 6 }}>
                  <span style={{ fontWeight: 500, color: PALETTE.textPrimary }}>{idx + 1}. {w?.name ?? `#${wId}`}</span>
                  <button onClick={() => setEditWorkerIds(ids => ids.filter(id => id !== wId))} style={{ ...btnSmall, color: PALETTE.error, background: `${PALETTE.error}22`, borderColor: PALETTE.error }}>✕</button>
                </div>
              );
            })}
            <select
              style={{ marginTop: 4, padding: 6, width: '100%', backgroundColor: PALETTE.cardBg, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}` }}
              value=""
              onChange={e => { if (e.target.value) setEditWorkerIds(ids => [...ids, Number(e.target.value)]); }}
            >
              <option value="">— adicionar trabalhador —</option>
              {workers.filter(w => w.active && !editWorkerIds.includes(w.id)).map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'block', marginBottom: 12 }}>
            Nota (opcional)
            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              rows={3}
              placeholder="Adicionar uma nota para este dia..."
              style={{ width: '100%', marginTop: 4, padding: 6, backgroundColor: PALETTE.cardBg, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, borderRadius: 4, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </label>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setEditDate(null)} style={btnCancel}>Cancelar</button>
            <button onClick={saveManualOverride} style={btnConfirm}>Salvar</button>
          </div>
        </Modal>
      )}

      {holidayModalData && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) setHolidayModalData(null) }}>
          <div style={{
            width: 380, maxWidth: '90%', background: PALETTE.cardBg, borderRadius: 12, padding: 0,
            boxShadow: '0 12px 48px rgba(0,0,0,0.5)', overflow: 'hidden',
            border: '1px solid #daa52066',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #b8860b 0%, #daa520 50%, #b8860b 100%)',
              padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22 }}>⭐</span>
                <h2 style={{ margin: 0, fontSize: 17, color: '#fff', fontWeight: 700 }}>Feriado</h2>
              </div>
              <button onClick={() => setHolidayModalData(null)} style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6,
                color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: 13, fontWeight: 600,
              }}>✕</button>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{
                padding: '14px 16px', background: '#FF6A00',
                border: '1px solid #ff8c0333', borderRadius: 8,
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{holidayModalData.name ?? 'Feriado'}</div>
                <div style={{ fontSize: 15, color: '#ffffff', marginTop: 6 }}>📅 {new Date(holidayModalData.date + 'T00:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}</div>
                {holidayModalData.recurring && (
                  <div style={{ fontSize: 12, color: '#ffffff', marginTop: 4, fontStyle: 'italic' }}>Recorrente (anual)</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {rotModal !== null && (
        <RotationModal
          rotation={rotModal === 'new' ? null : rotModal}
          workers={workers}
          scheduleFrom={rotScheduleFrom}
          onClose={() => { setRotModal(null); setRotScheduleFrom(null); }}
          onSaved={async () => { await loadRotations(); await loadCalendar(viewDate); setRotModal(null); setRotScheduleFrom(null); }}
        />
      )}

      {showWorkersModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowWorkersModal(false); loadWorkers(); } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Trabalhadores</h2>
              <button onClick={() => { setShowWorkersModal(false); loadWorkers(); }} style={btnSmall}>✕ Fechar</button>
            </div>
            <WorkersContent showTitle={false} />
          </div>
        </div>
      )}

      {showHolidaysModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowHolidaysModal(false); loadCalendar(viewDate); } }}>
          <div style={{ width: 600, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Feriados</h2>
              <button onClick={() => { setShowHolidaysModal(false); loadCalendar(viewDate); }} style={btnSmall}>✕ Fechar</button>
            </div>
            <HolidaysContent compact />
          </div>
        </div>
      )}

      {showAssignmentsModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000aa', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) { setShowAssignmentsModal(false); loadCalendar(viewDate); } }}>
          <div style={{ width: 900, maxWidth: '95%', maxHeight: '90vh', overflow: 'auto', background: PALETTE.cardBg, borderRadius: 10, padding: 24, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: PALETTE.textPrimary }}>Atribuições</h2>
              <button onClick={() => { setShowAssignmentsModal(false); loadCalendar(viewDate); }} style={btnSmall}>✕ Fechar</button>
            </div>
            <AssignmentsContent />
          </div>
        </div>
      )}

    </div>
  );
}

function DayInfoPanel({ date, dayData, workers, rotations, onClose, isAdmin, onCreateRotation, onHolidayUpdated, onEditDay, onEditRotation, onRemoveOverride }: {
  date: string;
  dayData: DayData | null;
  workers: Worker[];
  rotations: Rotation[];
  onClose: () => void;
  isAdmin?: boolean;
  onCreateRotation?: (date: string) => void;
  onHolidayUpdated?: () => void;
  onEditDay?: (date: string, workerIds: number[], note: string) => void;
  onEditRotation?: (rotation: Rotation, date: string) => void;
  onRemoveOverride?: (date: string) => void;
}) {
  const d = new Date(date + 'T00:00:00Z');
  const dayOfWeek = WEEKDAY_LABELS[d.getUTCDay()];
  const formattedDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });

  const entries = dayData?.entries ?? [];
  const holiday = dayData?.holiday;
  const [editingHoliday, setEditingHoliday] = useState(false)
  const [holidayNameEdit, setHolidayNameEdit] = useState('')
  const [holidayRecurringEdit, setHolidayRecurringEdit] = useState(false)

  const [showCreateHoliday, setShowCreateHoliday] = useState(false)
  const [createHolidayName, setCreateHolidayName] = useState('')
  const [createHolidayRecurring, setCreateHolidayRecurring] = useState(false)
  const [createHolidayDate, setCreateHolidayDate] = useState(date)

  React.useEffect(() => {
    setCreateHolidayDate(date)
    setCreateHolidayName('')
    setCreateHolidayRecurring(false)
  }, [date])

  React.useEffect(() => {
    if (holiday) {
      setHolidayNameEdit(holiday.name ?? '')
      setHolidayRecurringEdit(!!holiday.recurring)
    } else {
      setHolidayNameEdit('')
      setHolidayRecurringEdit(false)
    }
    setEditingHoliday(false)
  }, [holiday])
  const notes = Array.from(new Set(entries.map(e => e.note).filter(Boolean)));
  const sources = [...new Set(entries.map(e => e.source))];

  return (
    <aside style={{
      width: '100%',
      minHeight: '100%',
      boxSizing: 'border-box',
      backgroundColor: PALETTE.backgroundSecondary,
      borderRadius: 8,
      padding: 16,
      border: `1px solid ${PALETTE.border}`,
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: PALETTE.textPrimary }}>{dayOfWeek}</div>
          <div style={{ fontSize: 13, color: PALETTE.textSecondary, marginTop: 2 }}>{formattedDate}</div>
                </div>
                <div>
                  <button onClick={onClose} style={{ background: 'none', border: 'none', color: PALETTE.textSecondary, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '0 2px' }}>✕</button>
                </div>
      </div>

      <div style={{ height: 1, background: PALETTE.border }} />

      {holiday && (
        <div style={{ background: `${PALETTE.warning}18`, border: `1px solid ${PALETTE.warning}44`, borderRadius: 6, padding: '8px 10px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.warning, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Feriado</div>
          {!editingHoliday ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 500, background: '#FF6A00', color: '#fff', padding: '6px 8px', borderRadius: 4 }}>{holiday.name ?? 'Feriado'}</div>
              {isAdmin && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setEditingHoliday(true)} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 8px', borderRadius: 6 }}>Editar</button>
                  <button onClick={async () => {
                    if (!holiday) return
                    if (!confirm('Apagar este feriado?')) return
                    try {
                      await fetch(`${API}/holidays/${holiday.id}`, { method: 'DELETE', headers: authHeaders() })
                      onHolidayUpdated && onHolidayUpdated()
                      setEditingHoliday(false)
                    } catch (err) { console.error(err) }
                  }} style={{ ...btnSmallRed, padding: '6px 8px' }}>Apagar</button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (!holiday) return
              try {
                await fetch(`${API}/holidays/${holiday.id}`, { method: 'PUT', headers: jsonAuthHeaders(), body: JSON.stringify({ name: holidayNameEdit || undefined, recurring: holidayRecurringEdit }) })
                setEditingHoliday(false)
                onHolidayUpdated && onHolidayUpdated()
              } catch (err) { console.error(err) }
            }} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={holidayNameEdit} onChange={e => setHolidayNameEdit(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, color: PALETTE.textPrimary }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={holidayRecurringEdit} onChange={e => setHolidayRecurringEdit(e.target.checked)} /> Recorrente
              </label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setEditingHoliday(false); setHolidayNameEdit(holiday.name ?? ''); setHolidayRecurringEdit(!!holiday.recurring) }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#fff', padding: '6px 8px', borderRadius: 6 }}>Cancelar</button>
                <button type="submit" style={{ background: PALETTE.primary, border: 'none', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>Salvar</button>
              </div>
            </form>
          )}
          {holiday.recurring && <div style={{ fontSize: 11, color: PALETTE.textSecondary, marginTop: 2 }}>Recorrente (anual)</div>}
        </div>
      )}

      <div style={{ background: PALETTE.cardBg, borderRadius: 6, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
          {entries.length > 1 ? `Trabalhadores (${entries.length})` : 'Trabalhador'}
        </div>
        {entries.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {entries.map((entry, i) => {
              const w = entry.workerId ? workers.find(x => x.id === entry.workerId) : null;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {entry.workerColor && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.workerColor, flexShrink: 0 }} />
                  )}
                  <span style={{ fontSize: 14, fontWeight: 500, color: PALETTE.textPrimary }}>
                    {entry.source === 'MANUAL' && (
                      <span title="Atribuição manual" style={{ color: PALETTE.success, marginRight: 8, fontSize: 12 }}>●</span>
                    )}
                    {entry.workerName ?? '—'}
                  </span>
                  <span style={{
                    fontSize: 10,
                    padding: '1px 5px',
                    borderRadius: 3,
                    background: entry.source === 'MANUAL' ? `${PALETTE.success}22` : `${PALETTE.info}22`,
                    color: entry.source === 'MANUAL' ? PALETTE.success : PALETTE.info,
                  }}>
                    {entry.source === 'MANUAL' ? 'manual' : 'rodízio'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <span style={{ fontSize: 14, color: PALETTE.textDisabled }}>Nenhum atribuído</span>
        )}
      </div>

      {entries.some(e => e.rotationId) && (
        <div style={{ background: PALETTE.cardBg, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Rodízio</div>
          {entries.filter(e => e.rotationId).map((entry, i) => {
            const rotation = rotations.find(r => r.id === entry.rotationId);
            return (
              <div key={i} style={{ fontSize: 12, color: PALETTE.textSecondary }}>
                <strong style={{ color: PALETTE.textPrimary }}>{rotation?.name || entry.rotationName || `#${entry.rotationId}`}</strong>
              </div>
            );
          })}
        </div>
      )}

      {notes.length > 0 && (
        <div style={{ background: PALETTE.cardBg, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notas</div>
          {notes.map((note, i) => (
            <div key={i} style={{ fontSize: 13, color: PALETTE.textPrimary, lineHeight: 1.4, marginBottom: i < notes.length - 1 ? 4 : 0 }}>{note}</div>
          ))}
        </div>
      )}

      <div style={{ background: PALETTE.cardBg, borderRadius: 6, padding: '10px 12px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: PALETTE.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Detalhes</div>
        <div style={{ fontSize: 12, color: PALETTE.textSecondary, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>Dia da semana: <span style={{ color: PALETTE.textPrimary }}>{dayOfWeek}</span></div>
          <div>Data ISO: <span style={{ color: PALETTE.textPrimary }}>{date}</span></div>
          {entries.length > 0 && <div>Escalados: <span style={{ color: PALETTE.textPrimary }}>{entries.length}</span></div>}
          {d.getUTCDay() === 0 || d.getUTCDay() === 6 ? (
            <div style={{ color: PALETTE.warning, fontWeight: 500 }}>Fim de semana</div>
          ) : null}
        </div>
      </div>
      {isAdmin && (() => {
        const hasManual = entries.some(e => e.source === 'MANUAL');
        const hasRotation = entries.some(e => e.source === 'ROTATION');
        return (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.length > 0 ? (
              hasRotation && !hasManual ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{ ...btnPrimary, flex: 1, fontSize: 13, padding: '7px 12px' }}
                    onClick={() => {
                      const rotEntry = entries.find(e => e.rotationId);
                      const rot = rotEntry ? rotations.find(r => r.id === rotEntry.rotationId) : null;
                      if (rot) onEditRotation?.(rot, date);
                    }}
                  >Editar Rodízio</button>
                  <button
                    style={{ ...btnPrimary, fontSize: 13, padding: '7px 12px' }}
                    title="Sobrescrever"
                    onClick={() => {
                      onEditDay?.(date, entries.map(e => e.workerId).filter((id): id is number => id != null), entries[0]?.note ?? '');
                    }}
                  >✎ Sobrescrever</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    style={{ ...btnPrimary, flex: 1, fontSize: 13, padding: '7px 12px' }}
                    onClick={() => {
                      onEditDay?.(date, entries.map(e => e.workerId).filter((id): id is number => id != null), entries[0]?.note ?? '');
                    }}
                  >Editar Dia</button>
                  {hasManual && (
                    <button
                      style={{ background: PALETTE.error, color: '#fff', border: 'none', padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}
                      onClick={() => onRemoveOverride?.(date)}
                    >✕ Remover</button>
                  )}
                </div>
              )
            ) : (
              <button
                style={{ ...btnPrimary, width: '100%', fontSize: 13, padding: '7px 12px' }}
                onClick={() => onEditDay?.(date, [], '')}
              >Atribuir</button>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreateHoliday(true)} style={{ ...btnPrimary, flex: 1, background: '#FF6A00', border: 'none', fontSize: 13, padding: '7px 12px' }}>+ Feriado</button>
              <button onClick={() => onCreateRotation?.(date)} style={{ ...btnPrimary, flex: 1, fontSize: 13, padding: '7px 12px' }}>+ Rodízio</button>
            </div>
          </div>
        );
      })()}

      {showCreateHoliday && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={e => { if (e.target === e.currentTarget) setShowCreateHoliday(false) }}>
          <div style={{ width: 420, maxWidth: '95%', background: PALETTE.cardBg, borderRadius: 8, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Novo Feriado</h3>
              <button onClick={() => setShowCreateHoliday(false)} style={{ ...btnSmall, background: 'transparent' }}>✕</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault()
              try {
                await fetch(`${API}/holidays`, { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify({ date: createHolidayDate, name: createHolidayName || undefined, recurring: createHolidayRecurring }) })
                setShowCreateHoliday(false)
                onHolidayUpdated && onHolidayUpdated()
              } catch (err) { console.error(err) }
            }} style={{ display: 'grid', gap: 8 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: PALETTE.textSecondary, marginBottom: 6 }}>Data</label>
                <input type="date" value={createHolidayDate} onChange={e => setCreateHolidayDate(e.target.value)} required style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, color: PALETTE.textPrimary }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: PALETTE.textSecondary, marginBottom: 6 }}>Nome (opcional)</label>
                <input value={createHolidayName} onChange={e => setCreateHolidayName(e.target.value)} placeholder="Ex: Natal" style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${PALETTE.border}`, background: PALETTE.cardBg, color: PALETTE.textPrimary }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={createHolidayRecurring} onChange={e => setCreateHolidayRecurring(e.target.checked)} /> Recorrente
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                <button type="button" onClick={() => setShowCreateHoliday(false)} style={btnSmall}>Cancelar</button>
                <button type="submit" style={btnPrimary}>Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}


function Modal({ children, onClose, width }: { children: React.ReactNode; onClose: () => void; width?: number | string }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: PALETTE.cardBg, padding: 20, borderRadius: 10, width: width ?? 440, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', color: PALETTE.textPrimary }}>
        {children}
      </div>
    </div>
  );
}

function RotationModal({ rotation, workers, onClose, onSaved, scheduleFrom }: {
  rotation: Rotation | null;
  workers: Worker[];
  onClose: () => void;
  onSaved: () => void;
  scheduleFrom?: string | null;
}) {
  const todayISO = new Date().toISOString().slice(0, 10);
  const rotationStarted = !!(rotation && rotation.startDate && rotation.startDate.slice(0, 10) < todayISO);

  const [name, setName] = useState(rotation?.name ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(rotation?.weekdays ?? []);
  const [workerIds, setWorkerIds] = useState<number[]>(rotation?.workerIds ?? []);
  const [startDate, setStartDate] = useState(rotation?.startDate?.slice(0, 10) ?? scheduleFrom ?? todayISO);
  const [endDate, setEndDate] = useState<string | null>(rotation?.endDate ? rotation.endDate.slice(0, 10) : null);
  const [notifyUpcoming, setNotifyUpcoming] = useState(rotation?.notifyUpcoming ?? false);
  const [saving, setSaving] = useState(false);
  const [scheduleChange, setScheduleChange] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(scheduleFrom ?? '');

  const toggleWeekday = (d: number) =>
    setWeekdays(w => w.includes(d) ? w.filter(x => x !== d) : [...w, d].sort());

  const addWorker = (id: number) => { if (!workerIds.includes(id)) setWorkerIds([...workerIds, id]); };
  const removeWorker = (idx: number) => setWorkerIds(w => w.filter((_, i) => i !== idx));
  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    setWorkerIds(w => { const c = [...w]; [c[idx - 1], c[idx]] = [c[idx], c[idx - 1]]; return c; });
  };
  const moveDown = (idx: number) => {
    if (idx >= workerIds.length - 1) return;
    setWorkerIds(w => { const c = [...w]; [c[idx + 1], c[idx]] = [c[idx], c[idx + 1]]; return c; });
  };

  useEffect(() => {
    setScheduleDate(scheduleFrom ?? '');
  }, [scheduleFrom]);

  const save = async () => {
    if (weekdays.length === 0) return alert('Selecione ao menos um dia da semana.');
    if (workerIds.length < 1) return alert('Selecione ao menos 1 trabalhador para o rodízio.');
    if (!startDate) return alert('Data de início é obrigatória.');
    setSaving(true);
    const body = { name: name || null, weekdays, workerIds, startDate, notifyUpcoming };
    try {
      if (rotation) {
        if (scheduleChange && scheduleDate) {
          if (scheduleDate < todayISO) {
            alert('A data da mudança não pode ser anterior a hoje.');
            setSaving(false);
            return;
          }

          let effectiveWorkerIds = workerIds;
          try {
            if (rotation.startDate && workerIds.length > 0) {
              const startOld = toUTCMidnightRotation(rotation.startDate);
              const date = new Date(scheduleDate + 'T00:00:00Z');
              const dateWeekStart = weekStartUTC(date);
              const startWeekStart = weekStartUTC(startOld);
              const msPerWeek = 7 * 24 * 60 * 60 * 1000;
              const weeksSince = Math.round(
                (dateWeekStart.getTime() - startWeekStart.getTime()) / msPerWeek,
              );
              const n = workerIds.length;
              const k = ((weeksSince % n) + n) % n;
              effectiveWorkerIds = [
                ...workerIds.slice(k),
                ...workerIds.slice(0, k),
              ];
            }
          } catch {}

          const newBody = {
            name: name || rotation.name || null,
            weekdays,
            workerIds: effectiveWorkerIds,
            startDate: scheduleDate,
            notifyUpcoming,
          };

          let existingId: number | null = null;
          try {
            const allRes = await fetch(`${API}/rotations`);
            const allRots: Rotation[] = await allRes.json();
            const dup = allRots.find(
              r => r.id !== rotation.id &&
                   r.startDate?.slice(0, 10) === scheduleDate &&
                   JSON.stringify(r.weekdays) === JSON.stringify(weekdays)
            );
            if (dup) existingId = dup.id;
          } catch { }

          if (existingId) {
            await fetch(`${API}/rotations/${existingId}`, {
              method: 'PUT',
              headers: jsonAuthHeaders(),
              body: JSON.stringify(newBody),
            });
          } else {
            await fetch(`${API}/rotations`, {
              method: 'POST',
              headers: jsonAuthHeaders(),
              body: JSON.stringify(newBody),
            });
          }

          try {
            const baseName = rotation.name || name || `Rodízio #${rotation.id}`;
            const hasSuffix = baseName.toLowerCase().includes('-finalizado');
            const finalName = hasSuffix ? baseName : `${baseName} -finalizado`;
            const endDateObj = new Date(scheduleDate + 'T00:00:00Z');
            endDateObj.setUTCDate(endDateObj.getUTCDate() - 1);
            const endDateISO = endDateObj.toISOString().slice(0, 10);
            await fetch(`${API}/rotations/${rotation.id}`, {
              method: 'PUT',
              headers: jsonAuthHeaders(),
              body: JSON.stringify({ name: finalName, endDate: endDateISO }),
            });
          } catch {}
          } else {
          const bodyWithEnd = { ...body, endDate: endDate === null ? null : endDate };
          await fetch(`${API}/rotations/${rotation.id}`, {
            method: 'PUT',
            headers: jsonAuthHeaders(),
            body: JSON.stringify(bodyWithEnd),
          });
        }
      } else {
        const bodyWithEnd = { ...body, endDate: endDate === null ? null : endDate };
        await fetch(`${API}/rotations`, {
          method: 'POST',
          headers: jsonAuthHeaders(),
          body: JSON.stringify(bodyWithEnd),
        });
      }
      onSaved();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar rodízio.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} width={760}>
      <h3 style={{ marginTop: 0 }}>{rotation ? 'Editar Rodízio' : 'Novo Rodízio'}</h3>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Nome (opcional)
        <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', marginTop: 4, padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}` }} placeholder="Ex: Plantão fim de semana" />
      </label>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Dias da semana</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  type="button"
                  style={{
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: weekdays.includes(i) ? `2px solid ${PALETTE.primary}` : `1px solid ${PALETTE.border}`,
                    background: weekdays.includes(i) ? PALETTE.hoverBg : PALETTE.backgroundSecondary,
                    fontWeight: weekdays.includes(i) ? 700 : 400,
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Data de início</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%', padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}` }} />
            </div>
            <div style={{ width: 220 }}>
              <label style={{ display: 'block', marginBottom: 6 }}>Data de finalização (opcional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="date"
                  value={endDate ?? ''}
                  onChange={e => setEndDate(e.target.value ? e.target.value : null)}
                  style={{ flex: 1, padding: 6, backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}` }}
                />
                <button type="button" onClick={() => setEndDate(null)} style={{ ...btnSmall, alignSelf: 'center' }}>Limpar</button>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 12, background: PALETTE.hoverBg, padding: '10px 12px', borderRadius: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyUpcoming}
                onChange={e => setNotifyUpcoming(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: PALETTE.error, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: PALETTE.textPrimary }}>Notificação visual</div>
                <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 2 }}>
                  Destaca em vermelho os dias do rodízio quando faltam 7 dias ou menos
                </div>
              </div>
            </label>
          </div>

          {rotation && (
            <div style={{ marginBottom: 12, marginTop: 4 }}>
              {rotationStarted && (
                <div style={{ fontSize: 12, color: PALETTE.warning, background: '#3B2A12', padding: '6px 10px', borderRadius: 6, marginBottom: 8 }}>
                  Este rodízio já está em vigor. Alterações serão agendadas a partir de uma data futura.
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={scheduleChange}
                  onChange={e => setScheduleChange(e.target.checked)}
                />
                <span>Agendar mudança de ordem a partir de uma data</span>
              </label>
              {scheduleChange && (
                <div style={{ marginTop: 8 }}>
                  <input
                    type="date"
                    value={scheduleDate}
                    min={todayISO}
                    onChange={e => setScheduleDate(e.target.value)}
                    style={{ backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}`, padding: 6 }}
                  />
                  <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginTop: 8 }}>
                    Antes dessa data, o rodízio continua com a ordem atual.
                    A partir dela, passa a usar a nova ordem definida acima.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ width: 340, minWidth: 220 }}>
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>Ordem dos trabalhadores</div>
          <div style={{ fontSize: 12, color: PALETTE.textSecondary, marginBottom: 8 }}>
            O primeiro da lista será responsável na primeira semana a partir da data de início, o segundo na semana seguinte, e assim por diante.
          </div>
          <div style={{ maxHeight: 320, overflow: 'auto', paddingRight: 6 }}>
            {workerIds.length === 0 && <div style={{ fontSize: 12, color: PALETTE.textDisabled }}>Nenhum trabalhador selecionado</div>}
            {workerIds.map((wId, idx) => {
              const w = workers.find(x => x.id === wId);
              return (
                <div key={`${wId}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', marginBottom: 6, background: PALETTE.hoverBg, borderRadius: 6 }}>
                  <span style={{ fontWeight: 500, color: PALETTE.textPrimary }}>{idx + 1}. {w?.name ?? `#${wId}`}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button disabled={idx === 0} onClick={() => moveUp(idx)} style={btnSmall}>↑</button>
                    <button disabled={idx === workerIds.length - 1} onClick={() => moveDown(idx)} style={btnSmall}>↓</button>
                    <button onClick={() => removeWorker(idx)} style={{ ...btnSmall, color: PALETTE.error, background: `${PALETTE.error}22`, borderColor: PALETTE.error }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
          <select
            style={{ marginTop: 8, padding: 8, width: '100%', backgroundColor: PALETTE.backgroundSecondary, color: PALETTE.textPrimary, border: `1px solid ${PALETTE.border}` }}
            value=""
            onChange={e => { if (e.target.value) addWorker(Number(e.target.value)); }}
          >
            <option value="">— adicionar trabalhador —</option>
            {workers.filter(w => w.active && !workerIds.includes(w.id)).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          {rotation && (
            <button
              onClick={async () => {
                if (!confirm('Apagar este rodízio?')) return;
                setSaving(true);
                try {
                  await fetch(`${API}/rotations/${rotation.id}`, { method: 'DELETE', headers: authHeaders() });
                  onSaved();
                } catch (e) {
                  console.error(e);
                  alert('Erro ao apagar rodízio.');
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              style={btnDanger}
            >
              {saving ? 'Apagando...' : 'Apagar'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={btnCancel}>Cancelar</button>
          <button onClick={save} disabled={saving} style={btnConfirm}>
            {saving ? (rotation ? 'Salvando...' : 'Salvando...') : rotation ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const cellStyle: React.CSSProperties = {
  verticalAlign: 'top',
  border: `1px solid ${PALETTE.border}`,
  padding: 8,
  overflow: 'hidden',
  height: 112,
  transition: 'background 0.12s ease, transform 0.12s ease, box-shadow 0.12s ease'
};

