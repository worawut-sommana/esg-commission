import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { card, thL, thC, thR, tdL, tdC, tdR, tdMono, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, formatIsoDate } from '../lib/format';
import { fetchSavedExternalSales } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import SortTh from '../components/SortTh';

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

// The source system files commission payouts inside registration_payments
// too (only fordesc/paydesc says "Commission" — payfor/paytyp don't reliably
// distinguish it), so line items are split by that text rather than by which
// array they arrived in.
function isCommissionPayment(p) {
  const text = `${p.fordesc || ''} ${p.paydesc || ''}`.toLowerCase();
  return text.includes('commission');
}

function classifiedPayments(it) {
  const all = [...(it.registration_payments || []), ...(it.commission_payments || [])];
  return all.map((p) => ({ ...p, isCommission: isCommissionPayment(p) }));
}

function commissionTotal(it) {
  return classifiedPayments(it)
    .filter((p) => p.isCommission)
    .reduce((sum, p) => sum + (Number(p.payamt) || 0), 0);
}

function commissionIsPaid(it) {
  return classifiedPayments(it).some((p) => p.isCommission);
}

// registration_total_paid from the API mixes in any commission line items,
// so prefer the non-commission sum from the breakdown whenever a breakdown
// exists at all — even one that nets to 0 because every line item on this
// sale happened to be commission. Only fall back to the raw mixed total when
// there's no breakdown data to split (e.g. an older unsynced record).
function registrationFeeTotal(it) {
  const all = classifiedPayments(it);
  if (!all.length) {
    return it.registration_total_paid != null ? Number(it.registration_total_paid) : null;
  }
  return all.filter((p) => !p.isCommission).reduce((sum, p) => sum + (Number(p.payamt) || 0), 0);
}

function getSortValue(it, key) {
  switch (key) {
    case 'brand':
      return (it.brand || '').toLowerCase();
    case 'model_code':
      return (it.model_code || '').toLowerCase();
    case 'chassis_no':
      return (it.chassis_no || '').toLowerCase();
    case 'customer_name':
      return (it.customer_name || '').toLowerCase();
    case 'resv_date':
      return it.resv_date ? new Date(it.resv_date).getTime() : -Infinity;
    case 'sdate':
      return it.sdate ? new Date(it.sdate).getTime() : -Infinity;
    case 'delivery_date':
      return it.delivery_date ? new Date(it.delivery_date).getTime() : -Infinity;
    case 'sale_price':
      return Number(it.sale_price) || 0;
    case 'registration_total_paid':
      return registrationFeeTotal(it) != null ? registrationFeeTotal(it) : -Infinity;
    case 'commission_total':
      return commissionTotal(it);
    default:
      return '';
  }
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
    'ค่าทะเบียน': registrationFeeTotal(it) || '',
    'สถานะทะเบียน': it.registration_paid ? 'ชำระแล้ว' : 'ยังไม่ชำระ',
    'ค่าคอม': commissionTotal(it) || '',
    'สถานะค่าคอม': commissionIsPaid(it) ? 'จ่ายแล้ว' : 'ยังไม่จ่าย',
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
  { key: 'duplicates', label: 'เลขถังซ้ำ', adminOnly: true },
];

