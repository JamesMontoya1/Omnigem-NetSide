import React from 'react';
import { PALETTE, btnSmall } from '../../styles/theme';

export default function RecurringPatternsList({ items, onEdit, onDelete, workers }: { items: any[]; onEdit: (p:any)=>void; onDelete:(id:number)=>void; workers?: Array<{id:number;name:string}> }) {
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${PALETTE.border}`,
    fontSize: 12,
    fontWeight: 600,
    color: PALETTE.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${PALETTE.border}`,
    fontSize: 14,
    color: PALETTE.textPrimary,
  };

  return (
    <div style={{ background: PALETTE.cardBg, border: `1px solid ${PALETTE.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${PALETTE.border}` }}>
        <h3 style={{ margin: 0, fontSize: 16, color: PALETTE.textPrimary }}>Padrões</h3>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: PALETTE.backgroundSecondary }}>
            <th style={thStyle}>ID</th>
            <th style={thStyle}>Trabalhador</th>
            <th style={thStyle}>Dias</th>
            <th style={thStyle}>Intervalo</th>
            <th style={thStyle}>Período</th>
            <th style={{ ...thStyle, width: 120 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr key={p.id}>
              <td style={tdStyle}>{p.id}</td>
              <td style={tdStyle}>{(workers || []).find(w => w.id === p.workerId)?.name ?? p.workerId}</td>
              <td style={tdStyle}>{(p.weekdays || []).join(',')}</td>
              <td style={tdStyle}>{p.weekInterval && p.weekInterval>1 ? `A cada ${p.weekInterval} sem` : 'Toda semana'}</td>
              <td style={tdStyle}>{(!p.startDate && !p.endDate) ? 'Sempre' : `${p.startDate ? new Date(p.startDate).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '—'} — ${p.endDate ? new Date(p.endDate).toLocaleDateString('pt-BR', {timeZone:'UTC'}) : '—'}`}</td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onEdit(p)} style={{ ...btnSmall, color: PALETTE.primary, borderColor: PALETTE.primary }}>Editar</button>
                  <button onClick={() => onDelete(p.id)} style={{ ...btnSmall, color: PALETTE.error, background: `${PALETTE.error}18`, borderColor: PALETTE.error }}>Apagar</button>
                </div>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: PALETTE.textDisabled, padding: 24 }}>Nenhum padrão encontrado</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
