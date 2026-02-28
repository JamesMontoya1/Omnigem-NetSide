import React, { useEffect, useState } from 'react';

export default function RecurringPatternForm({ initial, initialRotation, onSave, onCancel }: { initial?: any; initialRotation?: any[]; onSave: (p:any)=>void; onCancel: ()=>void }) {
  const [workerId, setWorkerId] = useState<number | ''>(initial?.workerId ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [startDate, setStartDate] = useState<string>(initial?.startDate ? initial.startDate.slice(0,10) : '');
  const [endDate, setEndDate] = useState<string>(initial?.endDate ? initial.endDate.slice(0,10) : '');
  const [limitRange, setLimitRange] = useState<boolean>(!!(initial?.startDate || initial?.endDate));
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const [weekInterval, setWeekInterval] = useState<number>(initial?.weekInterval ?? 1);
  const [isRotation, setIsRotation] = useState<boolean>(false);
  const [rotationMembers, setRotationMembers] = useState<number[]>([]);
  const [rotationIds, setRotationIds] = useState<(number|undefined)[]>([]);
  const [scheduleChange, setScheduleChange] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [workers, setWorkers] = useState<Array<{id:number;name:string}>>([]);
  const API_BASE = (process.env.NEXT_PUBLIC_API_BASE as string) || 'http://localhost:3001';

  useEffect(()=>{
    let mounted = true;
    async function load(){
      try{
        const res = await fetch(`${API_BASE}/workers`);
        if(!res.ok) return setWorkers([]);
        const data = await res.json();
        if(mounted) setWorkers(data || []);
      }catch(e){ console.error('Failed loading workers', e); setWorkers([]); }
    }
    load();
    return ()=>{ mounted = false };
  }, [API_BASE]);

  useEffect(()=>{ if(initial){ setWorkerId(initial.workerId); setWeekdays(initial.weekdays || []); setStartDate(initial.startDate ? initial.startDate.slice(0,10): ''); setEndDate(initial.endDate ? initial.endDate.slice(0,10): ''); setNote(initial.note ?? ''); } }, [initial]);

  useEffect(()=>{ if(initial){ setLimitRange(!!(initial.startDate || initial.endDate)); } }, [initial]);

  // initialize rotation editing state when initialRotation provided
  useEffect(()=>{
    if(initialRotation && initialRotation.length){
      setIsRotation(true);
      const sorted = [...initialRotation].sort((a,b)=> (a.weekOffset||0) - (b.weekOffset||0));
      setRotationMembers(sorted.map(s=>s.workerId));
      setRotationIds(sorted.map(s=>s.id));
      const first = sorted[0];
      setWeekdays(first.weekdays||[]);
      setWeekInterval(first.weekInterval || sorted.length || 1);
      setStartDate(first.startDate ? first.startDate.slice(0,10) : '');
      setEndDate(first.endDate ? first.endDate.slice(0,10) : '');
      setNote(first.note ?? '');
    }
  }, [initialRotation]);

  const toggleWeekday = (d:number)=>{
    setWeekdays(w => w.includes(d) ? w.filter(x => x!==d) : [...w, d].sort());
  };
  const toggleRotationMember = (id:number)=>{
    setRotationMembers(r => r.includes(id) ? r.filter(x=>x!==id) : [...r, id]);
  };

  const addMember = (id:number) => setRotationMembers(r => r.includes(id) ? r : [...r, id]);
  const removeMember = (id:number) => setRotationMembers(r => r.filter(x=>x!==id));
  const moveUp = (idx:number) => setRotationMembers(r => {
    if(idx<=0) return r;
    const copy = [...r]; const tmp = copy[idx-1]; copy[idx-1] = copy[idx]; copy[idx] = tmp; return copy;
  });
  const moveDown = (idx:number) => setRotationMembers(r => {
    if(idx<0 || idx>=r.length-1) return r;
    const copy = [...r]; const tmp = copy[idx+1]; copy[idx+1] = copy[idx]; copy[idx] = tmp; return copy;
  });

  // operations that keep ids in sync when editing an existing rotation
  const addMemberWithId = (id:number) => { setRotationMembers(r => r.includes(id) ? r : [...r, id]); setRotationIds(ids => [...ids, undefined]); };
  const removeMemberWithId = (idx:number) => { setRotationMembers(r => r.filter((_,i)=>i!==idx)); setRotationIds(ids => ids.filter((_,i)=>i!==idx)); };
  const moveUpWithId = (idx:number) => {
    if(idx<=0) return;
    setRotationMembers(r=>{ const copy=[...r]; const tmp=copy[idx-1]; copy[idx-1]=copy[idx]; copy[idx]=tmp; return copy; });
    setRotationIds(ids=>{ const copy=[...ids]; const tmp=copy[idx-1]; copy[idx-1]=copy[idx]; copy[idx]=tmp; return copy; });
  };
  const moveDownWithId = (idx:number) => {
    setRotationMembers(r=>{ if(idx<0||idx>=r.length-1) return r; const copy=[...r]; const tmp=copy[idx+1]; copy[idx+1]=copy[idx]; copy[idx]=tmp; return copy; });
    setRotationIds(ids=>{ if(idx<0||idx>=ids.length-1) return ids; const copy=[...ids]; const tmp=copy[idx+1]; copy[idx+1]=copy[idx]; copy[idx]=tmp; return copy; });
  };

  const submit = async ()=>{
    if(isRotation){
      if(rotationMembers.length < 2) return alert('Select at least 2 workers for rotation');
      // build payloads for each member, include ids when editing existing rotation
      const n = rotationMembers.length;
    const today = new Date().toISOString().slice(0,10);
    const payloads = rotationMembers.map((wId, idx) => ({ id: rotationIds[idx], workerId: Number(wId), weekdays, weekInterval: n, weekOffset: idx, startDate: limitRange ? (startDate||today) : today, endDate: limitRange ? (endDate||null) : null, note }));
      const originalIds = initialRotation ? (initialRotation.map(p=>p.id)) : [];
      const out: any = { rotation: payloads, originalIds };
      if (scheduleChange) {
        const today = new Date().toISOString().slice(0, 10);
        out.scheduleStartDate = scheduleDate || today;
      }
      onSave(out);
      return;
    }
    if(!workerId) return alert('Worker ID required');
    onSave({ workerId: Number(workerId), weekdays, weekInterval: Number(weekInterval || 1), weekOffset: 0, startDate: limitRange ? (startDate||null) : null, endDate: limitRange ? (endDate||null) : null, note });
  };

  return (
    <div>
      <h2>{initial ? 'Edit' : 'New'} Pattern</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        <label>Worker
          <select value={workerId as any} onChange={e=>setWorkerId(e.target.value?Number(e.target.value):'')}>
            <option value="">-- select --</option>
            {workers.map(w => <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
          </select>
        </label>
        <label>Weekdays</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, i)=> (
            <button key={i} onClick={()=>toggleWeekday(i)} style={{ background: weekdays.includes(i)?'#aee':undefined }}>{label}</button>
          ))}
        </div>
        <label style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={limitRange} onChange={e=>setLimitRange(e.target.checked)} />
          <span>Limit to date range</span>
        </label>
        {limitRange && (
          <>
            <label>Start Date
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            </label>
            <label>End Date
              <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </label>
          </>
        )}
        <label>Repeat every
          <input type="number" min={1} value={weekInterval} onChange={e=>setWeekInterval(Number(e.target.value)||1)} style={{ width:80, marginLeft:8 }} />
          <span style={{ marginLeft:8 }}>week(s)</span>
        </label>
        <label style={{display:'flex',alignItems:'center',gap:8}}>
          <input type="checkbox" checked={isRotation} onChange={e=>setIsRotation(e.target.checked)} />
          <span>Create rotation among multiple workers</span>
        </label>
        {isRotation && (
          <div style={{ border:'1px solid #eee', padding:8 }}>
            <div style={{ fontSize:12, marginBottom:6 }}>Rotation order (top = first)</div>
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {rotationMembers.length === 0 && <div style={{ fontSize:12, color:'#666' }}>No workers selected</div>}
              {rotationMembers.map((id, idx) => {
                const w = workers.find(x=>x.id===id);
                return (
                  <div key={id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>{idx+1}. {w?.name ?? id} ({id})</div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button disabled={idx===0} onClick={()=>moveUpWithId(idx)}>↑</button>
                      <button disabled={idx===rotationMembers.length-1} onClick={()=>moveDownWithId(idx)}>↓</button>
                      <button onClick={()=>removeMemberWithId(idx)}>Remove</button>
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
                <select onChange={e=>{ if(e.target.value){ addMemberWithId(Number(e.target.value)); e.target.value=''; } }}>
                  <option value="">-- add worker --</option>
                  {workers.filter(w=>!rotationMembers.includes(w.id)).map(w=> <option key={w.id} value={w.id}>{w.name} ({w.id})</option>)}
                </select>
                <div style={{ fontSize:12, color:'#666' }}>Add to end of rotation</div>
              </div>
              <div style={{ marginTop:8, display:'flex', gap:8, alignItems:'center' }}>
                <label style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" checked={scheduleChange} onChange={e=>setScheduleChange(e.target.checked)} />
                  <span>Schedule change from</span>
                </label>
                {scheduleChange && <input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} />}
              </div>
            </div>
          </div>
        )}
        <label>Note
          <input value={note} onChange={e=>setNote(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={submit}>{initial ? 'Save' : 'Create'}</button>
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
