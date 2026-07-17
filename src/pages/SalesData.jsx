import { useEffect, useMemo, useState } from 'react';
import { card, thL, thC, thR, tdL, tdC, tdR, tdMono, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, formatIsoDate } from '../lib/format';
import { fetchSavedExternalSales } from '../lib/api';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

const DATE_PRESETS = [
  { key: 'today', label: 'วันนี้', days: 0 },
  { key: '7d', label: '7 วัน', days: 7 },
  { key: '15d', label: '15 วัน', days: 15 },
  { key: '30d', label: '30 วัน', days: 30 },
  { key: 'custom', label: 'ระบุวันที่' },
];

const TABS = [
  { key: 'list', label: 'รายการขาย' },
  { key: 'byModel', label: 'สรุปรุ่นรถ / ค่าทะเบียน' },
];

export default function SalesData() {
  const [tab, setTab] = useState('list');
  const [datePreset, setDatePreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);

  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [branch, setBranch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [registration, setRegistration] = useState('');

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);

  const load = async (overrides = {}) => {
    const df = overrides.date_from ?? dateFrom;
    const dt = overrides.date_to ?? dateTo;
    setStatus('loading');
    setError('');
    try {
      const data = await fetchSavedExternalSales({ date_from: df, date_to: dt });
      setItems(data.items || []);
      setStatus('ready');
    } catch (err) {
      setError(err.message || 'โหลดข้อมูลไม่สำเร็จ');
      setStatus('error');
    }
  };

  const applyPreset = (preset) => {
    setDatePreset(preset.key);
    if (preset.key === 'custom') return;
    const to = todayIso();
    const from = daysAgoIso(preset.days);
    setDateFrom(from);
    setDateTo(to);
    load({ date_from: from, date_to: to });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brandOptions = useMemo(() => uniqueSorted(items.map((it) => it.brand)), [items]);
  const branchOptions = useMemo(() => uniqueSorted(items.map((it) => it.branch)), [items]);
  const saleTypeOptions = useMemo(() => uniqueSorted(items.map((it) => it.sale_type)), [items]);

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((it) => {
        if (brand && it.brand !== brand) return false;
        if (branch && it.branch !== branch) return false;
        if (saleType && it.sale_type !== saleType) return false;
        if (registration === 'paid' && !it.registration_paid) return false;
        if (registration === 'unpaid' && it.registration_paid) return false;
        if (!needle) return true;
        return [it.customer_name, it.chassis_no, it.contno, it.model_code, it.resvno]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle));
      })
      .sort((a, b) => new Date(b.sdate || 0) - new Date(a.sdate || 0));
  }, [items, q, brand, branch, saleType, registration]);

  useEffect(() => {
    setPage(1);
  }, [items, q, brand, branch, saleType, registration]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const modelSummary = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const brandName = it.brand || '-';
      const model = it.model_code || '-';
      const key = `${brandName}__${model}`;
      if (!map.has(key)) {
        map.set(key, { brand: brandName, model, count: 0, paidCount: 0, unpaidCount: 0, totalFee: 0 });
      }
      const row = map.get(key);
      row.count += 1;
      if (it.registration_paid) row.paidCount += 1;
      else row.unpaidCount += 1;
      row.totalFee += Number(it.registration_total_paid) || 0;
    }
    return [...map.values()].sort((a, b) => b.totalFee - a.totalFee || b.count - a.count);
  }, [filteredItems]);

  const summaryTotals = useMemo(
    () =>
      modelSummary.reduce(
        (acc, row) => {
          acc.count += row.count;
          acc.paidCount += row.paidCount;
          acc.unpaidCount += row.unpaidCount;
          acc.totalFee += row.totalFee;
          return acc;
        },
        { count: 0, paidCount: 0, unpaidCount: 0, totalFee: 0 }
      ),
    [modelSummary]
  );

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลภายนอก</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ข้อมูลการขาย</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          ข้อมูลยอดขายจากระบบ eaksahalink ที่บันทึกลงฐานข้อมูลไว้แล้ว
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? btnPrimary : btnGhost}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={card + ' mb-5'}>
        <div className="flex gap-2 flex-wrap">
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              disabled={status === 'loading'}
              className={(datePreset === preset.key ? btnPrimary : btnGhost) + ' disabled:opacity-60 disabled:cursor-not-allowed'}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {datePreset === 'custom' && (
          <div className="flex gap-3 flex-wrap items-end mt-4">
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
              วันที่เริ่ม
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
            <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
              วันที่สิ้นสุด
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
              />
            </label>
            <button onClick={() => load()} disabled={status === 'loading'} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
              {status === 'loading' ? 'กำลังโหลด...' : 'ค้นหา'}
            </button>
          </div>
        )}
      </div>

      {status === 'error' && (
        <div className="mb-5 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">{error}</div>
      )}

      {status !== 'loading' && !error && (
        <>
          {tab === 'list' && (
          <div className={card + ' mb-5'}>
            <div className="flex gap-3 flex-wrap items-end">
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold flex-1 min-w-[220px]">
                ค้นหา
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ชื่อลูกค้า / เลขถัง / เลขที่สัญญา / รุ่นรถ"
                  className="px-3 py-[9px] border border-[#d7dce4] rounded-[10px] text-[13.5px]"
                />
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                แบรนด์
                <select value={brand} onChange={(e) => setBrand(e.target.value)} className={selectStyle + ' min-w-[150px]!'}>
                  <option value="">ทั้งหมด</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                สาขา
                <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectStyle + ' min-w-[120px]!'}>
                  <option value="">ทั้งหมด</option>
                  {branchOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                ประเภทการขาย
                <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className={selectStyle + ' min-w-[140px]!'}>
                  <option value="">ทั้งหมด</option>
                  {saleTypeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-[5px] text-[11.5px] text-[#6b7686] font-semibold">
                ทะเบียน
                <select value={registration} onChange={(e) => setRegistration(e.target.value)} className={selectStyle + ' min-w-[140px]!'}>
                  <option value="">ทั้งหมด</option>
                  <option value="paid">ชำระแล้ว</option>
                  <option value="unpaid">ยังไม่ชำระ</option>
                </select>
              </label>
            </div>
          </div>
          )}

          {tab === 'list' && (
          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
              <div>
                <div className="font-bold text-[15px]">
                  พบ {fi(items.length)} รายการ · แสดง {fi(filteredItems.length)} รายการ
                </div>
                <div className="text-[12.5px] text-[#8a94a3] mt-1">
                  {formatIsoDate(dateFrom)} ถึง {formatIsoDate(dateTo)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[1700px]">
                <thead>
                  <tr className="bg-[#f4f6fa]">
                    <th className={thC}>#</th>
                    <th className={thL}>แบรนด์</th>
                    <th className={thL}>สาขา</th>
                    <th className={thL}>เลขที่สัญญา</th>
                    <th className={thL}>ชื่อลูกค้า</th>
                    <th className={thL}>รุ่นรถ</th>
                    <th className={thL}>เลขถัง</th>
                    <th className={thL}>เงื่อนไขการขาย</th>
                    <th className={thL}>วันที่ขาย</th>
                    <th className={thL}>วันที่ส่งมอบ</th>
                    <th className={thR}>ราคาขาย</th>
                    <th className={thR}>ราคาส่ง</th>
                    <th className={thR}>MSRP</th>
                    <th className={thR}>ค่าทะเบียน</th>
                    <th className={thC}>สถานะทะเบียน</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((it, i) => (
                    <tr key={`${it.contno || it.chassis_no || 'row'}-${i}`} className="border-b border-[#eef1f5]">
                      <td className={tdC}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className={tdL}>{it.brand}</td>
                      <td className={tdL}>{it.branch}</td>
                      <td className={tdMono}>{it.contno}</td>
                      <td className={tdL}>{it.customer_name}</td>
                      <td className={tdL}>
                        <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                          {it.model_code}
                        </span>
                      </td>
                      <td className={tdMono}>{it.chassis_no}</td>
                      <td className={tdL}>{it.sale_condition}</td>
                      <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                      <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                      <td className={tdR}>{f2(it.sale_price)}</td>
                      <td className={tdR}>{f2(it.wholesales)}</td>
                      <td className={tdR}>{f2(it.msrp)}</td>
                      <td className={tdR}>{it.registration_total_paid != null ? f2(it.registration_total_paid) : '-'}</td>
                      <td className={tdC}>
                        {it.registration_paid ? (
                          <span className="inline-block px-[9px] py-[3px] bg-[#ecfdf3] text-[#15803d] rounded-full text-[11.5px] font-semibold">
                            ชำระแล้ว
                          </span>
                        ) : (
                          <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
                            ยังไม่ชำระ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filteredItems.length && <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบข้อมูลตามเงื่อนไขนี้</div>}
            </div>

            {filteredItems.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-3 mt-[18px] pt-[18px] border-t border-[#eef1f5]">
                <div className="text-[12.5px] text-[#8a94a3]">
                  หน้า {fi(currentPage)} / {fi(totalPages)}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                  >
                    ก่อนหน้า
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </div>
          )}

          {tab === 'byModel' && (
          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
              <div>
                <div className="font-bold text-[15px]">สรุปค่าทะเบียนแยกตามรุ่นรถ</div>
                <div className="text-[12.5px] text-[#8a94a3] mt-1">
                  {formatIsoDate(dateFrom)} ถึง {formatIsoDate(dateTo)} · {fi(modelSummary.length)} รุ่น
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {modelSummary.map((row, i) => (
                <div
                  key={`${row.brand}-${row.model}-${i}`}
                  className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 px-4 py-[14px] bg-[#f8f9fb] border border-[#eef1f5] rounded-[12px]"
                >
                  <div className="text-[13.5px]">
                    ยี่ห้อ <span className="font-bold">{row.brand}</span> รุ่น{' '}
                    <span className="font-bold">{row.model}</span> มีค่าทะเบียนรวม{' '}
                    <span className="font-bold text-[var(--ac)]">{f2(row.totalFee)} บาท</span>
                  </div>
                  <div className="text-[12px] text-[#8a94a3] whitespace-nowrap">
                    {fi(row.count)} คัน · ชำระแล้ว {fi(row.paidCount)} · ยังไม่ชำระ {fi(row.unpaidCount)}
                  </div>
                </div>
              ))}
              {!modelSummary.length && <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบข้อมูลตามเงื่อนไขนี้</div>}
            </div>

            {modelSummary.length > 0 && (
              <div className="flex items-center justify-between flex-wrap gap-3 mt-[18px] pt-[18px] border-t border-[#eef1f5]">
                <div className="font-semibold text-[13.5px]">รวมทั้งหมด {fi(summaryTotals.count)} คัน</div>
                <div className="font-bold text-[15px] text-[var(--ac)]">{f2(summaryTotals.totalFee)} บาท</div>
              </div>
            )}
          </div>
          )}
        </>
      )}
    </section>
  );
}
