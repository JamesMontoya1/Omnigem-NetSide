import React, { useEffect, useState } from 'react';
import AssignmentsList from './AssignmentsList';
import AssignmentForm from './AssignmentForm';
import { PALETTE, btnPrimary, btnDanger, inputStyle } from '../../styles/theme';
import { API_BASE, authHeaders, jsonAuthHeaders } from '../../config/api';

export default function AssignmentsContent({ readOnly = false }: { readOnly?: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  const [genStart, setGenStart] = useState('');
  const [genEnd, setGenEnd] = useState('');

  const load = async () => {
    const res = await fetch(`${API_BASE}/assignments`);
    if (!res.ok) return setItems([]);
    try {
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error('Invalid JSON for assignments', e);
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const onCreate = async (payload: any) => {
    const res = await fetch(`${API_BASE}/assignments`, { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify(payload) });
    if (res.ok) { setEditing(null); await load(); }
  };

  const onDelete = async (id: number) => { await fetch(`${API_BASE}/assignments/${id}`, { method: 'DELETE', headers: authHeaders() }); await load(); };

  const toggle = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(items.map(i => i.id));
    else setSelectedIds([]);
  };

  const onDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Apagar ${selectedIds.length} atribuição(ões)?`)) return;
    await Promise.all(selectedIds.map(id => fetch(`${API_BASE}/assignments/${id}`, { method: 'DELETE', headers: authHeaders() })));
    setSelectedIds([]);
    await load();
  };

  const onGenerate = async () => {
    if (!genStart || !genEnd) return alert('Informe início e fim');
    const res = await fetch(`${API_BASE}/assignments/generate`, { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify({ startDate: genStart, endDate: genEnd }) });
    if (res.ok) { await load(); const data = await res.json().catch(() => null); alert(`Generated: ${data?.createdCount ?? 'unknown'}`); }
  };

  return (
    <>
      <h1 style={{ margin: '0 0 20px 0', fontSize: 22, color: PALETTE.textPrimary }}>Atribuições</h1>

      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1 }}>
          {!readOnly && (
          <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={onDeleteSelected} disabled={selectedIds.length === 0} style={{ ...btnDanger, fontSize: 13, padding: '6px 12px' }}>
              Apagar selecionados
            </button>
            <span style={{ color: PALETTE.textSecondary, fontSize: 13 }}>{selectedIds.length} selecionado(s)</span>
          </div>
          )}
          <AssignmentsList items={items} onDelete={readOnly ? undefined : onDelete} selectedIds={selectedIds} onToggle={readOnly ? undefined : toggle} onToggleAll={readOnly ? undefined : toggleAll} />
        </div>

        {!readOnly && (
        <div style={{ width: 440 }}>
          <AssignmentForm initial={editing} onSave={onCreate} />

          <div style={{
            marginTop: 20,
            background: PALETTE.cardBg,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 8,
            padding: 16,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: PALETTE.textPrimary }}>Gerar a partir de padrões</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Início</label>
                <input type="date" value={genStart} onChange={e => setGenStart(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: PALETTE.textSecondary, marginBottom: 4 }}>Fim</label>
                <input type="date" value={genEnd} onChange={e => setGenEnd(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={onGenerate} style={{ ...btnPrimary, fontSize: 13, padding: '8px 14px' }}>Gerar</button>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
}
