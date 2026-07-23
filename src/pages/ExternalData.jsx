import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { card, thL, thC, thR, tdL, tdC, tdR, tdMono, btnPrimary, btnGhost, selectStyle } from '../lib/styles';
import { f2, fi, formatIsoDate } from '../lib/format';
import { fetchExternalSalesData, saveExternalSalesData } from '../lib/api';
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

function getSortValue(it, key) {
  switch (key) {
    case 'brand':
      return (it.database_name || '').toLowerCase();
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
      return it.registration_total_paid != null ? Number(it.registration_total_paid) : -Infinity;
    case 'registration_paid':
      return it.registration_paid ? 1 : 0;
    default:
      return '';
  }
}

export default function ExternalData() {
  const [dateFrom, setDateFrom] = useState(daysAgoIso(30));
  const [dateTo, setDateTo] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [branch, setBranch] = useState('');
  const [saleType, setSaleType] = useState('');
  const [registration, setRegistration] = useState('');
  const [sortKey, setSortKey] = useState('sdate');
  const [sortDir, setSortDir] = useState('desc');
  const [detailItem, setDetailItem] = useState(null);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  const onFetch = async () => {
    setLoading(true);
    setProgress(0);
    setError('');
    setSaveMessage('');
    setSaveError('');
    try {
      const pageSize = 1000;
      let offset = 0;
      let items = [];
      let meta = null;

      // The upstream API paginates (max ~1000 rows/page), so loop until every
      // matching row for the date range has been collected, updating % as we go.
      while (true) {
        const data = await fetchExternalSalesData({
          date_from: dateFrom,
          date_to: dateTo,
          branch: '%',
          limit: pageSize,
          offset,
        });
        if (!meta) meta = data;
        items = items.concat(data.items || []);
        setProgress(data.total ? Math.min(100, Math.round((items.length / data.total) * 100)) : 100);
        offset += pageSize;
        if (!data.items || !data.items.length || items.length >= data.total) break;
      }

      setResult({ ...meta, items, fetched: items.length });
      setQ('');
      setBrand('');
      setBranch('');
      setSaleType('');
      setRegistration('');
    } catch (err) {
      setError(err.message || 'ดึงข้อมูลไม่สำเร็จ');
      setResult(null);
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const items = result?.items || [];

  const brandOptions = useMemo(() => uniqueSorted(items.map((it) => it.database_name)), [items]);
  const branchOptions = useMemo(() => uniqueSorted(items.map((it) => it.branch)), [items]);
  const saleTypeOptions = useMemo(() => uniqueSorted(items.map((it) => it.sale_type)), [items]);

  const filteredItems = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items
      .filter((it) => {
        if (brand && it.database_name !== brand) return false;
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

  const onSave = async () => {
    setSaving(true);
    setSaveMessage('');
    setSaveError('');
    try {
      const r = await saveExternalSalesData(filteredItems);
      setSaveMessage(`บันทึกสำเร็จ: เพิ่มใหม่ ${fi(r.inserted)} รายการ · อัปเดต ${fi(r.updated)} รายการ`);
    } catch (err) {
      setSaveError(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="appfade">
      <div className="mb-[22px]">
        <div className="text-xs font-semibold tracking-[0.06em] uppercase text-[var(--ac)] mb-[6px]">ข้อมูลภายนอก</div>
        <h1 className="m-0 text-[27px] font-bold tracking-[-0.01em]">ยอดขายจากระบบ eaksahalink</h1>
        <div className="text-[#6b7686] text-[13.5px] mt-[6px]">
          ดึงข้อมูลยอดขายจริงจากระบบภายนอกมาดูเทียบกับข้อมูลที่อัปโหลดในระบบนี้
        </div>
      </div>

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
          <button onClick={onFetch} disabled={loading} className={btnPrimary + ' disabled:opacity-60 disabled:cursor-not-allowed'}>
            {loading ? `กำลังดึงข้อมูล... ${progress ?? 0}%` : 'ดึงข้อมูล'}
          </button>
        </div>
        {loading && (
          <div className="mt-3 h-[6px] bg-[#eef1f5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--ac)] rounded-full transition-[width] duration-200"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mb-5 px-4 py-[14px] bg-[#fef2f2] border border-[#fecaca] rounded-xl text-[#b91c1c] text-[13.5px]">
          {error}
        </div>
      )}

      {result && (
        <>
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

          <div className={card}>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-[18px]">
              <div>
                <div className="font-bold text-[15px]">
                  พบ {fi(result.total)} รายการ · แสดง {fi(filteredItems.length)} รายการ
                </div>
                <div className="text-[12.5px] text-[#8a94a3] mt-1">
                  {formatIsoDate(result.date_from)} ถึง {formatIsoDate(result.date_to)}
                  {result.date_defaulted ? ' (ใช้ช่วงวันที่ default)' : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {saveMessage && <span className="text-[12.5px] text-[#15803d] font-semibold">{saveMessage}</span>}
                {saveError && <span className="text-[12.5px] text-[#b91c1c] font-semibold">{saveError}</span>}
                <button
                  onClick={onSave}
                  disabled={saving || !filteredItems.length}
                  className={btnGhost + ' disabled:opacity-60 disabled:cursor-not-allowed'}
                >
                  {saving ? 'กำลังบันทึก...' : `บันทึกลงฐานข้อมูล (${fi(filteredItems.length)})`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[1200px]">
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
                      label="สถานะทะเบียน"
                      col="registration_paid"
                      align="center"
                      className={thC}
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it, i) => (
                    <tr key={`${it.contno || it.chassis_no || 'row'}-${i}`} className="border-b border-[#eef1f5]">
                      <td className={tdC}>{i + 1}</td>
                      <td className={tdL}>{it.database_name}</td>
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
          </div>
        </>
      )}

      <SaleDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
    </section>
  );
}

function Field({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-[3px] min-w-0">
      <span className="text-[10.5px] text-[#8a94a3] font-bold uppercase tracking-[0.03em]">{label}</span>
      <span className={'text-[13.5px] font-semibold text-[#1a2233] truncate' + (mono ? ' font-mono text-[12.5px]' : '')}>
        {value || value === 0 ? value : '-'}
      </span>
    </div>
  );
}

function SaleDetailModal({ item, onClose }) {
  if (!item) return null;
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
          <Field label="แบรนด์" value={item.database_name} />
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
          <Field label="ค่าทะเบียน" value={item.registration_total_paid != null ? f2(item.registration_total_paid) : '-'} />
        </div>

        <div className="mt-5 pt-4 border-t border-[#f1f3f6] flex items-center justify-between">
          <span className="text-[10.5px] text-[#8a94a3] font-bold uppercase tracking-[0.03em]">สถานะทะเบียน</span>
          {item.registration_paid ? (
            <span className="inline-block px-[9px] py-[3px] bg-[#ecfdf3] text-[#15803d] rounded-full text-[11.5px] font-semibold">
              ชำระแล้ว
            </span>
          ) : (
            <span className="inline-block px-[9px] py-[3px] bg-[#f4f6fa] text-[#8a94a3] rounded-full text-[11.5px] font-semibold">
              ยังไม่ชำระ
            </span>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
