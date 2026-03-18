export function num(v: any): number | undefined { const n = Number(String(v).replace(',', '.')); return isNaN(n) ? undefined : n }
export function formatTwo(v: any) {
  if (v === '' || v == null) return ''
  const n = Number(String(v).replace(',', '.'))
  return isNaN(n) ? '' : n.toFixed(2).replace('.', ',')
}

export function parseToNumber(v: any): number | undefined { const n = Number(String(v).replace(',', '.')); return isNaN(n) ? undefined : n }
