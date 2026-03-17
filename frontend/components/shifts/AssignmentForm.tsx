import React, { useEffect, useState } from 'react';
import { PALETTE, btnPrimary, inputStyle, selectStyle, cardStyle } from '../../styles/theme';
import { API_BASE } from '../../config/api';

export default function AssignmentForm({ initial, onSave }: { initial?: any; onSave: (p:any)=>void }) {
  const [date, setDate] = useState('');
  const [workerId, setWorkerId] = useState<number | ''>('');
  const [note, setNote] = useState('');
  const [workers, setWorkers] = useState<Array<{id:number;name:string}>>([]);


  useEffect(()=>{ if(initial){ setDate(initial.date ? initial.date.slice(0,10) : ''); setWorkerId(initial.workerId ?? ''); setNote(initial.note ?? ''); } }, [initial]);

  useEffect(()=>{
    let mounted = true;
    async function loadWorkers(){
      try{
        const res = await fetch(`${API_BASE}/workers`);
        if(!res.ok) return setWorkers([]);
        const data = await res.json();
        if(mounted) setWorkers(data || []);
      }catch(e){ console.error('Failed loading workers', e); setWorkers([]); }
    }
    loadWorkers();
    return ()=>{ mounted = false };
  }, [API_BASE]);

  const submit = ()=>{
    if(!date) return alert('Data obrigatória');
    onSave({ date, workerId: workerId === '' ? null : Number(workerId), note: note||null });
    setDate(''); setWorkerId(''); setNote('');
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: PALETTE.textPrimary }}>Nova Atribuição</h3>
      <div style={{ display: 'grid', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Data</label>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Trabalhador</label>
          <select value={workerId as any} onChange={e=>setWorkerId(e.target.value?Number(e.target.value):'')} style={selectStyle}>
            <option value="">— nenhum —</option>
            {workers.map(w => (
              <option key={w.id} value={w.id}>{w.name} ({w.id})</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Nota (opcional)</label>
          <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Adicionar nota..." style={inputStyle} />
        </div>
        <button onClick={submit} style={btnPrimary}>Criar</button>
      </div>
    </div>
  );
}
