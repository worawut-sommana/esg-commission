import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { card, thL, thC, thR, thRhi, tdL, tdC, tdR, tdRhi, tdMono } from '../lib/styles';
import { f2 } from '../lib/format';

export default function Detail() {
  const { active } = useData();
  const [brandFilter, setBrandFilter] = useState('all');
  const [search, setSearch] = useState('');

  const records = active.records || [];
  const brands = useMemo(() => [...new Set(records.map((r) => r.brand))], [records]);

  const q = search.trim().toLowerCase();
  const filtered = records.filter(
    (r) =>
      (brandFilter === 'all' || r.brand === brandFilter) &&
      (!q ||
        (r.name + ' ' + r.model + ' ' + r.vin + ' ' + (r.financier || r.branch || '')).toLowerCase().includes(q))
  );

  const sumPrice = filtered.reduce((a, r) => a + r.price, 0);
  const sumCom = filtered.reduce((a, r) => a + r.com, 0);

  const chips = [{ b: 'all', label: 'ทั้งหมด' }, ...brands.map((b) => ({ b, label: b }))];

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">รายละเอียดรายคัน</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">รายการขายรายคัน</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          {active.label} · {records.length} รายการ
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center mb-[18px]">
        <div className="relative flex-1 min-w-[240px]">
          <svg
            className="absolute left-[13px] top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#98a2b3"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า / รุ่น / เลข VIN"
            className="w-full py-[11px] pr-[14px] pl-[38px] border border-[#d7dce4] rounded-[11px] text-[13.5px] bg-white"
          />
        </div>
        <div className="flex gap-[7px] flex-wrap">
          {chips.map((c) => {
            const on = brandFilter === c.b;
            return (
              <button
                key={c.b}
                onClick={() => setBrandFilter(c.b)}
                className="px-[14px] py-2 rounded-full text-[12.5px] font-semibold cursor-pointer border transition-all"
                style={
                  on
                    ? { background: 'var(--ac)', borderColor: 'var(--ac)', color: '#fff' }
                    : { background: '#fff', borderColor: '#d7dce4', color: '#5a6473' }
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={card}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[1000px]">
            <thead>
              <tr className="bg-[#f4f6fa]">
                <th className={thC}>#</th>
                <th className={thL}>ชื่อลูกค้า</th>
                <th className={thL}>รุ่นรถ</th>
                <th className={thL}>เลข VIN</th>
                <th className={thL}>เงื่อนไข</th>
                <th className={thL}>วันที่ส่งมอบ</th>
                <th className={thR}>ราคาขาย</th>
                <th className={thRhi}>ค่าคอม 1%</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.vin} className="border-b border-[#eef1f5]">
                  <td className={tdC}>{i + 1}</td>
                  <td className={tdL}>{d.name}</td>
                  <td className={tdL}>
                    <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                      {d.model}
                    </span>
                  </td>
                  <td className={tdMono}>{d.vin}</td>
                  <td className={tdL}>{d.financier || d.branch || '-'}</td>
                  <td className={tdL}>{d.deliveryDate || '-'}</td>
                  <td className={tdR}>{f2(d.price)}</td>
                  <td className={tdRhi}>{f2(d.com)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#cfd6e0] bg-[#f4f6fa] font-bold">
                <td className={tdC} colSpan={6}>
                  รวม {filtered.length} รายการ
                </td>
                <td className={tdR}>{f2(sumPrice)}</td>
                <td className={tdRhi}>{f2(sumCom)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบรายการที่ตรงกับเงื่อนไข</div>
        )}
      </div>
    </section>
  );
}