export default function SalesData() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState('list');
  const [datePreset, setDatePreset] = useState('30d');
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);

  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [branch, setBranch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [registration, setRegistration] = useState('');
  const [sortKey, setSortKey] = useState('sdate');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
      .sort((a, b) => {
        const av = getSortValue(a, sortKey);
        const bv = getSortValue(b, sortKey);
        const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [items, q, brand, branch, saleType, registration, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [items, q, brand, branch, saleType, registration, sortKey, sortDir]);

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

  const duplicateChassisGroups = useMemo(() => {
    const map = new Map();
    for (const it of items) {
      const vin = (it.chassis_no || '').trim();
      if (!vin) continue;
      if (!map.has(vin)) map.set(vin, []);
      map.get(vin).push(it);
    }
    return [...map.values()]
      .filter((rows) => rows.length > 1)
      .sort((a, b) => b.length - a.length || a[0].chassis_no.localeCompare(b[0].chassis_no));
  }, [items]);

  const visibleTabs = TABS.filter((t) => !t.adminOnly || me?.isAdmin);

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
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={(tab === t.key ? btnPrimary : btnGhost) + ' inline-flex items-center gap-2'}
            >
              {t.label}
              {t.key === 'duplicates' && duplicateChassisGroups.length > 0 && (
                <span
                  className={
                    'inline-flex items-center justify-center min-w-[19px] h-[19px] px-[5px] rounded-full text-[11px] font-bold ' +
                    (tab === t.key ? 'bg-white/25 text-white' : 'bg-[#fef2f2] text-[#b91c1c]')
                  }
                >
                  {duplicateChassisGroups.length}
                </span>
              )}
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
              <table className="w-full border-collapse text-[13px] min-w-[1250px]">
                <thead>
                  <tr className="bg-[#f4f6fa]">
                    <th className={thC}>#</th>
                    <SortTh label="แบรนด์" col="brand" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="รุ่นรถ" col="model_code" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="เลขถัง" col="chassis_no" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh
                      label="ชื่อลูกค้า"
                      col="customer_name"
                      className={thL}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh label="วันที่จอง" col="resv_date" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh label="วันที่ขาย" col="sdate" className={thL} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                    <SortTh
                      label="วันที่ส่งมอบ"
                      col="delivery_date"
                      className={thL}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="ราคาขาย"
                      col="sale_price"
                      align="right"
                      className={thR}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="ค่าทะเบียน"
                      col="registration_total_paid"
                      align="right"
                      className={thR}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortTh
                      label="ค่าคอม"
                      col="commission_total"
                      align="right"
                      className={thR}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((it, i) => (
                    <tr key={`${it.contno || it.chassis_no || 'row'}-${i}`} className="border-b border-[#eef1f5]">
                      <td className={tdC}>{(currentPage - 1) * PAGE_SIZE + i + 1}</td>
                      <td className={tdL}>{it.brand}</td>
                      <td className={tdL}>
                        <span className="inline-block px-[9px] py-[3px] bg-[#eef2fb] text-[var(--ac)] rounded-full text-[11.5px] font-semibold">
                          {it.model_code}
                        </span>
                      </td>
                      <td className={tdMono}>
                        <button
                          onClick={() => setDetailItem(it)}
                          className="font-mono text-[12px] text-[var(--ac)] underline decoration-dotted underline-offset-2 cursor-pointer bg-transparent border-none p-0"
                        >
                          {it.chassis_no}
                        </button>
                      </td>
                      <td className={tdL}>{it.customer_name}</td>
                      <td className={tdL}>{formatIsoDate(it.resv_date)}</td>
                      <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                      <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                      <td className={tdR}>{f2(it.sale_price)}</td>
                      <td className={tdR}>{registrationFeeTotal(it) ? f2(registrationFeeTotal(it)) : '-'}</td>
                      <td className={tdR}>{commissionTotal(it) ? f2(commissionTotal(it)) : '-'}</td>
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

          {tab === 'duplicates' && me?.isAdmin && (
          <div className={card}>
            <div className="mb-[18px]">
              <div className="font-bold text-[15px]">พบเลขถังซ้ำ {fi(duplicateChassisGroups.length)} คัน</div>
              <div className="text-[12.5px] text-[#8a94a3] mt-1">
                ตรวจสอบจาก {fi(items.length)} รายการ · {formatIsoDate(dateFrom)} ถึง {formatIsoDate(dateTo)}
              </div>
            </div>

            <div className="flex flex-col gap-[14px]">
              {duplicateChassisGroups.map((rows) => (
                <div key={rows[0].chassis_no} className="border border-[#fecaca] rounded-[12px] overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-[12px] bg-[#fef2f2] flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[13.5px] text-[#b91c1c]">{rows[0].chassis_no}</span>
                      <span className="text-[12.5px] text-[#8a94a3]">
                        {rows[0].brand} {rows[0].model_code}
                      </span>
                    </div>
                    <span className="text-[11.5px] font-semibold text-[#b91c1c] bg-white px-[9px] py-[3px] rounded-full">
                      {fi(rows.length)} รายการ
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="bg-white">
                          <th className={thL}>เลขที่สัญญา</th>
                          <th className={thL}>ชื่อลูกค้า</th>
                          <th className={thL}>ประเภทการขาย</th>
                          <th className={thL}>วันที่ขาย</th>
                          <th className={thL}>วันที่ส่งมอบ</th>
                          <th className={thR}>ราคาขาย</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((it, i) => (
                          <tr key={`${it.contno || i}`} className="border-t border-[#eef1f5]">
                            <td className={tdMono}>{it.contno}</td>
                            <td className={tdL}>{it.customer_name}</td>
                            <td className={tdL}>{it.sale_type}</td>
                            <td className={tdL}>{formatIsoDate(it.sdate)}</td>
                            <td className={tdL}>{formatIsoDate(it.delivery_date)}</td>
                            <td className={tdR}>{f2(it.sale_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {!duplicateChassisGroups.length && (
                <div className="text-center p-11 text-[#98a2b3] text-sm">ไม่พบเลขถังซ้ำในช่วงวันที่นี้</div>
              )}
            </div>
          </div>
          )}
        </>
      )}

      <SaleDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </section>
  );
}

function Field({ label, value, mono, badge }) {
  return (
    <div className="flex flex-col gap-[3px] min-w-0">
      <span className="text-[10.5px] text-[#8a94a3] font-bold uppercase tracking-[0.03em]">{label}</span>
      <span className="flex items-center gap-2 flex-wrap">
        <span className={'text-[13.5px] font-semibold text-[#1a2233] truncate' + (mono ? ' font-mono text-[12.5px]' : '')}>
          {value || value === 0 ? value : '-'}
        </span>
        {badge}
      </span>
    </div>
  );
}

function StatusBadge({ paid, paidLabel, unpaidLabel }) {
  return paid ? (
    <span className="inline-block px-[9px] py-[3px] bg-[#ecfdf3] text-[#15803d] rounded-full text-[11.5px] font-semibold">
      {paidLabel}
    </span>
  ) : (
    <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
      {unpaidLabel}
    </span>
  );
}

function paymentRowsFor(item) {
  return classifiedPayments(item)
    .map((p) => ({ ...p, kind: p.isCommission ? 'คอมมิชชั่น' : 'ค่าทะเบียน' }))
    .sort((a, b) => new Date(b.billdt || 0) - new Date(a.billdt || 0));
}

function SaleDetailModal({ item, onClose }) {
  if (!item) return null;
  const paymentRows = paymentRowsFor(item);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className={card + ' w-full max-w-[560px] my-auto'} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-bold text-[16px]">รายละเอียดการขาย</div>
            <div className="text-[12px] text-[#8a94a3] font-mono mt-[2px]">{item.chassis_no}</div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[8px] text-[#98a2b3] text-[18px] leading-none hover:bg-[#f4f6fa]"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="แบรนด์" value={item.brand} />
          <Field label="รุ่นรถ" value={item.model_code} />
          <Field label="เลขถัง" value={item.chassis_no} mono />
          <Field label="สาขา" value={item.branch} />
          <Field label="ชื่อลูกค้า" value={item.customer_name} />
          <Field label="เงื่อนไขการขาย" value={item.sale_condition} />
          <Field label="เลขที่สัญญา" value={item.contno} mono />
          <Field label="เลขที่ใบจอง" value={item.resvno} mono />
          <Field label="ใบกำกับภาษี" value={item.taxno} mono />
          <Field label="วันที่จอง" value={formatIsoDate(item.resv_date)} />
          <Field label="วันที่ขาย" value={formatIsoDate(item.sdate)} />
          <Field label="วันที่ส่งมอบ" value={formatIsoDate(item.delivery_date)} />
          <Field label="ราคาขาย" value={f2(item.sale_price)} />
          <Field label="ราคาส่ง" value={f2(item.wholesales)} />
          <Field label="MSRP" value={f2(item.msrp)} />
          <Field
            label="ค่าทะเบียน"
            value={registrationFeeTotal(item) ? f2(registrationFeeTotal(item)) : '-'}
            badge={<StatusBadge paid={item.registration_paid} paidLabel="ชำระแล้ว" unpaidLabel="ยังไม่ชำระ" />}
          />
          <Field
            label="ค่าคอม"
            value={commissionTotal(item) ? f2(commissionTotal(item)) : '-'}
            badge={<StatusBadge paid={commissionIsPaid(item)} paidLabel="จ่ายแล้ว" unpaidLabel="ยังไม่จ่าย" />}
          />
        </div>

        {paymentRows.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#f1f3f6]">
            <div className="text-[10.5px] text-[#8a94a3] font-bold uppercase tracking-[0.03em] mb-3">ประวัติการชำระ</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-[#f8f9fb]">
                    <th className={thL}>วันที่</th>
                    <th className={thL}>รายการ</th>
                    <th className={thL}>เลขที่บิล</th>
                    <th className={thR}>จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((p, i) => (
                    <tr key={i} className="border-b border-[#f1f3f6]">
                      <td className={tdL}>{formatIsoDate(p.billdt)}</td>
                      <td className={tdL}>
                        <div className="font-semibold">{p.fordesc || p.paydesc || '-'}</div>
                        <div className="text-[11px] text-[#8a94a3]">
                          {p.kind}
                          {p.paydesc && p.fordesc && p.paydesc !== p.fordesc ? ` · ${p.paydesc}` : ''}
                        </div>
                      </td>
                      <td className={tdMono}>{p.billno}</td>
                      <td className={tdR}>{f2(p.payamt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
