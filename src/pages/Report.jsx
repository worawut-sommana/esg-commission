import { useData } from '../context/DataContext';
import { card, thL, thC, thR, thRhi, tdC, tdR, tdRmut, tdRhi, tdBrand, btnPrimary, selectStyle } from '../lib/styles';
import { colorFor, f2, fi } from '../lib/format';
import { sum } from '../lib/seed';

export default function Report() {
  const { months, active, activeMonthId, selectMonth } = useData();
  const brands = active.brands || [];
  const t = active.totals || sum(brands);

  return (
    <section className="appfade">
      <div data-noprint className="flex items-end justify-between gap-5 flex-wrap mb-6">
        <div>
          <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">รายงานสรุป</div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">รายงานยอดขายรายแบรนด์</h1>
        </div>
        <div className="flex gap-[10px] items-end">
          <select value={activeMonthId} onChange={(e) => selectMonth(e.target.value)} className={selectStyle}>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <button onClick={() => window.print()} className={btnPrimary}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
            พิมพ์ / บันทึก PDF
          </button>
        </div>
      </div>

      <div data-printarea className={card}>
        <div className="text-center mb-5">
          <div className="text-[19px] font-bold">รายงานยอดขาย My One เริ่มเดือน {active.label}</div>
          <div className="text-[13.5px] text-[#6b7686] mt-1">รอบวางบิล วันที่ {active.billing}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px] min-w-[820px]">
            <thead>
              <tr className="bg-[#f4f6fa]">
                <th className={thC}>ลำดับ</th>
                <th className={thL}>ยี่ห้อ</th>
                <th className={thR}>ยอดขาย (คัน)</th>
                <th className={thR}>มูลค่า</th>
                <th className={thR}>ค่าคอม 1%</th>
                <th className={thR}>ก้อน 2 สัดส่วน 30%</th>
                <th className={thR}>ส่วนต่างค่าทะเบียน</th>
                <th className={thRhi}>รายได้รวม</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b, i) => (
                <tr key={b.brand} className="border-b border-[#eef1f5]">
                  <td className={tdC}>{i + 1}</td>
                  <td className={tdBrand}>
                    <span
                      className="inline-block w-[9px] h-[9px] rounded-[3px] mr-2 align-middle"
                      style={{ background: colorFor(b.brand, i) }}
                    />
                    {b.brand}
                  </td>
                  <td className={tdR}>{fi(b.units)}</td>
                  <td className={tdR}>{f2(b.value)}</td>
                  <td className={tdR}>{f2(b.com1)}</td>
                  <td className={tdRmut}>{b.chunk2 ? f2(b.chunk2) : '—'}</td>
                  <td className={tdR}>{f2(b.regDiff)}</td>
                  <td className={tdRhi}>{f2(b.total)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#cfd6e0] bg-[#f4f6fa] font-bold">
                <td className={tdC}></td>
                <td className={tdBrand}>รวม</td>
                <td className={tdR}>{fi(t.units)}</td>
                <td className={tdR}>{f2(t.value)}</td>
                <td className={tdR}>{f2(t.com1)}</td>
                <td className={tdR}>{f2(t.chunk2)}</td>
                <td className={tdR}>{f2(t.regDiff)}</td>
                <td className={tdRhi}>{f2(t.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-[22px]">
          <div className="w-[340px] max-w-full">
            <div className="flex justify-between py-[9px] text-sm border-b border-dashed border-[#d7dce4]">
              <span className="text-[#6b7686]">หัก ค่าทะเบียน EV 3.5</span>
              <span className="font-bold text-[#dc2626]">-{f2(active.deduct)}</span>
            </div>
            <div className="flex justify-between px-[14px] py-[13px] mt-[10px] bg-[var(--ac)] text-white rounded-[11px]">
              <span className="font-semibold text-[15px]">สุทธิ</span>
              <span className="font-bold text-[17px]">{f2(active.net)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
