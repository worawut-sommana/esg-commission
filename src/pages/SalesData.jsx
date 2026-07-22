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

async function exportSalesToExcel(items, dateFrom, dateTo) {
  const XLSX = await import('xlsx');
  const rows = items.map((it, i) => ({
    '#': i + 1,
    'แบรนด์': it.brand,
    'สาขา': it.branch,
    'เลขที่สัญญา': it.contno,
    'ชื่อลูกค้า': it.customer_name,
    'รุ่นรถ': it.model_code,
    'เลขถัง': it.chassis_no,
    'เงื่อนไขการขาย': it.sale_condition,
    'เลขที่ใบจอง': it.resvno,
    'วันที่จอง': formatIsoDate(it.resv_date),
    'ใบกำกับภาษี': it.taxno,
    'วันที่ขาย': formatIsoDate(it.sdate),
    'วันที่ส่งมอบ': formatIsoDate(it.delivery_date),
    'ราคาขาย': it.sale_price ?? '',
    'ราคาส่ง': it.wholesales ?? '',
    'MSRP': it.msrp ?? '',
    'ค่าทะเบียน': it.registration_total_paid ?? '',
    'สถานะทะเบียน': it.registration_paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'ข้อมูลการขาย');
  XLSX.writeFile(wb, `ข้อมูลการขาย_${dateFrom}_${dateTo}.xlsx`);
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
  { key: 'grouped', label: 'จัดกลุ่มตามรุ่นรถ / ค่าทะเบียน' },
];

export default function SalesData() {
  const [tab, setTab] = useState('list');
  const [datePreset, setDatePreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());

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

  const groupedByModelFee = useMemo(() => {
    const map = new Map();
    for (const it of filteredItems) {
      const brandName = it.brand || '-';
      const model = it.model_code || '-';
      const fee = it.registration_total_paid != null ? Number(it.registration_total_paid) : null;
      const key = `${brandName}__${model}__${fee}`;
      if (!map.has(key)) {
        map.set(key, { key, brand: brandName, model, fee, rows: [] });
      }
      map.get(key).rows.push(it);
    }
    return [...map.values()].sort((a, b) => {
      const modelCmp = `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
      if (modelCmp !== 0) return modelCmp;
      if (a.fee == null) return 1;
      if (b.fee == null) return -1;
      return a.fee - b.fee;
    });
  }, [filteredItems]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลภายนอก</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ข้อมูลการขาย</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          ข้อมูลยอดขายจากระบบ eaksahalink ที่บันทึกลงฐานข้อมูลไว้แล้ว
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={tab === t.key ? btnPrimary : btnGhost}>
              {t.label}
            </button>
          ))}
        </div>

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
      </div>

      {datePreset === 'custom' && (
        <div className={card + ' mb-5'}>
          <div className="flex gap-3 flex-wrap items-end">
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
        </div>
      )}

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
              <button
                onClick={async () => {
                  setExporting(true);
                  try {
                    await exportSalesToExcel(filteredItems, dateFrom, dateTo);
                  } finally {
                    setExporting(false);
                  }
                }}
                disabled={exporting || !filteredItems.length}
                className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}
              >
                {exporting ? 'กำลังสร้างไฟล์...' : 'Export Excel'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[2000px]">
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
                    <th className={thL}>เลขที่ใบจอง</th>
                    <th className={thL}>วันที่จอง</th>
                    <th className={thL}>ใบกำกับภาษี</th>
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
                      <td className={tdMono}>{it.resvno}</td>
                      <td className={tdL}>{formatIsoDate(it.resv_date)}</td>
                      <td className={tdMono}>{it.taxno}</td>
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

          {tab === 'grouped' && (
          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
              <div>
                <div className="font-bold text-[15px]">จัดกลุ่มตามรุ่นรถ / ค่าทะเบียน</div>
                <div className="text-[12.5px] text-[#8a94a3] mt-1">
                  {formatIsoDate(dateFrom)} ถึง {formatIsoDate(dateTo)} · {fi(groupedByModelFee.length)} กลุ่ม
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-[10px]">
              {groupedByModelFee.map((g) => {
                const open = expandedGroups.has(g.key);
                return (
                  <div key={g.key} className="border border-[#eef1f5] rounded-[12px] overflow-hidden">
                    <button
                      onClick={() => toggleGroup(g.key)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-[14px] bg-[#f8f9fb] text-left cursor-pointer border-none"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="inline-block text-[#8a94a3] text-[11px] transition-transform"
                          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          ▶
                        </span>
                        <span className="font-semibold text-[13.5px]">
                          {g.brand} {g.model}
                        </span>
                        <span className="text-[12px] text-[#8a94a3]">{fi(g.rows.length)} คัน</span>
                      </div>
                      <div className="font-bold text-[13.5px] text-[var(--ac)] whitespace-nowrap">
                        {g.fee != null ? `${f2(g.fee)} บาท` : 'ไม่มีราคา'}
                      </div>
                    </button>

                    {open && (
                      <div className="overflow-x-auto border-t border-[#eef1f5]">
                        <table className="w-full border-collapse text-[13px] min-w-[700px]">
                          <thead>
                            <tr className="bg-white">
                              <th className={thL}>เลขถัง</th>
                              <th className={thL}>เลขที่สัญญา</th>
                              <th className={thL}>ชื่อลูกค้า</th>
                              <th className={thL}>วันที่ขาย</th>
                              <th className={thR}>ราคาขาย</th>
                              <th className={thR}>ค่าทะเบียน</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.rows.map((it, i) => (
                              <tr key={`${it.contno || it.chassis_no || 'row'}-${i}`} className="border-t border-[#eef1f5]">
                                <td className={tdMono}>{it.chassis_no}</td>
                                <td className={tdMono}>{it.contno}</td>
                                <td className={tdL}>{it.customer_name}</td>
                                <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                                <td className={tdR}>{f2(it.sale_price)}</td>
                                <td className={tdR}>{it.registration_total_paid != null ? f2(it.registration_total_paid) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
              {!groupedByModelFee.length && <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบข้อมูลตามเงื่อนไขนี้</div>}
            </div>
          </div>
          )}
        </>
      )}
    </section>
  );
}
