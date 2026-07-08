import { useData } from '../context/DataContext';
import { card } from '../lib/styles';
import { colorFor, hexA, f2, fi } from '../lib/format';

function KpiCard({ label, value, sub, valueColor, icon, iconColor }) {
  return (
    <div className={card + ' p-5!'}>
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-[#6b7686] font-semibold">{label}</span>
        <span
          className="flex items-center justify-center w-[34px] h-[34px] rounded-[10px]"
          style={{ background: hexA(iconColor, 0.12), color: iconColor }}
        >
          {icon}
        </span>
      </div>
      <div className="text-[23px] font-bold mt-[14px] tracking-[-0.02em]" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="text-xs text-[#8a94a3] mt-[5px]">{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { months, active, activeMonthId, selectMonth } = useData();
  const brands = active.brands || [];
  const t = active.totals || { units: 0, value: 0, com1: 0, chunk2: 0, regDiff: 0, total: 0 };

  const sortedByTotal = [...brands].sort((a, b) => (b.total || 0) - (a.total || 0));
  const maxTotal = Math.max(1, ...brands.map((b) => b.total || 0));
  const sumTotal = Math.max(1, brands.reduce((a, b) => a + (b.total || 0), 0));
  const maxUnits = Math.max(1, ...brands.map((b) => b.units || 0));
  const maxNet = Math.max(1, ...months.map((m) => m.net || 0));

  const incomeParts = [
    { label: 'ค่าคอม 1%', color: 'var(--ac)', val: t.com1 },
    { label: 'ก้อน 2 (30%)', color: '#8b5cf6', val: t.chunk2 },
    { label: 'ส่วนต่างค่าทะเบียน', color: '#e8590c', val: t.regDiff },
  ];
  const ipSum = Math.max(1, incomeParts.reduce((a, x) => a + x.val, 0));

  return (
    <section className="appfade">
      <div data-noprint className="flex items-end justify-between gap-5 flex-wrap mb-[26px]">
        <div>
          <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ภาพรวม</div>
          <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">แดชบอร์ดค่าคอมรถยนต์</h1>
          <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
            รอบวางบิล {active.billing} · เริ่มเดือน {active.label}
          </div>
        </div>
        <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-medium">
          รอบข้อมูล
          <select
            value={activeMonthId}
            onChange={(e) => selectMonth(e.target.value)}
            className="min-w-[210px] px-3 py-[9px] border border-[#d7dce4] rounded-[10px] bg-white text-[13.5px] font-semibold text-[#1a2233] cursor-pointer"
          >
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <KpiCard
          label="รายได้รวมสุทธิ"
          value={f2(active.net)}
          sub="บาท · หลังหักค่าทะเบียน EV"
          valueColor="#16a34a"
          iconColor="#16a34a"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          label="มูลค่าขายรวม"
          value={f2(t.value)}
          sub="บาท"
          valueColor="#1a2233"
          iconColor="var(--ac)"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        />
        <KpiCard
          label="ยอดขายรวม"
          value={fi(t.units) + ' คัน'}
          sub={brands.length + ' แบรนด์'}
          valueColor="#1a2233"
          iconColor="#e8590c"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 17h14M6 17l1.5-5.5A2 2 0 0 1 9.4 10h5.2a2 2 0 0 1 1.9 1.5L18 17" />
              <circle cx="8" cy="17.5" r="1.5" />
              <circle cx="16" cy="17.5" r="1.5" />
            </svg>
          }
        />
        <KpiCard
          label="ค่าคอมรวม (1%)"
          value={f2(t.com1)}
          sub="บาท"
          valueColor="#1a2233"
          iconColor="#8b5cf6"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12V8H6a2 2 0 0 1 0-4h12v4M4 6v12a2 2 0 0 0 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] gap-[18px] mb-5">
        <div className={card}>
          <div className="font-bold text-[15px] mb-[2px]">รายได้รวมแยกตามแบรนด์</div>
          <div className="text-xs text-[#8a94a3] mb-[18px]">หน่วย: บาท</div>
          <div className="flex flex-col gap-[15px]">
            {sortedByTotal.map((b, i) => {
              const c = colorFor(b.brand, i);
              const pct = Math.max(2, ((b.total || 0) / maxTotal) * 100);
              return (
                <div key={b.brand}>
                  <div className="flex justify-between items-baseline mb-[6px]">
                    <span className="flex items-center gap-2 text-[13px] font-semibold">
                      <span className="inline-block w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: c }} />
                      {b.brand}
                    </span>
                    <span className="text-[13px] font-semibold text-[#3a4453]">{f2(b.total)}</span>
                  </div>
                  <div className="h-[9px] bg-[#eef1f5] rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md origin-left"
                      style={{
                        width: pct + '%',
                        background: `linear-gradient(90deg,${c},${hexA(c, 0.75)})`,
                        animation: `growW .5s ${i * 0.05}s both cubic-bezier(.2,.7,.3,1)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={card}>
          <div className="font-bold text-[15px] mb-[2px]">สัดส่วนรายได้</div>
          <div className="text-xs text-[#8a94a3] mb-[18px]">% ของรายได้รวมทั้งหมด</div>
          <div className="flex h-4 rounded-[9px] overflow-hidden mb-5">
            {sortedByTotal.map((b, i) => {
              const c = colorFor(b.brand, i);
              const pct = ((b.total || 0) / sumTotal) * 100;
              return <div key={b.brand} title={b.brand} style={{ width: pct + '%', background: c }} />;
            })}
          </div>
          <div className="flex flex-col gap-[11px]">
            {sortedByTotal.map((b, i) => {
              const c = colorFor(b.brand, i);
              const pct = ((b.total || 0) / sumTotal) * 100;
              return (
                <div key={b.brand} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="inline-block w-[10px] h-[10px] rounded-[3px] flex-none" style={{ background: c }} />
                    {b.brand}
                  </span>
                  <span className="font-bold text-[#3a4453]">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[18px] mb-5">
        <div className={card}>
          <div className="font-bold text-[15px] mb-[2px]">ยอดขาย (คัน) แยกตามแบรนด์</div>
          <div className="text-xs text-[#8a94a3] mb-[18px]">จำนวนคันที่ขายในรอบนี้</div>
          <div className="flex flex-col gap-[13px]">
            {[...brands].sort((a, b) => (b.units || 0) - (a.units || 0)).map((b, i) => {
              const c = colorFor(b.brand, i);
              const pct = Math.max(3, ((b.units || 0) / maxUnits) * 100);
              return (
                <div key={b.brand} className="flex items-center gap-3">
                  <span className="w-[66px] flex-none text-[13px] font-semibold">{b.brand}</span>
                  <div className="flex-1 h-[22px] bg-[#eef1f5] rounded-md overflow-hidden relative">
                    <div
                      className="absolute left-0 top-0 h-full rounded-md"
                      style={{ width: pct + '%', background: hexA(c, 0.85) }}
                    />
                  </div>
                  <span className="w-16 flex-none text-right text-[13px] font-bold text-[#3a4453]">{fi(b.units)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className={card}>
          <div className="font-bold text-[15px] mb-[2px]">แนวโน้มรายได้สุทธิรายเดือน</div>
          <div className="text-xs text-[#8a94a3] mb-[22px]">เปรียบเทียบทุกรอบวางบิล</div>
          <div className="flex items-end gap-[18px] h-[180px] px-[6px]">
            {months.map((m) => {
              const on = m.id === active.id;
              const pct = Math.max(4, ((m.net || 0) / maxNet) * 100);
              return (
                <div key={m.id} className="flex-1 flex flex-col items-center gap-[9px] h-full justify-end">
                  <span className="text-xs font-bold text-[#3a4453]">
                    {Math.abs(m.net) >= 1e6 ? (m.net / 1e6).toFixed(1) + 'ล.' : fi(Math.round(m.net))}
                  </span>
                  <div
                    className="w-full max-w-[70px] rounded-t-lg"
                    style={{
                      height: pct + '%',
                      minHeight: 6,
                      background: on ? `linear-gradient(180deg,var(--ac),${hexA('#3b5bdb', 0.7)})` : '#c7cfdb',
                    }}
                  />
                  <span className="text-xs text-[#6b7686] font-semibold text-center">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={card}>
        <div className="font-bold text-[15px] mb-[2px]">องค์ประกอบรายได้รวม — {active.label}</div>
        <div className="text-xs text-[#8a94a3] mb-5">ที่มาของรายได้ก่อนหักค่าทะเบียน EV</div>
        <div className="flex h-5 rounded-[10px] overflow-hidden mb-[22px]">
          {incomeParts.map((p) => (
            <div key={p.label} style={{ width: (p.val / ipSum) * 100 + '%', background: p.color }} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {incomeParts.map((p) => (
            <div key={p.label} className="pl-[13px]" style={{ borderLeft: `3px solid ${p.color}` }}>
              <div className="text-[12.5px] text-[#6b7686] font-semibold">{p.label}</div>
              <div className="text-[17px] font-bold mt-1">{f2(p.val)}</div>
              <div className="text-[11.5px] text-[#8a94a3] mt-[3px]">{((p.val / ipSum) * 100).toFixed(1)}%</div>
            </div>
          ))}
          <div className="pl-[13px]" style={{ borderLeft: '3px solid #16a34a' }}>
            <div className="text-[12.5px] text-[#6b7686] font-semibold">รายได้สุทธิ</div>
            <div className="text-[17px] font-bold mt-1 text-[#16a34a]">{f2(active.net)}</div>
            <div className="text-[11.5px] text-[#8a94a3] mt-[3px]">หักค่าทะเบียน EV {f2(active.deduct)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
