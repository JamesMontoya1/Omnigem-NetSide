/** Paleta de cores compartilhada – modo escuro */
export const PALETTE = {
  // fundos
  background: '#1A1D21',
  backgroundSecondary: '#20242A',
  backgroundGradient: 'linear-gradient(180deg, #1A1D21 0%, #3A5A8A 100%)',
  cardBg: '#2A2F36',
  cardAlt: '#1f2b3c',
  hoverBg: '#323844',
  rowHover: '#3B4756',
  rowOpen: '#334055',
  border: '#3A4250',

  // texto
  textPrimary: '#E6EAF0',
  textSecondary: '#A8B0BA',
  textDisabled: '#6B7280',

  // destaques
  primary: '#5C7CFA',
  success: '#4CAF8D',
  warning: '#E6A23C',
  error: '#E57373',
  info: '#4DA3FF',

  plusBtnBorder: '#5C7CFA',
  todayBg: '#20242A',
  notCurrentBg: '#181B20',
  manualBg: '#14352C',
  rotationBg: '#1B2536',
};

/* ── Estilos de botão reutilizáveis ── */

export const btnPrimary: React.CSSProperties = {
  background: PALETTE.primary,
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};

export const btnConfirm: React.CSSProperties = {
  background: PALETTE.success,
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};

export const btnCancel: React.CSSProperties = {
  background: 'transparent',
  color: PALETTE.error,
  border: `1px solid ${PALETTE.error}`,
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};

export const btnDanger: React.CSSProperties = {
  background: PALETTE.error,
  color: '#fff',
  border: 'none',
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 600,
};

export const btnSmall: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 6px',
  cursor: 'pointer',
  background: PALETTE.hoverBg,
  color: PALETTE.textPrimary,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 4,
};

export const btnSmallBlue: React.CSSProperties = {
  fontSize: 11,
  padding: '4px 6px',
  cursor: 'pointer',
  background: PALETTE.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontWeight: 500,
};

export const btnSmallRed: React.CSSProperties = {
  fontSize: 10,
  padding: '2px 6px',
  cursor: 'pointer',
  background: PALETTE.error,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontWeight: 500,
};

export const btnNav: React.CSSProperties = {
  padding: '6px 12px',
  cursor: 'pointer',
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 6,
  background: PALETTE.hoverBg,
  color: PALETTE.textPrimary,
  fontWeight: 500,
};

/* ── Estilos de input/select ── */

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  backgroundColor: PALETTE.backgroundSecondary,
  color: PALETTE.textPrimary,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 4,
  fontFamily: 'inherit',
  fontSize: 13,
  boxSizing: 'border-box',
};

export const selectStyle: React.CSSProperties = {
  ...inputStyle,
};

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontWeight: 600,
  fontSize: 12,
  color: PALETTE.textSecondary,
  marginBottom: 2,
};

/* ── Estilos de card ── */

export const cardStyle: React.CSSProperties = {
  background: PALETTE.cardBg,
  border: `1px solid ${PALETTE.border}`,
  borderRadius: 8,
  padding: 12,
};
