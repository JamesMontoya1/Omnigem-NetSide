import React from 'react';
import { PALETTE, btnSmall } from '../../styles/theme';

type Props = {
  items: any[];
  onDelete?: (id:number)=>void;
  selectedIds: number[];
  onToggle?: (id:number)=>void;
  onToggleAll?: (checked:boolean)=>void;
};

export default function AssignmentsList({ items, onDelete, selectedIds, onToggle, onToggleAll }: Props) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;

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
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: PALETTE.backgroundSecondary }}>
            <th style={{ ...thStyle, width: 40, textAlign: 'center' }}>
              {onToggleAll && <input type="checkbox" checked={allSelected} onChange={e => onToggleAll(e.target.checked)} style={{ accentColor: PALETTE.primary }} />}
            </th>
            <th style={thStyle}>Data</th>
            <th style={thStyle}>Trabalhador</th>
            <th style={thStyle}>Fonte</th>
            <th style={thStyle}>Nota</th>
            <th style={{ ...thStyle, width: 80 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id} style={{ transition: 'background 0.15s' }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}>
                {onToggle && <input type="checkbox" checked={selectedIds.includes(a.id)} onChange={() => onToggle(a.id)} style={{ accentColor: PALETTE.primary }} />}
              </td>
              <td style={tdStyle}>{new Date(a.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
              <td style={tdStyle}>{a.workerId ?? '—'}</td>
              <td style={tdStyle}>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 500,
                  background: a.source === 'MANUAL' ? `${PALETTE.success}22` : `${PALETTE.info}22`,
                  color: a.source === 'MANUAL' ? PALETTE.success : PALETTE.info,
                }}>
                  {a.source === 'MANUAL' ? 'manual' : a.source?.toLowerCase() ?? '—'}
                </span>
              </td>
              <td style={{ ...tdStyle, color: a.note ? PALETTE.textPrimary : PALETTE.textDisabled }}>{a.note ?? '—'}</td>
              <td style={tdStyle}>
                {onDelete && <button onClick={() => onDelete(a.id)} style={{ ...btnSmall, color: PALETTE.error, background: `${PALETTE.error}18`, borderColor: PALETTE.error }}>Apagar</button>}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: PALETTE.textDisabled, padding: 24 }}>Nenhuma atribuição encontrada</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
