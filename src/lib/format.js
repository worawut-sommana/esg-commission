export const PALETTE = {
  OJ: '#3b5bdb',
  AION: '#0ca7c4',
  GEELY: '#16a34a',
  CHERY: '#e8590c',
  WULING: '#8b5cf6',
  GWM: '#ca8a04',
  MG: '#db2777',
};

export const EXTRA = ['#0891b2', '#65a30d', '#c026d3', '#ea580c', '#0d9488', '#7c3aed'];

export function colorFor(brand, i) {
  return PALETTE[brand] || EXTRA[i % EXTRA.length];
}

export function hexA(hex, a) {
  const h = (hex || '#3b5bdb').replace('#', '');
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function f2(n) {
  return (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fi(n) {
  return (Number(n) || 0).toLocaleString('en-US');
}

export function formatIsoDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`;
}

export function shortMil(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'พันล.';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'ล.';
  return fi(Math.round(n));
}
