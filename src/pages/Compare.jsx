import { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import { card, thL, thR, thRhi, tdBrand, tdR, tdRhi, selectStyle } from '../lib/styles';
import { colorFor, f2, fi, shortMil } from '../lib/format';
import { sum } from '../lib/seed';

const ArrowUp = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
);
const ArrowDown = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </svg>
);
const ArrowFlat = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...props}>
    <path d="M5 12h14" />
  </svg>
);

function delta(a, b) {
  const d = b - a;
  const pct = a ? (d / a) * 100 : b ? 100 : 0;
  const up = d > 0;
  const flat = d === 0;
  const Arrow = flat ? ArrowFlat : up ? ArrowUp : ArrowDown;
  const style = flat
    ? { background: '#f1f3f6', color: '#8a94a3' }
    : up
    ? { background: '#dcfce7', color: '#15803d' }
    : { background: '#fee2e2', color: '#b91c1c' };
  return { label: (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%', Arrow, style, up, flat };
}

export default function Compare() {
  const { months } = useData();
  const ids = months.map((m) => m.id);
  const [cmpAId, setCmpAId] = useState(ids[0]);
  const [cmpBId, setCmpBId] = useState(ids[ids.length - 1]);

  useEffect(() => {
    if (!ids.includes(cmpAId)) setCmpAId(ids[0]);
    if (!ids.includes(cmpBId)) setCmpBId(ids[ids.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months]);

  const mA = months.find((m) => m.id === cmpAId) || months[0];
  const mB = months.find((m) => m.id === cmpBId) || months[months.length - 1];
  if (!mA || !mB) return null;

  const brandsUnion = [];
  const seen = {};
  [...(mA.brands || []), ...(mB.brands || [])].forEach((b) => {
    if (!seen[b.brand]) {
      seen[b.brand] = 1;
      brandsUnion.push(b.brand);
    }
  });
  const findB = (m, br) => (m.brands || []).find((x) => x.brand === br) || { units: 0, total: 0 };

  const tA = mA.totals || sum(mA.brands || []);
  const tB = mB.totals || sum(mB.brands || []);
  const cmpKpis = [
    { label: 'ยอดขาย (คัน)', a: fi(tA.units), b: fi(tB.units), d: delta(tA.units, tB.units) },
    { label: 'มูลค่าขายรวม', a: shortMil(tA.value), b: shortMil(tB.value), d: delta(tA.value, tB.value) },
    { label: 'รายได้สุทธิ', a: shortMil(mA.net), b: shortMil(mB.net), d: delta(mA.net, mB.net) },
  ];

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">เปรียบเทียบ</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">เปรียบเทียบระหว่างรอบวางบิล</h1>
      </div>

      <div className="flex gap-[14px] flex-wrap mb-[22px]">
        <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
          รอบ A (ฐาน)
          <select value={cmpAId} onChange={(e) => setCmpAId(e.target.value)} className={selectStyle + ' min-w-[200px]!'}>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="self-end pb-[11px] text-[#98a2b3]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
        <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
          รอบ B (เทียบ)
          <select value={cmpBId} onChange={(e) => setCmpBId(e.target.value)} className={selectStyle + ' min-w-[200px]!'}>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {cmpKpis.map((k) => (
          <div key={k.label} className={card}>
            <div className="text-[12.5px] text-[#6b7686] font-semibold">{k.label}</div>
            <div className="flex items-baseline gap-[10px] mt-3">
              <span className="text-[15px] text-[#98a2b3] font-semibold">{k.a}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c3cad4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span className="text-[21px] font-bold">{k.b}</span>
            </div>
            <div
              className="mt-[9px] inline-flex items-center gap-[5px] text-[12.5px] font-bold px-[9px] py-[3px] rounded-full"
              style={k.d.style}
            >
              <k.d.Arrow />
              {k.d.label}
            </div>
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="font-bold text-[15px] mb-[18px]">เปรียบเทียบรายแบรนด์ — รายได้รวม</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[760px]">
            <thead>
              <tr className="bg-[#f4f6fa]">
                <th className={thL}>ยี่ห้อ</th>
                <th className={thR}>คัน ({mA.label})</th>
                <th className={thR}>คัน ({mB.label})</th>
                <th className={thR}>รายได้ ({mA.label})</th>
                <th className={thR}>รายได้ ({mB.label})</th>
                <th className={thRhi}>เปลี่ยนแปลง</th>
              </tr>
            </thead>
            <tbody>
              {brandsUnion.map((br, i) => {
                const a = findB(mA, br);
                const b = findB(mB, br);
                const c = colorFor(br, i);
                const d = delta(a.total || 0, b.total || 0);
                return (
                  <tr key={br} className="border-b border-[#eef1f5]">
                    <td className={tdBrand}>
                      <span className="inline-block w-[9px] h-[9px] rounded-[3px] mr-2 align-middle" style={{ background: c }} />
                      {br}
                    </td>
                    <td className={tdR}>{fi(a.units)}</td>
                    <td className={tdR}>{fi(b.units)}</td>
                    <td className={tdR}>{f2(a.total)}</td>
                    <td className={tdR}>{f2(b.total)}</td>
                    <td className={tdRhi}>
                      <span
                        className="inline-flex items-center gap-1 font-bold"
                        style={{ color: d.flat ? '#98a2b3' : d.up ? '#16a34a' : '#dc2626' }}
                      >
                        <d.Arrow />
                        {d.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
