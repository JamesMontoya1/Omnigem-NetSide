import React, { useEffect, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:3001';

function startOfMonth(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)); }
function endOfMonth(d: Date) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth()+1, 0)); }
function addDays(d: Date, n: number){ const c = new Date(d); c.setUTCDate(c.getUTCDate()+n); return c; }
function addWeeks(d: Date, w: number){ return addDays(d, w*7); }
function toISODate(d: Date){ return d.toISOString().slice(0,10); }

export default function CalendarPage(){
  const [viewDate, setViewDate] = useState(new Date());
  const [assignments, setAssignments] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [displayed, setDisplayed] = useState<Record<string, any>>({});

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<number | ''>('');
  const [applyFuture, setApplyFuture] = useState(false);
  const [horizonWeeks, setHorizonWeeks] = useState(12);
  const [scheduleChange, setScheduleChange] = useState(false);
  const [rotationGroup, setRotationGroup] = useState<any[] | null>(null);
  const [rotationOrder, setRotationOrder] = useState<Array<{id?:number; workerId:number}>>([]);

  useEffect(()=>{}, []);

  useEffect(()=>{}, [patterns]);

  useEffect(()=>{ loadDataForMonth(viewDate); loadWorkers(); loadPatterns(); loadHolidays(); }, [viewDate]);

  async function loadWorkers(){
    try{ const res = await fetch(`${API_BASE}/workers`, { cache: 'no-store' }); const data = await res.json(); setWorkers(data||[]); }catch(e){ setWorkers([]); }
  }
  async function loadPatterns(){ try{ const res = await fetch(`${API_BASE}/recurring-patterns`, { cache: 'no-store' }); const data = await res.json(); setPatterns(data||[]); }catch(e){ setPatterns([]); } }

  async function loadHolidays(){ try{ const res = await fetch(`${API_BASE}/holidays`, { cache: 'no-store' }); const data = await res.json(); setHolidays(data||[]); }catch(e){ setHolidays([]); } }

  async function loadDataForMonth(d: Date){
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    try{
      const res = await fetch(`${API_BASE}/assignments?startDate=${toISODate(start)}&endDate=${toISODate(end)}`, { cache: 'no-store' });
      const data = await res.json(); setAssignments(data||[]);
    }catch(e){ setAssignments([]); }
  }

  // compute displayed map merging real assignments and generated occurrences from patterns
  useEffect(()=>{
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const map: Record<string, any> = {};

    (assignments || []).forEach((a:any) => { if(a && a.date) map[a.date.slice(0,10)] = a; });

    const isHolidayDate = (d: Date) => {
      return (holidays || []).some((h:any) => {
        const hd = new Date(h.date);
        if (h.recurring) return hd.getUTCDate() === d.getUTCDate() && hd.getUTCMonth() === d.getUTCMonth();
        return hd.toISOString().slice(0,10) === d.toISOString().slice(0,10);
      });
    };

    (patterns || []).forEach((p:any) => {
      const pStart = p.startDate ? new Date(p.startDate) : start;
      const pEnd = p.endDate ? new Date(p.endDate) : end;
      const genStart = pStart > start ? pStart : start;
      const genEnd = pEnd < end ? pEnd : end;
      if (genStart > genEnd) return;
      for (let d = new Date(genStart); d <= genEnd; d.setUTCDate(d.getUTCDate()+1)){
        const weekday = d.getUTCDay();
        if (!(p.weekdays || []).includes(weekday)) continue;
        const interval = p.weekInterval || 1;
        if (interval > 1) {
          const startAnchor = p.startDate ? new Date(p.startDate) : genStart;
          const toUTCDate = (dt: Date) => Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate());
          const startWeekStart = new Date(startAnchor);
          startWeekStart.setUTCDate(startWeekStart.getUTCDate() - startWeekStart.getUTCDay());
          startWeekStart.setUTCHours(0,0,0,0);
          const currentWeekStart = new Date(d);
          currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - currentWeekStart.getUTCDay());
          currentWeekStart.setUTCHours(0,0,0,0);
          const weeksSince = Math.floor((toUTCDate(currentWeekStart) - toUTCDate(startWeekStart)) / (7*24*60*60*1000));
          const offset = (p.weekOffset || 0);
          if (((weeksSince % interval) + interval) % interval !== (offset % interval)) continue;
        }
        if (isHolidayDate(new Date(d))) continue;
        const key = toISODate(new Date(d));
        if (map[key]) continue;
        map[key] = { id: null, date: key, workerId: p.workerId, source: 'RECURRENT', note: p.note };
      }
    });

    setDisplayed(map);
  }, [assignments, patterns, holidays, viewDate]);

  function prevMonth(){ const c = new Date(viewDate); c.setUTCMonth(c.getUTCMonth()-1); setViewDate(c); }
  function nextMonth(){ const c = new Date(viewDate); c.setUTCMonth(c.getUTCMonth()+1); setViewDate(c); }

  function matrixForMonth(d: Date){
    const start = startOfMonth(d);
    const firstWeekday = start.getUTCDay();
    const daysInMonth = endOfMonth(d).getUTCDate();
    const rows: (Date|null)[][] = [];
    let cur = addDays(start, -firstWeekday);
    for(let r=0;r<6;r++){
      const row: (Date|null)[] = [];
      for(let c=0;c<7;c++){ row.push(new Date(cur)); cur = addDays(cur,1); }
      rows.push(row);
    }
    return rows;
  }

  function assignmentForDate(d: Date){
    const iso = toISODate(d);
    if(displayed[iso]) return displayed[iso];
    return assignments.find(a => a.date && a.date.slice(0,10) === iso);
  }

  function openEdit(d: Date){
    
    const a = assignmentForDate(d);
    setEditingDate(toISODate(d));
    setSelectedWorker(a?.workerId ?? '');
    setApplyFuture(false);
    // detect rotation group for this date and weekday
    const weekday = d.getUTCDay();
    try{
      const group = (patterns || []).filter((p:any) => (p.weekdays||[]).includes(weekday) && (!p.startDate || new Date(p.startDate) <= d) && (!p.endDate || new Date(p.endDate) >= d) && (p.weekInterval && p.weekInterval > 1));
      
      if(group.length >= 2){
        const sorted = [...group].sort((x:any,y:any)=> (x.weekOffset||0) - (y.weekOffset||0));
        setRotationGroup(sorted);
          setRotationOrder(sorted.map(s => ({ id: s.id, workerId: s.workerId })));
          // diagnostic log: show rotation members in sorted order for debugging
          try{
          }catch(e){}
      } else {
        setRotationGroup(null);
        setRotationOrder([]);
      }
    }catch(e){ setRotationGroup(null); setRotationOrder([]); }
  }

  async function saveEdit(){
    if(!editingDate) return;
    // validation: prevent scheduling a rotation change without defining rotation order
    if(scheduleChange && (!rotationOrder || rotationOrder.length === 0)){
      alert('Defina a ordem de rotação antes de marcar "Schedule change".');
      return;
    }
    const dateStr = editingDate;
    const old = assignments.find(a => a.date && a.date.slice(0,10) === dateStr);
    const oldWorker = old?.workerId ?? null;
    const newWorker = selectedWorker === '' ? null : Number(selectedWorker);

    // 1) delete existing assignment for that date if present
    if(old){ try{ await fetch(`${API_BASE}/assignments/${old.id}`, { method: 'DELETE' }); }catch(e){} }

    // 2) create manual assignment if newWorker not null
    if(newWorker !== null){ await fetch(`${API_BASE}/assignments`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ date: dateStr, workerId: newWorker }) }); }

    // 3) if applyFuture, propagate change across future weeks
    if(applyFuture){
      const start = new Date(dateStr + 'T00:00:00Z');
      const end = addWeeks(start, horizonWeeks);
      const weekday = start.getUTCDay();

      // a) remove recurring assignments in future for that weekday
      try{
        const res = await fetch(`${API_BASE}/assignments?startDate=${toISODate(start)}&endDate=${toISODate(end)}`);
        const future = await res.json();
        for(const f of future){
          const fd = new Date(f.date);
          if(fd.getUTCDay() === weekday && f.source === 'RECURRENT'){
            try{ await fetch(`${API_BASE}/assignments/${f.id}`, { method: 'DELETE' }); }catch(e){}
          }
        }
      }catch(e){}

      // b) adjust recurring patterns: remove weekday from old worker patterns, add to new worker pattern
      try{
        const res = await fetch(`${API_BASE}/recurring-patterns`);
        const pats = await res.json();
        if(scheduleChange){
            const sched = dateStr; // schedule from the selected date
            const dayBefore = (dstr:string)=>{ const d=new Date(dstr+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); };
            const schedDate = new Date(sched+'T00:00:00Z');

            

            // fallback to single-weekday scheduled swap (existing behavior)
            const pats = await (await fetch(`${API_BASE}/recurring-patterns`)).json();
          // immediate change (existing behavior)
          // remove weekday from patterns of oldWorker
          for(const p of pats){
            const pStart = p.startDate ? new Date(p.startDate) : null;
            const pEnd = p.endDate ? new Date(p.endDate) : null;
            const applies = (!pStart || pStart <= start) && (!pEnd || pEnd >= start);
            if(p.workerId === oldWorker && applies && (p.weekdays || []).includes(weekday)){
              const newWeek = (p.weekdays||[]).filter((x:number)=>x!==weekday);
              if(newWeek.length) await fetch(`${API_BASE}/recurring-patterns/${p.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ weekdays: newWeek }) });
              else await fetch(`${API_BASE}/recurring-patterns/${p.id}`, { method: 'DELETE' });
            }
          }

          // add weekday to a pattern for newWorker or create one
          if(newWorker !== null){
            let target = pats.find((p:any)=>p.workerId===newWorker && ((!p.startDate)|| new Date(p.startDate) <= start) && ((!p.endDate)|| new Date(p.endDate) >= start));
            if(target){
              if(!(target.weekdays||[]).includes(weekday)){
                const merged = Array.from(new Set([...(target.weekdays||[]), weekday])).sort();
                await fetch(`${API_BASE}/recurring-patterns/${target.id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ weekdays: merged }) });
              }
            } else {
              await fetch(`${API_BASE}/recurring-patterns`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ workerId: newWorker, weekdays: [weekday] }) });
            }
          }

          // c) regenerate assignments for the range
          await fetch(`${API_BASE}/assignments/generate`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startDate: toISODate(start), endDate: toISODate(end) }) });
        }
      }catch(e){ console.error('propagate failed', e); }
    }

    // refresh
    // if user requested a scheduled rotation change (independent of applyFuture), apply it here
    if(scheduleChange && rotationOrder && rotationOrder.length >= 2){
      const sched = dateStr;
      const dayBefore = (dstr:string)=>{ const d=new Date(dstr+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()-1); return d.toISOString().slice(0,10); };
      const schedDate = new Date(sched+'T00:00:00Z');
      const weekday = schedDate.getUTCDay();
      const originalGroup = rotationGroup || [];
      const weekdays = originalGroup.length ? (originalGroup[0].weekdays || [weekday]) : [weekday];
      const interval = originalGroup.length ? (originalGroup[0].weekInterval || originalGroup.length) : rotationOrder.length;
      const originalIds = originalGroup.map((r:any) => r.id).filter((id:any) => id != null);
      

      for(const id of originalIds){
        try{ const resPut = await fetch(`${API_BASE}/recurring-patterns/${id}`, { method: 'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ endDate: dayBefore(sched) }) }); if(!resPut.ok){ const txt = await resPut.text(); console.error('PUT recurring-patterns failed', id, resPut.status, txt); } }catch(e){ console.error('PUT recurring-patterns exception', id, e); }
      }

      const n = rotationOrder.length;
      // create new patterns so rotationOrder[0] applies on the week containing schedDate
      for(let i=0;i<n;i++){
        const r = rotationOrder[i];
        const body = { workerId: r.workerId, weekdays: weekdays, weekInterval: interval, weekOffset: i, startDate: sched };
        try{
          const resPost = await fetch(`${API_BASE}/recurring-patterns`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
          if(!resPost.ok){ const txt = await resPost.text(); console.error('POST recurring-patterns failed', body, resPost.status, txt); }
        }catch(e){ console.error('POST recurring-patterns exception', body, e); }
      }

      const regenEnd = addWeeks(schedDate, horizonWeeks);
      try{
        const resA = await fetch(`${API_BASE}/assignments?startDate=${toISODate(schedDate)}&endDate=${toISODate(regenEnd)}`);
        if(resA.ok){
          const futureAssigns = await resA.json();
          for(const f of futureAssigns){
            const fd = new Date(f.date);
            if((weekdays || []).includes(fd.getUTCDay()) && f.source === 'RECURRENT'){
              try{ const resDel = await fetch(`${API_BASE}/assignments/${f.id}`, { method: 'DELETE' }); if(!resDel.ok){ const txt = await resDel.text(); console.error('DELETE assignment failed', f.id, resDel.status, txt); } }catch(e){ console.error('DELETE assignment exception', f.id, e); }
            }
          }
        } else { const txt = await resA.text(); console.error('GET assignments for regen failed', resA.status, txt); }
      }catch(e){ console.error('GET assignments for regen exception', e); }

      try{ const resGen = await fetch(`${API_BASE}/assignments/generate`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ startDate: toISODate(schedDate), endDate: toISODate(regenEnd) }) }); if(!resGen.ok){ const txt = await resGen.text(); console.error('POST assignments/generate failed', resGen.status, txt); } }catch(e){ console.error('POST assignments/generate exception', e); }

      await loadDataForMonth(new Date(dateStr+'T00:00:00Z'));
      await loadPatterns();
      await loadHolidays();
      setEditingDate(null);
      return;
    }

    await loadDataForMonth(new Date(dateStr+'T00:00:00Z'));
    await loadPatterns();
    await loadHolidays();
    setEditingDate(null);
  }

  const rows = matrixForMonth(viewDate);

  return (
    <div style={{ padding:24 }}>
      <h1>Calendar</h1>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <button onClick={prevMonth}>Prev</button>
        <strong>{viewDate.toLocaleString(undefined,{month:'long',year:'numeric'})}</strong>
        <button onClick={nextMonth}>Next</button>
      </div>

      <table style={{ width:'100%', borderCollapse:'collapse', marginTop:12 }}>
        <thead>
          <tr>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <th key={d} style={{textAlign:'left'}}>{d}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row,ri)=> (
            <tr key={ri}>
              {row.map((cell,ci)=> (
                <td key={ci} style={{ verticalAlign:'top', border:'1px solid #eee', height:100, padding:6 }}>
                  {cell && (
                    <div>
                      <div style={{ fontSize:12, color: cell.getUTCMonth()===viewDate.getUTCMonth() ? undefined:'#999' }}>{cell.getUTCDate()}</div>
                      <div style={{ marginTop:6 }}>
                        {(() => { const a = assignmentForDate(cell); if(a) return <div style={{ background:'#eef', padding:4, borderRadius:4 }}>{workers.find(w=>w.id===a.workerId)?.name ?? a.workerId}</div>; return null })()}
                      </div>
                      <div style={{ marginTop:6 }}><button onClick={()=>openEdit(cell)}>Edit</button></div>
                    </div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {editingDate && (
        <div style={{ position:'fixed', left:0,top:0,right:0,bottom:0, background:'rgba(0,0,0,0.3)', display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:'#fff', padding:16, width:360, borderRadius:6 }}>
            <h3>Edit {editingDate}</h3>
            <label>Worker
              <select value={selectedWorker as any} onChange={e=>setSelectedWorker(e.target.value?Number(e.target.value):'')}>
                <option value="">-- none --</option>
                {workers.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <div style={{ marginTop:8 }}>
              <label style={{display:'flex',gap:8,alignItems:'center'}}>
                <input type="checkbox" checked={applyFuture} onChange={e=>setApplyFuture(e.target.checked)} />
                <span>Apply to future weeks</span>
              </label>
              {applyFuture && (
                <div style={{ marginTop:8 }}>
                  <label>Weeks horizon <input type="number" value={horizonWeeks} onChange={e=>setHorizonWeeks(Number(e.target.value)||0)} style={{ width:80, marginLeft:8 }} /></label>
                </div>
              )}

              <div style={{ marginTop:8 }}>
                <label style={{display:'flex',gap:8,alignItems:'center'}}>
                  <input type="checkbox" checked={scheduleChange} onChange={e=>setScheduleChange(e.target.checked)} />
                  <span>Schedule change from selected date</span>
                </label>
                {scheduleChange && rotationOrder && rotationOrder.length>0 && (
                  <div style={{ marginTop:8, border:'1px solid #eee', padding:8 }}>
                    <div style={{ fontSize:12, marginBottom:6 }}>Rotation order (top = will apply on selected date)</div>
                    {rotationOrder.map((r, idx)=> (
                      <div key={r.workerId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                        <div>{idx+1}. {workers.find(w=>w.id===r.workerId)?.name ?? r.workerId} ({r.workerId})</div>
                        <div style={{ display:'flex', gap:6 }}>
                          <button disabled={idx===0} onClick={()=>{ setRotationOrder(o=>{ const c=[...o]; const t=c[idx-1]; c[idx-1]=c[idx]; c[idx]=t; return c; }); }}>↑</button>
                          <button disabled={idx===rotationOrder.length-1} onClick={()=>{ setRotationOrder(o=>{ const c=[...o]; const t=c[idx+1]; c[idx+1]=c[idx]; c[idx]=t; return c; }); }}>↓</button>
                          <button onClick={()=>{ setRotationOrder(o=>o.filter((_,i)=>i!==idx)); }}>Remove</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <select onChange={e=>{ if(e.target.value){ setRotationOrder(o=>[...o, { workerId: Number(e.target.value) }]); e.target.value=''; } }}>
                        <option value="">-- add worker --</option>
                        {workers.filter(w=>!rotationOrder.some(r=>r.workerId===w.id)).map(w=> <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                      </select>
                      <div style={{ fontSize:12, color:'#666' }}>Add to end of rotation</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ marginTop:12, display:'flex', gap:8 }}>
              <button onClick={saveEdit} disabled={scheduleChange && (!rotationOrder || rotationOrder.length===0)}>Save</button>
              <button onClick={()=>setEditingDate(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
